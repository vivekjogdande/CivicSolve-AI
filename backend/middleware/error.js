const multer = require('multer');
const { ApiError } = require('../utils/errors');

const notFoundHandler = (req, res) => {
  res.status(404).json({ success: false, error: { message: `Route not found: ${req.method} ${req.originalUrl}` } });
};

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, _next) {
  let status = 500;
  let message = 'Something went wrong on the server';
  let details;

  if (err instanceof ApiError) {
    status = err.status;
    message = err.message;
    details = err.details;
  } else if (err instanceof multer.MulterError) {
    status = 400;
    message = err.code === 'LIMIT_FILE_SIZE' ? 'File is too large' : `Upload error: ${err.message}`;
  } else if (err && err.name === 'ValidationError') {
    status = 400;
    message = Object.values(err.errors).map((e) => e.message).join('; ');
  } else if (err && err.code === 11000) {
    status = 409;
    message = 'A record with that value already exists';
  } else if (err && err.name === 'CastError') {
    status = 400;
    message = 'Invalid identifier';
  } else if (err && err.type === 'entity.parse.failed') {
    status = 400;
    message = 'Malformed JSON body';
  }

  if (status >= 500) console.error('[error]', req.method, req.originalUrl, err);
  res.status(status).json({ success: false, error: { message, ...(details ? { details } : {}) } });
}

module.exports = { notFoundHandler, errorHandler };
