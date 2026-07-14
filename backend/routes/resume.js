// routes/resume.js
// Resume upload -> text extraction -> AI (Groq) scan -> skills merged into profile.
//
// ASSUMPTION: your existing auth middleware exports a function that verifies
// the JWT and sets `req.user = { id, role, ... }`. This project's other
// routes (attendance/leave/salary) clearly follow that pattern, but I don't
// have your actual middleware/auth.js file, so I've named the import
// `requireAuth` below. If your file exports a different name
// (e.g. `verifyToken`, `authGuard`), just change the require line to match —
// everything else will work unchanged.
const { requireAuth } = require('../middleware/auth');

const path = require('path');
const fs = require('fs');
const express = require('express');
const multer = require('multer');

const store = require('../db/store');
const { extractResumeText } = require('../services/resumeTextExtractor');
const { scanResumeWithGroq } = require('../services/groqClient');

const router = express.Router();

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'resumes');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_MIME = new Set([
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/msword' // .doc (rejected later with a clear message — legacy format not parseable)
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) return cb(null, true);
    cb(new Error('UNSUPPORTED_FILE_TYPE'));
  }
});

function safeFileName(userId, originalName) {
  const ext = path.extname(originalName || '').toLowerCase() || '';
  const stamp = Date.now();
  return `${userId}_${stamp}${ext}`;
}

// POST /api/resume/upload
// Employee uploads their own resume; Admin can upload on behalf of an
// employee by passing ?userId=<id> (falls back to the authenticated user).
router.post('/upload', requireAuth, upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No resume file was uploaded (expected field name "resume").' });
    }

    const targetUserId =
      req.user.role === 'admin' && req.query.userId ? Number(req.query.userId) : req.user.id;

    const targetUser = store.findUserById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found.' });
    }

    // Non-admins may only upload their own resume.
    if (req.user.role !== 'admin' && targetUserId !== req.user.id) {
      return res.status(403).json({ error: 'You can only upload your own resume.' });
    }

    // 1. Extract text
    let resumeText;
    try {
      resumeText = await extractResumeText(req.file.buffer, req.file.mimetype, req.file.originalname);
    } catch (e) {
      if (e.message === 'UNSUPPORTED_LEGACY_DOC') {
        return res.status(400).json({
          error: 'Legacy .doc files can\'t be parsed. Please upload a .pdf or .docx instead.'
        });
      }
      return res.status(400).json({ error: 'Could not read text from this file. Is it a valid PDF/DOCX?' });
    }

    if (!resumeText.trim()) {
      return res.status(400).json({ error: 'No readable text found in this resume (it may be a scanned image).' });
    }

    // 2. Save file to disk (kept separate from the JSON store — binary data
    //    doesn't belong in hrms.json).
    const storedFileName = safeFileName(targetUserId, req.file.originalname);
    const storedPath = path.join(UPLOAD_DIR, storedFileName);
    fs.writeFileSync(storedPath, req.file.buffer);

    // 3. AI scan (Groq). If this fails, we still keep the uploaded file and
    //    record the failure so it can be retried later instead of losing the upload.
    let scan;
    let scanStatus = 'completed';
    let scanError = null;
    try {
      scan = await scanResumeWithGroq(resumeText);
    } catch (e) {
      scan = { summary: '', skills: [], totalExperienceYears: 0, education: [], highlights: [] };
      scanStatus = 'failed';
      scanError = e.message === 'GROQ_API_KEY_MISSING'
        ? 'AI scanning is not configured (missing GROQ_API_KEY on the server).'
        : 'AI scanning failed. The file was saved and you can retry the scan later.';
    }

    // 4. Persist resume metadata + scan result
    const record = store.saveResumeRecord(targetUserId, {
      originalFileName: req.file.originalname,
      storedFileName,
      mimeType: req.file.mimetype,
      sizeBytes: req.file.size,
      scanStatus,
      scanError,
      summary: scan.summary,
      skills: scan.skills,
      totalExperienceYears: scan.totalExperienceYears,
      education: scan.education,
      highlights: scan.highlights
    });

    // 5. Merge AI-discovered skills straight into the employee's profile
    let updatedUser = targetUser;
    if (scan.skills.length > 0) {
      updatedUser = store.mergeSkillsIntoProfile(targetUserId, scan.skills);
    }

    return res.status(201).json({
      resume: record,
      user: store.sanitizeUser(updatedUser)
    });
  } catch (err) {
    if (err.message === 'UNSUPPORTED_FILE_TYPE') {
      return res.status(400).json({ error: 'Unsupported file type. Please upload a PDF or DOCX.' });
    }
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File is too large. Max size is 5MB.' });
    }
    console.error('Resume upload error:', err);
    return res.status(500).json({ error: 'Something went wrong while processing the resume.' });
  }
});

// GET /api/resume/me — the logged-in user's own resume record
router.get('/me', requireAuth, (req, res) => {
  const record = store.getResumeForUser(req.user.id);
  if (!record) return res.status(404).json({ error: 'No resume uploaded yet.' });
  res.json({ resume: record });
});

// GET /api/resume/:userId — Admin/HR viewing any employee's resume
router.get('/:userId', requireAuth, (req, res) => {
  const targetUserId = Number(req.params.userId);
  if (req.user.role !== 'admin' && targetUserId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to view this resume.' });
  }
  const record = store.getResumeForUser(targetUserId);
  if (!record) return res.status(404).json({ error: 'No resume uploaded for this user.' });
  res.json({ resume: record });
});

// GET /api/resume/:userId/download — stream the original file back
router.get('/:userId/download', requireAuth, (req, res) => {
  const targetUserId = Number(req.params.userId);
  if (req.user.role !== 'admin' && targetUserId !== req.user.id) {
    return res.status(403).json({ error: 'Not authorized to download this resume.' });
  }
  const record = store.getResumeForUser(targetUserId);
  if (!record) return res.status(404).json({ error: 'No resume uploaded for this user.' });

  const filePath = path.join(UPLOAD_DIR, record.storedFileName);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Resume file is missing on the server.' });
  }
  res.download(filePath, record.originalFileName);
});

module.exports = router;
