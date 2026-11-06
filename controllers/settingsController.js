const { settingsStore, userStore, patientStore } = require('../storage/fileStore');
const { saveBedCapacityChangeToCSV, saveBedStatusSnapshotToCSV } = require('../storage/csvStore');

exports.getSettings = (req, res) => {
  try {
    const settings = settingsStore.get();
    res.json({ success: true, settings });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.updateSettings = (req, res) => {
  try {
    if (req.user.role !== 'admin') return res.status(403).json({ success: false, message: 'Only admin can change system settings.' });

    // ✅ If icuCapacity is being changed, log it to bed_capacity_log.csv (increase or decrease)
    let warning = null;
    if (req.body.icuCapacity !== undefined) {
      const previousCapacity = settingsStore.get().icuCapacity;
      const newCapacity = parseInt(req.body.icuCapacity);
      const occupiedBeds = patientStore.getAll().map(p => p.bedNumber);

      if (newCapacity !== previousCapacity) {
        saveBedCapacityChangeToCSV(req.user.name || req.user.email, previousCapacity, newCapacity, occupiedBeds.length);
      }

      const bedsAboveCapacity = occupiedBeds.filter(b => b > newCapacity);
      if (bedsAboveCapacity.length > 0) {
        warning = `Note: Bed(s) ${bedsAboveCapacity.join(', ')} still have active patients above the new capacity of ${newCapacity}. Discharge them or increase capacity to manage those beds normally.`;
      }
    }

    const settings = settingsStore.update(req.body);

    // ✅ If capacity changed, snapshot full bed status (new empty beds now appear in CSV)
    if (req.body.icuCapacity !== undefined) {
      saveBedStatusSnapshotToCSV(settings.icuCapacity, patientStore.getAll());
    }

    res.json({ success: true, message: 'Settings updated successfully.', settings, warning });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};

exports.getSystemInfo = (req, res) => {
  try {
    const users = userStore.getAll();
    res.json({
      success: true,
      system: {
        nodeVersion: process.version,
        uptime: Math.floor(process.uptime()),
        platform: process.platform,
        totalUsers: users.length,
        usersByRole: {
          admin: users.filter(u => u.role === 'admin').length,
          doctor: users.filter(u => u.role === 'doctor').length,
          nurse: users.filter(u => u.role === 'nurse').length,
        },
        storageType: 'File-based JSON + CSV',
        memoryUsageMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      },
    });
  } catch (e) { res.status(500).json({ success: false, message: e.message }); }
};
