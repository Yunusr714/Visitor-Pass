import { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../lib/api';

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // For staff multi-org you may also keep org/orgs in here; not needed for 'account' flow
  const [orgs, setOrgs] = useState([]);
  const [org, setOrg] = useState(null);

  function setTokenAndUser(t, u) {
    localStorage.setItem('token', t);
    setToken(t);
    setUser(u);
  }

  async function loadMe() {
    if (!token) return;
    setLoading(true);
    try {
      const me = await api.me();
      setUser(me.user);
      // Optional: hydrate staff orgs here if needed
    } catch (e) {
      console.error('loadMe error', e);
      logout();
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { if (token) loadMe(); }, [token]);

  async function login(email, password) {
    const data = await api.login(email, password);
    if (!data?.token) throw new Error(data?.error || 'Login failed');
    localStorage.setItem('token', data.token);
    setToken(data.token);
    setUser(data.user || null);
    return data;
  }

  function logout() {
    localStorage.removeItem('token');
    setToken(null); setUser(null);
  }

  const value = { token, user, loading, login, logout, setTokenAndUser, orgs, org };
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export default AuthProvider;