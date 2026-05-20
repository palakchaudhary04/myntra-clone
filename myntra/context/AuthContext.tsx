import React, { createContext, useContext, useEffect, useState } from 'react';
import { getUserData, saveUserData, clearUserData } from '@/utils/storage';
import api from '../constants/apiConfig';

type User = { _id: string; name: string; email: string };

type AuthContextType = {
  isAuthenticated: boolean;
  user:    User | null;
  token:   string | null;
  Signup:  (fullName: string, email: string, password: string) => Promise<void>;
  login:   (email: string, password: string) => Promise<void>;
  logout:  () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user,  setUser]  = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  // Restore session on app start
  useEffect(() => {
    (async () => {
      const data = await getUserData();
      if (data._id && data.name && data.email) {
        setUser({ _id: data._id, name: data.name, email: data.email });
        setToken(data.token || null);
        setIsAuthenticated(true);
        // Attach token to all future axios requests
        if (data.token) api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      }
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const res  = await api.post('/user/login', { email, password });
    const data = res.data;                        // { user: {...}, token: "..." }
    const u    = data.user;

    // ── Bug fix: backend returns fullName, not name ─────────────────────
    const displayName = u.fullName || u.name || '';
    await saveUserData(u._id, displayName, u.email, data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser({ _id: u._id, name: displayName, email: u.email });
    setToken(data.token);
    setIsAuthenticated(true);
  };

  const Signup = async (fullName: string, email: string, password: string) => {
    const res  = await api.post('/user/signup', { fullName, email, password });
    const data = res.data;
    const u    = data.user;

    const displayName = u.fullName || u.name || '';
    await saveUserData(u._id, displayName, u.email, data.token);
    api.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
    setUser({ _id: u._id, name: displayName, email: u.email });
    setToken(data.token);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await clearUserData();
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, token, Signup, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;