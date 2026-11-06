import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuth, ready } = useAuth();
  if (!ready) return (
    <div className="loading-screen">
      <div className="spinner" />
      <div className="loading-label">AUTHENTICATING...</div>
    </div>
  );
  return isAuth ? children : <Navigate to="/" replace />;
};

export default ProtectedRoute;
