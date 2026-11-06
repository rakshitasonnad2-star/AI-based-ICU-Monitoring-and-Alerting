import React, { useState, useEffect, useCallback } from 'react';
import { AlertTriangle, CheckCircle, Eye, Trash2, RefreshCw, Bell } from 'lucide-react';
import { alertAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Bg from '../components/Bg';
import '../styles/patient.css';

const riskColors = { Critical:'var(--red)', High:'var(--orange)', Medium:'var(--yellow)', Low:'var(--green)' };
const riskBgs    = { Critical:'rgba(255,51,102,0.15)', High:'rgba(255,136,0,0.12)', Medium:'rgba(255,204,0,0.1)', Low:'rgba(0,255,136,0.1)' };

export default function Alerts() {
  const [alerts,     setAlerts]     = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab,        setTab]        = useState('active');
  const [lastLoaded, setLastLoaded] = useState(null);
  const [busyId,     setBusyId]     = useState(null);
  const { alertTick } = useSocket();
  const { settings }  = useSettings();
  const { user }      = useAuth();

  // doctors and admins can resolve / delete, nurses can only acknowledge
  const canManage = user?.role === 'admin' || user?.role === 'doctor';

  // ── Load alerts from the backend ───────────────────────────────────────────
  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const [ar, sr] = await Promise.all([alertAPI.getAll(), alertAPI.getStats()]);
      setAlerts(ar.alerts || []);
      setStats(sr.stats);
      setLastLoaded(new Date());
    } catch (e) { console.error('Alerts load error:', e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // refresh instantly when a new alert arrives or someone acknowledges / resolves
  useEffect(() => { if (alertTick > 0) load(); }, [alertTick, load]);

  // refresh every 15 seconds as a safety net
  useEffect(() => {
    const iv = setInterval(() => load(), 15000);
    return () => clearInterval(iv);
  }, [load]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const run = async (id, fn) => {
    setBusyId(id);
    try { await fn(); await load(); }
    catch (e) { alert(e.message); }
    finally { setBusyId(null); }
  };

  const handleAck = (id) => run(id, () => alertAPI.acknowledge(id));

  const handleResolve = (a) => {
    if (!window.confirm(`Resolve all open alerts for ${a.patientName} (Bed ${a.bedNumber})?\n\nSMS reminders for this patient will stop.`)) return;
    run(a.id, () => alertAPI.resolve(a.id));
  };

  const handleDelete = (a) => {
    if (!window.confirm('Delete this resolved alert permanently?')) return;
    run(a.id, () => alertAPI.remove(a.id));
  };

  const handleClearResolved = () => {
    if (!window.confirm('Delete ALL resolved alerts?')) return;
    run('bulk', () => alertAPI.clearResolved());
  };

  const handleClearAll = () => {
    if (!window.confirm('Clear ALL alerts (including active ones)? This cannot be undone.')) return;
    run('bulk', () => alertAPI.clearAll());
  };

  // ── Tabs ───────────────────────────────────────────────────────────────────
  const count = (s) => alerts.filter(a => a.status === s).length;
  const tabs = [
    { key:'active',       label:`Active (${count('active')})` },
    { key:'acknowledged', label:`Acknowledged (${count('acknowledged')})` },
    { key:'resolved',     label:`Resolved (${count('resolved')})` },
    { key:'all',          label:`All (${alerts.length})` },
  ];
  const shown = alerts.filter(a => tab === 'all' || a.status === tab);   // already newest first

  if (loading) return (
    <div className="loading-screen"><div className="spinner"/><div className="loading-label">LOADING ALERTS...</div></div>
  );

  return (
    <div style={{ position:'relative' }}>
      <Bg/>
      <div className="app-layout" style={{ position:'relative', zIndex:1 }}>
        <Sidebar/>
        <div className="main-area">
          <Navbar/>
          <div className="page-content">

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
              <div>
                <div className="analytics-big-title">◈ ALERT CENTER</div>
                <div className="analytics-sub">// EMERGENCY NOTIFICATIONS & ICU ALERT MANAGEMENT</div>
                <div style={{ fontFamily:'var(--fm)', fontSize:'0.62rem', color:'var(--t3)', marginTop:4 }}>
                  {lastLoaded && <>Last refreshed: {lastLoaded.toLocaleTimeString()} · </>}
                  Auto-refresh · {settings.alertSoundEnabled ? '🔔 Sound ON' : '🔕 Sound OFF'}
                </div>
              </div>
              <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => load(true)} disabled={refreshing}>
                  <RefreshCw size={13} style={{ animation: refreshing ? 'spin 0.8s linear infinite' : 'none' }}/>
                  {refreshing ? 'Refreshing...' : 'Refresh'}
                </button>
                {canManage && count('resolved') > 0 && (
                  <button className="btn btn-ghost btn-sm" onClick={handleClearResolved} disabled={busyId === 'bulk'}>
                    <Trash2 size={13}/> Clear Resolved
                  </button>
                )}
                {user?.role === 'admin' && (
                  <button className="btn btn-danger btn-sm" onClick={handleClearAll} disabled={busyId === 'bulk'}>
                    <Trash2 size={13}/> Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))', gap:12, marginBottom:20 }}>
              {[
                { label:'Active',        value:stats?.active       ?? 0, color:'var(--yellow)' },
                { label:'Acknowledged',  value:stats?.acknowledged ?? 0, color:'var(--cyan)'   },
                { label:'Resolved',      value:stats?.resolved     ?? 0, color:'var(--green)'  },
                { label:'Critical',      value:stats?.critical     ?? 0, color:'var(--red)'    },
                { label:'High Risk',     value:stats?.high         ?? 0, color:'var(--orange)' },
                { label:'Last 24 Hours', value:stats?.last24h      ?? 0, color:'var(--purple)' },
              ].map(s => (
                <div key={s.label} className="security-stat-card">
                  <div className="security-stat-value" style={{ color:s.color }}>{s.value}</div>
                  <div className="security-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            {/* How it works */}
            <div style={{ fontFamily:'var(--fm)', fontSize:'0.66rem', color:'var(--t3)', marginBottom:14, lineHeight:1.6 }}>
              ACTIVE → nobody has seen it yet · ACKNOWLEDGED → someone is handling it · RESOLVED → fixed (SMS reminders stop).
              Each patient has at most 2 open alerts.
            </div>

            {/* Tabs */}
            <div className="alert-filter-bar">
              {tabs.map(t => (
                <button key={t.key}
                  className={`alert-filter-btn ${tab === t.key ? 'active' : ''}`}
                  onClick={() => setTab(t.key)}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* List */}
            {shown.length === 0 ? (
              <div className="glass" style={{ padding:40, textAlign:'center' }}>
                <Bell size={40} color="var(--t3)" style={{ margin:'0 auto 12px', display:'block', opacity:.4 }}/>
                <div style={{ fontFamily:'var(--fm)', fontSize:'0.85rem', color:'var(--t3)' }}>
                  No {tab === 'all' ? '' : tab} alerts
                </div>
              </div>
            ) : (
              shown.map(a => (
                <div key={a.id}
                  className={`alert-card-full ${(a.riskLevel || '').toLowerCase()} ${a.status === 'resolved' ? 'acked' : ''}`}
                  style={{ marginBottom:10 }}>

                  <div className="alert-icon-box" style={{ background: riskBgs[a.riskLevel] || 'rgba(0,212,255,0.1)' }}>
                    <AlertTriangle size={18} color={riskColors[a.riskLevel] || 'var(--cyan)'}/>
                  </div>

                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5, flexWrap:'wrap' }}>
                      <span style={{ fontFamily:'var(--fn)', fontSize:'0.78rem', color: riskColors[a.riskLevel] || 'var(--cyan)' }}>
                        BED {a.bedNumber} — {a.patientName}
                      </span>
                      <span className={`tag tag-${(a.riskLevel || 'low').toLowerCase()}`}>{a.riskLevel}</span>
                      {a.status === 'acknowledged' && <span className="tag tag-stable">✓ ACKNOWLEDGED</span>}
                      {a.status === 'resolved'     && <span className="tag tag-stable">✔ RESOLVED</span>}
                    </div>

                    <div style={{ fontFamily:'var(--fm)', fontSize:'0.76rem', color:'var(--t2)', marginBottom:5, lineHeight:1.5 }}>
                      {a.message}
                    </div>

                    <div style={{ fontFamily:'var(--fm)', fontSize:'0.62rem', color:'var(--t3)', display:'flex', gap:14, flexWrap:'wrap' }}>
                      <span>🕐 {new Date(a.timestamp).toLocaleString()}</span>
                      {a.attendingDoctor && <span>Doctor: {a.attendingDoctor}</span>}
                      {a.smsCount > 0 && (
                        <span>📱 SMS sent ×{a.smsCount}{a.lastSmsAt ? ` · last ${new Date(a.lastSmsAt).toLocaleTimeString()}` : ''}</span>
                      )}
                      {a.acknowledgedBy && a.acknowledgedAt && (
                        <span>✓ Acknowledged by <b>{a.acknowledgedBy}</b> at {new Date(a.acknowledgedAt).toLocaleTimeString()}</span>
                      )}
                      {a.resolvedBy && a.resolvedAt && (
                        <span>✔ Resolved by <b>{a.resolvedBy}</b> at {new Date(a.resolvedAt).toLocaleTimeString()}</span>
                      )}
                    </div>
                  </div>

                  {/* Buttons */}
                  <div style={{ display:'flex', gap:8, alignSelf:'flex-start', flexShrink:0, flexWrap:'wrap', justifyContent:'flex-end' }}>
                    {a.status === 'active' && (
                      <button className="btn btn-ghost btn-sm" disabled={busyId === a.id} onClick={() => handleAck(a.id)}>
                        <Eye size={12}/> ACK
                      </button>
                    )}
                    {a.status !== 'resolved' && canManage && (
                      <button className="btn btn-primary btn-sm" disabled={busyId === a.id} onClick={() => handleResolve(a)}>
                        <CheckCircle size={12}/> RESOLVE
                      </button>
                    )}
                    {a.status === 'resolved' && canManage && (
                      <button className="btn btn-danger btn-sm" disabled={busyId === a.id} onClick={() => handleDelete(a)}>
                        <Trash2 size={12}/> DELETE
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}

          </div>
        </div>
      </div>
    </div>
  );
}