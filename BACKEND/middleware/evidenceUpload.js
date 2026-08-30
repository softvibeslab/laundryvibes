const multer = require('multer');

const MAX_EVIDENCE_BYTES = 2 * 1024 * 1024;
const uploadEvidence = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_EVIDENCE_BYTES, files: 1, fields: 10 },
}).single('evidence');

function detectEvidenceType(buffer) {
  if (!Buffer.isBuffer(buffer)) return null;
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { contentType: 'image/jpeg', extension: 'jpg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { contentType: 'image/png', extension: 'png' };
  if (buffer.length >= 12 && buffer.subarray(0, 4).toString('ascii') === 'RIFF' && buffer.subarray(8, 12).toString('ascii') === 'WEBP') return { contentType: 'image/webp', extension: 'webp' };
  if (buffer.length >= 5 && buffer.subarray(0, 5).toString('ascii') === '%PDF-') return { contentType: 'application/pdf', extension: 'pdf' };
  return null;
}

function validateEvidence(file) {
  if (!file) return null;
  const detected = detectEvidenceType(file.buffer);
  if (!detected) {
    const error = new Error('La evidencia debe ser un archivo JPEG, PNG, WebP o PDF válido');
    error.status = 400;
    throw error;
  }
  return { data: file.buffer, contentType: detected.contentType, extension: detected.extension };
}

module.exports = { MAX_EVIDENCE_BYTES, detectEvidenceType, uploadEvidence, validateEvidence };
