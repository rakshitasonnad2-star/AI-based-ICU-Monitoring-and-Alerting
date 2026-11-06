import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Brain, AlertTriangle, Shield, Settings } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';

const Sidebar = () => {
  const { liveAlerts } = useSocket();
  const { user }       = useAuth();
  const { settings }   = useSettings();
  const [uptime, setUptime] = useState(0);

  useEffect(() => {
    const s = Date.now();
    const t = setInterval(() => setUptime(Math.floor((Date.now() - s) / 1000)), 1000);
    return () => clearInterval(t);
  }, []);

  const fmt = (s) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  };

  return (
    <aside className="sidebar">
      <div className="sidebar-label">Navigation</div>

      <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
        <LayoutDashboard size={15}/> Dashboard
      </NavLink>
      <NavLink to="/analytics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
        <Brain size={15}/> AI Analytics
      </NavLink>

      <div className="sidebar-div"/>
      <div className="sidebar-label">System</div>

      <NavLink to="/alerts" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
        <AlertTriangle size={15}/> Alerts
        {liveAlerts.length > 0 && (
          <span className="sidebar-badge" style={{ animation:'blink 0.8s infinite' }}>
            {liveAlerts.length}
          </span>
        )}
      </NavLink>

      {user?.role === 'admin' && (
        <NavLink to="/security" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <Shield size={15}/> Security
        </NavLink>
      )}

      <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
        <Settings size={15}/> Settings
      </NavLink>

      <div className="sidebar-foot">
        <div style={{ fontFamily:'var(--fm)', fontSize:'0.6rem', color:'var(--t3)', marginBottom:4, letterSpacing:'0.08em' }}>
          {settings.hospitalName || 'ICU System'}
        </div>
        <div className="uptime-lbl">Uptime</div>
        <div className="uptime-val">{fmt(uptime)}</div>
      </div>
    </aside>
  );
};

export default Sidebar;
