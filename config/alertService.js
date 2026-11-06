const { alertStore } = require('../storage/fileStore');
const { notifyAlertSMS } = require('./smsService');

const COOLDOWN_MS = 60 * 1000;     // min gap between two NEW alerts for the same patient
const MAX_OPEN_PER_PATIENT = 2;    // max unresolved alerts (active + acknowledged) per patient
const REFRESH_MS = 30 * 1000;      // how often the newest open alert gets the latest vitals
const rank = { Low: 0, Medium: 1, High: 2, Critical: 3 };

const lastFired = new Map();       // patientId -> { level, time }
const lastRefresh = new Map();     // patientId -> time

const maybeRaiseAlert = (patient, vitals, aiStatus, io, options = {}) => {
  const { type = 'vitals', ignoreCooldown = false } = options;
  const level = aiStatus.riskLevel;

  // Patient is better -> a new deterioration may raise a fresh alert straight away
  if (rank[level] < rank.High) { lastFired.delete(patient.id); return null; }

  const message =
    (aiStatus.alerts || []).map(a => a.message).join(' • ') || aiStatus.prediction;
  const now = Date.now();
  const open = alertStore.getOpenByPatient(patient.id);

  // Already at the limit: no new alert, only keep the newest one up to date
  if (open.length >= MAX_OPEN_PER_PATIENT) {
    if (now - (lastRefresh.get(patient.id) || 0) > REFRESH_MS) {
      lastRefresh.set(patient.id, now);
      const newest = open[open.length - 1];
      alertStore.update(newest.id, {
        vitals,
        message,
        riskLevel: rank[level] > rank[newest.riskLevel] ? level : newest.riskLevel,
      });
    }
    return null;
  }

  const prev = lastFired.get(patient.id);
  const escalated = !prev || rank[level] > rank[prev.level];
  if (!ignoreCooldown && !escalated && now - prev.time < COOLDOWN_MS) return null;

  lastFired.set(patient.id, { level, time: now });

  const alert = alertStore.add({
    patientId: patient.id,
    patientName: patient.name,
    bedNumber: patient.bedNumber,
    attendingDoctor: patient.attendingDoctor,
    riskLevel: level,
    message,
    type,
    vitals,
  });

  // First SMS to the doctor / nurse of this patient (never breaks alert creation)
  try { notifyAlertSMS(alert); } catch (e) { console.error('[SMS] error:', e.message); }

  if (io) io.emit('emergency_alert', alert);
  return alert;
};

module.exports = { maybeRaiseAlert };