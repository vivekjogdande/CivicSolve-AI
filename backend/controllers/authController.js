const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const User = require('../models/User');
const { ROLES, AUTHORITY_ROLES } = require('../utils/constants');
const { signToken } = require('../middleware/auth');
const { asyncHandler, unauthorized, badRequest, conflict, serviceUnavailable } = require('../utils/errors');
const { logEvent } = require('../services/auditService');
const { env } = require('../config/env');

// Compared against when the email is unknown, so response time does not reveal which emails exist.
const DUMMY_HASH = bcrypt.hashSync('civicsolve-dummy-password', 12);

const register = asyncHandler(async (req, res) => {
  if (mongoose.connection.readyState !== 1) {
    console.error(`[auth] citizen register aborted: database disconnected (readyState=${mongoose.connection.readyState})`);
    throw serviceUnavailable('Database service is currently unavailable. Please check backend connection.');
  }
  const { name, email, phone, password } = req.body;
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (await User.exists({ email: normalizedEmail })) {
    console.warn('[auth] citizen register failed: reason=EMAIL_ALREADY_EXISTS');
    throw conflict('An account with this email already exists');
  }
  const user = await User.create({
    name,
    email: normalizedEmail,
    phone,
    passwordHash: await bcrypt.hash(password, 12),
    role: ROLES.CITIZEN,
  });
  console.log(`[auth] citizen registered successfully: role=${user.role}`);
  res.status(201).json({ success: true, data: { token: signToken(user), user: user.toSafeJSON() } });
});

const loginFor = (allowedRoles, portal) =>
  asyncHandler(async (req, res) => {
    // Fail immediately if database is unavailable so connection errors are never masked as 401
    if (mongoose.connection.readyState !== 1) {
      console.error(`[auth] ${portal} login aborted: database disconnected (readyState=${mongoose.connection.readyState})`);
      throw serviceUnavailable('Database service is currently unavailable. Please check backend connection.');
    }

    const email = (req.body.email || '').trim().toLowerCase();
    const { password } = req.body;
    const user = await User.findOne({ email }).select('+passwordHash').populate('department');
    const ok = await bcrypt.compare(password, user ? user.passwordHash : DUMMY_HASH);

    if (!user) {
      // Diagnostic log without revealing sensitive details (email/password/hash/token are never logged)
      let authorityAccountsExist;
      let matchesAdminEnv;
      if (portal === 'authority') {
        try {
          authorityAccountsExist = (await User.exists({ role: { $in: allowedRoles } })) !== null;
        } catch {
          authorityAccountsExist = 'unknown';
        }
        matchesAdminEnv = Boolean(env.adminEmail) && email === env.adminEmail.toLowerCase();
      }
      console.warn(
        `[auth] ${portal} login failed: reason=ACCOUNT_NOT_FOUND portal=${portal}` +
          (portal === 'authority' ? ` authorityAccountsExist=${authorityAccountsExist} matchesAdminEnv=${matchesAdminEnv}` : '')
      );
      throw unauthorized('Incorrect email or password');
    }

    if (!ok) {
      console.warn(`[auth] ${portal} login failed: reason=INVALID_PASSWORD portal=${portal} role=${user.role}`);
      throw unauthorized('Incorrect email or password');
    }

    if (!user.isActive) {
      console.warn(`[auth] ${portal} login failed: reason=ACCOUNT_INACTIVE portal=${portal} role=${user.role}`);
      throw unauthorized('Account is inactive. Please contact an administrator.');
    }

    if (!allowedRoles.includes(user.role)) {
      console.warn(`[auth] ${portal} login failed: reason=ROLE_MISMATCH portal=${portal} accountRole=${user.role} expectedRoles=${allowedRoles.join(',')}`);
      // Consistent error message to avoid portal/email enumeration
      throw unauthorized(`Incorrect email or password for the ${portal} portal`);
    }

    console.log(`[auth] ${portal} login successful: role=${user.role}`);

    // Update lastLoginAt safely without risking validation failures on populated references
    await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });

    if (AUTHORITY_ROLES.includes(user.role)) {
      await logEvent({
        actor: user,
        actorType: user.role === ROLES.ADMIN ? 'ADMIN' : 'AUTHORITY',
        action: 'AUTHORITY_LOGIN',
        message: 'Authority login',
      });
    }

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
