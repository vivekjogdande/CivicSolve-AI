const router = require('express').Router();
const c = require('../controllers/authorityController');
const { validate } = require('../middleware/validate');
const { requireAuthority, requireSenior } = require('../middleware/auth');
const { imageUpload, persistFiles } = require('../middleware/upload');
const s = require('../utils/schemas');

router.use(requireAuthority);

router.get('/summary', c.summary);
router.get('/charts', c.charts);
router.get('/officers', c.officers);
router.get('/departments', c.departments);
router.get('/complaints', validate(s.authorityListQuery, 'query'), c.list);
router.get('/senior/queue', requireSenior, validate(s.authorityListQuery, 'query'), c.seniorQueue);

router.get('/complaints/:complaintId', c.loadComplaint, c.detail);
router.get('/complaints/:complaintId/responders', c.loadComplaint, c.getRecommendedResponders);
router.post('/complaints/:complaintId/assign', c.loadComplaint, validate(s.assignBody), c.assign);
router.post('/complaints/:complaintId/status', c.loadComplaint, validate(s.statusBody), c.setStatus);
router.post('/complaints/:complaintId/notes', c.loadComplaint, validate(s.noteBody), c.addNote);
router.post('/complaints/:complaintId/escalate', c.loadComplaint, validate(s.escalateBody), c.escalate);
router.post('/complaints/:complaintId/ai-compare', c.loadComplaint, validate(s.aiBody), c.aiCompare);
router.post('/complaints/:complaintId/review', requireSenior, c.loadComplaint, validate(s.reviewBody), c.completeReview);
// Access check first, then multer, validation, and only then are files written to disk.
router.post(
  '/complaints/:complaintId/resolution',
  c.loadComplaint, imageUpload.single('photo'), validate(s.resolutionBody), persistFiles({ requireImage: true }), c.submitResolution
);

module.exports = router;
