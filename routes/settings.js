const router = require('express').Router();
const ctrl = require('../controllers/settingsController');
const { protect } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.getSettings);
router.put('/', ctrl.updateSettings);
router.get('/system-info', ctrl.getSystemInfo);

module.exports = router;
