import React, { createContext, useContext, useState, useEffect } from 'react';

const Ctx = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser]   = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('icu_token'));
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('icu_user');
    if (saved && token) { try { setUser(JSON.parse(saved)); } catch {} }
    setReady(true);
  }, []);

  const login = (userData, tok) => {
    setUser(userData); setToken(tok);
    localStorage.setItem('icu_token', tok);
    localStorage.setItem('icu_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null); setToken(null);
    localStorage.removeItem('icu_token');
    localStorage.removeItem('icu_user');
  };

  return (
    <Ctx.Provider value={{ user, token, login, logout, ready, isAuth: !!user }}>
      {children}
    </Ctx.Provider>
  );
};

export const useAuth = () => useContext(Ctx);
