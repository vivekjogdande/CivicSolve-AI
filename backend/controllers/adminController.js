const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Department = require('../models/Department');
const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const { ROLES, AUTHORITY_ROLES } = require('../utils/constants');
const { asyncHandler, conflict, notFound, badRequest } = require('../utils/errors');
const { logEvent } = require('../services/auditService');

const overview = asyncHandler(async (_req, res) => {
  const [citizens, authorities, complaints, departments, recent] = await Promise.all([
    User.countDocuments({ role: ROLES.CITIZEN }),
    User.countDocuments({ role: { $in: AUTHORITY_ROLES } }),
    Complaint.countDocuments(),
    Department.countDocuments({ isActive: true }),
    AuditLog.find().sort({ createdAt: -1 }).limit(25).lean(),
  ]);
  res.json({
    success: true,
    data: {
      counts: { citizens, authorities, complaints, departments },
      recentActivity: recent.map((l) => ({ at: l.createdAt, actorType: l.actorType, actorName: l.actorName, action: l.action, complaintId: l.complaintId, message: l.message })),
    },
  });
});

const listUsers = asyncHandler(async (req, res) => {
  const filter = req.query.type === 'citizens' ? { role: ROLES.CITIZEN } : { role: { $in: AUTHORITY_ROLES } };
  const users = await User.find(filter).populate('department', 'name').sort({ createdAt: -1 }).limit(200);
  res.json({ success: true, data: { users: users.map((u) => ({ ...u.toSafeJSON(), isActive: u.isActive, lastLoginAt: u.lastLoginAt })) } });
});

/** The only way to create authority accounts: an administrator does it. */
const createAuthority = asyncHandler(async (req, res) => {
  const { name, email, phone, password, role, department } = req.body;
  if (await User.exists({ email })) throw conflict('An account with this email already exists');
  if (department && !(await Department.exists({ _id: department }))) throw badRequest('Department not found');
  const user = await User.create({ name, email, phone, role, department, passwordHash: await bcrypt.hash(password, 12), createdBy: req.user._id });
  await logEvent({ actor: req.user, actorType: 'ADMIN', action: 'AUTHORITY_ACCOUNT_CREATED', message: `Created ${role} account for ${email}` });
  res.status(201).json({ success: true, data: { user: user.toSafeJSON() } });
});

const updateAuthority = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: { $in: [ROLES.OFFICER, ROLES.SENIOR_OFFICER] } });
  if (!user) throw notFound('Authority account not found');
  if (String(user._id) === String(req.user._id)) throw badRequest('You cannot change your own account here');
  Object.assign(user, req.body);
  await user.save();
  await logEvent({ actor: req.user, actorType: 'ADMIN', action: 'AUTHORITY_ACCOUNT_UPDATED', message: `Updated ${user.email}: ${Object.keys(req.body).join(', ')}` });
  res.json({ success: true, data: { user: user.toSafeJSON() } });
});

const resetPassword = asyncHandler(async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: { $in: [ROLES.OFFICER, ROLES.SENIOR_OFFICER] } }).select('+passwordHash');
  if (!user) throw notFound('Authority account not found');
  user.passwordHash = await bcrypt.hash(req.body.newPassword, 12);
  await user.save();
  await logEvent({ actor: req.user, actorType: 'ADMIN', action: 'AUTHORITY_PASSWORD_RESET', message: `Password reset for ${user.email}` });
  res.json({ success: true, data: { message: 'Password reset' } });
});

const listDepartments = asyncHandler(async (_req, res) => {
  const rows = await Department.find().sort({ name: 1 });
  res.json({ success: true, data: { departments: rows.map((d) => ({ id: d._id, name: d.name, code: d.code, description: d.description || '', isActive: d.isActive })) } });
});

const createDepartment = asyncHandler(async (req, res) => {
  const d = await Department.create({ ...req.body, code: req.body.code.toUpperCase() });
  await logEvent({ actor: req.user, actorType: 'ADMIN', action: 'DEPARTMENT_CREATED', message: `Created department ${d.name}` });
  res.status(201).json({ success: true, data: { department: { id: d._id, name: d.name, code: d.code } } });
});

module.exports = { overview, listUsers, createAuthority, updateAuthority, resetPassword, listDepartments, createDepartment };
