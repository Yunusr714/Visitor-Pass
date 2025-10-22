import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';

export default function Login() {
  const { login, setTokenAndUser } = useAuth(); // helper in AuthContext to set token+user
  const [mode, setMode] = useState('user'); // 'user' | 'staff'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/my-passes';

  function switchMode(next) {
    setMode(next);
    setError('');
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'staff') {
        await login(email, password);
        nav('/dashboard', { replace: true });
      } else {
        const data = await api.accountLogin(email, password);
        if (!data?.token) throw new Error(data?.error || 'Login failed');
        localStorage.setItem('token', data.token);
        setTokenAndUser(data.token, data.user);
        nav('/my-passes', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <div className="card" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Login</h2>

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <button
            className={`btn outline ${mode === 'user' ? 'active' : ''}`}
            onClick={() => switchMode('user')}
            disabled={mode === 'user'}
          >
            User
          </button>
          <button
            className={`btn outline ${mode === 'staff' ? 'active' : ''}`}
            onClick={() => switchMode('staff')}
            disabled={mode === 'staff'}
          >
            Staff
          </button>
        </div>

        <form onSubmit={onSubmit} className="form">
          <label>Email
            <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
          </label>
          <label>Password
            <input type="password" value={password} onChange={(e)=>setPassword(e.target.value)} required />
          </label>
          {error && <div className="error">{error}</div>}
          <button type="submit" className="btn block" disabled={busy}>
            {busy ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <div style={{ marginTop: 16 }}>
          <div className="muted" style={{ marginBottom: 6 }}>New user?</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <Link to="/register-user" className="btn outline">Register</Link>
          </div>
        </div>
      </div>
    </div>
  );
}