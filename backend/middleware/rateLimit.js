const rateLimit = require('express-rate-limit');

const make = (windowMs, max, message) =>
  rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => res.status(429).json({ success: false, error: { message } }),
  });

const quiet = process.env.NODE_ENV === 'test';
const lim = (w, m, msg) => (quiet ? (_q, _s, n) => n() : make(w, m, msg));

module.exports = {
  apiLimiter: lim(15 * 60 * 1000, 600, 'Too many requests. Please slow down.'),
  authLimiter: lim(15 * 60 * 1000, 25, 'Too many login attempts. Try again in 15 minutes.'),
  createComplaintLimiter: lim(60 * 60 * 1000, 15, 'Report limit reached. Please try again later.'),
  tokenLimiter: lim(15 * 60 * 1000, 30, 'Too many attempts. Try again in 15 minutes.'),
  observationLimiter: lim(60 * 60 * 1000, 20, 'Observation limit reached. Please try again later.'),
};
