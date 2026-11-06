import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { BedDouble, Heart, Wind, Thermometer, Activity, Plus, Search, Eye, Trash2, Zap, Brain, X } from 'lucide-react';
import { patientAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Bg from '../components/Bg';
import ECGCanvas from '../components/ECGCanvas';
import AddPatientModal from '../components/AddPatientModal';
import '../styles/dashboard.css';

const VitalCard = ({ icon, label, value, unit, color, pct }) => (
  <div className="vital-card">
    <div className="vital-icon-bg" style={{ color }}>{icon}</div>
    <div className="vital-lbl">{label}</div>
    <div className="vital-val" style={{ color, textShadow:`0 0 12px ${color}55` }}>{value}</div>
    <div className="vital-unit">{unit}</div>
    <div className="vital-bar">
      <div className="vital-bar-fill" style={{ width:`${Math.min(100,Math.max(0,pct))}%`, background:color, boxShadow:`0 0 6px ${color}` }} />
    </div>
  </div>
);

const BedCard = ({ bed, patient, selected, onClick, liveVitals }) => {
  const v = liveVitals || patient?.currentVitals;
  const cls = !patient ? 'empty' : (patient.status||'stable').toLowerCase();
  return (
    <div className={`bed-card ${cls} ${selected ? 'selected' : ''}`} onClick={onClick}>
      <div className="bed-hd">
        <span className="bed-num">◈ ICU BED {bed}</span>
        <div className={`bed-dot ${cls}`} />
      </div>
      {patient ? (
        <>
          <div className="bed-name">{patient.name}</div>
          <div className="bed-diag">{patient.diagnosis}</div>
          <div className="bed-mini-grid">
            <div className="bed-mini"><Heart size={9} color="var(--green)" /><span className="bed-mini-val" style={{ color:'var(--green)' }}>{v?.heartRate??'--'}</span><span className="bed-mini-lbl">bpm</span></div>
            <div className="bed-mini"><Wind size={9} color="var(--cyan)" /><span className="bed-mini-val">{v?.oxygenLevel??'--'}</span><span className="bed-mini-lbl">%O₂</span></div>
            <div className="bed-mini"><Activity size={9} color="var(--yellow)" /><span className="bed-mini-val" style={{ color:'var(--yellow)' }}>{v?.systolicBP??'--'}/{v?.diastolicBP??'--'}</span><span className="bed-mini-lbl">BP</span></div>
            <div className="bed-mini"><Thermometer size={9} color="var(--orange)" /><span className="bed-mini-val" style={{ color:'var(--orange)' }}>{v?.temperature??'--'}</span><span className="bed-mini-lbl">°F</span></div>
          </div>
          <div style={{ marginTop:8 }}>
            <span className={`tag tag-${(patient.aiStatus?.riskLevel||'low').toLowerCase()}`}>AI: {patient.aiStatus?.riskLevel||'Low'} Risk</span>
          </div>
        </>
      ) : (
        <div className="bed-empty-msg"><BedDouble size={22} style={{ opacity:.3,display:'block',margin:'0 auto 6px' }} />BED AVAILABLE</div>
      )}
    </div>
  );
};

const AIPanel = ({ aiStatus, liveAlerts, dismissAlert }) => {
  const navigate = useNavigate();   // ✅ CHANGED (new line)
  const riskColors = { Critical:'var(--red)', High:'var(--orange)', Medium:'var(--yellow)', Low:'var(--green)' };
  const score  = aiStatus?.stabilityScore ?? 85;
  const rColor = riskColors[aiStatus?.riskLevel] || 'var(--cyan)';
  const circ   = 2 * Math.PI * 30;
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      <div className="ai-panel">
        <div className="ai-hd">
          <div className="ai-icon"><Brain size={14} color="var(--purple)" /></div>
          <div className="ai-title">AI HEALTH ANALYSIS</div>
        </div>
        <div className="ai-ring-wrap">
          <svg width="76" height="76" viewBox="0 0 76 76" style={{ display:'block', margin:'0 auto' }}>
            <circle cx="38" cy="38" r="30" fill="none" stroke="rgba(0,212,255,0.1)" strokeWidth="6"/>
            <circle cx="38" cy="38" r="30" fill="none" stroke={rColor} strokeWidth="6" strokeLinecap="round"
              strokeDasharray={`${(score/100)*circ} ${circ}`} transform="rotate(-90 38 38)"
              style={{ filter:`drop-shadow(0 0 5px ${rColor})`, transition:'stroke-dasharray 1s ease' }}/>
            <text x="38" y="35" textAnchor="middle" fill={rColor} style={{ fontFamily:'var(--fm)',fontSize:14,fontWeight:700 }}>{score}</text>
            <text x="38" y="47" textAnchor="middle" fill="var(--t3)" style={{ fontFamily:'var(--fm)',fontSize:7 }}>STABLE</text>
          </svg>
        </div>
        <div className="ai-risk-line"><span style={{ color:'var(--t3)' }}>RISK: </span><span style={{ color:rColor,fontWeight:700,textShadow:`0 0 8px ${rColor}` }}>{aiStatus?.riskLevel||'Low'}</span></div>
        {aiStatus?.prediction && <div className="ai-prediction">{aiStatus.prediction}</div>}
        {aiStatus?.alerts?.slice(0,3).map((a,i)=>(
          <div key={i} className={`alert-row alert-${(a.severity||'medium').toLowerCase()}`}><Zap size={10} style={{ flexShrink:0,marginTop:1 }}/><span>{a.message}</span></div>
        ))}
      </div>
      {liveAlerts.length > 0 && (
        <div className="ai-panel">
          <div className="ai-hd">
            <div className="ai-icon" style={{ background:'rgba(255,51,102,0.18)',borderColor:'rgba(255,51,102,0.35)' }}><Zap size={14} color="var(--red)"/></div>
            {/* ✅ CHANGED: clickable title */}
            <div className="ai-title" style={{ color:'var(--red)', cursor:'pointer' }} onClick={() => navigate('/alerts')}>LIVE ALERTS →</div>
            <span style={{ marginLeft:'auto',background:'var(--red-dim)',color:'var(--red)',borderRadius:10,fontFamily:'var(--fm)',fontSize:'0.6rem',padding:'1px 7px',border:'1px solid rgba(255,51,102,0.3)' }}>{liveAlerts.length}</span>
          </div>
          {/* ✅ CHANGED: show up to 8 and make each row clickable */}
          {liveAlerts.slice(0,8).map(a=>(
            <div key={a._uid} className="alert-row alert-critical" style={{ marginBottom:5, cursor:'pointer' }} onClick={() => navigate('/alerts')}>
              <div style={{ flex:1,minWidth:0 }}>
                <div style={{ fontWeight:700,marginBottom:2 }}>BED {a.bedNumber} — {a.patientName}</div>
                <div style={{ opacity:.8,fontSize:'0.66rem' }}>{a.riskLevel} Risk Detected</div>
              </div>
              {/* ✅ CHANGED: stopPropagation so the X only dismisses and does not open /alerts */}
              <button className="alert-dismiss" onClick={(e) => { e.stopPropagation(); dismissAlert(a._uid); }}><X size={10}/></button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default function Dashboard() {
  const [patients,    setPatients]    = useState([]);
  const [selected,    setSelected]    = useState(null);
  const [analytics,   setAnalytics]   = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [showAdd,     setShowAdd]     = useState(false);
  const [search,      setSearch]      = useState('');
  const [discharging, setDischarging] = useState(false);
  const { vitalsMap, liveAlerts, dismissAlert } = useSocket();
  const { user } = useAuth();
  const { settings } = useSettings();   // ✅ live ICU capacity from Settings
  const navigate = useNavigate();

  // ✅ Dynamic bed list — grows/shrinks instantly when admin changes ICU capacity
  const icuCapacity = Math.max(1, parseInt(settings.icuCapacity) || 4);
  const bedNumbers = Array.from({ length: icuCapacity }, (_, i) => i + 1);

  const fetchAll = useCallback(async () => {
    try {
      const [pr, ar] = await Promise.all([patientAPI.getAll(), patientAPI.analytics()]);
      setPatients(pr.patients);
      setAnalytics(ar.analytics);
      if (pr.patients.length > 0 && !selected) setSelected(pr.patients[0]);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const bedMap = {};
  patients.forEach(p => { bedMap[p.bedNumber] = p; });

  // ✅ If capacity was decreased while patients occupy higher bed numbers,
  // still show those beds so the patient isn't hidden — flagged as "overflow"
  const overflowBedNumbers = Object.keys(bedMap)
    .map(Number)
    .filter(b => b > icuCapacity)
    .sort((a, b) => a - b);
  const allBedNumbers = [...bedNumbers, ...overflowBedNumbers];

  const liveData = selected ? vitalsMap[selected.id] : null;
  const liveV  = liveData?.vitals   || selected?.currentVitals;
  const liveAI = liveData?.aiStatus || selected?.aiStatus;

  const handleDischarge = async () => {
    if (!selected || !window.confirm(`Discharge ${selected.name}?`)) return;
    setDischarging(true);
    try { await patientAPI.discharge(selected.id); setSelected(null); await fetchAll(); }
    catch (e) { alert(e.message); }
    finally { setDischarging(false); }
  };

  if (loading) return (
    <div className="loading-screen"><div className="spinner"/><div className="loading-label">INITIALIZING ICU SYSTEMS...</div></div>
  );

  return (
    <div style={{ position:'relative' }}>
      <Bg />
      <div className="app-layout" style={{ position:'relative', zIndex:1 }}>
        <Sidebar />
        <div className="main-area">
          <Navbar />
          <div className="dash-layout">
            {/* LEFT */}
            <div className="dash-left">
              <div>
                <div className="section-hd">
                  <div className="section-title">ICU BED MONITOR ({icuCapacity} {icuCapacity===1?'BED':'BEDS'})</div>
                  {(user?.role==='admin'||user?.role==='doctor') && (
                    <button className="btn btn-primary btn-sm" onClick={()=>setShowAdd(true)}><Plus size={13}/> ADD</button>
                  )}
                </div>
                <div style={{ position:'relative', marginBottom:11 }}>
                  <Search size={13} style={{ position:'absolute',left:10,top:'50%',transform:'translateY(-50%)',color:'var(--t3)' }}/>
                  <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search patient…" style={{ paddingLeft:30,height:34,fontSize:'0.82rem' }}/>
                </div>
                {overflowBedNumbers.length > 0 && (
                  <div className="msg msg-error" style={{ marginBottom:10, fontSize:'0.68rem' }}>
                    ⚠ Bed{overflowBedNumbers.length>1?'s':''} {overflowBedNumbers.join(', ')} still occupied above the new capacity of {icuCapacity}. Discharge or increase capacity in Settings.
                  </div>
                )}
                {allBedNumbers.map(bed => {
                  const pat = bedMap[bed];
                  if (search && pat && !pat.name.toLowerCase().includes(search.toLowerCase()) && !pat.diagnosis.toLowerCase().includes(search.toLowerCase())) return null;
                  const lv = pat ? vitalsMap[pat.id]?.vitals : null;
                  return <BedCard key={bed} bed={bed} patient={pat} selected={selected?.id===pat?.id} liveVitals={lv} onClick={()=>pat&&setSelected(pat)}/>;
                })}
              </div>
            </div>

            {/* CENTER */}
            <div className="dash-center">
              {selected ? (
                <>
                  <div className="ecg-panel">
                    <div className="ecg-hd">
                      <div>
                        <div className="ecg-label">◈ LIVE ECG — {selected.name}</div>
                        <div className="ecg-diag">Bed {selected.bedNumber} · {selected.diagnosis}</div>
                      </div>
                      <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                        <div className="ecg-bpm-wrap">
                          <div className="pulse-dot"/>
                          <div className="ecg-bpm">{liveV?.heartRate??'--'}</div>
                          <div className="ecg-bpm-unit">BPM</div>
                        </div>
                        <div style={{ display:'flex',gap:8 }}>
                          <button className="btn btn-ghost btn-sm" onClick={()=>navigate(`/patients/${selected.id}`)}><Eye size={12}/> VIEW</button>
                          {(user?.role==='admin'||user?.role==='doctor') && (
                            <button className="btn btn-danger btn-sm" onClick={handleDischarge} disabled={discharging}>
                              <Trash2 size={12}/> {discharging?'...':'DISCHARGE'}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="ecg-canvas-wrap"><ECGCanvas heartRate={liveV?.heartRate??72} height={130}/></div>
                  </div>

                  <div>
                    <div className="section-title" style={{ marginBottom:11 }}>LIVE VITAL PARAMETERS</div>
                    <div className="vitals-grid">
                      <VitalCard icon={<Heart size={22}/>} label="HEART RATE" value={liveV?.heartRate??'--'} unit="beats / min" color="var(--green)" pct={((liveV?.heartRate??72)/180)*100}/>
                      <VitalCard icon={<Wind size={22}/>} label="O₂ SATURATION" value={liveV?.oxygenLevel??'--'} unit="% SpO₂" color="var(--cyan)" pct={liveV?.oxygenLevel??98}/>
                      <VitalCard icon={<Activity size={22}/>} label="BLOOD PRESSURE" value={`${liveV?.systolicBP??'--'}/${liveV?.diastolicBP??'--'}`} unit="mmHg sys/dia" color="var(--yellow)" pct={((liveV?.systolicBP??120)/200)*100}/>
                      <VitalCard icon={<Thermometer size={22}/>} label="TEMPERATURE" value={liveV?.temperature??'--'} unit="°F body temp" color="var(--orange)" pct={Math.min(100,(((liveV?.temperature??98.6)-94)/15)*100)}/>
                    </div>
                  </div>

                  <div className="patient-info-strip">
                    {[['Age',`${selected.age} yrs`],['Gender',selected.gender],['Blood',selected.bloodGroup],['Doctor',selected.attendingDoctor],['Status',selected.status],['Admitted',new Date(selected.admissionDate).toLocaleDateString()]].map(([k,v])=>(
                      <div key={k} className="pinfo-item"><div className="pinfo-lbl">{k}</div><div className="pinfo-val">{v}</div></div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="empty-state">
                  <BedDouble size={62} color="var(--cyan)"/>
                  <div className="empty-title">SELECT A PATIENT</div>
                  <div className="empty-sub">Click an ICU bed card to start monitoring</div>
                  {patients.length===0 && <button className="btn btn-primary" onClick={()=>setShowAdd(true)}><Plus size={14}/> Admit First Patient</button>}
                </div>
              )}
            </div>

            {/* RIGHT */}
            <div className="dash-right">
              <AIPanel aiStatus={liveAI} liveAlerts={liveAlerts} dismissAlert={dismissAlert}/>
              {analytics && (
                <div className="glass" style={{ padding:14 }}>
                  <div className="section-title" style={{ marginBottom:11 }}>ICU ANALYTICS</div>
                  {[['Occupancy',`${analytics.occupancyRate}%`],['Available Beds',`${analytics.availableBeds}/${analytics.totalBeds}`],['Critical',analytics.criticalCount,analytics.criticalCount>0?'var(--red)':undefined],['High Risk',analytics.highRiskCount,analytics.highRiskCount>0?'var(--orange)':undefined],['Avg HR',`${analytics.avgHeartRate} bpm`],['Avg O₂',`${analytics.avgOxygen}%`],['AI Stability',`${analytics.avgStability}%`]].map(([l,v,c])=>(
                    <div key={l} className="stat-row"><span className="stat-lbl">{l}</span><span className="stat-val" style={c?{color:c}:{}}>{v}</span></div>
                  ))}
                </div>
              )}
              <div className="glass" style={{ padding:14 }}>
                <div className="section-title" style={{ marginBottom:11 }}>DEVICE STATUS</div>
                {[['Cardiac Monitor','ONLINE'],['Ventilator','ONLINE'],['Infusion Pump','STANDBY'],['Pulse Oximeter','ONLINE'],['BP Monitor','ONLINE'],['AI Engine','ONLINE']].map(([n,s])=>(
                  <div key={n} className="device-row"><span className="device-name">{n}</span><span className={s==='ONLINE'?'badge-online':'badge-standby'}>{s}</span></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showAdd && (
        <AddPatientModal onClose={()=>setShowAdd(false)} occupiedBeds={patients.map(p=>p.bedNumber)} icuCapacity={icuCapacity}
          onAdded={async()=>{ await fetchAll(); }}/>
      )}
    </div>
  );
}