import { useEffect, useMemo, useState } from 'react';
import { api } from '../lib/api';
import QRCode from 'react-qr-code';
import { useAuth } from '../context/AuthContext';
import PageHeader from '../components/PageHeader';

export default function Passes() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [visitors, setVisitors] = useState([]);
  const [filter, setFilter] = useState({ status: '', visitorId: '' });
  const [msg, setMsg] = useState('');
  const canIssue = useMemo(() => ['admin', 'security'].includes(String(user?.role || '').toLowerCase()), [user]);

  async function load() {
    const [p, v] = await Promise.all([
      api.listPasses({ ...filter, limit: 20, page: 1 }),
      api.listVisitors({ limit: 100, page: 1 })
    ]);
    setItems(p.items || []);
    setVisitors(v.items || []);
  }
  useEffect(() => { load(); }, []);

  async function onIssue(e) {
    e.preventDefault(); setMsg('');
    const visitorId = e.target.visitorId.value;
    const appointmentId = e.target.appointmentId.value || undefined;
    try {
      await api.issuePass({ visitorId, appointmentId });
      setMsg('Pass issued'); load(); e.target.reset();
    } catch (e) { setMsg(e.message || 'Failed to issue pass'); }
  }

  return (
    <div className="section">
      <PageHeader
        title="Passes"
        subtitle="Issue and manage QR-based passes. Download QR or PDF badge."
        right={
          <div className="row" style={{ gap: 8 }}>
            <select value={filter.status} onChange={(e)=>setFilter({...filter, status:e.target.value})}>
              <option value="">All statuses</option>
              <option value="issued">issued</option>
              <option value="active">active</option>
              <option value="expired">expired</option>
              <option value="revoked">revoked</option>
            </select>
            <select value={filter.visitorId} onChange={(e)=>setFilter({...filter, visitorId:e.target.value})}>
              <option value="">All visitors</option>
              {visitors.map(v => <option key={v._id} value={v._id}>{v.firstName} {v.lastName}</option>)}
            </select>
            <button className="btn outline" onClick={load}>Apply</button>
          </div>
        }
      />

      <div className="grid-2eq align-start">
        <div className="card" style={{ gridColumn: '1 / -1' }}>
          {items.length === 0 ? <div>No passes found.</div> : (
            <div className="grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
              {items.map(p => (
                <div key={p._id} className="card" data-aos="fade-up">
                  <div className="row">
                    <div>
                      <div><strong>Code:</strong> {p.code}</div>
                      <div><strong>Visitor:</strong> {p.visitorId?.firstName} {p.visitorId?.lastName}</div>
                      <div className="muted"><strong>Status:</strong> {p.status}</div>
                      <div className="muted">
                        <strong>Valid:</strong> {new Date(p.validFrom).toLocaleString()} → {new Date(p.validTo).toLocaleString()}
                      </div>
                    
                    </div>
                    <div style={{margin:10}}>
                      <QRCode value={p.code} size={96} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <h3>Issue New Pass</h3>
          {!canIssue ? (
            <div className="muted">You don’t have permission to issue passes.</div>
          ) : (
            <form onSubmit={onIssue} className="form">
              <label>Visitor
                <select name="visitorId" required>
                  <option value="">Select visitor</option>
                  {visitors.map(v => <option key={v._id} value={v._id}>{v.firstName} {v.lastName} ({v.email || v.company || 'n/a'})</option>)}
                </select>
              </label>
              <label>Appointment ID (optional)
                <input name="appointmentId" placeholder="Paste appointment id (optional)" />
              </label>
              <button type="submit" className="btn block">Issue</button>
              {msg && <div className="muted">{msg}</div>}
            </form>
          )}
        </div>
      </div>
    </div>
  );
}