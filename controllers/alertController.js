const { alertStore } = require('../storage/fileStore');
const { sendSMS } = require('../config/smsService');

const notifyClients = (req, payload = {}) => {
  const io = req.app.get('io');
  if (io) io.emit('alert_updated', payload);
};

// GET /api/alerts   (newest first, optional ?status=active|acknowledged|resolved)
exports.getAlerts = (req, res) => {
  try {
    let alerts = alertStore.getRecent(200);
    if (req.query.status) alerts = alerts.filter(a => a.status === req.query.status);
    res.json({ success: true, count: alerts.length, alerts });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/alerts/:id/acknowledge   — any logged-in staff ("I have seen it, I am on it")
exports.acknowledgeAlert = (req, res) => {
  try {
    const alert = alertStore.acknowledge(req.params.id, req.user.name);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    notifyClients(req, alert);
    res.json({ success: true, alert });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// PUT /api/alerts/:id/resolve   — doctor / admin. Closes ALL open alerts of that patient.
exports.resolveAlert = (req, res) => {
  try {
    const alert = alertStore.resolvePatientAlerts(req.params.id, req.user.name);
    if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
    notifyClients(req, alert);
    res.json({ success: true, alert });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/alerts/:id   — doctor / admin, only RESOLVED alerts
exports.deleteAlert = (req, res) => {
  try {
    const result = alertStore.remove(req.params.id);
    if (result === null)  return res.status(404).json({ success: false, message: 'Alert not found.' });
    if (result === false) return res.status(400).json({ success: false, message: 'Only resolved alerts can be deleted.' });
    notifyClients(req);
    res.json({ success: true, message: 'Alert deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/alerts/resolved   — doctor / admin, removes every resolved alert
exports.clearResolved = (req, res) => {
  try {
    alertStore.clearResolved();
    notifyClients(req);
    res.json({ success: true, message: 'Resolved alerts cleared.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// DELETE /api/alerts/clear   — admin only, removes everything
exports.clearAllAlerts = (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Admin only.' });
    alertStore.clearAll();
    notifyClients(req);
    res.json({ success: true, message: 'All alerts cleared.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getAlertStats = (req, res) => {
  try {
    const alerts = alertStore.getAll();
    const day = Date.now() - 24 * 60 * 60 * 1000;
    const count = (fn) => alerts.filter(fn).length;
    const stats = {
      total: alerts.length,
      active: count(a => a.status === 'active'),
      acknowledged: count(a => a.status === 'acknowledged'),
      resolved: count(a => a.status === 'resolved'),
      pending: count(a => a.status === 'active'),            // kept for older screens
      critical: count(a => a.riskLevel === 'Critical'),
      high: count(a => a.riskLevel === 'High'),
      last24h: count(a => new Date(a.timestamp).getTime() > day),
    };
    res.json({ success: true, stats });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// POST /api/alerts/test-sms   — admin: sends one test SMS to ALERT_PHONE
exports.testSms = async (req, res) => {
  const ok = await sendSMS(process.env.ALERT_PHONE, 'ICU system test: SMS alerts are working.');
  res.json({ success: ok, message: ok ? 'Test SMS sent.' : 'SMS failed - see backend terminal.' });
};