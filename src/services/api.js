const PORTS = [5000, 5001, 5002, 3001];
let BACKEND_URL = null;

const detectBackend = async () => {
  if (BACKEND_URL) return BACKEND_URL;
  for (const port of PORTS) {
    try {
      const res = await fetch(`http://localhost:${port}/api/health`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) { BACKEND_URL = `http://localhost:${port}/api`; return BACKEND_URL; }
    } catch { /* try next port */ }
  }
  throw new Error('Backend not reachable. Please start the backend server (node server.js).');
};

const tok = () => localStorage.getItem('icu_token');

const req = async (path, opts = {}) => {
  const base = await detectBackend();
  let res;
  try {
    res = await fetch(`${base}${path}`, {
      headers: { 'Content-Type': 'application/json', ...(tok() ? { Authorization: `Bearer ${tok()}` } : {}) },
      ...opts,
    });
  } catch {
    BACKEND_URL = null;
    throw new Error('Cannot reach backend server. Is it still running?');
  }

  const text = await res.text();
  if (!text || text.trim() === '') throw new Error('Server returned empty response.');

  let data;
  try { data = JSON.parse(text); }
  catch { throw new Error('Invalid response from server.'); }

  if (!res.ok) throw new Error(data.message || `Request failed (${res.status})`);
  return data;
};

// Download a file (CSV) by triggering browser save
const download = async (path, filename) => {
  const base = await detectBackend();
  const res = await fetch(`${base}${path}`, { headers: { Authorization: `Bearer ${tok()}` } });
  if (!res.ok) throw new Error('Download failed');
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  window.URL.revokeObjectURL(url);
};

export const authAPI = {
  login:        (body) => req('/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  register:     (body) => req('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  getMe:        ()     => req('/auth/me'),
  getUsers:     ()     => req('/auth/users'),
  getActivity:  ()     => req('/auth/activity'),
  changePassword: (body) => req('/auth/change-password', { method: 'PUT', body: JSON.stringify(body) }),
};

export const patientAPI = {
  getAll:       ()         => req('/patients'),
  getById:      (id)       => req(`/patients/${id}`),
  add:          (body)     => req('/patients',                  { method: 'POST',   body: JSON.stringify(body) }),
  update:       (id, body) => req(`/patients/${id}`,           { method: 'PUT',    body: JSON.stringify(body) }),
  updateVitals: (id, body) => req(`/patients/${id}/vitals`,    { method: 'PUT',    body: JSON.stringify(body) }),
  addNote:      (id, body) => req(`/patients/${id}/notes`,     { method: 'POST',   body: JSON.stringify(body) }),
  discharge:    (id)       => req(`/patients/${id}/discharge`, { method: 'PUT' }),
  delete:       (id)       => req(`/patients/${id}`,           { method: 'DELETE' }),
  analytics:    ()         => req('/patients/analytics'),
};

export const alertAPI = {
  getAll:        ()    => req('/alerts'),
  getStats:      ()    => req('/alerts/stats'),
  acknowledge:   (id)  => req(`/alerts/${id}/acknowledge`, { method: 'PUT' }),
  resolve:       (id)  => req(`/alerts/${id}/resolve`,     { method: 'PUT' }),
  remove:        (id)  => req(`/alerts/${id}`,             { method: 'DELETE' }),
  clearResolved: ()    => req('/alerts/resolved',          { method: 'DELETE' }),
  clearAll:      ()    => req('/alerts/clear',             { method: 'DELETE' }),
  testSms:       ()    => req('/alerts/test-sms',          { method: 'POST' }),
};

export const settingsAPI = {
  get:          ()     => req('/settings'),
  update:       (body) => req('/settings', { method: 'PUT', body: JSON.stringify(body) }),
  systemInfo:   ()     => req('/settings/system-info'),
};

export const vitalsAPI = {
  stats:        ()              => req('/vitals/stats'),
  download:     (type, filename)=> download(`/vitals/download/${type}`, filename),
  downloadPatient: (patientId, type, filename) => download(`/vitals/patient/${patientId}/${type}`, filename),
  clear:        (type)          => req(`/vitals/clear/${type}`, { method: 'DELETE' }),
};
