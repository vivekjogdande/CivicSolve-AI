const mongoose = require('mongoose');
const { STATUS, CATEGORIES, SEVERITIES, AI_OUTCOMES } = require('../utils/constants');

const { Schema } = mongoose;

const mediaSchema = new Schema(
  {
    url: { type: String, required: true },
    filename: String,
    mimetype: String,
    kind: { type: String, enum: ['image', 'video'], default: 'image' },
    size: Number,
    sha256: String,
  },
  { _id: false }
);

const checkSchema = new Schema(
  {
    key: String,
    label: String,
    result: { type: String, enum: ['PASS', 'FAIL', 'UNVERIFIABLE', 'WARN'] },
    detail: String,
  },
  { _id: false }
);

const aiSchema = new Schema(
  {
    comparisonStatus: {
      type: String,
      enum: ['IMPROVED', 'PARTIALLY_IMPROVED', 'NO_CLEAR_IMPROVEMENT', 'WORSENED', 'INCONCLUSIVE', 'IDENTICAL_IMAGE', 'MODEL_UNAVAILABLE'],
      default: 'INCONCLUSIVE',
    },
    outcome: { type: String, enum: AI_OUTCOMES },
    model: String,
    beforeObservations: [String],
    afterObservations: [String],
    observableChanges: [String],
    remainingProblems: [String],
    complaintRelevance: {
      type: String,
      enum: ['RELEVANT', 'PARTIALLY_RELEVANT', 'IRRELEVANT', 'UNCERTAIN'],
      default: 'UNCERTAIN',
    },
    confidence: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'UNKNOWN'], default: 'UNKNOWN' },
    reasoningSummary: String,
    limitations: [String],
    recommendedAction: String,
    // Visual-difference analysis layer
    isIdenticalImage: { type: Boolean, default: false },
    matchType: { type: String, enum: ['EXACT_SHA256', 'PERCEPTUAL_NEAR_IDENTICAL', 'DIFFERENT', 'UNREADABLE', 'UNKNOWN'], default: 'UNKNOWN' },
    similarityScore: Number,
    beforeSha256: String,
    afterSha256: String,
    // Legacy fields preserved for backward compatibility
    pollutionBefore: String,
    pollutionAfter: String,
    apparentChange: String,
    remainingWaste: String,
    error: String,
    comparedAt: Date,
    comparedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { _id: false }
);

const intakeAiSchema = new Schema(
  {
    analyzedAt: { type: Date, default: Date.now },
    suggestedCategory: String,
    suggestedPriority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    category: String,
    priority: { type: String, enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] },
    summary: String,
    safetyHazards: [String],
    recommendedDepartment: String,
    recommendedAction: String,
    confidenceScore: Number,
    isAiGenerated: { type: Boolean, default: false },
    isFallback: { type: Boolean, default: false },
    modelUsed: String,
  },
  { _id: false }
);

const attemptSchema = new Schema({
  attemptNumber: Number,
  submittedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  submittedAt: { type: Date, default: Date.now },
  description: { type: String, maxlength: 2000 },
  actionsTaken: { type: String, maxlength: 2000 },
  evidence: mediaSchema,
  validation: {
    status: { type: String, enum: ['VERIFIED', 'FLAGGED'], default: 'FLAGGED' },
    capturedAt: Date,
    gps: { lat: Number, lng: Number },
    distanceMeters: Number,
    checks: [checkSchema],
    flagReasons: [String],
    reviewNote: String,
  },
  ai: aiSchema,
  confirmationDeadline: Date,
  citizenDecision: {
    decision: { type: String, enum: ['CONFIRMED', 'REJECTED'] },
    decidedAt: Date,
    via: { type: String, enum: ['ACCOUNT', 'TOKEN'] },
    reason: { type: String, maxlength: 2000 },
    media: [mediaSchema],
  },
  closedUnconfirmedAt: Date,
});

const noteSchema = new Schema({
  author: { type: Schema.Types.ObjectId, ref: 'User' },
  authorName: String,
  type: { type: String, enum: ['NOTE', 'ACTION'], default: 'NOTE' },
  text: { type: String, required: true, maxlength: 2000 },
  isPublic: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

const complaintSchema = new Schema(
  {
    complaintId: { type: String, required: true, unique: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, required: true, trim: true, maxlength: 2000 },
    category: { type: String, enum: CATEGORIES, required: true, index: true },
    severity: { type: String, enum: SEVERITIES, default: 'MEDIUM', index: true },
    landmark: { type: String, trim: true, maxlength: 150 },
    location: {
      type: { type: String, enum: ['Point'], default: 'Point', required: true },
      coordinates: { type: [Number], required: true }, // [lng, lat]
    },
    reporter: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    reporterName: { type: String, trim: true, maxlength: 100 },
    isAnonymous: { type: Boolean, default: false },
    anonymousTokenHash: { type: String, select: false },
    department: { type: Schema.Types.ObjectId, ref: 'Department', index: true },
    assignedOfficer: { type: Schema.Types.ObjectId, ref: 'User', index: true },
    status: { type: String, enum: Object.values(STATUS), default: STATUS.SUBMITTED, index: true },
    media: [mediaSchema],
    notes: [noteSchema],
    resolutionAttempts: [attemptSchema],
    confirmationDeadline: Date,
    reopenCount: { type: Number, default: 0 },
    needsSeniorReview: { type: Boolean, default: false, index: true },
    escalationReason: String,
    observationCount: { type: Number, default: 0 },
    observationsSinceResolution: { type: Number, default: 0 },
    resolvedAt: Date,
    intakeAiAnalysis: intakeAiSchema,
  },
  { timestamps: true }
);

complaintSchema.index({ location: '2dsphere' });
complaintSchema.index({ createdAt: -1 });
complaintSchema.index({ status: 1, confirmationDeadline: 1 });
complaintSchema.index({ title: 'text', description: 'text', landmark: 'text', complaintId: 'text' });

module.exports = mongoose.model('Complaint', complaintSchema);
