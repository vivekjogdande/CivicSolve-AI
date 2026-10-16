const AuditLog = require('../models/AuditLog');

async function logEvent({ complaint, actor, actorType, action, fromStatus, toStatus, message, isPublic = false, meta }) {
  try {
    return await AuditLog.create({
      complaint: complaint ? complaint._id : undefined,
      complaintId: complaint ? complaint.complaintId : undefined,
      actor: actor ? actor._id : undefined,
      actorName: actor ? actor.name : undefined,
      actorType,
      action,
      fromStatus,
      toStatus,
      message,
      isPublic,
      meta,
    });
  } catch (e) {
    console.error('[audit] failed to write log', e.message);
    return null;
  }
}

module.exports = { logEvent };
