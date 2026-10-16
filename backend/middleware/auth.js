const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/User');
const { ROLES, AUTHORITY_ROLES } = require('../utils/constants');
const { unauthorized, forbidden, asyncHandler } = require('../utils/errors');

const signToken = (user) =>
  jwt.sign({ sub: String(user._id), role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });

async function loadUser(req) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  let payload;
  try {
    payload = jwt.verify(header.slice(7), env.jwtSecret);
  } catch {
    throw unauthorized('Session expired or invalid. Please log in again.');
  }
  const user = await User.findById(payload.sub).populate('department');
  if (!user || !user.isActive) throw unauthorized('Account not found or disabled');
  return user;
}

/** Requires a valid JWT. Role is always re-read from the database, never trusted from the token. */
const requireAuth = asyncHandler(async (req, _res, next) => {
  const user = await loadUser(req);
  if (!user) throw unauthorized();
  req.user = user;
  next();
});

/** Attaches req.user when a valid token is present; anonymous callers pass through. */
const optionalAuth = asyncHandler(async (req, _res, next) => {
  const user = await loadUser(req);
  if (user) req.user = user;
  next();
});

const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(unauthorized());
  if (!roles.includes(req.user.role)) return next(forbidden());
  next();
};

const requireCitizen = [requireAuth, requireRole(ROLES.CITIZEN)];
const requireAuthority = [requireAuth, requireRole(...AUTHORITY_ROLES)];
const requireSenior = [requireAuth, requireRole(ROLES.SENIOR_OFFICER, ROLES.ADMIN)];
const requireAdmin = [requireAuth, requireRole(ROLES.ADMIN)];

module.exports = { signToken, requireAuth, optionalAuth, requireRole, requireCitizen, requireAuthority, requireSenior, requireAdmin };
