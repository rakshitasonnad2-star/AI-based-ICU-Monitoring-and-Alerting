const fs = require('fs');
const path = require('path');
const { alertStore } = require('../storage/fileStore');

const rank = { Low: 0, Medium: 1, High: 2, Critical: 3 };
const STAFF_FILE = path.join(__dirname, '../data/staff.json');

// Read lazily so .env is always loaded first
const repeatMs   = () => (Number(process.env.SMS_REPEAT_MINUTES) || 5) * 60 * 1000;
const maxRepeats = () => Number(process.env.SMS_MAX_REPEATS) || 0;      // 0 = until resolved
const minLevel   = () => process.env.SMS_MIN_LEVEL || 'Critical';

const lastSms = new Map();     // "patientId:phone" -> time of last SMS
const sentCount = new Map();   // "patientId:phone" -> how many SMS were sent
let deviceIden = null;

const norm = (s) => (s || '').trim().toLowerCase();
const headers = (t) => ({ 'Access-Token': t, 'Content-Type': 'application/json' });

const loadStaff = () => {
  try { return JSON.parse(fs.readFileSync(STAFF_FILE, 'utf8')).staff || []; }
  catch { return []; }
};

// Who must be told about this alert?
//  - the attending doctor of the patient (name must match patient.attendingDoctor)
//  - the nurse(s) who cover the bed number
//  - fallback: ALERT_PHONE from .env, so nobody is ever left out
function getRecipients(alert) {
  const phones = new Set();
  loadStaff().forEach((s) => {
    if (!s.phone) return;
    const isDoctor = s.role === 'doctor' && norm(s.name) === norm(alert.attendingDoctor);
    const isNurse  = s.role === 'nurse' && (s.beds || []).includes(Number(alert.bedNumber));
    if (isDoctor || isNurse) phones.add(s.phone);
  });
  if (phones.size === 0 && process.env.ALERT_PHONE) phones.add(process.env.ALERT_PHONE);
  return [...phones];
}

async function findSmsDevice(token) {
  if (deviceIden) return deviceIden;
  const r = await fetch('https://api.pushbullet.com/v2/devices', { headers: headers(token) });
  if (!r.ok) throw new Error(`devices lookup failed: ${r.status}`);
  const dev = ((await r.json()).devices || []).find((d) => d.active && d.has_sms);
  if (!dev) throw new Error('No SMS-capable phone found. Check SMS permission in the Pushbullet app.');
  deviceIden = dev.iden;
  return deviceIden;
}

// One number per message (several numbers in one call would create a group text)
async function sendSMS(phone, message) {
  const token = process.env.PUSHBULLET_TOKEN;
  if (!token || !phone) { console.warn('[SMS] not configured, skipping'); return false; }
  try {
    const iden = await findSmsDevice(token);
    const r = await fetch('https://api.pushbullet.com/v2/texts', {
      method: 'POST',
      headers: headers(token),
      body: JSON.stringify({ data: { target_device_iden: iden, addresses: [phone], message } }),
    });
    if (!r.ok) throw new Error(`${r.status} ${await r.text()}`);
    console.log(`[SMS] sent to ${phone}`);
    return true;
  } catch (e) {
    console.error(`[SMS] failed for ${phone}:`, e.message, e.cause?.code || e.cause?.message || '');
    return false;
  }
}

const smsText = (alert, reminderNo) => {
  const v = alert.vitals || {};
  const vit = `HR ${v.heartRate}, SpO2 ${v.oxygenLevel}%, BP ${v.systolicBP}/${v.diastolicBP}`;
  const lvl = String(alert.riskLevel).toUpperCase();
  return reminderNo > 0
    ? `REMINDER #${reminderNo} ICU ${lvl} - Bed ${alert.bedNumber} still unresolved: ${vit}. Please check and resolve on dashboard.`
    : `ICU ${lvl} - Bed ${alert.bedNumber}: ${vit}. Check dashboard.`;
};

// Sends the first SMS, or a reminder when the repeat time has passed
function deliver(alert) {
  getRecipients(alert).forEach((phone) => {
    const key = `${alert.patientId}:${phone}`;
    const count = sentCount.get(key) || 0;
    if (Date.now() - (lastSms.get(key) || 0) < repeatMs()) return;
    if (count > 0 && maxRepeats() > 0 && count >= 1 + maxRepeats()) return;   // optional safety cap
    lastSms.set(key, Date.now());
    sentCount.set(key, count + 1);
    sendSMS(phone, smsText(alert, count)).then((ok) => {
      if (ok) alertStore.bumpSms(alert.id);
    });
  });
}

// Newest unresolved alert of every patient (active AND acknowledged)
function openAlertsByPatient() {
  const map = new Map();
  alertStore.getAll()
    .filter((a) => a.status !== 'resolved' && rank[a.riskLevel] >= rank[minLevel()])
    .forEach((a) => map.set(a.patientId, a));
  return map;
}

// Called when a new alert is created
function notifyAlertSMS(alert) {
  if (rank[alert.riskLevel] < rank[minLevel()]) return;
  deliver(alert);
}

// Runs every 30 s: keeps texting until the alert is RESOLVED
function runReminders() {
  try {
    const open = openAlertsByPatient();
    open.forEach((alert) => deliver(alert));

    // Resolved patients: forget their counters so a new alert texts immediately
    [...lastSms.keys()].forEach((key) => {
      if (!open.has(key.split(':')[0])) { lastSms.delete(key); sentCount.delete(key); }
    });
  } catch (e) {
    console.error('[SMS] reminder error:', e.message);
  }
}

function startSmsReminders() {
  // After a server restart, existing open alerts count as "just notified"
  openAlertsByPatient().forEach((alert) =>
    getRecipients(alert).forEach((phone) => {
      const key = `${alert.patientId}:${phone}`;
      lastSms.set(key, Date.now());
      sentCount.set(key, 1);
    })
  );
  setInterval(runReminders, 30 * 1000);
  console.log(`[SMS] reminders every ${repeatMs() / 60000} min until the alert is resolved (min level: ${minLevel()})`);
}

module.exports = { sendSMS, notifyAlertSMS, startSmsReminders, runReminders };