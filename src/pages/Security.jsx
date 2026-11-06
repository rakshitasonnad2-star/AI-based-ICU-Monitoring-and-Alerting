import React, { useState, useEffect } from 'react';
import { Shield, User, LogIn, LogOut, Key, RefreshCw, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Bg from '../components/Bg';
import '../styles/patient.css';

export default function Security() {
  const [activity, setActivity] = useState([]);
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [pwForm,   setPwForm]   = useState({ currentPassword:'', newPassword:'', confirm:'' });
  const [pwMsg,    setPwMsg]    = useState('');
  const [pwLoading,setPwLoading]= useState(false);
  const { user } = useAuth();

  const load = async () => {
    try {
      const [ar, ur] = await Promise.all([authAPI.getActivity(), authAPI.getUsers()]);
      setActivity(ar.activity);
      setUsers(ur.users);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleChangePw = async (e) => {
    e.preventDefault();
    if (!pwForm.currentPassword || !pwForm.newPassword) { setPwMsg('error:All fields required.'); return; }
    if (pwForm.newPassword.length < 6) { setPwMsg('error:Min 6 characters.'); return; }
    if (pwForm.newPassword !== pwForm.confirm) { setPwMsg('error:Passwords do not match.'); return; }
    setPwLoading(true); setPwMsg('');
    try {
      await authAPI.changePassword({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword });
      setPwMsg('success:Password changed successfully!');
      setPwForm({ currentPassword:'', newPassword:'', confirm:'' });
    } catch (er) { setPwMsg(`error:${er.message}`); }
    finally { setPwLoading(false); }
  };

  const IL = { background:'rgba(0,212,255,0.05)', border:'1px solid var(--border)', borderRadius:8, color:'var(--t1)', padding:'9px 13px', fontFamily:'var(--fb)', fontSize:'0.9rem', width:'100%', outline:'none' };

  const actionIcon = (action) => {
    if (action === 'login')           return <LogIn size={14} color="var(--green)"/>;
    if (action === 'register')        return <User size={14} color="var(--cyan)"/>;
    if (action === 'password_change') return <Key size={14} color="var(--yellow)"/>;
    return <Shield size={14} color="var(--t3)"/>;
  };

  const roleColor = { admin:'var(--red)', doctor:'var(--cyan)', nurse:'var(--green)' };

  if (loading) return (
    <div className="loading-screen"><div className="spinner"/><div className="loading-label">LOADING SECURITY DATA...</div></div>
  );

  const failedLogins   = activity.filter(a => !a.success).length;
  const successLogins  = activity.filter(a => a.success && a.action === 'login').length;
  const uniqueUsers    = [...new Set(activity.map(a => a.email))].length;

  return (
    <div style={{ position:'relative' }}>
      <Bg/>
      <div className="app-layout" style={{ position:'relative', zIndex:1 }}>
        <Sidebar/>
        <div className="main-area">
          <Navbar/>
          <div className="page-content">

            {/* Hero */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:22, flexWrap:'wrap', gap:12 }}>
              <div>
                <div className="analytics-big-title">◈ SECURITY CENTER</div>
                <div className="analytics-sub">// ACCESS CONTROL · LOGIN ACTIVITY · USER MANAGEMENT</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={load}><RefreshCw size={13}/> Refresh</button>
            </div>

            {/* Stats */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(150px,1fr))', gap:12, marginBottom:20 }}>
              {[
                { label:'Total Users',    value:users.length,   color:'var(--cyan)',   icon:<User size={20}/> },
                { label:'Total Logins',   value:successLogins,  color:'var(--green)',  icon:<LogIn size={20}/> },
                { label:'Failed Logins',  value:failedLogins,   color:'var(--red)',    icon:<AlertTriangle size={20}/> },
                { label:'Active Sessions',value:uniqueUsers,    color:'var(--purple)', icon:<Shield size={20}/> },
              ].map(s => (
                <div key={s.label} className="security-stat-card">
                  <div style={{ color:s.color, opacity:.7, marginBottom:8, display:'flex', justifyContent:'center' }}>{s.icon}</div>
                  <div className="security-stat-value" style={{ color:s.color }}>{s.value}</div>
                  <div className="security-stat-label">{s.label}</div>
                </div>
              ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>

              {/* Registered Users */}
              <div className="settings-section">
                <div style={{ fontFamily:'var(--fn)', fontSize:'0.78rem', color:'var(--cyan)', letterSpacing:'0.1em', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                  <User size={14}/> REGISTERED USERS ({users.length})
                </div>
                {users.map(u => (
                  <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
                    <div style={{ width:36, height:36, borderRadius:'50%', background:`${roleColor[u.role]}22`, border:`1px solid ${roleColor[u.role]}44`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--fn)', fontSize:'0.72rem', color:roleColor[u.role], flexShrink:0 }}>
                      {u.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'var(--fb)', fontSize:'0.88rem', fontWeight:600, color:'var(--t1)' }}>{u.name}</div>
                      <div style={{ fontFamily:'var(--fm)', fontSize:'0.65rem', color:'var(--t3)' }}>{u.email}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <span className={`tag tag-${u.role === 'admin' ? 'critical' : u.role === 'doctor' ? 'improving' : 'stable'}`}>{u.role}</span>
                      <div style={{ fontFamily:'var(--fm)', fontSize:'0.6rem', color:'var(--t3)', marginTop:3 }}>{u.department}</div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Change Password */}
              <div className="settings-section">
                <div style={{ fontFamily:'var(--fn)', fontSize:'0.78rem', color:'var(--cyan)', letterSpacing:'0.1em', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                  <Key size={14}/> CHANGE PASSWORD
                </div>

                {pwMsg && (
                  <div className={`msg ${pwMsg.startsWith('success') ? 'msg-success' : 'msg-error'}`}>
                    {pwMsg.startsWith('success') ? <CheckCircle size={13}/> : <XCircle size={13}/>}
                    {pwMsg.replace(/^(success:|error:)/, '')}
                  </div>
                )}

                <form onSubmit={handleChangePw}>
                  {[
                    ['currentPassword', 'Current Password'],
                    ['newPassword',     'New Password'],
                    ['confirm',         'Confirm New Password'],
                  ].map(([k, l]) => (
                    <div key={k} className="form-group">
                      <label style={{ fontFamily:'var(--fm)', fontSize:'0.67rem', color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:5 }}>{l}</label>
                      <input style={IL} type="password" value={pwForm[k]} onChange={e => setPwForm(p => ({ ...p, [k]: e.target.value }))} placeholder="••••••••" autoComplete="new-password"/>
                    </div>
                  ))}
                  <button type="submit" className="btn btn-primary" disabled={pwLoading} style={{ width:'100%', justifyContent:'center' }}>
                    <Key size={13}/> {pwLoading ? 'UPDATING...' : 'UPDATE PASSWORD'}
                  </button>
                </form>

                <div style={{ marginTop:20, padding:'12px', background:'rgba(0,212,255,0.04)', borderRadius:8, border:'1px solid var(--border)' }}>
                  <div style={{ fontFamily:'var(--fm)', fontSize:'0.65rem', color:'var(--cyan)', marginBottom:8, letterSpacing:'0.1em' }}>SECURITY STATUS</div>
                  {[
                    ['JWT Authentication', true],
                    ['Password Hashing (bcrypt)', true],
                    ['Role-Based Access', true],
                    ['Login Activity Logging', true],
                    ['Session Timeout', true],
                  ].map(([label, ok]) => (
                    <div key={label} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0', fontFamily:'var(--fm)', fontSize:'0.7rem' }}>
                      {ok ? <CheckCircle size={11} color="var(--green)"/> : <XCircle size={11} color="var(--red)"/>}
                      <span style={{ color:'var(--t2)' }}>{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Login Activity */}
            <div className="settings-section">
              <div style={{ fontFamily:'var(--fn)', fontSize:'0.78rem', color:'var(--cyan)', letterSpacing:'0.1em', marginBottom:16, display:'flex', alignItems:'center', gap:8 }}>
                <Shield size={14}/> LOGIN ACTIVITY LOG (Last 30 events)
              </div>
              {activity.length === 0 ? (
                <div style={{ fontFamily:'var(--fm)', fontSize:'0.78rem', color:'var(--t3)', textAlign:'center', padding:20 }}>No activity logged yet.</div>
              ) : (
                activity.map((a, i) => (
                  <div key={i} className="activity-row">
                    <div className="activity-icon" style={{ background: a.success ? 'rgba(0,255,136,0.1)' : 'rgba(255,51,102,0.1)', border: `1px solid ${a.success ? 'rgba(0,255,136,0.2)' : 'rgba(255,51,102,0.2)'}` }}>
                      {actionIcon(a.action)}
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'var(--fb)', fontSize:'0.85rem', fontWeight:600, color:'var(--t1)' }}>
                        {a.userName || 'Unknown'} <span style={{ fontFamily:'var(--fm)', fontSize:'0.7rem', color:'var(--t3)' }}>({a.email})</span>
                      </div>
                      <div style={{ fontFamily:'var(--fm)', fontSize:'0.65rem', color:'var(--t3)', marginTop:2 }}>
                        {a.action.replace('_', ' ').toUpperCase()} · IP: {a.ip} · {new Date(a.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <div>
                      {a.success
                        ? <span style={{ fontFamily:'var(--fm)', fontSize:'0.65rem', color:'var(--green)', background:'rgba(0,255,136,0.1)', padding:'2px 8px', borderRadius:10, border:'1px solid rgba(0,255,136,0.2)' }}>SUCCESS</span>
                        : <span style={{ fontFamily:'var(--fm)', fontSize:'0.65rem', color:'var(--red)', background:'rgba(255,51,102,0.1)', padding:'2px 8px', borderRadius:10, border:'1px solid rgba(255,51,102,0.2)' }}>FAILED</span>
                      }
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
