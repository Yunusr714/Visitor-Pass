import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../lib/api';

export default function RegisterUser() {
  const [form, setForm] = useState({ name: '', email: '', password: '', phone: '' });
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const nav = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setMsg('');
    setBusy(true);
    try {
      const res = await api.registerAccount(form);
      if (res?.error) { setMsg(res.error); return; }
      setMsg('Registered. Please login.');
      nav('/login');
    } catch (err) {
      setMsg(err.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="section">
      <div className="card" style={{ maxWidth: 560, margin: '0 auto' }}>
        <h2 style={{ marginTop: 0 }}>Register</h2>
        <form className="form" onSubmit={onSubmit}>
          <label>Name<input value={form.name} onChange={(e)=>setForm({...form, name:e.target.value})} required/></label>
          <label>Email<input type="email" value={form.email} onChange={(e)=>setForm({...form, email:e.target.value})} required/></label>
          <label>Password<input type="password" value={form.password} onChange={(e)=>setForm({...form, password:e.target.value})} required/></label>
          <label>Mobile number<input value={form.phone} onChange={(e)=>setForm({...form, phone:e.target.value})}/></label>
          <button className="btn" type="submit" disabled={busy}>{busy ? 'Registering...' : 'Register'}</button>
          {msg && <div className="error" style={{ marginTop: 8 }}>{msg}</div>}
        </form>
      </div>
    </div>
  );
}