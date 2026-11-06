import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { io } from 'socket.io-client';
import { alertAPI } from '../services/api';
import { useAuth } from './AuthContext';

const Ctx = createContext(null);
const PORTS = [5000, 5001, 5002, 3001];

const detectSocketURL = async () => {
  for (const port of PORTS) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) return `http://localhost:${port}`;
    } catch { /* try next */ }
  }
  return 'http://localhost:5000';
};

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [connected,    setConnected]    = useState(false);
  const [vitalsMap,    setVitalsMap]    = useState({});
  const [openAlerts,   setOpenAlerts]   = useState([]);   // alerts from the server with status "active"
  const [dismissedIds, setDismissedIds] = useState([]);   // hidden by the X button (this browser only)
  const [alertTick,    setAlertTick]    = useState(0);    // changes every time alerts are reloaded

  // Load the real alert list from the server (survives page refresh)
  const refreshAlerts = useCallback(async () => {
    if (!localStorage.getItem('icu_token')) { setOpenAlerts([]); return; }
    try {
      const r = await alertAPI.getAll();
      setOpenAlerts((r.alerts || []).filter(a => a.status === 'active'));
      setAlertTick(t => t + 1);
    } catch { /* backend may be restarting */ }
  }, []);

  const refreshRef = useRef(refreshAlerts);
  refreshRef.current = refreshAlerts;

  // Reload on login/logout and every 20 s as a safety net
  useEffect(() => {
    refreshAlerts();
    const iv = setInterval(() => refreshRef.current(), 20000);
    return () => clearInterval(iv);
  }, [user, refreshAlerts]);

  useEffect(() => {
    let socket;
    detectSocketURL().then((url) => {
      socket = io(url, { transports: ['websocket', 'polling'], reconnectionAttempts: 20, reconnectionDelay: 2000 });
      socket.on('connect',       () => setConnected(true));
      socket.on('disconnect',    () => setConnected(false));
      socket.on('connect_error', () => {});
      socket.on('vitals_update', (data) => {
        setVitalsMap(prev => ({ ...prev, [data.patientId]: { vitals: data.vitals, aiStatus: data.aiStatus } }));
      });
      socket.on('emergency_alert', () => refreshRef.current());   // new alert created
      socket.on('alert_updated',   () => refreshRef.current());   // acknowledged / resolved / deleted
    });
    return () => { if (socket) socket.disconnect(); };
  }, []);

  // "Live alerts" = alerts nobody has acknowledged yet, at most 2 per patient
  const liveAlerts = useMemo(() => {
    const perPatient = {};
    return openAlerts
      .filter(a => !dismissedIds.includes(a.id))
      .filter(a => {
        perPatient[a.patientId] = (perPatient[a.patientId] || 0) + 1;
        return perPatient[a.patientId] <= 2;
      })
      .map(a => ({ ...a, _uid: a.id }));
  }, [openAlerts, dismissedIds]);

  const dismissAlert = (uid) => setDismissedIds(prev => [...prev, uid]);

  return (
    <Ctx.Provider value={{ connected, vitalsMap, liveAlerts, dismissAlert, alertTick, refreshAlerts }}>
      {children}
    </Ctx.Provider>
  );
};

export const useSocket = () => useContext(Ctx);