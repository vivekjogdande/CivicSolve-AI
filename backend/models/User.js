const mongoose = require('mongoose');
const { ROLES } = require('../utils/constants');

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    phone: { type: String, trim: true, maxlength: 20 },
    passwordHash: { type: String, required: true, select: false },
    role: { type: String, enum: Object.values(ROLES), default: ROLES.CITIZEN, index: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // admin who created an authority account
    lastLoginAt: Date,
  },
  { timestamps: true }
);

userSchema.methods.toSafeJSON = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email,
    phone: this.phone || '',
    role: this.role,
    department: this.department && this.department._id ? this.department : this.department || null,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model('User', userSchema);
