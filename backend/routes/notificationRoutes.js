const router = require('express').Router();
const Notification = require('../models/Notification');
const { requireAuth } = require('../middleware/auth');
const { asyncHandler, notFound } = require('../utils/errors');

router.use(requireAuth);

router.get('/', asyncHandler(async (req, res) => {
  const [items, unread] = await Promise.all([
    Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ user: req.user._id, isRead: false }),
  ]);
  res.json({ success: true, data: { items: items.map((n) => ({ id: n._id, type: n.type, title: n.title, message: n.message, complaintId: n.complaintId, isRead: n.isRead, createdAt: n.createdAt })), unread } });
}));

router.post('/read-all', asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, isRead: false }, { $set: { isRead: true } });
  res.json({ success: true, data: { message: 'All notifications marked as read' } });
}));

router.post('/:id/read', asyncHandler(async (req, res) => {
  const n = await Notification.findOneAndUpdate({ _id: req.params.id, user: req.user._id }, { $set: { isRead: true } }, { new: true });
  if (!n) throw notFound('Notification not found');
  res.json({ success: true, data: { id: n._id, isRead: true } });
}));

module.exports = router;
