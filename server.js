require('dotenv').config();
const express   = require('express');
const http      = require('http');
const { Server } = require('socket.io');
const cors      = require('cors');
const net       = require('net');
const bcrypt    = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const { patientStore, userStore, settingsStore } = require('./storage/fileStore');
const { saveVitalsToCSV, saveBedStatusSnapshotToCSV } = require('./storage/csvStore');
const { computeAI }               = require('./config/aiEngine');
const { maybeRaiseAlert }         = require('./config/alertService');   // ✅ NEW
const { startSmsReminders }       = require('./config/smsService');     // ✅ NEW

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', methods: ['GET','POST','PUT','DELETE'] },
});

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Preflight
app.options('*', (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  res.status(200).end();
});

app.set('io', io);

// ── Routes ────────────────────────────────────────────────────────────────────
app.use('/api/auth',     require('./routes/auth'));
app.use('/api/patients', require('./routes/patients'));
app.use('/api/vitals',   require('./routes/vitals'));
app.use('/api/alerts',   require('./routes/alerts'));
app.use('/api/settings', require('./routes/settings'));

app.get('/api/health', (req, res) =>
  res.json({ status: 'ok', timestamp: new Date().toISOString() }));

app.use((req, res) =>
  res.status(404).json({ success: false, message: `${req.method} ${req.path} not found` }));
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(500).json({ success: false, message: err.message });
});

// ── Socket.IO ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`\x1b[36m[SOCKET] Connected: ${socket.id}\x1b[0m`);
  socket.emit('connected', { message: 'ICU AI Network Connected' });
  socket.on('disconnect', () =>
    console.log(`\x1b[33m[SOCKET] Disconnected: ${socket.id}\x1b[0m`));
});

// ── Live vital simulation every 3 seconds ─────────────────────────────────────
// CSV saves to file every 30 seconds (every 10th tick)
const fluctuate = (val, range) =>
  parseFloat((val + (Math.random() - 0.5) * range * 2).toFixed(1));

let csvTick = 0;

setInterval(() => {
  try {
    const patients = patientStore.getAll();

    patients.forEach((patient) => {
      const v = patient.currentVitals;
      if (!v) return;

      // Fluctuate vitals slightly for realistic simulation
      const sim = {
        heartRate:       Math.round(Math.max(40, Math.min(180, fluctuate(v.heartRate, 4)))),
        oxygenLevel:     Math.min(100, Math.max(80, fluctuate(v.oxygenLevel, 0.7))),
        systolicBP:      Math.round(Math.max(70, Math.min(200, fluctuate(v.systolicBP, 5)))),
        diastolicBP:     Math.round(Math.max(40, Math.min(130, fluctuate(v.diastolicBP, 3)))),
        temperature:     parseFloat(Math.max(94, Math.min(106, fluctuate(v.temperature, 0.1))).toFixed(1)),
        respiratoryRate: Math.round(Math.max(8, Math.min(35, fluctuate(v.respiratoryRate || 16, 1)))),
      };

      const aiStatus = computeAI(sim);

      // Push live data to all browsers every 3 seconds
      io.emit('vitals_update', {
        patientId: patient.id, bedNumber: patient.bedNumber,
        name: patient.name, vitals: sim, aiStatus,
      });

      // ✅ NEW — Emergency alert: High / Critical only, max 2 open alerts per patient,
      // first SMS goes to the assigned doctor / nurse (see config/alertService.js)
      maybeRaiseAlert(patient, sim, aiStatus, io, { type: 'simulation' });
    });

    // ✅ Write simulated vitals to CSV every 30 seconds (10th tick)
    csvTick++;
    if (csvTick % 10 === 0) {
      const currentPatients = patientStore.getAll();
      currentPatients.forEach((patient) => {
        const v = patient.currentVitals;
        if (!v) return;
        const ai = patient.aiStatus || computeAI(v);
        saveVitalsToCSV(patient, v, ai);
      });

      // ✅ Snapshot EVERY bed slot (occupied + empty) into bed_status.csv
      const { icuCapacity } = settingsStore.get();
      saveBedStatusSnapshotToCSV(icuCapacity || 4, currentPatients);

      console.log(`\x1b[32m[CSV] Auto-saved vitals for ${currentPatients.length} patient(s) + bed status snapshot (${icuCapacity || 4} beds) → source: simulation\x1b[0m`);
    }

  } catch { /* silent — don't crash simulation */ }
}, 3000);

// ── Seed demo data on first boot ──────────────────────────────────────────────
const seedDemoData = async () => {
  if (userStore.getAll().length === 0) {
    for (const u of [
      { email: 'admin@icu.med',  password: 'admin123',  name: 'Dr. Admin User',   role: 'admin',  department: 'Administration' },
      { email: 'doctor@icu.med', password: 'doctor123', name: 'Dr. Sarah Chen',   role: 'doctor', department: 'ICU' },
      { email: 'nurse@icu.med',  password: 'nurse123',  name: 'Nurse Emily Ross', role: 'nurse',  department: 'ICU' },
    ]) {
      userStore.create({
        id: `usr_${uuidv4()}`, ...u,
        password: await bcrypt.hash(u.password, 12),
        isActive: true, lastLogin: null,
      });
    }
    console.log('\x1b[32m[SEED] 3 demo users → data/users.json\x1b[0m');
  }

  if (patientStore.getAll().length === 0) {
    const demoPatients = [
      {
        name: 'James Mitchell', age: 67, gender: 'Male', bedNumber: 1,
        bloodGroup: 'O+', diagnosis: 'Acute Myocardial Infarction',
        attendingDoctor: 'Dr. Sarah Chen', status: 'Critical',
        currentVitals: { heartRate: 112, oxygenLevel: 91, systolicBP: 155, diastolicBP: 95, temperature: 101.2, respiratoryRate: 22 },
        emergencyContact: { name: 'Mary Mitchell', phone: '555-0101', relation: 'Spouse' },
        allergies: ['Penicillin'],
        medications: [{ name: 'Aspirin', dosage: '325mg', frequency: 'Once daily' }],
        notes: [{ text: 'Admitted via emergency. Cardiology consult requested.', author: 'Dr. Sarah Chen', timestamp: new Date().toISOString() }],
      },
      {
        name: 'Elena Vasquez', age: 45, gender: 'Female', bedNumber: 2,
        bloodGroup: 'A+', diagnosis: 'Respiratory Failure',
        attendingDoctor: 'Dr. James Park', status: 'Serious',
        currentVitals: { heartRate: 88, oxygenLevel: 94, systolicBP: 128, diastolicBP: 82, temperature: 99.8, respiratoryRate: 24 },
        emergencyContact: { name: 'Carlos Vasquez', phone: '555-0102', relation: 'Husband' },
        allergies: ['Sulfa'],
        medications: [{ name: 'Albuterol', dosage: '2.5mg', frequency: 'Every 4 hours' }],
        notes: [{ text: 'On supplemental oxygen. Respiratory therapy ongoing.', author: 'Dr. James Park', timestamp: new Date().toISOString() }],
      },
      {
        name: 'Robert Chang', age: 72, gender: 'Male', bedNumber: 3,
        bloodGroup: 'B-', diagnosis: 'Septic Shock Recovery',
        attendingDoctor: 'Dr. Lisa Thompson', status: 'Stable',
        currentVitals: { heartRate: 76, oxygenLevel: 97, systolicBP: 118, diastolicBP: 76, temperature: 98.6, respiratoryRate: 16 },
        emergencyContact: { name: 'Wei Chang', phone: '555-0103', relation: 'Son' },
        allergies: [],
        medications: [{ name: 'Vancomycin', dosage: '1g', frequency: 'Every 12 hours' }],
        notes: [{ text: 'Responding to antibiotics. BP stabilizing.', author: 'Dr. Lisa Thompson', timestamp: new Date().toISOString() }],
      },
    ];

    for (const p of demoPatients) {
      const aiStatus = computeAI(p.currentVitals);
      const patient  = patientStore.create({
        id: `pat_${uuidv4()}`, ...p,
        admissionDate: new Date().toISOString(), dischargeDate: null,
        currentVitals: { ...p.currentVitals, lastUpdated: new Date().toISOString() },
        aiStatus,
        vitalHistory: [{ ...p.currentVitals, timestamp: new Date().toISOString() }],
      });
      // ✅ Save initial vitals to CSV on seed
      saveVitalsToCSV(patient, p.currentVitals, aiStatus);
    }

    // ✅ Take a full bed-status snapshot right away (includes the empty 4th bed)
    const { icuCapacity } = settingsStore.get();
    saveBedStatusSnapshotToCSV(icuCapacity || 4, patientStore.getAll());

    console.log('\x1b[32m[SEED] 3 demo patients → data/patients.json\x1b[0m');
    console.log('\x1b[32m[CSV]  Initial vitals + bed status → data/vitals-csv/*.csv\x1b[0m');
  }
};

// ── Auto port finder ──────────────────────────────────────────────────────────
const findPort = (start) => new Promise((resolve) => {
  const srv = net.createServer();
  srv.once('error', () => resolve(findPort(start + 1)));
  srv.once('listening', () => { srv.close(); resolve(start); });
  srv.listen(start);
});

let PORT = parseInt(process.env.PORT) || 5000;

findPort(PORT).then(async (availablePort) => {
  PORT = availablePort;
  server.listen(PORT, async () => {
    await seedDemoData();
    startSmsReminders();   // ✅ NEW — repeats SMS until the alert is resolved

    console.log(`\x1b[36m`);
    console.log(`╔══════════════════════════════════════════════════════╗`);
    console.log(`║    ICU AI Monitoring System  ✅  ONLINE              ║`);
    console.log(`║                                                      ║`);
    console.log(`║  Backend  : http://localhost:${PORT}                     ║`);
    console.log(`║  Users    : backend/data/users.json                  ║`);
    console.log(`║  Patients : backend/data/patients.json               ║`);
    console.log(`║  Alerts   : backend/data/alerts.json                 ║`);
    console.log(`║  Settings : backend/data/settings.json               ║`);
    console.log(`║  Vitals   : backend/data/vitals-csv/*.csv  ✅        ║`);
    console.log(`║                                                      ║`);
    console.log(`║  CSV saves: On admission + Manual update + Auto/30s  ║`);
    console.log(`╚══════════════════════════════════════════════════════╝`);
    console.log(`\x1b[0m`);
    console.log(`\x1b[33m  admin@icu.med   /  admin123\x1b[0m`);
    console.log(`\x1b[33m  doctor@icu.med  /  doctor123\x1b[0m`);
    console.log(`\x1b[33m  nurse@icu.med   /  nurse123\x1b[0m\n`);

    if (PORT !== 5000) {
      console.log(`\x1b[31m  ⚠ Port 5000 busy — using ${PORT}. Frontend auto-detects. ✅\x1b[0m\n`);
    }
  });
});