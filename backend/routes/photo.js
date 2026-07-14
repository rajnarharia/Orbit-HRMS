// routes/photo.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const router = express.Router();
const store = require('../db/store');
const { requireAuth } = require('../middleware/auth');

// Ensure uploads/photos directory exists
const photosDir = path.join(__dirname, '..', 'uploads', 'photos');
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, photosDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.jpg';
    const uniqueName = `photo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only image files (jpg, png, webp, gif) are allowed.'));
    }
  }
});

function removeUploadedFile(file) {
  if (file?.path && fs.existsSync(file.path)) {
    try { fs.unlinkSync(file.path); } catch (e) { /* ignore cleanup errors */ }
  }
}

// POST /api/photo/upload - employee uploads own photo
// POST /api/photo/upload?userId=5 - admin uploads for any user
router.post('/upload', requireAuth, upload.single('photo'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No photo file provided.' });
  }

  let targetId = req.user.id;
  if (req.query.userId && req.user.role === 'admin') {
    targetId = Number(req.query.userId);
  } else if (req.query.userId) {
    removeUploadedFile(req.file);
    return res.status(403).json({ error: 'Only admins can upload photos for other users.' });
  }

  const user = store.findUserById(targetId);
  if (!user) {
    removeUploadedFile(req.file);
    return res.status(404).json({ error: 'User not found.' });
  }

  // Delete the old photo file if it exists
  if (user.profilePic) {
    const oldPath = path.join(photosDir, path.basename(user.profilePic));
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
    }
  }

  const photoUrl = `/uploads/photos/${req.file.filename}`;
  const isAdmin = req.user.role === 'admin';
  const updated = store.updateUser(targetId, { profilePic: photoUrl }, isAdmin || targetId === req.user.id);

  res.json({ user: store.sanitizeUser(updated), photoUrl });
});

// DELETE /api/photo/:userId - remove profile photo
router.delete('/:userId', requireAuth, (req, res) => {
  const targetId = Number(req.params.userId);
  if (req.user.role !== 'admin' && req.user.id !== targetId) {
    return res.status(403).json({ error: 'You can only remove your own photo.' });
  }

  const user = store.findUserById(targetId);
  if (!user) return res.status(404).json({ error: 'User not found.' });

  if (user.profilePic) {
    const oldPath = path.join(photosDir, path.basename(user.profilePic));
    if (fs.existsSync(oldPath)) {
      try { fs.unlinkSync(oldPath); } catch (e) { /* ignore */ }
    }
  }

  const isAdmin = req.user.role === 'admin';
  const updated = store.updateUser(targetId, { profilePic: '' }, isAdmin || targetId === req.user.id);
  res.json({ user: store.sanitizeUser(updated) });
});

module.exports = router;
