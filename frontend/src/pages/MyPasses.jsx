import { useEffect, useMemo, useState } from 'react';
import { api, API_URL } from '../lib/api';

function fmt(dt) {
  if (!dt) return '—';
  try {
    return new Date(dt).toLocaleString(undefined, {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: 'numeric', minute: '2-digit', second: '2-digit'
    });
  } catch {
    return String(dt);
  }
}

function PassCard({ p }) {
  const visitorName = useMemo(() => {
    const v = p.visitorId || {};
    const name = [v.firstName, v.lastName].filter(Boolean).join(' ');
    return name || v.email || '—';
  }, [p]);

  // Prefer stored public QR; fallback to authenticated endpoint
  const qrSrc = p.qrImageUrl ? `${API_URL}${p.qrImageUrl}` : api.passQrUrl(p._id);

  return (
    <div className="card" style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 16 }}>
      <div>
        {p.orgName ? (
          <div style={{
            display: 'inline-block',
            fontSize: 12,
            padding: '2px 8px',
            borderRadius: 999,
            background: '#EEF2FF',
            color: '#3730A3',
            marginBottom: 8
          }}>
            {p.orgName}
          </div>
        ) : null}

        <div style={{ lineHeight: 1.9 }}>
          <div><strong>Code:</strong> {p.code}</div>
          <div><strong>Visitor:</strong> {visitorName}</div>
          <div><strong>Status:</strong> {p.status}</div>
          <div><strong>Valid:</strong> {fmt(p.validFrom)} → {fmt(p.validTo)}</div>
        </div>

        <div style={{ marginTop: 12, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <a className="btn outline" href={api.passPdfUrl(p._id)} target="_blank" rel="noreferrer">Open PDF</a>
        </div>
      </div>

      <div style={{ alignSelf: 'center' }}>
        <img
          src={qrSrc}
          alt="QR"
          width={120}
          height={120}
          style={{ imageRendering: 'pixelated', borderRadius: 8, border: '1px solid #e5e7eb' }}
        />
      </div>
    </div>
  );
}

export default function MyPasses() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr('');
      try {
        const res = await api.listPasses({ limit: 100, page: 1 });
        setItems(res.items || []);
      } catch (e) {
        setErr(e.message || 'Failed to load passes');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="section">
      <div className="card" style={{ paddingBottom: 8 }}>
        <h3 style={{ marginTop: 0 }}>My Passes</h3>
        {err && <div className="error" style={{ marginBottom: 8 }}>{err}</div>}

        {loading ? (
          <div>Loading...</div>
        ) : items.length === 0 ? (
          <div className="muted">No passes found.</div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: 12
            }}
          >
            {items.map((p) => (
              <PassCard key={p._id} p={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}