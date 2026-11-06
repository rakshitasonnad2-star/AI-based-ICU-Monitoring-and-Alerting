const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { readCSV, getCSVStats, clearCSV } = require('../storage/csvStore');

router.use(protect);

router.get('/stats', (req, res) => {
  try { res.json({ success: true, stats: getCSVStats() }); }
  catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/download/:type', (req, res) => {
  try {
    const { type } = req.params;
    const csv = readCSV(type);
    if (!csv) return res.status(404).json({ success: false, message: 'CSV file not found' });

    const names = {
      heartRate: 'heart_rate.csv', oxygenLevel: 'oxygen_level.csv', bloodPressure: 'blood_pressure.csv',
      temperature: 'temperature.csv', respiratoryRate: 'respiratory_rate.csv', allVitals: 'all_vitals.csv',
      bedStatus: 'bed_status.csv', bedCapacityLog: 'bed_capacity_log.csv',
    };

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${names[type] || type + '.csv'}"`);
    res.send(csv);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.get('/patient/:patientId/:type', (req, res) => {
  try {
    const { patientId, type } = req.params;
    const csv = readCSV(type);
    if (!csv) return res.status(404).json({ success: false, message: 'CSV not found' });

    const lines = csv.split('\n').filter(Boolean);
    const header = lines[0];
    const rows = lines.slice(1).filter(row => row.includes(patientId));
    const filtered = [header, ...rows].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="patient_${patientId}_${type}.csv"`);
    res.send(filtered);
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

router.delete('/clear/:type', (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only' });
    const ok = clearCSV(req.params.type);
    if (!ok) return res.status(404).json({ success: false, message: 'File not found' });
    res.json({ success: true, message: `${req.params.type} CSV cleared` });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
});

module.exports = router;
