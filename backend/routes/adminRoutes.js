const router = require('express').Router();
const c = require('../controllers/adminController');
const { validate } = require('../middleware/validate');
const { requireAdmin } = require('../middleware/auth');
const s = require('../utils/schemas');

router.use(requireAdmin);

router.get('/overview', c.overview);
router.get('/users', c.listUsers);
router.post('/users', validate(s.createAuthoritySchema), c.createAuthority);
router.patch('/users/:id', validate(s.updateAuthoritySchema), c.updateAuthority);
router.post('/users/:id/reset-password', validate(s.resetPasswordSchema), c.resetPassword);
router.get('/departments', c.listDepartments);
router.post('/departments', validate(s.departmentSchema), c.createDepartment);

module.exports = router;
