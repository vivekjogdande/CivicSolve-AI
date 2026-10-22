const { approx } = require('../utils/geo');
const { STATUS } = require('../utils/constants');

const deptName = (c) => (c.department && c.department.name ? c.department.name : null);
const lngLat = (c) => ({ lat: c.location.coordinates[1], lng: c.location.coordinates[0] });
const truncate = (s, n) => (s && s.length > n ? `${s.slice(0, n - 1)}…` : s);

/** Safe to show to anyone (map, landing page, track-by-ID without credentials). */
function publicSummary(c) {
  const { lat, lng } = lngLat(c);
  return {
    complaintId: c.complaintId,
    title: c.title,
    category: c.category,
    severity: c.severity,
    status: c.status,
    landmark: c.landmark || null,
    location: { lat: approx(lat), lng: approx(lng) }, // ~110 m precision
    createdAt: c.createdAt,
    observationCount: c.observationCount || 0,
    description: truncate(c.description, 200),
  };
}

function publicTimeline(logs = []) {
  return logs
    .filter((l) => l.isPublic)
    .map((l) => ({ at: l.createdAt, action: l.action, message: l.message, fromStatus: l.fromStatus, toStatus: l.toStatus }));
}

function publicNotes(c) {
  return (c.notes || []).filter((n) => n.isPublic).map((n) => ({ type: n.type, text: n.text, at: n.createdAt }));
}

/** Track-by-ID view for people without credentials. No photos, exact coordinates or evidence. */
function publicDetail(c, logs) {
  const { lat, lng } = lngLat(c);
  return {
    ...publicSummary(c),
    description: c.description,
    location: { lat: approx(lat), lng: approx(lng) },
    department: deptName(c),
    updatedAt: c.updatedAt,
    reopenCount: c.reopenCount,
    resolutionAttemptCount: (c.resolutionAttempts || []).length,
    confirmationDeadline: c.status === STATUS.AWAITING_CITIZEN_CONFIRMATION ? c.confirmationDeadline : null,
    publicNotes: publicNotes(c),
    timeline: publicTimeline(logs),
    intakeAiAnalysis: c.intakeAiAnalysis || null,
    access: 'PUBLIC',
  };
}

const aiAdvisory = (ai) =>
  ai && (ai.outcome || ai.comparisonStatus)
    ? {
        comparisonStatus: ai.comparisonStatus || 'INCONCLUSIVE',
        outcome: ai.outcome,
        confidence: ai.confidence,
        beforeObservations: ai.beforeObservations || [],
        afterObservations: ai.afterObservations || [],
        observableChanges: ai.observableChanges || [],
        remainingProblems: ai.remainingProblems || [],
        complaintRelevance: ai.complaintRelevance || 'UNCERTAIN',
        reasoningSummary: ai.reasoningSummary || ai.apparentChange || '',
        limitations: ai.limitations || [],
        apparentChange: ai.apparentChange,
        remainingWaste: ai.remainingWaste,
        recommendedAction: ai.recommendedAction,
        isIdenticalImage: !!ai.isIdenticalImage,
        matchType: ai.matchType || 'UNKNOWN',
        similarityScore: ai.similarityScore != null ? ai.similarityScore : null,
        model: ai.model,
        advisory: true,
      }
    : null;

/** For the reporter (account owner or anonymous-token holder). Adds photos, exact location and evidence. */
function citizenDetail(c, logs, access) {
  const { lat, lng } = lngLat(c);
  const attempts = (c.resolutionAttempts || []).map((a) => ({
    id: a._id,
    attemptNumber: a.attemptNumber,
    submittedAt: a.submittedAt,
    description: a.description,
    evidence: a.evidence ? { url: a.evidence.url, kind: a.evidence.kind } : null,
    validationStatus: a.validation ? a.validation.status : null,
    ai: aiAdvisory(a.ai),
    confirmationDeadline: a.confirmationDeadline,
    decision: a.citizenDecision && a.citizenDecision.decision
      ? {
          decision: a.citizenDecision.decision,
          decidedAt: a.citizenDecision.decidedAt,
          reason: a.citizenDecision.reason,
          media: (a.citizenDecision.media || []).map((m) => ({ url: m.url, kind: m.kind })),
        }
      : null,
    closedUnconfirmedAt: a.closedUnconfirmedAt || null,
  }));
  return {
    ...publicDetail(c, logs),
    location: { lat, lng },
    isAnonymous: c.isAnonymous,
    media: (c.media || []).map((m) => ({ url: m.url, kind: m.kind })),
    resolutionAttempts: attempts,
    intakeAiAnalysis: c.intakeAiAnalysis || null,
    canRespond: c.status === STATUS.AWAITING_CITIZEN_CONFIRMATION && !!c.confirmationDeadline && c.confirmationDeadline > new Date(),
    confirmationDeadline: c.confirmationDeadline || null,
    access,
  };
}

/** Full internal view for officers. */
function authorityDetail(c, logs, observations = []) {
  const { lat, lng } = lngLat(c);
  return {
    complaintId: c.complaintId,
    title: c.title,
    description: c.description,
    category: c.category,
    severity: c.severity,
    status: c.status,
    landmark: c.landmark || null,
    location: { lat, lng },
    isAnonymous: c.isAnonymous,
    reporter: c.isAnonymous || !c.reporter ? null : { name: c.reporter.name, email: c.reporter.email, phone: c.reporter.phone || '' },
    department: c.department ? { id: c.department._id, name: c.department.name, code: c.department.code } : null,
    assignedOfficer: c.assignedOfficer ? { id: c.assignedOfficer._id, name: c.assignedOfficer.name } : null,
    media: c.media,
    notes: (c.notes || []).map((n) => ({ id: n._id, type: n.type, text: n.text, isPublic: n.isPublic, authorName: n.authorName, at: n.createdAt })),
    resolutionAttempts: (c.resolutionAttempts || []).map((a) => ({
      id: a._id,
      attemptNumber: a.attemptNumber,
      submittedAt: a.submittedAt,
      description: a.description,
      actionsTaken: a.actionsTaken,
      evidence: a.evidence,
      validation: a.validation,
      ai: a.ai,
      confirmationDeadline: a.confirmationDeadline,
      citizenDecision: a.citizenDecision,
      closedUnconfirmedAt: a.closedUnconfirmedAt,
    })),
    confirmationDeadline: c.confirmationDeadline || null,
    reopenCount: c.reopenCount,
    needsSeniorReview: c.needsSeniorReview,
    escalationReason: c.escalationReason || null,
    observationCount: c.observationCount,
    observationsSinceResolution: c.observationsSinceResolution,
    recentObservations: observations.map((o) => ({ type: o.type, note: o.note, at: o.createdAt })),
    intakeAiAnalysis: c.intakeAiAnalysis || null,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    history: logs.map((l) => ({ at: l.createdAt, actorType: l.actorType, actorName: l.actorName, action: l.action, message: l.message, fromStatus: l.fromStatus, toStatus: l.toStatus, isPublic: l.isPublic })),
  };
}

/** Row in the authority table. */
function authorityRow(c) {
  return {
    complaintId: c.complaintId,
    title: c.title,
    category: c.category,
    severity: c.severity,
    status: c.status,
    landmark: c.landmark || null,
    department: deptName(c),
    assignedOfficer: c.assignedOfficer ? c.assignedOfficer.name : null,
    reopenCount: c.reopenCount,
    needsSeniorReview: c.needsSeniorReview,
    createdAt: c.createdAt,
    updatedAt: c.updatedAt,
    confirmationDeadline: c.confirmationDeadline || null,
  };
}

/** Row in the citizen's own list. */
function citizenRow(c) {
  return {
    complaintId: c.complaintId,
    title: c.title,
    category: c.category,
    status: c.status,
    landmark: c.landmark || null,
    createdAt: c.createdAt,
    confirmationDeadline: c.status === STATUS.AWAITING_CITIZEN_CONFIRMATION ? c.confirmationDeadline : null,
  };
}

module.exports = { publicSummary, publicDetail, citizenDetail, authorityDetail, authorityRow, citizenRow };
