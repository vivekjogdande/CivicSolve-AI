const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { env } = require('../config/env');
const { badRequest } = require('../utils/errors');
const { detectFileType } = require('../utils/fileSignature');
const { randomFileName, sha256File } = require('../utils/tokens');

const UPLOAD_DIR = path.join(__dirname, '..', 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const VIDEO_MIMES = ['video/mp4', 'video/webm', 'video/quicktime'];

// Files are kept in memory first so we can verify their real type (magic bytes) before writing to disk.
const makeUploader = ({ allowVideo }) =>
  multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: env.maxUploadMb * 1024 * 1024, files: 5 },
    fileFilter: (_req, file, cb) => {
      const ok = IMAGE_MIMES.includes(file.mimetype) || (allowVideo && VIDEO_MIMES.includes(file.mimetype));
      cb(ok ? null : badRequest(`Unsupported file type: ${file.mimetype}. Allowed: ${allowVideo ? 'JPG, PNG, WebP, HEIC, MP4, WebM, MOV' : 'JPG, PNG, WebP, HEIC'}`), ok);
    },
  });

const complaintUpload = makeUploader({ allowVideo: true });
const imageUpload = makeUploader({ allowVideo: false });

/**
 * Verifies each uploaded buffer's magic bytes and writes it under a random, unguessable file name.
 * Populates req.savedFiles = [{ field, media:{...}, buffer }]
 */
function persistFiles({ requireImage = false } = {}) {
  return (req, _res, next) => {
    try {
      const files = req.files || (req.file ? [req.file] : []);
      req.savedFiles = files.map((f) => {
        const real = detectFileType(f.buffer);
        if (!real) throw badRequest(`"${f.originalname}" is not a valid image or video file`);
        if (requireImage && real.kind !== 'image') throw badRequest('This upload must be a photograph');
        const filename = randomFileName(real.ext);
        fs.writeFileSync(path.join(UPLOAD_DIR, filename), f.buffer);
        return {
          field: f.fieldname,
          buffer: f.buffer,
          media: { url: `/uploads/${filename}`, filename, mimetype: real.mime, kind: real.kind, size: f.size, sha256: sha256File(f.buffer) },
        };
      });
      next();
    } catch (e) {
      next(e);
    }
  };
}

module.exports = { UPLOAD_DIR, complaintUpload, imageUpload, persistFiles };
