const mongoose = require('mongoose');

/** Append-only history of everything that happens to a complaint (and admin actions). */
const auditLogSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', index: true },
    complaintId: { type: String, index: true },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorName: String,
    actorType: { type: String, enum: ['CITIZEN', 'ANONYMOUS', 'AUTHORITY', 'ADMIN', 'COMMUNITY', 'SYSTEM'], required: true },
    action: { type: String, required: true },
    fromStatus: String,
    toStatus: String,
    message: String,
    isPublic: { type: Boolean, default: false }, // visible on the public/citizen timeline
    meta: mongoose.Schema.Types.Mixed,
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

auditLogSchema.index({ createdAt: -1 });

module.exports = mongoose.model('AuditLog', auditLogSchema);
