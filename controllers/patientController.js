const { v4: uuidv4 } = require('uuid');
const { patientStore, alertStore, settingsStore } = require('../storage/fileStore');
const { computeAI } = require('../config/aiEngine');
const { maybeRaiseAlert } = require('../config/alertService');
const { saveVitalsToCSV, saveBedStatusSnapshotToCSV } = require('../storage/csvStore');

exports.getAllPatients = (req, res) => {
  try {
    const patients = patientStore.getAll();
    res.json({ success: true, count: patients.length, patients });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getPatientById = (req, res) => {
  try {
    const patient = patientStore.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, patient });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.addPatient = (req, res) => {
  try {
    const { name, age, gender, bedNumber, diagnosis, attendingDoctor,
            bloodGroup, emergencyContact, currentVitals, allergies, medications, status } = req.body;

    if (!name || !age || !gender || !bedNumber || !diagnosis || !attendingDoctor)
      return res.status(400).json({ success: false, message: 'Missing required fields.' });

    // ✅ Validate bed number against current ICU capacity from settings
    const { icuCapacity } = settingsStore.get();
    const bedNum = parseInt(bedNumber);
    if (bedNum < 1 || bedNum > icuCapacity) {
      return res.status(400).json({ success: false, message: `Invalid bed number. ICU currently has ${icuCapacity} bed(s) (1–${icuCapacity}).` });
    }

    const bedOccupied = patientStore.findByBed(parseInt(bedNumber));
    if (bedOccupied)
      return res.status(400).json({ success: false, message: `ICU Bed ${bedNumber} is already occupied by ${bedOccupied.name}.` });

    const vitals = currentVitals || { heartRate: 72, oxygenLevel: 98, systolicBP: 120, diastolicBP: 80, temperature: 98.6, respiratoryRate: 16 };
    const aiStatus = computeAI(vitals);

    const patient = patientStore.create({
      id: `pat_${uuidv4()}`,
      name: name.trim(), age: parseInt(age), gender,
      bedNumber: parseInt(bedNumber), bloodGroup: bloodGroup || 'O+',
      diagnosis: diagnosis.trim(), attendingDoctor: attendingDoctor.trim(),
      status: status || 'Stable',
      admissionDate: new Date().toISOString(), dischargeDate: null,
      currentVitals: { ...vitals, lastUpdated: new Date().toISOString() },
      aiStatus,
      emergencyContact: emergencyContact || {},
      allergies: allergies || [],
      medications: medications || [],
      notes: [],
      vitalHistory: [{ ...vitals, timestamp: new Date().toISOString() }],
    });

    // ✅ Save INITIAL vitals to all 6 CSV files immediately on admission
    saveVitalsToCSV(patient, vitals, aiStatus);
    console.log(`[CSV] Initial vitals saved for ${patient.name} (Bed ${patient.bedNumber}) → source: admission`);

    // ✅ Snapshot ALL bed slots (occupied + still-empty) into bed_status.csv right away
    saveBedStatusSnapshotToCSV(icuCapacity, patientStore.getAll());

    // High / Critical on admission -> alert (max 2 open per patient) + SMS
    maybeRaiseAlert(patient, vitals, aiStatus, req.app.get('io'), { type: 'admission', ignoreCooldown: true });

    res.status(201).json({ success: true, message: 'Patient admitted successfully.', patient });
  } catch (e) {
    console.error('[PATIENT] Add error:', e.message);
    res.status(500).json({ success: false, message: e.message });
  }
};

exports.updatePatient = (req, res) => {
  try {
    const patient = patientStore.findById(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    const updated = patientStore.updateById(req.params.id, req.body);
    res.json({ success: true, message: 'Patient updated.', patient: updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

// ── MANUAL VITAL UPDATE (Doctor clicks "Save Vitals") ────────────────────────
exports.updateVitals = (req, res) => {
  try {
    const { heartRate, oxygenLevel, systolicBP, diastolicBP, temperature, respiratoryRate } = req.body;

    const vitals = {
      heartRate:       parseFloat(heartRate),
      oxygenLevel:     parseFloat(oxygenLevel),
      systolicBP:      parseFloat(systolicBP),
      diastolicBP:     parseFloat(diastolicBP),
      temperature:     parseFloat(temperature),
      respiratoryRate: parseFloat(respiratoryRate || 16),
    };

    const aiStatus = computeAI(vitals);

    // 1. Update patients.json — vitalHistory + currentVitals
    const patient = patientStore.updateVitals(req.params.id, vitals);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    // 2. Update aiStatus in patients.json
    const updated = patientStore.updateById(req.params.id, { aiStatus });

    // 3. ✅ Save MANUAL vitals to all 6 CSV files immediately
    saveVitalsToCSV(patient, vitals, aiStatus);
    console.log(`[CSV] Manual vitals saved for ${patient.name} → HR:${vitals.heartRate} O2:${vitals.oxygenLevel} Risk:${aiStatus.riskLevel} → source: manual`);

    // ✅ Refresh bed status snapshot (occupied + empty beds) with the latest vitals
    const { icuCapacity: capacityNow } = settingsStore.get();
    saveBedStatusSnapshotToCSV(capacityNow, patientStore.getAll());

    // 4. Emit real-time update to all browsers
    const io = req.app.get('io');
    if (io) {
      io.emit('vitals_update', {
        patientId: patient.id, bedNumber: patient.bedNumber,
        name: patient.name, vitals, aiStatus,
      });
    }

    // High / Critical -> alert (max 2 open per patient) + SMS to the assigned doctor / nurse
    maybeRaiseAlert(patient, vitals, aiStatus, io, { type: 'manual_vitals', ignoreCooldown: true });

    res.json({ success: true, message: 'Vitals updated and saved to CSV.', patient: updated });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.addNote = (req, res) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: 'Note text required.' });
    const patient = patientStore.addNote(req.params.id, { text, author: req.user.name || 'Staff' });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, patient });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.dischargePatient = (req, res) => {
  try {
    const patient = patientStore.discharge(req.params.id);
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    // ✅ Snapshot bed status — discharged bed now shows EMPTY in bed_status.csv
    const { icuCapacity } = settingsStore.get();
    saveBedStatusSnapshotToCSV(icuCapacity, patientStore.getAll());

    res.json({ success: true, message: `${patient.name} discharged successfully.`, patient });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.deletePatient = (req, res) => {
  try {
    const deleted = patientStore.delete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Patient not found.' });
    res.json({ success: true, message: 'Patient record deleted.' });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getAnalytics = (req, res) => {
  try {
    const patients = patientStore.getAll();
    const alerts   = alertStore.getRecent(10);
    const { icuCapacity } = settingsStore.get();          // ✅ dynamic from settings
    const totalBeds = icuCapacity || 4;
    const occupiedBeds = patients.length;
    const avg = (key) => patients.length
      ? parseFloat((patients.reduce((s, p) => s + (p.currentVitals?.[key] || 0), 0) / patients.length).toFixed(1))
      : 0;

    res.json({
      success: true,
      analytics: {
        totalBeds, occupiedBeds,
        availableBeds: totalBeds - occupiedBeds,
        occupancyRate: Math.round((occupiedBeds / totalBeds) * 100),
        criticalCount: patients.filter(p => p.aiStatus?.riskLevel === 'Critical').length,
        highRiskCount: patients.filter(p => p.aiStatus?.riskLevel === 'High').length,
        avgHeartRate:  avg('heartRate'),
        avgOxygen:     avg('oxygenLevel'),
        avgTemp:       avg('temperature'),
        avgStability:  patients.length
          ? Math.round(patients.reduce((s, p) => s + (p.aiStatus?.stabilityScore || 80), 0) / patients.length)
          : 0,
        patientsByStatus: {
          Critical:  patients.filter(p => p.status === 'Critical').length,
          Serious:   patients.filter(p => p.status === 'Serious').length,
          Stable:    patients.filter(p => p.status === 'Stable').length,
          Improving: patients.filter(p => p.status === 'Improving').length,
        },
        recentAlerts: alerts,
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};