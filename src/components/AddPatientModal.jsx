import React, { useState } from 'react';
import { X, User, Activity, Phone, AlertCircle, CheckCircle } from 'lucide-react';
import { patientAPI } from '../services/api';

const BLOOD_GROUPS = ['A+','A-','B+','B-','O+','O-','AB+','AB-'];
const STATUSES     = ['Stable','Serious','Critical','Improving'];

export default function AddPatientModal({ onClose, onAdded, occupiedBeds = [], icuCapacity = 4 }) {
  const [step,    setStep]    = useState(1);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');
  const [form,    setForm]    = useState({
    name:'', age:'', gender:'Male', bedNumber:'', bloodGroup:'O+',
    diagnosis:'', attendingDoctor:'', status:'Stable',
    // Step 2 — Vitals
    heartRate:'72', oxygenLevel:'98', systolicBP:'120',
    diastolicBP:'80', temperature:'98.6', respiratoryRate:'16',
    // Step 3 — Emergency contact
    ecName:'', ecPhone:'', ecRelation:'',
    allergies:'', medications:'',
  });

  const set = (k) => (e) => { setForm(p => ({ ...p, [k]: e.target.value })); setError(''); };
  const totalBeds = Math.max(1, parseInt(icuCapacity) || 4);
  const available = Array.from({ length: totalBeds }, (_, i) => i + 1).filter(b => !occupiedBeds.includes(b));

  // ── Validation ─────────────────────────────────────────────────────────────
  const validateStep1 = () => {
    if (!form.name.trim())             return 'Patient full name is required.';
    if (!form.age || parseInt(form.age) < 1 || parseInt(form.age) > 150)
                                       return 'Valid age (1–150) is required.';
    if (!form.bedNumber)               return 'Please select an available ICU bed.';
    if (!form.diagnosis.trim())        return 'Diagnosis is required.';
    if (!form.attendingDoctor.trim())  return 'Attending doctor name is required.';
    return null;
  };

  const validateStep2 = () => {
    const hr  = parseFloat(form.heartRate);
    const o2  = parseFloat(form.oxygenLevel);
    const sys = parseFloat(form.systolicBP);
    const dia = parseFloat(form.diastolicBP);
    const tmp = parseFloat(form.temperature);
    const rr  = parseFloat(form.respiratoryRate);
    if (isNaN(hr)  || hr  < 20  || hr  > 300) return 'Heart rate must be between 20–300 bpm.';
    if (isNaN(o2)  || o2  < 50  || o2  > 100) return 'O₂ saturation must be between 50–100%.';
    if (isNaN(sys) || sys < 50  || sys > 300)  return 'Systolic BP must be between 50–300 mmHg.';
    if (isNaN(dia) || dia < 20  || dia > 200)  return 'Diastolic BP must be between 20–200 mmHg.';
    if (isNaN(tmp) || tmp < 90  || tmp > 115)  return 'Temperature must be between 90–115°F.';
    if (isNaN(rr)  || rr  < 4   || rr  > 60)  return 'Respiratory rate must be between 4–60/min.';
    return null;
  };

  const validateStep3 = () => {
    // Phone is optional but if entered must be exactly 10 digits
    if (form.ecPhone && !/^\d{10}$/.test(form.ecPhone.replace(/[\s\-()]/g, ''))) {
      return 'Mobile number must be exactly 10 digits (e.g. 9876543210).';
    }
    return null;
  };

  const handleNext = () => {
    let err = null;
    if (step === 1) err = validateStep1();
    if (step === 2) err = validateStep2();
    if (step === 3) err = validateStep3();
    if (err) { setError(err); return; }
    setError('');
    setStep(s => s + 1);
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    const err = validateStep3();
    if (err) { setError(err); return; }

    setLoading(true); setError('');
    try {
      const vitals = {
        heartRate:       parseFloat(form.heartRate),
        oxygenLevel:     parseFloat(form.oxygenLevel),
        systolicBP:      parseFloat(form.systolicBP),
        diastolicBP:     parseFloat(form.diastolicBP),
        temperature:     parseFloat(form.temperature),
        respiratoryRate: parseFloat(form.respiratoryRate),
      };

      const payload = {
        name:            form.name.trim(),
        age:             parseInt(form.age),
        gender:          form.gender,
        bedNumber:       parseInt(form.bedNumber),
        bloodGroup:      form.bloodGroup,
        diagnosis:       form.diagnosis.trim(),
        attendingDoctor: form.attendingDoctor.trim(),
        status:          form.status,
        currentVitals:   vitals,                          // ✅ Vitals sent to backend → saved to CSV
        emergencyContact: {
          name:     form.ecName.trim(),
          phone:    form.ecPhone.replace(/[\s\-()]/g, ''), // strip formatting
          relation: form.ecRelation.trim(),
        },
        allergies:   form.allergies  ? form.allergies.split(',').map(s=>s.trim()).filter(Boolean) : [],
        medications: form.medications? form.medications.split(',').map(s=>({ name:s.trim(), dosage:'', frequency:'' })).filter(m=>m.name) : [],
      };

      const res = await patientAPI.add(payload);
      onAdded(res.patient);
      onClose();
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const IL = {
    background:'rgba(0,212,255,0.05)', border:'1px solid var(--border)',
    borderRadius:8, color:'var(--t1)', padding:'9px 13px',
    fontFamily:'var(--fb)', fontSize:'0.9rem', width:'100%', outline:'none',
  };
  const LL = {
    fontFamily:'var(--fm)', fontSize:'0.67rem', color:'var(--t3)',
    textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:5,
  };

  const steps = [
    { icon:<User size={14}/>,     label:'Patient Info' },
    { icon:<Activity size={14}/>, label:'Initial Vitals' },
    { icon:<Phone size={14}/>,    label:'Emergency Contact' },
  ];

  return (
    <div className="overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal-box">

        {/* Header */}
        <div className="modal-hd">
          <span className="modal-title">◈ ADMIT NEW PATIENT</span>
          <button className="modal-close" onClick={onClose}><X size={16}/></button>
        </div>

        {/* Step progress */}
        <div style={{ display:'flex', gap:8, marginBottom:22 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:5 }}>
              <div style={{
                width:'100%', height:3, borderRadius:2,
                background: i+1 <= step ? 'var(--cyan)' : 'rgba(0,212,255,0.15)',
                transition:'background .3s',
                boxShadow: i+1 <= step ? '0 0 6px var(--cyan)' : 'none',
              }}/>
              <span style={{ fontFamily:'var(--fm)', fontSize:'0.6rem', color: i+1<=step?'var(--cyan)':'var(--t3)', letterSpacing:'0.08em', display:'flex', alignItems:'center', gap:4 }}>
                {s.icon} {s.label}
              </span>
            </div>
          ))}
        </div>

        {error && (
          <div className="msg msg-error" style={{ marginBottom:14 }}>
            <AlertCircle size={13}/> {error}
          </div>
        )}

        {/* ── STEP 1: Patient Info ─────────────────────────────────────────── */}
        {step === 1 && (
          <div className="modal-grid">
            <div className="span2">
              <label style={LL}>Full Name *</label>
              <input style={IL} value={form.name} onChange={set('name')} placeholder="Patient full name"/>
            </div>
            <div>
              <label style={LL}>Age *</label>
              <input style={IL} type="number" min="1" max="150" value={form.age} onChange={set('age')} placeholder="Age in years"/>
            </div>
            <div>
              <label style={LL}>Gender *</label>
              <select style={IL} value={form.gender} onChange={set('gender')}>
                <option>Male</option><option>Female</option><option>Other</option>
              </select>
            </div>
            <div>
              <label style={LL}>ICU Bed * {available.length===0 && '— ALL FULL'}</label>
              <select style={IL} value={form.bedNumber} onChange={set('bedNumber')}>
                <option value="">-- Select Bed --</option>
                {available.map(b => <option key={b} value={b}>ICU Bed {b}</option>)}
              </select>
            </div>
            <div>
              <label style={LL}>Blood Group</label>
              <select style={IL} value={form.bloodGroup} onChange={set('bloodGroup')}>
                {BLOOD_GROUPS.map(b => <option key={b}>{b}</option>)}
              </select>
            </div>
            <div className="span2">
              <label style={LL}>Diagnosis *</label>
              <input style={IL} value={form.diagnosis} onChange={set('diagnosis')} placeholder="Primary diagnosis"/>
            </div>
            <div>
              <label style={LL}>Attending Doctor *</label>
              <input style={IL} value={form.attendingDoctor} onChange={set('attendingDoctor')} placeholder="Dr. Name"/>
            </div>
            <div>
              <label style={LL}>Initial Status</label>
              <select style={IL} value={form.status} onChange={set('status')}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="span2">
              <label style={LL}>Known Allergies (comma separated)</label>
              <input style={IL} value={form.allergies} onChange={set('allergies')} placeholder="Penicillin, Sulfa..."/>
            </div>
          </div>
        )}

        {/* ── STEP 2: Initial Vitals ───────────────────────────────────────── */}
        {step === 2 && (
          <>
            <div style={{ background:'rgba(0,212,255,0.05)', border:'1px solid var(--border)', borderRadius:8, padding:'10px 14px', marginBottom:16, fontFamily:'var(--fm)', fontSize:'0.74rem', color:'var(--cyan)' }}>
              ✅ These vitals will be saved to all 6 CSV files immediately on admission.
            </div>
            <div className="modal-grid">
              {[
                ['heartRate',       'Heart Rate (bpm)',         '72',   '20',  '300', '1'],
                ['oxygenLevel',     'O₂ Saturation (%)',        '98',   '50',  '100', '0.1'],
                ['systolicBP',      'Systolic BP (mmHg)',       '120',  '50',  '300', '1'],
                ['diastolicBP',     'Diastolic BP (mmHg)',      '80',   '20',  '200', '1'],
                ['temperature',     'Temperature (°F)',          '98.6', '90',  '115', '0.1'],
                ['respiratoryRate', 'Respiratory Rate (/min)',  '16',   '4',   '60',  '1'],
              ].map(([k, l, ph, mn, mx, step]) => (
                <div key={k}>
                  <label style={LL}>{l}</label>
                  <input style={IL} type="number" step={step} min={mn} max={mx}
                    value={form[k]} onChange={set(k)} placeholder={ph}/>
                </div>
              ))}
            </div>
          </>
        )}

        {/* ── STEP 3: Emergency Contact ────────────────────────────────────── */}
        {step === 3 && (
          <div className="modal-grid">
            <div className="span2">
              <label style={LL}>Contact Full Name</label>
              <input style={IL} value={form.ecName} onChange={set('ecName')} placeholder="Emergency contact name"/>
            </div>
            <div>
              <label style={LL}>
                Mobile Number (10 digits)
                {form.ecPhone && !/^\d{10}$/.test(form.ecPhone.replace(/[\s\-()]/g,'')) && (
                  <span style={{ color:'var(--red)', marginLeft:6 }}>✗ Must be 10 digits</span>
                )}
                {form.ecPhone && /^\d{10}$/.test(form.ecPhone.replace(/[\s\-()]/g,'')) && (
                  <span style={{ color:'var(--green)', marginLeft:6 }}>✓ Valid</span>
                )}
              </label>
              <input style={{
                  ...IL,
                  borderColor: form.ecPhone
                    ? /^\d{10}$/.test(form.ecPhone.replace(/[\s\-()]/g,''))
                      ? 'var(--green)' : 'var(--red)'
                    : 'var(--border)',
                }}
                value={form.ecPhone}
                onChange={e => {
                  // Only allow digits, spaces, dashes, parentheses
                  const val = e.target.value.replace(/[^\d\s\-()]/g, '');
                  setForm(p => ({ ...p, ecPhone: val }));
                  setError('');
                }}
                maxLength={15}
                placeholder="9876543210 (10 digits)"
                inputMode="numeric"
              />
              <div style={{ fontFamily:'var(--fm)', fontSize:'0.62rem', color:'var(--t3)', marginTop:4 }}>
                Enter 10-digit mobile number without country code
              </div>
            </div>
            <div>
              <label style={LL}>Relation to Patient</label>
              <input style={IL} value={form.ecRelation} onChange={set('ecRelation')} placeholder="Spouse, Child, Parent..."/>
            </div>
            <div className="span2">
              <label style={LL}>Current Medications (comma separated)</label>
              <input style={IL} value={form.medications} onChange={set('medications')} placeholder="Aspirin, Metformin..."/>
            </div>
            <div className="span2" style={{ background:'rgba(0,255,136,0.05)', border:'1px solid rgba(0,255,136,0.2)', borderRadius:8, padding:'10px 14px' }}>
              <div style={{ fontFamily:'var(--fm)', fontSize:'0.72rem', color:'var(--green)', marginBottom:6 }}>
                ✅ On Submit — the following will happen automatically:
              </div>
              <div style={{ fontFamily:'var(--fm)', fontSize:'0.68rem', color:'var(--t2)', lineHeight:1.7 }}>
                • Patient saved to <b>patients.json</b><br/>
                • Vitals saved to <b>heart_rate.csv</b>, <b>oxygen_level.csv</b>, <b>blood_pressure.csv</b>,
                  <b>temperature.csv</b>, <b>respiratory_rate.csv</b> and <b>all_vitals.csv</b><br/>
                • AI risk score calculated instantly<br/>
                • Dashboard updates in real time
              </div>
            </div>
          </div>
        )}

        {/* Footer buttons */}
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:22, gap:10 }}>
          {step > 1
            ? <button className="btn btn-ghost" onClick={() => { setError(''); setStep(s => s-1); }}>← Back</button>
            : <div/>}
          {step < 3
            ? <button className="btn btn-primary" onClick={handleNext}>Next →</button>
            : <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'ADMITTING...' : '✓ ADMIT PATIENT & SAVE CSV'}
              </button>
          }
        </div>

      </div>
    </div>
  );
}
