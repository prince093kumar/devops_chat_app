import React, { createContext, useState, useEffect } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Normalize user object so both id and _id are populated safely
  const saveUser = (userData) => {
    if (!userData) {
      setUser(null);
      return;
    }
    const normalized = { ...userData };
    if (normalized._id && !normalized.id) {
      normalized.id = normalized._id;
    } else if (normalized.id && !normalized._id) {
      normalized._id = normalized.id;
    }
    setUser(normalized);
  };

  useEffect(() => {
    const checkLoggedIn = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          // Fetch fresh user profile from API gateway
          const res = await api.get('/api/auth/profile');
          saveUser(res.data.user);
        } catch (err) {
          console.error('Error restoring session:', err);
          logout();
        }
      }
      setLoading(false);
    };
    checkLoggedIn();
  }, []);

  const login = async (email, password) => {
    const res = await api.post('/api/auth/login', { email, password });
    localStorage.setItem('token', res.data.token);
    saveUser(res.data.user);
    return res.data;
  };

  const register = async (username, email, password) => {
    const res = await api.post('/api/auth/register', { username, email, password });
    localStorage.setItem('token', res.data.token);
    saveUser(res.data.user);
    return res.data;
  };

  const logout = () => {
    localStorage.removeItem('token');
    saveUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
