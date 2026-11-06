const fs   = require('fs');
const path = require('path');

const CSV_DIR = path.join(__dirname, '../data/vitals-csv');
if (!fs.existsSync(CSV_DIR)) fs.mkdirSync(CSV_DIR, { recursive: true });

const FILES = {
  heartRate:       path.join(CSV_DIR, 'heart_rate.csv'),
  oxygenLevel:     path.join(CSV_DIR, 'oxygen_level.csv'),
  bloodPressure:   path.join(CSV_DIR, 'blood_pressure.csv'),
  temperature:     path.join(CSV_DIR, 'temperature.csv'),
  respiratoryRate: path.join(CSV_DIR, 'respiratory_rate.csv'),
  allVitals:       path.join(CSV_DIR, 'all_vitals.csv'),
  bedCapacityLog:  path.join(CSV_DIR, 'bed_capacity_log.csv'),
  bedStatus:       path.join(CSV_DIR, 'bed_status.csv'),
};

const HEADERS = {
  heartRate:       'timestamp,patientId,patientName,bedNumber,heartRate,unit,status\n',
  oxygenLevel:     'timestamp,patientId,patientName,bedNumber,oxygenLevel,unit,status\n',
  bloodPressure:   'timestamp,patientId,patientName,bedNumber,systolicBP,diastolicBP,unit,status\n',
  temperature:     'timestamp,patientId,patientName,bedNumber,temperature,unit,status\n',
  respiratoryRate: 'timestamp,patientId,patientName,bedNumber,respiratoryRate,unit,status\n',
  allVitals:       'timestamp,patientId,patientName,bedNumber,heartRate,oxygenLevel,systolicBP,diastolicBP,temperature,respiratoryRate,riskLevel,stabilityScore\n',
  bedCapacityLog:  'timestamp,changedBy,previousCapacity,newCapacity,action,occupiedBedsAtChange\n',
  bedStatus:       'timestamp,bedNumber,occupied,patientId,patientName,heartRate,oxygenLevel,systolicBP,diastolicBP,temperature,respiratoryRate,riskLevel\n',
};

Object.entries(FILES).forEach(([key, filePath]) => {
  if (!fs.existsSync(filePath) || fs.readFileSync(filePath, 'utf8').trim() === '') {
    fs.writeFileSync(filePath, HEADERS[key]);
  }
});

const esc = (val) => {
  if (val === null || val === undefined) return '';
  const str = String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) return `"${str.replace(/"/g, '""')}"`;
  return str;
};

const appendRow = (filePath, values) => fs.appendFileSync(filePath, values.map(esc).join(',') + '\n');

const hrStatus  = (v) => v < 60 ? 'Low' : v > 100 ? 'High' : 'Normal';
const o2Status  = (v) => v < 90 ? 'Critical' : v < 95 ? 'Low' : 'Normal';
const bpStatus  = (s) => s < 90 ? 'Low' : s > 140 ? 'High' : 'Normal';
const tmpStatus = (v) => v < 96.5 ? 'Low' : v > 101.5 ? 'High' : 'Normal';
const rrStatus  = (v) => v < 12 ? 'Low' : v > 24 ? 'High' : 'Normal';

const saveVitalsToCSV = (patient, vitals, aiStatus) => {
  const now = new Date().toISOString();
  const { id, name, bedNumber } = patient;
  const { heartRate, oxygenLevel, systolicBP, diastolicBP, temperature, respiratoryRate } = vitals;

  try {
    appendRow(FILES.heartRate,       [now, id, name, bedNumber, heartRate, 'bpm', hrStatus(heartRate)]);
    appendRow(FILES.oxygenLevel,     [now, id, name, bedNumber, oxygenLevel, '%SpO2', o2Status(oxygenLevel)]);
    appendRow(FILES.bloodPressure,   [now, id, name, bedNumber, systolicBP, diastolicBP, 'mmHg', bpStatus(systolicBP)]);
    appendRow(FILES.temperature,     [now, id, name, bedNumber, temperature, 'F', tmpStatus(temperature)]);
    appendRow(FILES.respiratoryRate, [now, id, name, bedNumber, respiratoryRate, '/min', rrStatus(respiratoryRate)]);
    appendRow(FILES.allVitals,       [now, id, name, bedNumber, heartRate, oxygenLevel, systolicBP, diastolicBP, temperature, respiratoryRate, aiStatus?.riskLevel || 'Low', aiStatus?.stabilityScore ?? 85]);
  } catch (err) {
    console.error('[CSV] Write error:', err.message);
  }
};

// ✅ Logs every ICU bed capacity change (increase or decrease) to its own CSV
const saveBedCapacityChangeToCSV = (changedBy, previousCapacity, newCapacity, occupiedBedsAtChange) => {
  const now = new Date().toISOString();
  const action = newCapacity > previousCapacity ? 'INCREASED' : newCapacity < previousCapacity ? 'DECREASED' : 'UNCHANGED';
  try {
    appendRow(FILES.bedCapacityLog, [now, changedBy, previousCapacity, newCapacity, action, occupiedBedsAtChange]);
    console.log(`[CSV] Bed capacity logged → ${previousCapacity} → ${newCapacity} (${action}) by ${changedBy}`);
  } catch (err) {
    console.error('[CSV] Bed capacity log write error:', err.message);
  }
};

// ✅ Snapshots EVERY bed slot (1..icuCapacity) into bed_status.csv —
// occupied beds get real vitals, empty beds get an explicit EMPTY row.
// This guarantees bed-level data is in CSV even before/without a patient.
const saveBedStatusSnapshotToCSV = (icuCapacity, patients) => {
  const now = new Date().toISOString();
  const byBed = {};
  patients.forEach(p => { byBed[p.bedNumber] = p; });

  try {
    for (let bed = 1; bed <= icuCapacity; bed++) {
      const p = byBed[bed];
      if (p) {
        const v = p.currentVitals || {};
        appendRow(FILES.bedStatus, [
          now, bed, 'YES', p.id, p.name,
          v.heartRate ?? '', v.oxygenLevel ?? '', v.systolicBP ?? '', v.diastolicBP ?? '',
          v.temperature ?? '', v.respiratoryRate ?? '', p.aiStatus?.riskLevel || 'Low',
        ]);
      } else {
        appendRow(FILES.bedStatus, [
          now, bed, 'NO', '', 'EMPTY',
          '', '', '', '', '', '', '',
        ]);
      }
    }
  } catch (err) {
    console.error('[CSV] Bed status snapshot write error:', err.message);
  }
};

const readCSV = (type) => {
  const filePath = FILES[type];
  if (!filePath || !fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
};

const getCSVStats = () => {
  const stats = {};
  Object.entries(FILES).forEach(([key, filePath]) => {
    if (fs.existsSync(filePath)) {
      const lines = fs.readFileSync(filePath, 'utf8').split('\n').filter(Boolean);
      stats[key] = { rows: Math.max(0, lines.length - 1), file: path.basename(filePath) };
    }
  });
  return stats;
};

const clearCSV = (type) => {
  const filePath = FILES[type];
  if (!filePath) return false;
  fs.writeFileSync(filePath, HEADERS[type]);
  return true;
};

module.exports = { saveVitalsToCSV, saveBedCapacityChangeToCSV, saveBedStatusSnapshotToCSV, readCSV, getCSVStats, clearCSV, FILES };
