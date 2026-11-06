const router = require('express').Router();
const { register, login, getMe, getAllUsers, getLoginActivity, changePassword } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/auth');

router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.get('/users', protect, authorize('admin'), getAllUsers);
router.get('/activity', protect, authorize('admin'), getLoginActivity);
router.put('/change-password', protect, changePassword);

module.exports = router;
