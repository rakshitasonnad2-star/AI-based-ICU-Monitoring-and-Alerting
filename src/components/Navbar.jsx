import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, LogOut, Bell } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useSettings } from '../context/SettingsContext';

const Navbar = () => {
  const { user, logout }          = useAuth();
  const { connected, liveAlerts } = useSocket();
  const { settings }              = useSettings();
  const [time, setTime]           = useState(new Date());
  const navigate                  = useNavigate();

  // Alert sound notification
  const prevAlertCount = React.useRef(liveAlerts.length);   // ← CHANGED (was useRef(0))
  useEffect(() => {
    if (
      settings.alertSoundEnabled &&
      liveAlerts.length > prevAlertCount.current &&
      liveAlerts.length > 0
    ) {
      // Play a beep using Web Audio API (no external file needed)
      try {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        for (let i = 0; i < 3; i++) {
          const osc  = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 880;
          osc.type = 'sine';
          gain.gain.setValueAtTime(0.3, ctx.currentTime + i * 0.3);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.3 + 0.2);
          osc.start(ctx.currentTime + i * 0.3);
          osc.stop(ctx.currentTime + i * 0.3 + 0.25);
        }
      } catch { /* browser may block audio without user interaction */ }
    }
    prevAlertCount.current = liveAlerts.length;
  }, [liveAlerts.length, settings.alertSoundEnabled]);

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const pad = (n) => String(n).padStart(2, '0');
  const timeStr = `${pad(time.getHours())}:${pad(time.getMinutes())}:${pad(time.getSeconds())}`;
  const initials = user?.name?.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) || 'DR';

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="nav-icon"><Activity size={17} color="var(--cyan)"/></div>
        <div>
          {/* ✅ Hospital name from Settings */}
          <div className="nav-title">{settings.hospitalName || 'ICU·AI MONITOR'}</div>
          <div className="nav-sub">Neural Health Intelligence v3.0</div>
        </div>
      </div>

      <div className="nav-center">
        <div className="nav-status-pill">
          <div className={`dot ${connected ? 'dot-green' : 'dot-red'}`}/>
          {connected ? 'AI HEALTHCARE ONLINE' : 'RECONNECTING...'}
        </div>
        <div className="nav-time">{timeStr}</div>
        <div className="nav-url">http://localhost:3000</div>
      </div>

      <div className="nav-right">
        {/* ✅ Bell with alert count badge */}
        <button className="nav-bell" onClick={() => navigate('/alerts')} title="View Alerts">
          <Bell size={16}/>
          {liveAlerts.length > 0 && (
            <span className="nav-bell-badge" style={{ animation:'blink 0.8s ease-in-out infinite' }}>
              {liveAlerts.length}
            </span>
          )}
        </button>
        <div style={{ textAlign:'right' }}>
          <div className="nav-uname">{user?.name || 'User'}</div>
          <div className="nav-urole">{user?.role} · {user?.department}</div>
        </div>
        <div className="nav-avatar">{initials}</div>
        <button className="nav-logout" onClick={logout}>
          <LogOut size={12}/> EXIT
        </button>
      </div>
    </nav>
  );
};

export default Navbar;