const router = require('express').Router();
const ctrl = require('../controllers/alertController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.getAlerts);
router.get('/stats', ctrl.getAlertStats);
router.post('/test-sms', authorize('admin'), ctrl.testSms);

router.put('/:id/acknowledge', ctrl.acknowledgeAlert);                       // any staff
router.put('/:id/resolve', authorize('admin', 'doctor'), ctrl.resolveAlert); // doctor / admin

// NOTE: fixed words must stay ABOVE '/:id'
router.delete('/clear', ctrl.clearAllAlerts);                                // admin (checked in controller)
router.delete('/resolved', authorize('admin', 'doctor'), ctrl.clearResolved);
router.delete('/:id', authorize('admin', 'doctor'), ctrl.deleteAlert);       // only resolved alerts

module.exports = router;