import React, { useState, useEffect } from 'react';
import { Settings, Save, RefreshCw, Trash2, Download, Server, Bell, Shield, Database, CheckCircle, AlertCircle } from 'lucide-react';
import { settingsAPI, vitalsAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Bg from '../components/Bg';
import '../styles/patient.css';

const Toggle = ({ checked, onChange }) => (
  <label className="toggle-switch">
    <input type="checkbox" checked={!!checked} onChange={e => onChange(e.target.checked)} />
    <span className="toggle-slider" />
  </label>
);

export default function SettingsPage() {
  const [sysInfo,  setSysInfo]  = useState(null);
  const [csvStats, setCsvStats] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState('');
  const [local,    setLocal]    = useState({});
  const { user } = useAuth();
  const { settings, refreshSettings } = useSettings();   // ✅ global settings context
  const isAdmin = user?.role === 'admin';

  // initialise local form from global settings
  useEffect(() => { setLocal({ ...settings }); }, [settings]);

  const load = async () => {
    try {
      const [ir, cr] = await Promise.all([settingsAPI.systemInfo(), vitalsAPI.stats()]);
      setSysInfo(ir.system);
      setCsvStats(cr.stats);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // ── Save settings ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!isAdmin) return;
    setSaving(true); setMsg('');
    try {
      const res = await settingsAPI.update(local);
      // ✅ Immediately push updated settings into global context → Navbar/Dashboard/Analytics re-render
      await refreshSettings();
      if (res.warning) {
        setMsg(`warn:Settings saved. ${res.warning}`);
        setTimeout(() => setMsg(''), 7000);
      } else {
        setMsg('success:Settings saved and applied across the system — Dashboard bed count updated instantly.');
        setTimeout(() => setMsg(''), 4000);
      }
    } catch (e) { setMsg(`error:${e.message}`); }
    finally { setSaving(false); }
  };

  const handleClearCSV = async (type) => {
    if (!isAdmin) return;
    if (!window.confirm(`Clear ${type} CSV? This deletes ALL recorded data for this vital.`)) return;
    try {
      await vitalsAPI.clear(type);
      await load();
      setMsg('success:CSV file cleared successfully.');
      setTimeout(() => setMsg(''), 3000);
    } catch (e) { setMsg(`error:${e.message}`); }
  };

  const handleDownloadCSV = async (type, filename) => {
    try { await vitalsAPI.download(type, filename); }
    catch (e) { alert(e.message); }
  };

  const set = (k, v) => setLocal(p => ({ ...p, [k]: v }));
  const setThreshold = (k, v) => setLocal(p => ({
    ...p,
    criticalThresholds: { ...p.criticalThresholds, [k]: parseFloat(v) || 0 }
  }));

  const IL = {
    background: 'rgba(0,212,255,0.05)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--t1)', padding: '8px 12px',
    fontFamily: 'var(--fb)', fontSize: '0.9rem', outline: 'none',
  };

  const CSV_FILES = [
    { type: 'heartRate',       label: 'Heart Rate',         file: 'heart_rate.csv' },
    { type: 'oxygenLevel',     label: 'O₂ Level',           file: 'oxygen_level.csv' },
    { type: 'bloodPressure',   label: 'Blood Pressure',     file: 'blood_pressure.csv' },
    { type: 'temperature',     label: 'Temperature',        file: 'temperature.csv' },
    { type: 'respiratoryRate', label: 'Resp. Rate',         file: 'respiratory_rate.csv' },
    { type: 'allVitals',       label: 'All Vitals',         file: 'all_vitals.csv' },
    { type: 'bedStatus',       label: 'Bed Status (All Beds)', file: 'bed_status.csv' },
    { type: 'bedCapacityLog',  label: 'Bed Capacity Log',   file: 'bed_capacity_log.csv' },
  ];

  if (loading) return (
    <div className="loading-screen"><div className="spinner"/><div className="loading-label">LOADING SETTINGS...</div></div>
  );

  return (
    <div style={{ position: 'relative' }}>
      <Bg/>
      <div className="app-layout" style={{ position: 'relative', zIndex: 1 }}>
        <Sidebar/>
        <div className="main-area">
          <Navbar/>
          <div className="page-content">

            {/* Hero */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
              <div>
                <div className="analytics-big-title">◈ SYSTEM SETTINGS</div>
                <div className="analytics-sub">// HOSPITAL CONFIG · CSV MANAGEMENT · SYSTEM INFO</div>
                <div style={{ fontFamily:'var(--fm)', fontSize:'0.65rem', color:'var(--green)', marginTop:4 }}>
                  ✅ Changes saved here apply instantly to Dashboard, Navbar & Alerts
                </div>
              </div>
              <div style={{ display:'flex', gap:10 }}>
                <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13}/> Refresh</button>
                {isAdmin && (
                  <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
                    <Save size={13}/> {saving ? 'SAVING...' : 'SAVE & APPLY'}
                  </button>
                )}
              </div>
            </div>

            {/* Status message */}
            {msg && (
              <div
                className={`msg ${msg.startsWith('success') ? 'msg-success' : msg.startsWith('warn') ? 'msg-warn' : 'msg-error'}`}
                style={msg.startsWith('warn') ? { background:'rgba(255,204,0,0.12)', border:'1px solid rgba(255,204,0,0.3)', color:'var(--yellow)', marginBottom:16 } : { marginBottom:16 }}
              >
                {msg.startsWith('success') ? <CheckCircle size={13}/> : <AlertCircle size={13}/>}
                {msg.replace(/^(success:|error:|warn:)/, '')}
              </div>
            )}

            {!isAdmin && (
              <div className="msg msg-info" style={{ marginBottom:16 }}>
                <Shield size={13}/> View-only mode. Only admins can modify settings.
              </div>
            )}

            {/* Live preview of active settings */}
            <div style={{ background:'rgba(0,255,136,0.05)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', gap:24, flexWrap:'wrap' }}>
              <div style={{ fontFamily:'var(--fm)', fontSize:'0.68rem', color:'var(--green)', marginBottom:4, width:'100%', letterSpacing:'0.1em' }}>
                ✅ CURRENTLY ACTIVE SETTINGS (live across all pages)
              </div>
              {[
                ['Hospital', settings.hospitalName],
                ['ICU Beds', settings.icuCapacity],
                ['Alert Sound', settings.alertSoundEnabled ? 'ON' : 'OFF'],
                ['Vital Interval', `${settings.vitalUpdateInterval}s`],
                ['CSV Interval', `${settings.csvSaveInterval}s`],
                ['Timezone', settings.timezone],
              ].map(([k, v]) => (
                <div key={k} style={{ textAlign:'center' }}>
                  <div style={{ fontFamily:'var(--fm)', fontSize:'0.6rem', color:'var(--t3)', textTransform:'uppercase', marginBottom:2 }}>{k}</div>
                  <div style={{ fontFamily:'var(--fm)', fontSize:'0.82rem', fontWeight:700, color:'var(--cyan)' }}>{String(v)}</div>
                </div>
              ))}
            </div>

            {/* ── Hospital Configuration ── */}
            <div className="settings-section">
              <div style={{ fontFamily:'var(--fn)', fontSize:'0.78rem', color:'var(--cyan)', letterSpacing:'0.1em', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <Settings size={14}/> HOSPITAL CONFIGURATION
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Hospital Name</div>
                  <div className="settings-row-desc">Shown in Navbar and Dashboard header</div>
                </div>
                <input style={{ ...IL, maxWidth:220 }} disabled={!isAdmin}
                  value={local.hospitalName || ''} onChange={e => set('hospitalName', e.target.value)}
                  placeholder="City General Hospital"/>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">ICU Bed Capacity</div>
                  <div className="settings-row-desc">Total number of ICU beds monitored</div>
                </div>
                <input style={{ ...IL, maxWidth:80 }} type="number" min="1" max="20" disabled={!isAdmin}
                  value={local.icuCapacity || 4} onChange={e => set('icuCapacity', parseInt(e.target.value))}/>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Vital Update Interval (seconds)</div>
                  <div className="settings-row-desc">How often live vitals refresh on Dashboard</div>
                </div>
                <input style={{ ...IL, maxWidth:80 }} type="number" min="1" max="60" disabled={!isAdmin}
                  value={local.vitalUpdateInterval || 3} onChange={e => set('vitalUpdateInterval', parseInt(e.target.value))}/>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">CSV Auto-Save Interval (seconds)</div>
                  <div className="settings-row-desc">How often vitals are written to CSV files automatically</div>
                </div>
                <input style={{ ...IL, maxWidth:80 }} type="number" min="10" max="300" disabled={!isAdmin}
                  value={local.csvSaveInterval || 30} onChange={e => set('csvSaveInterval', parseInt(e.target.value))}/>
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Timezone</div>
                  <div className="settings-row-desc">Used for all timestamps in the system</div>
                </div>
                <select style={{ ...IL, maxWidth:200 }} disabled={!isAdmin}
                  value={local.timezone || 'Asia/Kolkata'} onChange={e => set('timezone', e.target.value)}>
                  {['Asia/Kolkata','Asia/Dubai','Asia/Singapore','America/New_York',
                    'America/Los_Angeles','Europe/London','Europe/Berlin','Australia/Sydney'].map(tz => (
                    <option key={tz}>{tz}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Alert Settings ── */}
            <div className="settings-section">
              <div style={{ fontFamily:'var(--fn)', fontSize:'0.78rem', color:'var(--cyan)', letterSpacing:'0.1em', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <Bell size={14}/> ALERT CONFIGURATION
              </div>

              <div className="settings-row">
                <div>
                  <div className="settings-row-label">Alert Sound Notification</div>
                  <div className="settings-row-desc">Play beep sound when an emergency alert arrives on Navbar</div>
                </div>
                <Toggle checked={local.alertSoundEnabled ?? true}
                  onChange={v => set('alertSoundEnabled', v)}/>
              </div>
            </div>

            {/* ── AI Critical Thresholds ── */}
            <div className="settings-section">
              <div style={{ fontFamily:'var(--fn)', fontSize:'0.78rem', color:'var(--cyan)', letterSpacing:'0.1em', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <AlertCircle size={14}/> AI CRITICAL THRESHOLDS
              </div>
              <div style={{ fontFamily:'var(--fm)', fontSize:'0.72rem', color:'var(--t3)', marginBottom:14 }}>
                These values are used by the AI engine to calculate risk level. Changes apply after Save.
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
                {[
                  ['heartRateLow',  'Heart Rate Low (bpm)',   '50'],
                  ['heartRateHigh', 'Heart Rate High (bpm)',  '130'],
                  ['oxygenLow',     'O₂ Critical Low (%)',    '90'],
                  ['tempHigh',      'Temperature High (°F)',  '103'],
                  ['tempLow',       'Temperature Low (°F)',   '95'],
                ].map(([k, l, ph]) => (
                  <div key={k}>
                    <label style={{ fontFamily:'var(--fm)', fontSize:'0.65rem', color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:5 }}>
                      {l}
                    </label>
                    <input style={IL} type="number" step="0.1" disabled={!isAdmin}
                      value={local.criticalThresholds?.[k] ?? ph}
                      onChange={e => setThreshold(k, e.target.value)}
                      placeholder={ph}/>
                  </div>
                ))}
              </div>
            </div>

            {/* ── CSV File Management ── */}
            <div className="settings-section">
              <div style={{ fontFamily:'var(--fn)', fontSize:'0.78rem', color:'var(--cyan)', letterSpacing:'0.1em', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <Database size={14}/> CSV VITAL DATA FILES
              </div>
              <div style={{ marginBottom:14, fontFamily:'var(--fm)', fontSize:'0.72rem', color:'var(--t3)' }}>
                Location: <span style={{ color:'var(--cyan)' }}>backend/data/vitals-csv/</span>
                &nbsp;· CSV files save on: <span style={{ color:'var(--green)' }}>Patient Admission + Manual Vital Update + Auto every {settings.csvSaveInterval}s</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:10 }}>
                {CSV_FILES.map(f => (
                  <div key={f.type} style={{ background:'rgba(0,212,255,0.04)', border:'1px solid var(--border)', borderRadius:8, padding:14 }}>
                    <div style={{ fontFamily:'var(--fb)', fontSize:'0.88rem', fontWeight:600, color:'var(--t1)', marginBottom:3 }}>{f.label}</div>
                    <div style={{ fontFamily:'var(--fm)', fontSize:'0.65rem', color:'var(--t3)', marginBottom:10 }}>
                      {csvStats?.[f.type]?.rows ?? 0} rows · {f.file}
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-ghost btn-sm" style={{ flex:1, justifyContent:'center' }}
                        onClick={() => handleDownloadCSV(f.type, f.file)}>
                        <Download size={11}/> Download
                      </button>
                      {isAdmin && (
                        <button className="btn btn-danger btn-sm" style={{ flex:1, justifyContent:'center' }}
                          onClick={() => handleClearCSV(f.type)}>
                          <Trash2 size={11}/> Clear
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── System Information ── */}
            {sysInfo && (
              <div className="settings-section">
                <div style={{ fontFamily:'var(--fn)', fontSize:'0.78rem', color:'var(--cyan)', letterSpacing:'0.1em', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                  <Server size={14}/> SYSTEM INFORMATION
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
                  {[
                    ['Node.js Version',   sysInfo.nodeVersion],
                    ['Platform',          sysInfo.platform],
                    ['Storage Type',      sysInfo.storageType],
                    ['Memory Usage',      `${sysInfo.memoryUsageMB} MB`],
                    ['System Uptime',     `${Math.floor(sysInfo.uptime / 60)} min`],
                    ['Total Users',       sysInfo.totalUsers],
                    ['Admins',            sysInfo.usersByRole?.admin ?? 0],
                    ['Doctors',           sysInfo.usersByRole?.doctor ?? 0],
                    ['Nurses',            sysInfo.usersByRole?.nurse ?? 0],
                  ].map(([k, v]) => (
                    <div key={k} style={{ background:'rgba(0,212,255,0.04)', borderRadius:8, padding:'10px 14px', border:'1px solid var(--border)' }}>
                      <div style={{ fontFamily:'var(--fm)', fontSize:'0.6rem', color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:4 }}>{k}</div>
                      <div style={{ fontFamily:'var(--fm)', fontSize:'0.9rem', fontWeight:700, color:'var(--cyan)' }}>{v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Save button at bottom */}
            {isAdmin && (
              <div style={{ textAlign:'center', marginTop:8, marginBottom:24 }}>
                <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                  <Save size={14}/> {saving ? 'SAVING...' : 'SAVE & APPLY ALL SETTINGS'}
                </button>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
