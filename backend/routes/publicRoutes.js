const router = require('express').Router();
const c = require('../controllers/publicController');
const { validate } = require('../middleware/validate');
const { optionalAuth } = require('../middleware/auth');
const { observationLimiter } = require('../middleware/rateLimit');
const s = require('../utils/schemas');

router.get('/stats', c.stats);
router.get('/map', validate(s.mapQuery, 'query'), c.map);
router.get('/recent', c.recent);
router.get('/transparency', validate(s.transparencyQuery, 'query'), c.transparency);
router.post('/observations', observationLimiter, optionalAuth, validate(s.observationBody), c.createObservation);

module.exports = router;
