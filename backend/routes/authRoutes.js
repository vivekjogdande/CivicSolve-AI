const router = require('express').Router();
const c = require('../controllers/authController');
const { validate } = require('../middleware/validate');
const { requireAuth } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');
const s = require('../utils/schemas');

router.post('/register', authLimiter, validate(s.registerSchema), c.register);
router.post('/citizen/login', authLimiter, validate(s.loginSchema), c.citizenLogin);
router.post('/authority/login', authLimiter, validate(s.loginSchema), c.authorityLogin);
router.get('/me', requireAuth, c.me);
router.patch('/me', requireAuth, validate(s.updateProfileSchema), c.updateMe);
router.post('/change-password', requireAuth, authLimiter, validate(s.changePasswordSchema), c.changePassword);

module.exports = router;
