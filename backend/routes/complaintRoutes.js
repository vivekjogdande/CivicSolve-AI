const router = require('express').Router();
const c = require('../controllers/complaintController');
const { validate } = require('../middleware/validate');
const { optionalAuth, requireCitizen } = require('../middleware/auth');
const { complaintUpload, imageUpload, persistFiles } = require('../middleware/upload');
const { createComplaintLimiter, tokenLimiter } = require('../middleware/rateLimit');
const s = require('../utils/schemas');

// Create: multer parses the form -> validate fields -> only then write files to disk.
router.post('/', createComplaintLimiter, optionalAuth, complaintUpload.array('media', 5), validate(s.createComplaintSchema), persistFiles(), c.create);

// AI and duplicate detection services
router.post('/ai-analyze', optionalAuth, c.aiAnalyze);
router.get('/check-duplicates', optionalAuth, c.getDuplicates);

// Citizen (account) routes. Fixed paths must come before "/:complaintId".
router.get('/mine', requireCitizen, validate(s.citizenListQuery, 'query'), c.listMine);
router.get('/mine/summary', requireCitizen, c.mySummary);

// Track by ID only: public data
router.get('/track/:complaintId', c.trackPublic);

// Anonymous (token) routes. The token travels in the POST body, never in the URL.
router.post('/:complaintId/anonymous/view', tokenLimiter, validate(s.tokenBody), c.loadAnonymous, c.detailAnonymous);
router.post('/:complaintId/anonymous/confirm', tokenLimiter, validate(s.tokenBody), c.loadAnonymous, c.confirmAnonymous);
router.post(
  '/:complaintId/anonymous/reject',
  tokenLimiter, imageUpload.array('media', 3), validate(s.rejectBody.extend({ token: s.tokenBody.shape.token })),
  c.loadAnonymous, persistFiles({ requireImage: true }), c.rejectAnonymous
);

// Owner routes
router.get('/:complaintId', requireCitizen, c.loadOwned, c.detailOwned);
router.post('/:complaintId/confirm', requireCitizen, c.loadOwned, c.confirmOwned);
router.post(
  '/:complaintId/reject',
  requireCitizen, imageUpload.array('media', 3), validate(s.rejectBody), c.loadOwned, persistFiles({ requireImage: true }), c.rejectOwned
);

module.exports = router;
