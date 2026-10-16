const Complaint = require('../models/Complaint');
const CommunityObservation = require('../models/CommunityObservation');
const { STATUS } = require('../utils/constants');
const { asyncHandler, notFound, conflict } = require('../utils/errors');
const { hashIp } = require('../utils/tokens');
const views = require('../services/views');
const analytics = require('../services/analyticsService');
const { logEvent } = require('../services/auditService');
const { notifyDepartment } = require('../services/notificationService');

const SAFE_FIELDS = 'complaintId title description category severity status landmark location createdAt observationCount';

const stats = asyncHandler(async (_req, res) => {
  res.json({ success: true, data: await analytics.landingStats() });
});

const map = asyncHandler(async (req, res) => {
  const filter = {};
  ['category', 'status', 'severity'].forEach((k) => { if (req.query[k]) filter[k] = req.query[k]; });
  const items = await Complaint.find(filter).select(SAFE_FIELDS).sort({ createdAt: -1 }).limit(1000).lean();
  res.json({ success: true, data: { items: items.map(views.publicSummary), total: items.length } });
});

const recent = asyncHandler(async (_req, res) => {
  const items = await Complaint.find().select(SAFE_FIELDS).sort({ createdAt: -1 }).limit(6).lean();
  res.json({ success: true, data: { items: items.map(views.publicSummary) } });
});

const transparency = asyncHandler(async (req, res) => {
  res.json({ success: true, data: await analytics.transparency({ from: req.query.from, to: req.query.to }) });
});

/**
 * "Still polluted" / "looks clean" community observation.
 * It is supporting evidence for officers only: it never changes a complaint's status.
 */
const createObservation = asyncHandler(async (req, res) => {
  const { complaintId, type, note } = req.body;
  const c = await Complaint.findOne({ complaintId: complaintId.toUpperCase() }).populate('department');
  if (!c) throw notFound('Complaint not found');
  const ipHash = hashIp(req.ip);
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  if (await CommunityObservation.exists({ complaint: c._id, ipHash, createdAt: { $gte: dayAgo } })) {
    throw conflict('You already submitted an observation for this complaint in the last 24 hours. Thank you!');
  }
  await CommunityObservation.create({ complaint: c._id, complaintId: c.complaintId, type, note, user: req.user ? req.user._id : undefined, ipHash });
  c.observationCount += 1;
  const watched = [STATUS.AWAITING_CITIZEN_CONFIRMATION, STATUS.RESOLVED_CITIZEN_CONFIRMED, STATUS.CLOSED_UNCONFIRMED].includes(c.status);
  if (type === 'STILL_POLLUTED' && watched) c.observationsSinceResolution += 1;
  await c.save();
  await logEvent({ complaint: c, actor: req.user, actorType: 'COMMUNITY', action: 'OBSERVATION', message: type === 'STILL_POLLUTED' ? 'Community member reported the site is still polluted' : 'Community member reported the site looks clean', isPublic: true });
  if (type === 'STILL_POLLUTED' && watched) {
    await notifyDepartment(c, { type: 'OBSERVATION', title: 'Community observation', message: `${c.complaintId}: a community member says it is still polluted.` });
  }
  res.status(201).json({ success: true, data: { message: 'Observation recorded. It will be shared with the responsible officers.', observationCount: c.observationCount } });
});

module.exports = { stats, map, recent, transparency, createObservation };
