import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function RegisterOrg() {
  const [form, setForm] = useState({ orgName: '', adminName: '', adminEmail: '', password: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    try {
      const data = await api.registerOrg(form);
      if (!data?.token) { setMsg(data?.error || 'Failed to register'); return; }
      localStorage.setItem('token', data.token);
      if (data?.org?.id) localStorage.setItem('currentOrgId', data.org.id);
      // simple reload to hydrate context
      window.location.href = '/dashboard';
    } catch (err) {
      setMsg(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Register Organization</h2>
        <form className="form" onSubmit={onSubmit}>
          <label>Organization name<input value={form.orgName} onChange={(e)=>setForm({...form, orgName:e.target.value})} required/></label>
          <label>Admin name<input value={form.adminName} onChange={(e)=>setForm({...form, adminName:e.target.value})} required/></label>
          <label>Admin email<input value={form.adminEmail} onChange={(e)=>setForm({...form, adminEmail:e.target.value})} type="email" required/></label>
          <label>Admin password<input value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} type="password" required/></label>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Registering...' : 'Register & Login'}</button>
          {msg && <div className="error" style={{ marginTop: 8 }}>{msg}</div>}
        </form>
      </div>
    </div>
  );
}