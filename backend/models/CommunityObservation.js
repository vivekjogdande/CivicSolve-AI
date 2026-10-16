const mongoose = require('mongoose');

const observationSchema = new mongoose.Schema(
  {
    complaint: { type: mongoose.Schema.Types.ObjectId, ref: 'Complaint', required: true, index: true },
    complaintId: { type: String, required: true },
    type: { type: String, enum: ['STILL_POLLUTED', 'LOOKS_CLEAN'], default: 'STILL_POLLUTED' },
    note: { type: String, trim: true, maxlength: 500 },
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    ipHash: { type: String, required: true, index: true }, // salted hash, never the raw IP
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

observationSchema.index({ complaint: 1, ipHash: 1, createdAt: -1 });

module.exports = mongoose.model('CommunityObservation', observationSchema);
