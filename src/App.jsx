import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider }     from './context/AuthContext';
import { SocketProvider }   from './context/SocketContext';
import { SettingsProvider } from './context/SettingsContext';
import ProtectedRoute from './components/ProtectedRoute';

import Login          from './pages/Login';
import Register       from './pages/Register';
import Dashboard      from './pages/Dashboard';
import PatientDetails from './pages/PatientDetails';
import Analytics      from './pages/Analytics';
import Alerts         from './pages/Alerts';
import Security       from './pages/Security';
import SettingsPage   from './pages/Settings';

export default function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <SettingsProvider>
          <BrowserRouter>
            <Routes>
              <Route path="/"             element={<Login />} />
              <Route path="/register"     element={<Register />} />
              <Route path="/dashboard"    element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/patients/:id" element={<ProtectedRoute><PatientDetails /></ProtectedRoute>} />
              <Route path="/analytics"    element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
              <Route path="/alerts"       element={<ProtectedRoute><Alerts /></ProtectedRoute>} />
              <Route path="/security"     element={<ProtectedRoute><Security /></ProtectedRoute>} />
              <Route path="/settings"     element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="*"             element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SettingsProvider>
      </SocketProvider>
    </AuthProvider>
  );
}
