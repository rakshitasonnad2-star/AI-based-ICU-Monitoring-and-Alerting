import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, User, Briefcase, Shield, Eye, EyeOff, AlertCircle, CheckCircle, UserPlus } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Bg from '../components/Bg';
import '../styles/auth.css';

export default function Register() {
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'', role:'doctor', department:'ICU' });
  const [showPw, setShowPw]   = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [success, setSuccess] = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const set = (k) => (e) => { setForm(p => ({ ...p, [k]: e.target.value })); setError(''); };

  const validate = () => {
    if (!form.name.trim())           return 'Full name is required.';
    if (!form.email.trim())          return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email address.';
    if (!form.password)              return 'Password is required.';
    if (form.password.length < 6)   return 'Password must be at least 6 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setLoading(true); setError(''); setSuccess('');
    try {
      const res = await authAPI.register({
        name: form.name.trim(), email: form.email.trim().toLowerCase(),
        password: form.password, role: form.role, department: form.department,
      });
      setSuccess(`Welcome, ${res.user.name}! Redirecting to dashboard...`);
      login(res.user, res.token);
      setTimeout(() => navigate('/dashboard'), 1400);
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally { setLoading(false); }
  };

  const pwLen = form.password.length;
  const strength = pwLen === 0 ? 0 : pwLen < 6 ? 1 : pwLen < 10 ? 2 : 3;
  const strengthColors = ['', '#ff3366', '#ffcc00', '#00ff88'];
  const strengthLabels = ['', 'WEAK', 'FAIR', 'STRONG'];

  const ROLES = ['admin','doctor','nurse'];
  const DEPTS = ['ICU','Emergency','Cardiology','Neurology','Surgery','Pediatrics','Oncology'];

  return (
    <div className="auth-page">
      <Bg />
      <div className="orb-1" /><div className="orb-2" /><div className="orb-3" />
      <div className="scan-line" />

      <div className="auth-wrap fade-up" style={{ maxWidth:500 }}>
        <div className="auth-logo">
          <div className="auth-logo-ring"><Activity size={32} color="var(--cyan)" /></div>
          <div className="auth-logo-title">ICU · AI MONITOR</div>
          <div className="auth-logo-sub">Personnel Registration Portal</div>
        </div>

        <div className="auth-card">
          <div className="auth-card-title">PERSONNEL REGISTRATION</div>
          <div className="auth-card-sub">// CREATE SECURE SYSTEM CREDENTIALS</div>

          {error   && <div className="msg msg-error">  <AlertCircle size={14} /> {error}   </div>}
          {success && <div className="msg msg-success"><CheckCircle size={14} /> {success} </div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label"><User size={11} /> Full Name *</label>
              <div className="input-wrap">
                <User size={14} className="input-icon" />
                <input value={form.name} onChange={set('name')} placeholder="Dr. Full Name" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label"><Shield size={11} /> Role *</label>
                <div className="input-wrap">
                  <Shield size={14} className="input-icon" />
                  <select value={form.role} onChange={set('role')}>
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label"><Briefcase size={11} /> Department *</label>
                <div className="input-wrap">
                  <Briefcase size={14} className="input-icon" />
                  <select value={form.department} onChange={set('department')}>
                    {DEPTS.map(d => <option key={d}>{d}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label"><Mail size={11} /> Medical Email *</label>
              <div className="input-wrap">
                <Mail size={14} className="input-icon" />
                <input type="email" value={form.email} onChange={set('email')} placeholder="doctor@hospital.med" autoComplete="email" />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label"><Lock size={11} /> Password *</label>
                <div className="input-wrap" style={{ position:'relative' }}>
                  <Lock size={14} className="input-icon" />
                  <input type={showPw?'text':'password'} value={form.password} onChange={set('password')} placeholder="Min 6 chars" style={{ paddingRight:38 }} autoComplete="new-password" />
                  <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                    {showPw ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
                {form.password && (
                  <div className="pw-strength">
                    <div className="pw-bar"><div className="pw-fill" style={{ width:`${(strength/3)*100}%`, background:strengthColors[strength] }} /></div>
                    <span className="pw-label" style={{ color:strengthColors[strength] }}>{strengthLabels[strength]}</span>
                  </div>
                )}
              </div>
              <div className="form-group">
                <label className="form-label"><Lock size={11} /> Confirm *</label>
                <div className="input-wrap">
                  <Lock size={14} className="input-icon" />
                  <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="Re-enter" autoComplete="new-password" />
                </div>
                {form.confirm && (
                  <div style={{ fontFamily:'var(--fm)', fontSize:'0.65rem', marginTop:5, color: form.password===form.confirm ? 'var(--green)' : 'var(--red)' }}>
                    {form.password===form.confirm ? '✓ Passwords match' : '✗ Does not match'}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading || !!success}>
              {loading ? (
                <><div style={{ width:16,height:16,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#000',borderRadius:'50%',animation:'spin .8s linear infinite' }} /> REGISTERING...</>
              ) : (
                <><UserPlus size={16} /> CREATE ACCOUNT</>
              )}
            </button>
          </form>

          <div className="auth-footer">
            Already have access? <Link to="/" className="auth-link">SIGN IN</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
