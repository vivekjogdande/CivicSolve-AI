const Complaint = require('../models/Complaint');
const AuditLog = require('../models/AuditLog');
const { STATUS } = require('../utils/constants');
const { asyncHandler, badRequest, notFound, forbidden } = require('../utils/errors');
const { verifyToken } = require('../utils/tokens');
const svc = require('../services/complaintService');
const views = require('../services/views');

const timeline = (c) => AuditLog.find({ complaint: c._id }).sort({ createdAt: 1 }).lean();

/* ---------- middleware that loads + authorises the complaint before any file is written ---------- */

const GENERIC_DENY = 'Invalid complaint ID or confirmation token';

/** Anonymous access: complaint ID in the URL, secret token in the body. Never in the URL or logs. */
const loadAnonymous = asyncHandler(async (req, _res, next) => {
  const token = (req.body && req.body.token) || req.headers['x-confirmation-token'];
  const c = await Complaint.findOne({ complaintId: req.params.complaintId }).select('+anonymousTokenHash').populate('department');
  if (!c || !c.isAnonymous || !verifyToken(token, c.anonymousTokenHash)) throw forbidden(GENERIC_DENY);
  req.complaint = c;
  next();
});

const loadOwned = asyncHandler(async (req, _res, next) => {
  const c = await Complaint.findOne({ complaintId: req.params.complaintId }).populate('department');
  if (!c || !c.reporter || String(c.reporter) !== String(req.user._id)) throw notFound('Complaint not found');
  req.complaint = c;
  next();
});

/* ------------------------------------------------------------------ handlers */

const create = asyncHandler(async (req, res) => {
  if (!req.savedFiles || !req.savedFiles.length) throw badRequest('Attach at least one photograph or video of the pollution.');
  const { complaint, token } = await svc.createComplaint({ data: req.body, files: req.savedFiles, user: req.user });
  res.status(201).json({
    success: true,
    data: {
      complaintId: complaint.complaintId,
      status: complaint.status,
      isAnonymous: complaint.isAnonymous,
      // Shown exactly once; only its hash is stored.
      confirmationToken: token || undefined,
    },
  });
});

const listMine = asyncHandler(async (req, res) => {
  const { page, limit, status } = req.query;
  const filter = { reporter: req.user._id, ...(status ? { status } : {}) };
  const [items, total] = await Promise.all([
    Complaint.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
    Complaint.countDocuments(filter),
  ]);
  res.json({ success: true, data: { items: items.map(views.citizenRow), page, limit, total, pages: Math.ceil(total / limit) } });
});

const mySummary = asyncHandler(async (req, res) => {
  const rows = await Complaint.aggregate([{ $match: { reporter: req.user._id } }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const by = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const g = (...s) => s.reduce((n, k) => n + (by[k] || 0), 0);
  res.json({
    success: true,
    data: {
      total: rows.reduce((n, r) => n + r.count, 0),
      inProgress: g(STATUS.SUBMITTED, STATUS.UNDER_REVIEW, STATUS.ASSIGNED, STATUS.IN_PROGRESS, STATUS.ESCALATED),
      awaitingConfirmation: g(STATUS.AWAITING_CITIZEN_CONFIRMATION),
      confirmed: g(STATUS.RESOLVED_CITIZEN_CONFIRMED),
      reopened: g(STATUS.REOPENED),
      closedUnconfirmed: g(STATUS.CLOSED_UNCONFIRMED),
    },
  });
});

/** Track by ID alone: public, privacy-safe view only. */
const trackPublic = asyncHandler(async (req, res) => {
  const c = await Complaint.findOne({ complaintId: req.params.complaintId.toUpperCase() }).populate('department');
  if (!c) throw notFound('No complaint found with that ID');
  res.json({ success: true, data: { complaint: views.publicDetail(c, await timeline(c)) } });
});

const detailOwned = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { complaint: views.citizenDetail(req.complaint, await timeline(req.complaint), 'OWNER') } });
});

const detailAnonymous = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { complaint: views.citizenDetail(req.complaint, await timeline(req.complaint), 'TOKEN') } });
});

const decide = (decision, via) =>
  asyncHandler(async (req, res) => {
    const c = await svc.citizenDecide({
      complaint: req.complaint,
      decision,
      via,
      user: req.user,
      reason: req.body.reason,
      files: req.savedFiles || [],
    });
    await c.populate('department');
    res.json({ success: true, data: { complaint: views.citizenDetail(c, await timeline(c), via === 'TOKEN' ? 'TOKEN' : 'OWNER') } });
  });

module.exports = {
  loadAnonymous, loadOwned, create, listMine, mySummary, trackPublic, detailOwned, detailAnonymous,
  confirmOwned: decide('CONFIRMED', 'ACCOUNT'),
  rejectOwned: decide('REJECTED', 'ACCOUNT'),
  confirmAnonymous: decide('CONFIRMED', 'TOKEN'),
  rejectAnonymous: decide('REJECTED', 'TOKEN'),
};
