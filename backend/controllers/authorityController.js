const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const CommunityObservation = require('../models/CommunityObservation');
const User = require('../models/User');
const Department = require('../models/Department');
const { ROLES, STATUS } = require('../utils/constants');
const { asyncHandler, notFound, forbidden } = require('../utils/errors');
const svc = require('../services/complaintService');
const views = require('../services/views');
const analytics = require('../services/analyticsService');
const { logEvent } = require('../services/auditService');

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const isSenior = (u) => u.role === ROLES.SENIOR_OFFICER || u.role === ROLES.ADMIN;

/** Officers see complaints routed to their department or assigned to them; senior officers and admins see all. */
function scopeFor(user) {
  if (isSenior(user)) return {};
  const or = [{ assignedOfficer: user._id }];
  if (user.department) or.push({ department: user.department._id || user.department });
  return { $or: or };
}

const loadComplaint = asyncHandler(async (req, _res, next) => {
  const c = await Complaint.findOne({ complaintId: req.params.complaintId }).populate('department').populate('assignedOfficer', 'name email').populate('reporter', 'name email phone');
  if (!c) throw notFound('Complaint not found');
  if (!isSenior(req.user)) {
    const deptId = req.user.department && (req.user.department._id || req.user.department);
    const sameDept = deptId && c.department && String(c.department._id) === String(deptId);
    const mine = c.assignedOfficer && String(c.assignedOfficer._id) === String(req.user._id);
    if (!sameDept && !mine) throw forbidden('This complaint is not assigned to your department');
  }
  req.complaint = c;
  next();
});

const fullDetail = async (c) => {
  const [logs, obs] = await Promise.all([
    AuditLog.find({ complaint: c._id }).sort({ createdAt: -1 }).limit(200).lean(),
    CommunityObservation.find({ complaint: c._id }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  await c.populate([{ path: 'department' }, { path: 'assignedOfficer', select: 'name email' }, { path: 'reporter', select: 'name email phone' }]);
  return views.authorityDetail(c, logs, obs);
};

const summary = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await analytics.authoritySummary(scopeFor(req.user)) });
});

const charts = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await analytics.authorityCharts(scopeFor(req.user)) });
});

function buildListFilter(req, extra = {}) {
  const q = req.query;
  const filter = { ...scopeFor(req.user), ...extra };
  const and = [];
  if (q.status) filter.status = q.status;
  if (q.category) filter.category = q.category;
  if (q.severity) filter.severity = q.severity;
  if (q.department && isSenior(req.user)) filter.department = q.department;
  if (q.mine) filter.assignedOfficer = req.user._id;
  if (q.search) {
    const rx = new RegExp(escapeRegex(q.search), 'i');
    and.push({ $or: [{ complaintId: rx }, { title: rx }, { landmark: rx }, { description: rx }] });
  }
  if (and.length) filter.$and = and;
  return filter;
}

async function paged(req, res, filter) {
  const { page, limit, sort, order } = req.query;
  const [items, total] = await Promise.all([
    Complaint.find(filter).sort({ [sort]: order === 'asc' ? 1 : -1 }).skip((page - 1) * limit).limit(limit).populate('department', 'name').populate('assignedOfficer', 'name'),
    Complaint.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items: items.map(views.authorityRow), page, limit, total, pages: Math.ceil(total / limit) } });
}

const list = asyncHandler(async (req, res) => paged(req, res, buildListFilter(req)));

/** Escalated, flagged for senior review, or repeatedly reopened (and still open). */
const seniorQueue = asyncHandler(async (req, res) => {
  const open = { status: { $nin: [STATUS.RESOLVED_CITIZEN_CONFIRMED, STATUS.CLOSED_UNCONFIRMED] } };
  const base = buildListFilter(req, open);
  const attention = { $or: [{ status: STATUS.ESCALATED }, { needsSeniorReview: true }, { reopenCount: { $gte: 2 } }] };
  base.$and = [...(base.$and || []), attention];
  await paged(req, res, base);
});

const detail = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { complaint: await fullDetail(req.complaint) } });
});

const assign = asyncHandler(async (req, res) => {
  await svc.assignComplaint(req.complaint, req.body, req.user);
  res.json({ success: true, data: { complaint: await fullDetail(req.complaint) } });
});

const setStatus = asyncHandler(async (req, res) => {
  await svc.changeStatus(req.complaint, req.body.status, req.user, req.body.note);
  res.json({ success: true, data: { complaint: await fullDetail(req.complaint) } });
});

const addNote = asyncHandler(async (req, res) => {
  await svc.addNote(req.complaint, req.body, req.user);
  res.json({ success: true, data: { complaint: await fullDetail(req.complaint) } });
});

const escalate = asyncHandler(async (req, res) => {
  await svc.changeStatus(req.complaint, STATUS.ESCALATED, req.user, req.body.reason);
  res.json({ success: true, data: { complaint: await fullDetail(req.complaint) } });
});

const submitResolution = asyncHandler(async (req, res) => {
  const file = (req.savedFiles || [])[0];
  try {
    await svc.submitResolution({ complaint: req.complaint, user: req.user, file, description: req.body.description, actionsTaken: req.body.actionsTaken });
  } catch (e) {
    if (e.validation) return res.status(400).json({ success: false, error: { message: e.message, details: e.details, validation: e.validation } });
    throw e;
  }
  res.status(201).json({ success: true, data: { complaint: await fullDetail(req.complaint) } });
});

const aiCompare = asyncHandler(async (req, res) => {
  const ai = await svc.runAiComparison(req.complaint._id, req.body.attemptId, req.user);
  const fresh = await Complaint.findById(req.complaint._id).populate('department').populate('assignedOfficer', 'name email').populate('reporter', 'name email phone');
  res.json({ success: true, data: { ai, complaint: await fullDetail(fresh) } });
});

/** Senior officer closes the review flag after looking at an escalated/reopened case. */
const completeReview = asyncHandler(async (req, res) => {
  req.complaint.needsSeniorReview = false;
  req.complaint.notes.push({ author: req.user._id, authorName: req.user.name, type: 'NOTE', text: `Senior review: ${req.body.note}`, isPublic: false });
  await req.complaint.save();
  await logEvent({ complaint: req.complaint, actor: req.user, actorType: 'AUTHORITY', action: 'SENIOR_REVIEW_COMPLETED', message: 'Senior review completed', isPublic: false });
  res.json({ success: true, data: { complaint: await fullDetail(req.complaint) } });
});

const officers = asyncHandler(async (req, res) => {
  const filter = { isActive: true, role: { $in: [ROLES.OFFICER, ROLES.SENIOR_OFFICER] } };
  if (!isSenior(req.user) && req.user.department) filter.department = req.user.department._id || req.user.department;
  const rows = await User.find(filter).select('name email role department').populate('department', 'name').sort({ name: 1 });
  res.json({ success: true, data: { officers: rows.map((o) => ({ id: o._id, name: o.name, role: o.role, department: o.department ? o.department.name : null })) } });
});

const departments = asyncHandler(async (_req, res) => {
  const rows = await Department.find({ isActive: true }).sort({ name: 1 });
  res.json({ success: true, data: { departments: rows.map((d) => ({ id: d._id, name: d.name, code: d.code })) } });
});

const { matchResponders } = require('../services/civicAiService');

const getRecommendedResponders = asyncHandler(async (req, res) => {
  const c = req.complaint;
  const [lng, lat] = c.location.coordinates;
  const recommendations = await matchResponders({
    complaintId: c.complaintId,
    lat,
    lng,
    category: c.category,
    severity: c.severity,
  });
  res.json({ success: true, data: { recommendations } });
});

module.exports = {
  loadComplaint,
  summary,
  charts,
  list,
  seniorQueue,
  detail,
  assign,
  setStatus,
  addNote,
  escalate,
  submitResolution,
  aiCompare,
  completeReview,
  officers,
  departments,
  getRecommendedResponders,
};
