import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { settingsAPI } from '../services/api';

const Ctx = createContext(null);

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState({
    hospitalName: 'City General Hospital',
    icuCapacity: 4,
    alertSoundEnabled: true,
    vitalUpdateInterval: 3,
    csvSaveInterval: 30,
    timezone: 'Asia/Kolkata',
    criticalThresholds: { heartRateLow: 50, heartRateHigh: 130, oxygenLow: 90, tempHigh: 103, tempLow: 95 },
  });
  const [loaded, setLoaded] = useState(false);

  const fetchSettings = useCallback(async () => {
    try {
      const res = await settingsAPI.get();
      if (res.success) {
        setSettings(res.settings);
        setLoaded(true);
      }
    } catch (e) { /* silent - use defaults */ }
  }, []);

  useEffect(() => {
    fetchSettings();
    // Re-fetch settings every 30 seconds so Dashboard reflects changes
    const interval = setInterval(fetchSettings, 30000);
    return () => clearInterval(interval);
  }, []);

  const refreshSettings = () => fetchSettings();

  return (
    <Ctx.Provider value={{ settings, loaded, refreshSettings }}>
      {children}
    </Ctx.Provider>
  );
};

export const useSettings = () => useContext(Ctx);
