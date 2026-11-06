const router = require('express').Router();
const ctrl = require('../controllers/patientController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/', ctrl.getAllPatients);
router.get('/analytics', ctrl.getAnalytics);
router.get('/:id', ctrl.getPatientById);
router.post('/', authorize('admin', 'doctor'), ctrl.addPatient);
router.put('/:id', authorize('admin', 'doctor'), ctrl.updatePatient);
router.put('/:id/vitals', ctrl.updateVitals);
router.post('/:id/notes', ctrl.addNote);
router.put('/:id/discharge', authorize('admin', 'doctor'), ctrl.dischargePatient);
router.delete('/:id', authorize('admin'), ctrl.deletePatient);

module.exports = router;
