import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useNavigate } from 'react-router-dom';

export default function MyOrganizations() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const nav = useNavigate();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await api.accountOrganizations();
        setItems(res.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="section">
      <div className="card">
        <h3 style={{ marginTop: 0 }}>My Organizations</h3>
        {loading ? (
          <div>Loading...</div>
        ) : items.length === 0 ? (
          <div className="muted">No Organizations Found</div>
        ) : (
          <ul className="list">
            {items.map(o => (
              <li key={o.id} className="list-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                <div>
                  <div style={{ fontWeight: 600 }}>{o.name}</div>
                  {o.passes ? <div className="muted" style={{ fontSize: 13 }}>{o.passes} passes</div> : null}
                </div>
                <button className="btn" onClick={() => nav(`/my-passes?orgId=${o.id}`)}>View Passes</button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}