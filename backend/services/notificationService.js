const Notification = require('../models/Notification');
const User = require('../models/User');
const { ROLES } = require('../utils/constants');

async function notifyUser(userId, { type, title, message, complaint }) {
  if (!userId) return;
  try {
    await Notification.create({
      user: userId,
      type,
      title,
      message,
      complaint: complaint ? complaint._id : undefined,
      complaintId: complaint ? complaint.complaintId : undefined,
    });
  } catch (e) {
    console.error('[notify] failed', e.message);
  }
}

/** Notifies every active officer of the complaint's department (plus the assigned officer). */
async function notifyDepartment(complaint, payload) {
  const ids = new Set();
  if (complaint.assignedOfficer) ids.add(String(complaint.assignedOfficer._id || complaint.assignedOfficer));
  if (complaint.department) {
    const deptId = complaint.department._id || complaint.department;
    const officers = await User.find({ department: deptId, isActive: true, role: { $in: [ROLES.OFFICER, ROLES.SENIOR_OFFICER] } }).select('_id');
    officers.forEach((o) => ids.add(String(o._id)));
  }
  await Promise.all([...ids].map((id) => notifyUser(id, { ...payload, complaint })));
}

async function notifySeniorOfficers(complaint, payload) {
  const seniors = await User.find({ role: { $in: [ROLES.SENIOR_OFFICER, ROLES.ADMIN] }, isActive: true }).select('_id');
  await Promise.all(seniors.map((s) => notifyUser(s._id, { ...payload, complaint })));
}

module.exports = { notifyUser, notifyDepartment, notifySeniorOfficers };
