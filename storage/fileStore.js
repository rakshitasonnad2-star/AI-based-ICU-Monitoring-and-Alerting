const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const FILES = {
  users:         path.join(DATA_DIR, 'users.json'),
  patients:      path.join(DATA_DIR, 'patients.json'),
  alerts:        path.join(DATA_DIR, 'alerts.json'),
  settings:      path.join(DATA_DIR, 'settings.json'),
  loginActivity: path.join(DATA_DIR, 'login_activity.json'),
};

const DEFAULTS = {
  users:    { users: [], _meta: { total: 0, lastModified: '' } },
  patients: { patients: [], _meta: { total: 0, lastModified: '' } },
  alerts:   { alerts: [], _meta: { total: 0, lastModified: '' } },
  settings: {
    settings: {
      hospitalName: 'City General Hospital',
      icuCapacity: 4,
      alertSoundEnabled: true,
      autoDischargeHours: 168,
      vitalUpdateInterval: 3,
      csvSaveInterval: 30,
      criticalThresholds: { heartRateLow: 50, heartRateHigh: 130, oxygenLow: 90, tempHigh: 103, tempLow: 95 },
      theme: 'cyberpunk-dark',
      timezone: 'Asia/Kolkata',
      twoFactorEnabled: false,
      sessionTimeoutMinutes: 60,
    },
    _meta: { lastModified: '' },
  },
  loginActivity: { activity: [], _meta: { total: 0, lastModified: '' } },
};

Object.entries(FILES).forEach(([key, filePath]) => {
  if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8').trim() === '') {
    fs.writeFileSync(filePath, JSON.stringify(DEFAULTS[key], null, 2));
  }
});

const readFile = (key) => {
  try { return JSON.parse(fs.readFileSync(FILES[key], 'utf8')); }
  catch { return DEFAULTS[key]; }
};

const writeFile = (key, data) => {
  data._meta = { ...data._meta, lastModified: new Date().toISOString() };
  fs.writeFileSync(FILES[key], JSON.stringify(data, null, 2));
};

// ═══════════════════ USER STORE ═══════════════════
const userStore = {
  getAll: () => readFile('users').users,
  findByEmail: (email) => readFile('users').users.find(u => u.email.toLowerCase() === email.toLowerCase()) || null,
  findById: (id) => readFile('users').users.find(u => u.id === id) || null,
  create: (userData) => {
    const db = readFile('users');
    const newUser = { ...userData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.users.push(newUser);
    db._meta.total = db.users.length;
    writeFile('users', db);
    console.log(`[FILE-DB] New user → ${userData.email} (${userData.role})`);
    return newUser;
  },
  updateLastLogin: (id) => {
    const db = readFile('users');
    const idx = db.users.findIndex(u => u.id === id);
    if (idx !== -1) {
      db.users[idx].lastLogin = new Date().toISOString();
      db.users[idx].updatedAt = new Date().toISOString();
      writeFile('users', db);
    }
  },
  updateById: (id, updates) => {
    const db = readFile('users');
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return null;
    db.users[idx] = { ...db.users[idx], ...updates, updatedAt: new Date().toISOString() };
    writeFile('users', db);
    return db.users[idx];
  },
  deleteById: (id) => {
    const db = readFile('users');
    const idx = db.users.findIndex(u => u.id === id);
    if (idx === -1) return false;
    db.users.splice(idx, 1);
    db._meta.total = db.users.length;
    writeFile('users', db);
    return true;
  },
};

// ═══════════════════ PATIENT STORE ═══════════════════
const patientStore = {
  getAll: () => readFile('patients').patients.filter(p => p.status !== 'Discharged'),
  getAllIncludingDischarged: () => readFile('patients').patients,
  findById: (id) => readFile('patients').patients.find(p => p.id === id) || null,
  findByBed: (bedNumber) => readFile('patients').patients.find(p => p.bedNumber === bedNumber && p.status !== 'Discharged') || null,
  create: (patientData) => {
    const db = readFile('patients');
    const newPatient = { ...patientData, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    db.patients.push(newPatient);
    db._meta.total = db.patients.length;
    writeFile('patients', db);
    console.log(`[FILE-DB] New patient → ${patientData.name} (Bed ${patientData.bedNumber})`);
    return newPatient;
  },
  updateById: (id, updates) => {
    const db = readFile('patients');
    const idx = db.patients.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.patients[idx] = { ...db.patients[idx], ...updates, updatedAt: new Date().toISOString() };
    writeFile('patients', db);
    return db.patients[idx];
  },
  updateVitals: (id, vitals) => {
    const db = readFile('patients');
    const idx = db.patients.findIndex(p => p.id === id);
    if (idx === -1) return null;
    const vitalEntry = { ...vitals, timestamp: new Date().toISOString() };
    db.patients[idx].currentVitals = { ...vitals, lastUpdated: new Date().toISOString() };
    if (!db.patients[idx].vitalHistory) db.patients[idx].vitalHistory = [];
    db.patients[idx].vitalHistory.push(vitalEntry);
    if (db.patients[idx].vitalHistory.length > 50) db.patients[idx].vitalHistory = db.patients[idx].vitalHistory.slice(-50);
    db.patients[idx].updatedAt = new Date().toISOString();
    writeFile('patients', db);
    return db.patients[idx];
  },
  addNote: (id, note) => {
    const db = readFile('patients');
    const idx = db.patients.findIndex(p => p.id === id);
    if (idx === -1) return null;
    if (!db.patients[idx].notes) db.patients[idx].notes = [];
    db.patients[idx].notes.push({ ...note, timestamp: new Date().toISOString() });
    db.patients[idx].updatedAt = new Date().toISOString();
    writeFile('patients', db);
    return db.patients[idx];
  },
  discharge: (id) => {
    const db = readFile('patients');
    const idx = db.patients.findIndex(p => p.id === id);
    if (idx === -1) return null;
    db.patients[idx].status = 'Discharged';
    db.patients[idx].dischargeDate = new Date().toISOString();
    db.patients[idx].updatedAt = new Date().toISOString();
    writeFile('patients', db);
    console.log(`[FILE-DB] Discharged → ${db.patients[idx].name}`);
    return db.patients[idx];
  },
  delete: (id) => {
    const db = readFile('patients');
    const idx = db.patients.findIndex(p => p.id === id);
    if (idx === -1) return false;
    db.patients.splice(idx, 1);
    db._meta.total = db.patients.length;
    writeFile('patients', db);
    return true;
  },
};

// ═══════════════════ ALERT STORE ═══════════════════
// Alert life-cycle:  active (new)  →  acknowledged ("I'm on it")  →  resolved (fixed)
// The old `acknowledged` true/false field is kept in sync so older code keeps working.
const withStatus = (a) => ({ ...a, status: a.status || (a.acknowledged ? 'acknowledged' : 'active') });

const alertStore = {
  getAll: () => readFile('alerts').alerts.map(withStatus),

  getRecent: (limit = 20) => readFile('alerts').alerts.map(withStatus).slice(-limit).reverse(),

  // Unresolved alerts (active + acknowledged) of one patient, oldest first
  getOpenByPatient: (patientId) =>
    readFile('alerts').alerts.map(withStatus).filter(a => a.patientId === patientId && a.status !== 'resolved'),

  add: (alert) => {
    const db = readFile('alerts');
    const newAlert = {
      ...alert,
      id: `alt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
      status: 'active', acknowledged: false,
      acknowledgedBy: null, acknowledgedAt: null,
      resolvedBy: null, resolvedAt: null,
      smsCount: 0, lastSmsAt: null,
      timestamp: new Date().toISOString(),
    };
    db.alerts.push(newAlert);
    if (db.alerts.length > 200) db.alerts = db.alerts.slice(-200);
    db._meta.total = db.alerts.length;
    writeFile('alerts', db);
    return newAlert;
  },

  update: (id, updates) => {
    const db = readFile('alerts');
    const idx = db.alerts.findIndex(a => a.id === id);
    if (idx === -1) return null;
    db.alerts[idx] = { ...db.alerts[idx], ...updates };
    writeFile('alerts', db);
    return withStatus(db.alerts[idx]);
  },

  acknowledge: (id, byUser) => {
    const db = readFile('alerts');
    const idx = db.alerts.findIndex(a => a.id === id);
    if (idx === -1) return null;
    if (withStatus(db.alerts[idx]).status === 'resolved') return withStatus(db.alerts[idx]); // already closed
    db.alerts[idx] = {
      ...db.alerts[idx],
      status: 'acknowledged', acknowledged: true,
      acknowledgedBy: byUser, acknowledgedAt: new Date().toISOString(),
    };
    writeFile('alerts', db);
    return withStatus(db.alerts[idx]);
  },

  // Resolving closes EVERY open alert of that patient (so SMS reminders stop for the patient)
  resolvePatientAlerts: (id, byUser) => {
    const db = readFile('alerts');
    const target = db.alerts.find(a => a.id === id);
    if (!target) return null;
    const now = new Date().toISOString();
    db.alerts.forEach((a) => {
      if (a.patientId === target.patientId && withStatus(a).status !== 'resolved') {
        a.status = 'resolved'; a.acknowledged = true;
        a.acknowledgedBy = a.acknowledgedBy || byUser;
        a.acknowledgedAt = a.acknowledgedAt || now;
        a.resolvedBy = byUser; a.resolvedAt = now;
      }
    });
    writeFile('alerts', db);
    return withStatus(db.alerts.find(a => a.id === id));
  },

  // Counts every SMS sent for an alert (shown on the Alerts page)
  bumpSms: (id) => {
    const db = readFile('alerts');
    const idx = db.alerts.findIndex(a => a.id === id);
    if (idx === -1) return null;
    db.alerts[idx].smsCount = (db.alerts[idx].smsCount || 0) + 1;
    db.alerts[idx].lastSmsAt = new Date().toISOString();
    writeFile('alerts', db);
    return withStatus(db.alerts[idx]);
  },

  // Only resolved alerts can be deleted.  returns: null = not found, false = not resolved, true = deleted
  remove: (id) => {
    const db = readFile('alerts');
    const idx = db.alerts.findIndex(a => a.id === id);
    if (idx === -1) return null;
    if (withStatus(db.alerts[idx]).status !== 'resolved') return false;
    db.alerts.splice(idx, 1);
    db._meta.total = db.alerts.length;
    writeFile('alerts', db);
    return true;
  },

  clearResolved: () => {
    const db = readFile('alerts');
    db.alerts = db.alerts.filter(a => withStatus(a).status !== 'resolved');
    db._meta.total = db.alerts.length;
    writeFile('alerts', db);
  },

  clearAll: () => {
    writeFile('alerts', { alerts: [], _meta: { total: 0, lastModified: '' } });
  },
};

// ═══════════════════ SETTINGS STORE ═══════════════════
const settingsStore = {
  get: () => readFile('settings').settings,
  update: (updates) => {
    const db = readFile('settings');
    db.settings = { ...db.settings, ...updates };
    writeFile('settings', db);
    return db.settings;
  },
};

// ═══════════════════ LOGIN ACTIVITY STORE ═══════════════════
const loginActivityStore = {
  getAll: () => readFile('loginActivity').activity,
  getRecent: (limit = 30) => readFile('loginActivity').activity.slice(-limit).reverse(),
  log: (entry) => {
    const db = readFile('loginActivity');
    const newEntry = { ...entry, id: `act_${Date.now()}_${Math.floor(Math.random()*1000)}`, timestamp: new Date().toISOString() };
    db.activity.push(newEntry);
    if (db.activity.length > 300) db.activity = db.activity.slice(-300);
    db._meta.total = db.activity.length;
    writeFile('loginActivity', db);
    return newEntry;
  },
};

module.exports = { userStore, patientStore, alertStore, settingsStore, loginActivityStore, readFile, writeFile };
