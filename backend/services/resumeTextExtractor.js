// services/resumeTextExtractor.js
// Pulls plain text out of an uploaded resume (PDF or DOCX) so it can be
// handed to the AI scanner. Pure-JS libraries only (pdf-parse, mammoth) —
// no native builds, consistent with the rest of this project.

const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');

const MAX_CHARS_FOR_AI = 12000; // keep prompts small & cheap; resumes rarely exceed this

function truncate(text) {
  const clean = (text || '').replace(/\r/g, '').replace(/\n{3,}/g, '\n\n').trim();
  return clean.length > MAX_CHARS_FOR_AI ? clean.slice(0, MAX_CHARS_FOR_AI) : clean;
}

/**
 * Extracts text from a resume file buffer.
 * @param {Buffer} buffer - raw file bytes (from multer memoryStorage)
 * @param {string} mimeType - the uploaded file's mimetype
 * @param {string} originalName - original filename (used to sniff extension if mimetype is generic)
 * @returns {Promise<string>} extracted, truncated plain text
 */
async function extractResumeText(buffer, mimeType, originalName = '') {
  const ext = (originalName.split('.').pop() || '').toLowerCase();

  const isPdf = mimeType === 'application/pdf' || ext === 'pdf';
  const isDocx =
    mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    ext === 'docx';
  const isDoc = mimeType === 'application/msword' || ext === 'doc';

  if (isPdf) {
    const result = await pdfParse(buffer);
    return truncate(result.text);
  }

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer });
    return truncate(result.value);
  }

  if (isDoc) {
    // Legacy .doc (binary OLE format) isn't supported by mammoth/pdf-parse.
    // Rather than silently returning garbage, we surface a clear error so
    // the route can respond helpfully instead of sending junk to the AI.
    throw new Error('UNSUPPORTED_LEGACY_DOC');
  }

  throw new Error('UNSUPPORTED_FILE_TYPE');
}

module.exports = { extractResumeText, truncate, MAX_CHARS_FOR_AI };
