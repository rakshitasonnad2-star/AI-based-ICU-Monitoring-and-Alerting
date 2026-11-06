import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Mail, Lock, Eye, EyeOff, AlertCircle, LogIn } from 'lucide-react';
import { authAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Bg from '../components/Bg';
import '../styles/auth.css';

export default function Login() {
  const [form, setForm]     = useState({ email: '', password: '' });
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');
  const { login } = useAuth();
  const navigate  = useNavigate();

  const set = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email.trim()) { setError('Email is required.'); return; }
    if (!form.password)     { setError('Password is required.'); return; }
    setLoading(true); setError('');
    try {
      const res = await authAPI.login({ email: form.email.trim(), password: form.password });
      login(res.user, res.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally { setLoading(false); }
  };

  const fillDemo = (role) => {
    const map = { admin: ['admin@icu.med','admin123'], doctor: ['doctor@icu.med','doctor123'], nurse: ['nurse@icu.med','nurse123'] };
    setForm({ email: map[role][0], password: map[role][1] });
    setError('');
  };

  return (
    <div className="auth-page">
      <Bg />
      <div className="orb-1" /><div className="orb-2" /><div className="orb-3" />
      <div className="scan-line" />

      <div className="auth-wrap fade-up">
        <div className="auth-logo">
          <div className="auth-logo-ring"><Activity size={32} color="var(--cyan)" /></div>
          <div className="auth-logo-title">ICU · AI MONITOR</div>
          <div className="auth-logo-sub">Neural Healthcare Intelligence System</div>
        </div>

        <div className="auth-card">
          <div className="auth-card-title">SYSTEM ACCESS</div>
          <div className="auth-card-sub">// AUTHORIZED PERSONNEL ONLY</div>

          {error && <div className="msg msg-error"><AlertCircle size={14} /> {error}</div>}

          <form onSubmit={handleSubmit} noValidate>
            <div className="form-group">
              <label className="form-label"><Mail size={11} /> Medical Email</label>
              <div className="input-wrap">
                <Mail size={14} className="input-icon" />
                <input type="email" value={form.email} onChange={set('email')} placeholder="doctor@hospital.med" autoComplete="email" />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label"><Lock size={11} /> Access Code</label>
              <div className="input-wrap" style={{ position: 'relative' }}>
                <Lock size={14} className="input-icon" />
                <input type={showPw ? 'text' : 'password'} value={form.password} onChange={set('password')} placeholder="••••••••" style={{ paddingRight: 40 }} autoComplete="current-password" />
                <button type="button" className="pw-toggle" onClick={() => setShowPw(!showPw)}>
                  {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? (
                <><div style={{ width:16,height:16,border:'2px solid rgba(0,0,0,.3)',borderTopColor:'#000',borderRadius:'50%',animation:'spin .8s linear infinite' }} /> AUTHENTICATING...</>
              ) : (
                <><LogIn size={16} /> INITIATE ACCESS</>
              )}
            </button>
          </form>

          <div className="demo-section">
            <div className="demo-label">// DEMO CREDENTIALS — CLICK TO FILL</div>
            <div className="demo-btns">
              {['admin','doctor','nurse'].map(r => (
                <button key={r} className="demo-btn" type="button" onClick={() => fillDemo(r)}>{r}</button>
              ))}
            </div>
          </div>

          <div className="auth-footer">
            No account? <Link to="/register" className="auth-link">REQUEST ACCESS</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
