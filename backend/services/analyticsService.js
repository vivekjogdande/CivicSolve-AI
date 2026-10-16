const Complaint = require('../models/Complaint');
const { STATUS } = require('../utils/constants');
const { computeRates } = require('./metrics');

const UNDER_INVESTIGATION = [STATUS.UNDER_REVIEW, STATUS.ASSIGNED, STATUS.IN_PROGRESS, STATUS.ESCALATED, STATUS.REOPENED];

function periodMatch(from, to) {
  const m = {};
  if (from || to) {
    m.createdAt = {};
    if (from) m.createdAt.$gte = from;
    if (to) m.createdAt.$lte = to;
  }
  return m;
}

/** Landing-page statistics. Every number is a live count; an empty database yields zeros. */
async function landingStats() {
  const [totals, locations] = await Promise.all([
    Complaint.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          underInvestigation: { $sum: { $cond: [{ $in: ['$status', UNDER_INVESTIGATION] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', STATUS.RESOLVED_CITIZEN_CONFIRMED] }, 1, 0] } },
        },
      },
    ]),
    // "Locations monitored" = distinct ~1 km grid cells that contain at least one report
    Complaint.aggregate([
      {
        $group: {
          _id: {
            lat: { $round: [{ $arrayElemAt: ['$location.coordinates', 1] }, 2] },
            lng: { $round: [{ $arrayElemAt: ['$location.coordinates', 0] }, 2] },
          },
        },
      },
      { $count: 'n' },
    ]),
  ]);
  const t = totals[0] || {};
  return {
    totalReports: t.total || 0,
    underInvestigation: t.underInvestigation || 0,
    citizenConfirmedResolutions: t.confirmed || 0,
    locationsMonitored: (locations[0] && locations[0].n) || 0,
  };
}

/** Public transparency statistics, all aggregated from real records. */
async function transparency({ from, to } = {}) {
  const match = periodMatch(from, to);
  const hasAttempt = { 'resolutionAttempts.0': { $exists: true } };

  const [byCategory, byLocation, byStatus, rateCounts, byDepartment, resolvedTrend, reportTrend, total] = await Promise.all([
    Complaint.aggregate([{ $match: match }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Complaint.aggregate([
      { $match: { ...match, landmark: { $exists: true, $ne: '' } } },
      { $group: { _id: { $toLower: { $trim: { input: '$landmark' } } }, count: { $sum: 1 }, label: { $first: '$landmark' } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    Complaint.aggregate([{ $match: match }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Complaint.aggregate([
      { $match: { ...match, ...hasAttempt } },
      {
        $group: {
          _id: null,
          attempted: { $sum: 1 },
          eligible: { $sum: { $cond: [{ $ne: ['$status', STATUS.AWAITING_CITIZEN_CONFIRMATION] }, 1, 0] } },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', STATUS.RESOLVED_CITIZEN_CONFIRMED] }, 1, 0] } },
          closedUnconfirmed: { $sum: { $cond: [{ $eq: ['$status', STATUS.CLOSED_UNCONFIRMED] }, 1, 0] } },
          rejectedAtLeastOnce: {
            $sum: { $cond: [{ $gt: [{ $size: { $filter: { input: '$resolutionAttempts', cond: { $eq: ['$$this.citizenDecision.decision', 'REJECTED'] } } } }, 0] }, 1, 0] },
          },
        },
      },
    ]),
    Complaint.aggregate([
      { $match: { ...match, department: { $exists: true } } },
      {
        $group: {
          _id: '$department',
          total: { $sum: 1 },
          confirmed: { $sum: { $cond: [{ $eq: ['$status', STATUS.RESOLVED_CITIZEN_CONFIRMED] }, 1, 0] } },
          reopened: { $sum: { $cond: [{ $gt: ['$reopenCount', 0] }, 1, 0] } },
          closedUnconfirmed: { $sum: { $cond: [{ $eq: ['$status', STATUS.CLOSED_UNCONFIRMED] }, 1, 0] } },
          open: { $sum: { $cond: [{ $in: ['$status', [STATUS.RESOLVED_CITIZEN_CONFIRMED, STATUS.CLOSED_UNCONFIRMED]] }, 0, 1] } },
          avgResolutionMs: { $avg: { $cond: [{ $eq: ['$status', STATUS.RESOLVED_CITIZEN_CONFIRMED] }, { $subtract: ['$resolvedAt', '$createdAt'] }, null] } },
        },
      },
      { $lookup: { from: 'departments', localField: '_id', foreignField: '_id', as: 'dept' } },
      { $unwind: '$dept' },
      { $project: { _id: 0, department: '$dept.name', total: 1, confirmed: 1, reopened: 1, closedUnconfirmed: 1, open: 1, avgResolutionDays: { $cond: [{ $ne: ['$avgResolutionMs', null] }, { $round: [{ $divide: ['$avgResolutionMs', 86400000] }, 1] }, null] } } },
      { $sort: { total: -1 } },
    ]),
    Complaint.aggregate([
      { $match: match },
      { $unwind: '$resolutionAttempts' },
      { $match: { 'resolutionAttempts.citizenDecision.decision': 'CONFIRMED' } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$resolutionAttempts.citizenDecision.decidedAt' } }, confirmed: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Complaint.aggregate([
      { $match: match },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, reported: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
    Complaint.countDocuments(match),
  ]);

  const rc = rateCounts[0] || {};
  const months = new Map();
  reportTrend.forEach((r) => months.set(r._id, { month: r._id, reported: r.reported, confirmed: 0 }));
  resolvedTrend.forEach((r) => months.set(r._id, { ...(months.get(r._id) || { month: r._id, reported: 0 }), confirmed: r.confirmed }));

  return {
    period: { from: from || null, to: to || null, basis: 'Complaints are included by submission date (createdAt). Trend "confirmed" counts use the citizen decision date.' },
    totalComplaints: total,
    byCategory: byCategory.map((r) => ({ category: r._id, count: r.count })),
    byLocation: byLocation.map((r) => ({ location: r.label, count: r.count })),
    byStatus: byStatus.map((r) => ({ status: r._id, count: r.count })),
    rates: computeRates({
      attempted: rc.attempted || 0,
      eligible: rc.eligible || 0,
      confirmed: rc.confirmed || 0,
      rejectedAtLeastOnce: rc.rejectedAtLeastOnce || 0,
      closedUnconfirmed: rc.closedUnconfirmed || 0,
    }),
    byDepartment,
    trend: [...months.values()].sort((a, b) => a.month.localeCompare(b.month)),
  };
}

/** Counts for the authority summary cards, within a visibility scope. */
async function authoritySummary(scope) {
  const rows = await Complaint.aggregate([{ $match: scope }, { $group: { _id: '$status', count: { $sum: 1 } } }]);
  const by = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const g = (s) => by[s] || 0;
  return {
    totalAssigned: rows.reduce((n, r) => n + r.count, 0),
    pending: g(STATUS.SUBMITTED) + g(STATUS.UNDER_REVIEW),
    inProgress: g(STATUS.ASSIGNED) + g(STATUS.IN_PROGRESS),
    awaitingConfirmation: g(STATUS.AWAITING_CITIZEN_CONFIRMATION),
    confirmed: g(STATUS.RESOLVED_CITIZEN_CONFIRMED),
    reopened: g(STATUS.REOPENED),
    closedUnconfirmed: g(STATUS.CLOSED_UNCONFIRMED),
    escalated: g(STATUS.ESCALATED),
    byStatus: rows.map((r) => ({ status: r._id, count: r.count })),
  };
}

async function authorityCharts(scope) {
  const [byCategory, byMonth] = await Promise.all([
    Complaint.aggregate([{ $match: scope }, { $group: { _id: '$category', count: { $sum: 1 } } }, { $sort: { count: -1 } }]),
    Complaint.aggregate([
      { $match: scope },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]),
  ]);
  return { byCategory: byCategory.map((r) => ({ category: r._id, count: r.count })), byMonth: byMonth.map((r) => ({ month: r._id, count: r.count })) };
}

module.exports = { landingStats, transparency, authoritySummary, authorityCharts, UNDER_INVESTIGATION };
