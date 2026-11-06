import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Heart, Wind, Activity, Thermometer, Brain, User, Phone, Pill, AlertTriangle, Plus, Save, Edit2, X, CheckCircle, Download } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { patientAPI, vitalsAPI } from '../services/api';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Bg from '../components/Bg';
import ECGCanvas from '../components/ECGCanvas';
import '../styles/patient.css';

const VTABS = [
  { key:'heartRate',    label:'Heart Rate',  color:'#00ff88', unit:'bpm'  },
  { key:'oxygenLevel',  label:'O₂ Level',    color:'#00d4ff', unit:'%'    },
  { key:'systolicBP',   label:'Systolic BP', color:'#ffcc00', unit:'mmHg' },
  { key:'temperature',  label:'Temp',        color:'#ff8800', unit:'°F'   },
];

const TT = {
  contentStyle:{ background:'rgba(2,11,24,.96)', border:'1px solid rgba(0,212,255,.3)', borderRadius:8, fontFamily:'var(--fm)', fontSize:'0.74rem' },
  labelStyle:  { color:'var(--cyan)' },
};

export default function PatientDetails() {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { vitalsMap } = useSocket();

  const [patient,     setPatient]     = useState(null);
  const [loading,     setLoading]     = useState(true);
  const [activeTab,   setActiveTab]   = useState('heartRate');
  const [note,        setNote]        = useState('');
  const [noteLoading, setNoteLoading] = useState(false);
  const [noteOk,      setNoteOk]      = useState(false);
  const [editVitals,  setEditVitals]  = useState(false);
  const [vitalsForm,  setVitalsForm]  = useState({});
  const [savingV,     setSavingV]     = useState(false);
  const [vMsg,        setVMsg]        = useState('');
  const [downloading, setDownloading] = useState('');

  const load = async () => {
    try {
      const r = await patientAPI.getById(id);
      setPatient(r.patient);
      setVitalsForm(r.patient.currentVitals || {});
    } catch { navigate('/dashboard'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  const liveData = patient ? vitalsMap[patient.id] : null;
  const liveV    = liveData?.vitals   || patient?.currentVitals;
  const liveAI   = liveData?.aiStatus || patient?.aiStatus;
  const canEdit  = user?.role === 'admin' || user?.role === 'doctor';

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setNoteLoading(true);
    try {
      const r = await patientAPI.addNote(id, { text: note.trim() });
      setPatient(r.patient); setNote('');
      setNoteOk(true); setTimeout(() => setNoteOk(false), 2500);
    } catch (e) { alert(e.message); }
    finally { setNoteLoading(false); }
  };

  const handleSaveVitals = async () => {
    setSavingV(true); setVMsg('');
    try {
      await patientAPI.updateVitals(id, vitalsForm);
      await load(); setEditVitals(false);
      setVMsg('success'); setTimeout(() => setVMsg(''), 3000);
    } catch (e) { setVMsg(e.message); }
    finally { setSavingV(false); }
  };

  const handleDownloadCSV = async (type, filename) => {
    setDownloading(type);
    try { await vitalsAPI.downloadPatient(id, type, filename); }
    catch (e) { alert(e.message); }
    finally { setDownloading(''); }
  };

  if (loading) return <div className="loading-screen"><div className="spinner"/><div className="loading-label">LOADING PATIENT DATA...</div></div>;
  if (!patient) return null;

  const initials  = patient.name.split(' ').map(w=>w[0]).join('').toUpperCase().slice(0,2);
  const riskColor = { Critical:'var(--red)', High:'var(--orange)', Medium:'var(--yellow)', Low:'var(--green)' }[liveAI?.riskLevel] || 'var(--cyan)';
  const chartData = (patient.vitalHistory||[]).slice(-25).map(v=>({ t: new Date(v.timestamp).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}), v: v[activeTab] }));

  const IL = { background:'rgba(0,212,255,0.05)', border:'1px solid var(--border)', borderRadius:8, color:'var(--t1)', padding:'9px 12px', fontFamily:'var(--fb)', fontSize:'0.9rem', width:'100%', outline:'none' };

  const CSV_EXPORTS = [
    { type:'heartRate',       name:'Heart Rate',     file:`patient_heartrate_${id}.csv` },
    { type:'oxygenLevel',     name:'O₂ Level',       file:`patient_oxygen_${id}.csv` },
    { type:'bloodPressure',   name:'Blood Pressure', file:`patient_bp_${id}.csv` },
    { type:'temperature',     name:'Temperature',    file:`patient_temp_${id}.csv` },
    { type:'respiratoryRate', name:'Resp. Rate',     file:`patient_rr_${id}.csv` },
    { type:'allVitals',       name:'All Vitals',     file:`patient_all_${id}.csv` },
  ];

  return (
    <div style={{ position:'relative' }}>
      <Bg />
      <div className="app-layout" style={{ position:'relative', zIndex:1 }}>
        <Sidebar />
        <div className="main-area">
          <Navbar />
          <div className="page-content">
            <button className="back-btn" onClick={()=>navigate('/dashboard')}><ArrowLeft size={14}/> Back to Dashboard</button>

            {/* Header */}
            <div className="p-header-card">
              <div style={{ display:'flex', alignItems:'center', gap:16 }}>
                <div className="p-avatar">{initials}</div>
                <div>
                  <div className="p-name">{patient.name}</div>
                  <div className="p-meta">
                    <span><User size={10}/> {patient.age} yrs · {patient.gender}</span>
                    <span>Blood: {patient.bloodGroup}</span>
                    <span>Bed {patient.bedNumber}</span>
                    <span>Dr: {patient.attendingDoctor}</span>
                  </div>
                  <div style={{ marginTop:8, display:'flex', gap:8, flexWrap:'wrap' }}>
                    <span className={`tag tag-${(patient.status||'stable').toLowerCase()}`}>{patient.status}</span>
                    <span className={`tag tag-${(liveAI?.riskLevel||'low').toLowerCase()}`}>AI: {liveAI?.riskLevel||'Low'} Risk</span>
                  </div>
                </div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontFamily:'var(--fm)', fontSize:'0.62rem', color:'var(--t3)', marginBottom:3 }}>ADMITTED</div>
                <div style={{ fontFamily:'var(--fm)', fontSize:'0.85rem', color:'var(--t1)' }}>{new Date(patient.admissionDate).toLocaleDateString()}</div>
                <div style={{ fontFamily:'var(--fm)', fontSize:'0.62rem', color:'var(--t3)', marginTop:10 }}>AI STABILITY</div>
                <div style={{ fontFamily:'var(--fm)', fontSize:'1.6rem', fontWeight:700, color:riskColor }}>{liveAI?.stabilityScore??85}<span style={{ fontSize:'0.7rem' }}>/100</span></div>
              </div>
            </div>

            {/* Live ECG */}
            <div className="p-card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', gap:9, marginBottom:12 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)', animation:'blink 1s infinite' }}/>
                <span style={{ fontFamily:'var(--fn)', fontSize:'0.68rem', color:'var(--green)', letterSpacing:'0.14em' }}>LIVE ECG MONITOR</span>
                <span style={{ marginLeft:'auto', fontFamily:'var(--fm)', fontSize:'0.72rem', color:'var(--t3)' }}>{liveV?.heartRate??'--'} BPM</span>
              </div>
              <ECGCanvas heartRate={liveV?.heartRate??72} height={100}/>
            </div>

            {/* Current Vitals */}
            <div className="p-card" style={{ marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <div className="p-card-title"><Activity size={14}/> CURRENT VITALS</div>
                {canEdit && (
                  <button className="btn btn-ghost btn-sm" onClick={()=>{setEditVitals(!editVitals);setVMsg('');}}>
                    {editVitals ? <><X size={12}/> CANCEL</> : <><Edit2 size={12}/> UPDATE</>}
                  </button>
                )}
              </div>
              {vMsg==='success' && <div className="msg msg-success"><CheckCircle size={13}/> Vitals updated & saved to CSV.</div>}
              {vMsg && vMsg!=='success' && <div className="msg msg-error">{vMsg}</div>}

              {editVitals ? (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:12, marginBottom:14 }}>
                    {[['heartRate','Heart Rate (bpm)'],['oxygenLevel','O₂ Level (%)'],['systolicBP','Systolic BP'],['diastolicBP','Diastolic BP'],['temperature','Temperature (°F)'],['respiratoryRate','Resp. Rate']].map(([k,l])=>(
                      <div key={k}>
                        <label style={{ fontFamily:'var(--fm)', fontSize:'0.65rem', color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.1em', display:'block', marginBottom:5 }}>{l}</label>
                        <input style={IL} type="number" step="0.1" value={vitalsForm[k]??''} onChange={e=>setVitalsForm(p=>({...p,[k]:parseFloat(e.target.value)}))}/>
                      </div>
                    ))}
                  </div>
                  <button className="btn btn-primary" onClick={handleSaveVitals} disabled={savingV}><Save size={13}/> {savingV?'SAVING...':'SAVE VITALS'}</button>
                </>
              ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(115px,1fr))', gap:11 }}>
                  {[
                    {l:'Heart Rate',   v:liveV?.heartRate,        u:'bpm',   c:'var(--green)' },
                    {l:'O₂ Sat.',      v:liveV?.oxygenLevel,      u:'%',     c:'var(--cyan)'  },
                    {l:'Systolic BP',  v:liveV?.systolicBP,       u:'mmHg',  c:'var(--yellow)'},
                    {l:'Diastolic BP', v:liveV?.diastolicBP,      u:'mmHg',  c:'var(--yellow)'},
                    {l:'Temperature',  v:liveV?.temperature,      u:'°F',    c:'var(--orange)'},
                    {l:'Resp. Rate',   v:liveV?.respiratoryRate,  u:'/min',  c:'var(--purple)'},
                  ].map(({l,v,u,c})=>(
                    <div key={l} style={{ textAlign:'center', background:'rgba(0,212,255,0.04)', borderRadius:8, padding:'10px 6px', border:'1px solid var(--border)' }}>
                      <div style={{ fontFamily:'var(--fm)', fontSize:'0.58rem', color:'var(--t3)', marginBottom:4 }}>{l}</div>
                      <div style={{ fontFamily:'var(--fm)', fontSize:'1.4rem', fontWeight:700, color:c, textShadow:`0 0 10px ${c}88` }}>{v??'--'}</div>
                      <div style={{ fontFamily:'var(--fm)', fontSize:'0.58rem', color:'var(--t3)' }}>{u}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* CSV Export */}
            <div className="p-card" style={{ marginBottom:14 }}>
              <div className="p-card-title" style={{ marginBottom:14 }}><Download size={14}/> DOWNLOAD VITAL CSV FILES</div>
              <div className="csv-export-grid">
                {CSV_EXPORTS.map(e => (
                  <div key={e.type} className="csv-export-card" onClick={()=>handleDownloadCSV(e.type, e.file)}>
                    <div className="csv-export-icon">
                      {downloading===e.type
                        ? <div style={{ width:22,height:22,border:'2px solid var(--border)',borderTopColor:'var(--cyan)',borderRadius:'50%',animation:'spin .8s linear infinite',margin:'0 auto' }}/>
                        : <Download size={22} color="var(--cyan)"/>}
                    </div>
                    <div className="csv-export-name">{e.name}</div>
                    <div className="csv-export-rows">.csv file</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Vital History Chart */}
            <div className="p-card" style={{ marginBottom:14 }}>
              <div className="p-card-title" style={{ marginBottom:12 }}><Activity size={14}/> VITAL HISTORY TREND</div>
              <div style={{ display:'flex', gap:7, marginBottom:14, flexWrap:'wrap' }}>
                {VTABS.map(t=>(
                  <button key={t.key} onClick={()=>setActiveTab(t.key)}
                    style={{ padding:'5px 13px', borderRadius:20, fontFamily:'var(--fm)', fontSize:'0.7rem', fontWeight:600, border:`1px solid ${activeTab===t.key?t.color:'var(--border)'}`, background:activeTab===t.key?`${t.color}22`:'transparent', color:activeTab===t.key?t.color:'var(--t3)', cursor:'pointer', textTransform:'uppercase', letterSpacing:'0.05em', transition:'all .2s' }}>
                    {t.label}
                  </button>
                ))}
              </div>
              {chartData.length>1 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,212,255,0.06)"/>
                    <XAxis dataKey="t" tick={{ fontFamily:'var(--fm)',fontSize:10,fill:'var(--t3)' }}/>
                    <YAxis tick={{ fontFamily:'var(--fm)',fontSize:10,fill:'var(--t3)' }}/>
                    <Tooltip {...TT} formatter={v=>[`${v} ${VTABS.find(x=>x.key===activeTab)?.unit}`,VTABS.find(x=>x.key===activeTab)?.label]}/>
                    <Line type="monotone" dataKey="v" stroke={VTABS.find(x=>x.key===activeTab)?.color} strokeWidth={2} dot={false} activeDot={{r:4}} style={{ filter:`drop-shadow(0 0 4px ${VTABS.find(x=>x.key===activeTab)?.color})` }}/>
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ height:200, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--fm)', fontSize:'0.78rem', color:'var(--t3)' }}>
                  Vital history builds up as readings are recorded.
                </div>
              )}
            </div>

            {/* Bottom 2-col */}
            <div className="p-2col">
              <div className="p-card">
                <div className="p-card-title" style={{ marginBottom:12 }}><User size={14}/> PATIENT INFORMATION</div>
                {[['Diagnosis',patient.diagnosis],['Blood Group',patient.bloodGroup],['Doctor',patient.attendingDoctor],['Dept','ICU'],['Admitted',new Date(patient.admissionDate).toLocaleString()],['Allergies',patient.allergies?.join(', ')||'None known']].map(([k,v])=>(
                  <div key={k} className="data-row"><span className="data-key">{k}</span><span className="data-val">{v}</span></div>
                ))}
              </div>
              <div className="p-card">
                <div className="p-card-title" style={{ marginBottom:12 }}><Brain size={14}/> AI ANALYSIS</div>
                <div style={{ fontFamily:'var(--fm)', fontSize:'0.76rem', color:'var(--t2)', lineHeight:1.55, borderLeft:`2px solid ${riskColor}`, paddingLeft:10, marginBottom:12 }}>{liveAI?.prediction||'Analyzing…'}</div>
                {liveAI?.alerts?.length>0 && liveAI.alerts.map((a,i)=>(
                  <div key={i} className={`alert-row alert-${(a.severity||'medium').toLowerCase()}`} style={{ marginBottom:5 }}><AlertTriangle size={10} style={{ flexShrink:0 }}/><span>{a.message}</span></div>
                ))}
                <div style={{ marginTop:10 }}>
                  {[['Stability',`${liveAI?.stabilityScore??'--'}/100`],['Risk Level',liveAI?.riskLevel??'N/A'],['Last Analysis',liveAI?.lastAnalysis?new Date(liveAI.lastAnalysis).toLocaleTimeString():'--']].map(([k,v])=>(
                    <div key={k} className="data-row"><span className="data-key">{k}</span><span className="data-val" style={k==='Risk Level'?{color:riskColor}:{}}>{v}</span></div>
                  ))}
                </div>
              </div>
              <div className="p-card">
                <div className="p-card-title" style={{ marginBottom:12 }}><Phone size={14}/> EMERGENCY CONTACT</div>
                {patient.emergencyContact?.name
                  ? [['Name',patient.emergencyContact.name],['Phone',patient.emergencyContact.phone],['Relation',patient.emergencyContact.relation]].map(([k,v])=>(
                      <div key={k} className="data-row"><span className="data-key">{k}</span><span className="data-val">{v||'—'}</span></div>
                    ))
                  : <div style={{ fontFamily:'var(--fm)', fontSize:'0.78rem', color:'var(--t3)' }}>No emergency contact on file.</div>
                }
              </div>
              <div className="p-card">
                <div className="p-card-title" style={{ marginBottom:12 }}><Pill size={14}/> MEDICATIONS</div>
                {patient.medications?.length>0
                  ? patient.medications.map((m,i)=>(
                      <div key={i} className="data-row"><span className="data-key">{m.name}</span><span className="data-val">{[m.dosage,m.frequency].filter(Boolean).join(' · ')||'—'}</span></div>
                    ))
                  : <div style={{ fontFamily:'var(--fm)', fontSize:'0.78rem', color:'var(--t3)' }}>No medications recorded.</div>
                }
              </div>
            </div>

            {/* Clinical Notes */}
            <div className="p-card" style={{ marginBottom:24 }}>
              <div className="p-card-title" style={{ marginBottom:14 }}>📋 CLINICAL NOTES</div>
              {patient.notes?.length>0
                ? [...patient.notes].reverse().map((n,i)=>(
                    <div key={i} style={{ padding:'10px 12px', borderRadius:8, background:'rgba(0,212,255,0.03)', border:'1px solid rgba(255,255,255,0.04)', marginBottom:8 }}>
                      <div style={{ fontFamily:'var(--fm)', fontSize:'0.78rem', color:'var(--t2)', marginBottom:4 }}>{n.text}</div>
                      <div style={{ fontFamily:'var(--fm)', fontSize:'0.62rem', color:'var(--t3)' }}>{n.author} · {new Date(n.timestamp).toLocaleString()}</div>
                    </div>
                  ))
                : <div style={{ fontFamily:'var(--fm)', fontSize:'0.78rem', color:'var(--t3)', marginBottom:12 }}>No clinical notes yet.</div>
              }
              {noteOk && <div className="msg msg-success"><CheckCircle size={13}/> Note saved.</div>}
              <div style={{ display:'flex', gap:10, marginTop:12 }}>
                <textarea value={note} onChange={e=>setNote(e.target.value)} placeholder="Add clinical observation…" style={{ flex:1, minHeight:60, resize:'vertical', fontFamily:'var(--fb)' }}/>
                <button className="btn btn-primary" style={{ alignSelf:'flex-end', padding:'9px 16px' }} onClick={handleAddNote} disabled={noteLoading||!note.trim()}>
                  {noteLoading?'...': <Plus size={15}/>}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
