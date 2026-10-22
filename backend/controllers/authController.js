const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { ROLES, AUTHORITY_ROLES } = require('../utils/constants');
const { signToken } = require('../middleware/auth');
const { asyncHandler, unauthorized, badRequest, conflict } = require('../utils/errors');
const { logEvent } = require('../services/auditService');

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('civicsolve-dummy-password', 12);

const register = asyncHandler(async (req, res) => {
  const { name, email, phone, password } = req.body;
  if (await User.exists({ email })) throw conflict('An account with this email already exists');
  const user = await User.create({ name, email, phone, passwordHash: await bcrypt.hash(password, 12), role: ROLES.CITIZEN });
  res.status(201).json({ success: true, data: { token: signToken(user), user: user.toSafeJSON() } });
});

const loginFor = (allowedRoles, portal) =>
  asyncHandler(async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash').populate('department');
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);
    if (!user || !ok || !user.isActive) throw unauthorized('Incorrect email or password');
    if (!allowedRoles.includes(user.role)) {
      // Same message: never reveal that the email exists on the other portal.
      throw unauthorized(`Incorrect email or password for the ${portal} portal`);
    }
    user.lastLoginAt = new Date();
    await user.save();
    if (AUTHORITY_ROLES.includes(user.role)) await logEvent({ actor: user, actorType: user.role === ROLES.ADMIN ? 'ADMIN' : 'AUTHORITY', action: 'AUTHORITY_LOGIN', message: 'Authority login' });
    res.json({ success: true, data: { token: signToken(user), user: user.toSafeJSON() } });
  });

const citizenLogin = loginFor([ROLES.CITIZEN], 'citizen');
const authorityLogin = loginFor(AUTHORITY_ROLES, 'authority');

const me = (req, res) => res.json({ success: true, data: { user: req.user.toSafeJSON() } });

const updateMe = asyncHandler(async (req, res) => {
  if (req.body.name !== undefined) req.user.name = req.body.name;
  if (req.body.phone !== undefined) req.user.phone = req.body.phone;
  await req.user.save();
  res.json({ success: true, data: { user: req.user.toSafeJSON() } });
});

const changePassword = asyncHandler(async (req, res) => {
  const user = await User.findById(req.user._id).select('+passwordHash');
  if (!(await bcrypt.compare(req.body.currentPassword, user.passwordHash))) throw badRequest('Current password is incorrect');
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  res.json({ success: true, data: { message: 'Password updated' } });
});

module.exports = { register, citizenLogin, authorityLogin, me, updateMe, changePassword };
