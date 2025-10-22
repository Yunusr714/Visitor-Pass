import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const heroImage = 'https://images.unsplash.com/photo-1524758631624-e2822e304c36?q=80&w=1600&auto=format&fit=crop';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="section">
      {/* Hero */}
      <div className="hero" style={{ backgroundImage: `url(${heroImage})` }}>
        <div className="hero-content" data-aos="fade-up">
          <h1 className="hero-title">Visitor Pass Management System</h1>
          <p className="hero-sub">Secure, fast, and paperless visitor management for your organization.</p>
          <div className="hero-cta" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {!user ? (
              <>
                <Link to="/login" className="btn">Login</Link>
                <Link to="/register-org" className="btn secondary">Register Organization</Link>
                <Link to="/register-visitor" className="btn outline">Register Visitor</Link>
              </>
            ) : (
              <>
                <Link to="/dashboard" className="btn">Open Dashboard</Link>
                <Link to="/passes" className="btn secondary">Issue Pass</Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Rest of the page unchanged */}
      <div className="section grid" data-aos="fade-up">
        <div className="card center" data-aos="zoom-in" data-aos-delay="0">
          <div>
            <div className="stat-num">24/7</div>
            <div className="muted">Always available</div>
          </div>
        </div>
        <div className="card center" data-aos="zoom-in" data-aos-delay="100">
          <div>
            <div className="stat-num">QR</div>
            <div className="muted">Instant check-in/out</div>
          </div>
        </div>
        <div className="card center" data-aos="zoom-in" data-aos-delay="200">
          <div>
            <div className="stat-num">Audit</div>
            <div className="muted">Complete visit logs</div>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="section grid">
        <div className="card" data-aos="fade-up" data-aos-delay="0">
          <h3>Pre-registration</h3>
          <p className="muted">Create visitors ahead of time and tie them to appointments for a smooth lobby experience.</p>
        </div>
        <div className="card" data-aos="fade-up" data-aos-delay="100">
          <h3>QR Passes</h3>
          <p className="muted">Generate unique codes, share digitally, and scan on arrival for instant check-in.</p>
        </div>
        <div className="card" data-aos="fade-up" data-aos-delay="200">
          <h3>Logs & Reports</h3>
          <p className="muted">Search, filter, and export visit history for compliance and audits.</p>
        </div>
      </div>

      {/* Roles */}
      <div className="section grid-2">
        <div className="card" data-aos="fade-right">
          <h3>For Admins</h3>
          <ul className="muted">
            <li>Manage users (Hosts, Security, Admins)</li>
            <li>View upcoming appointments and recent logs</li>
            <li>Issue and revoke passes</li>
          </ul>
          <Link to={user ? '/dashboard' : '/login'} className="btn" style={{ marginTop: 10 }}>
            {user ? 'Go to Dashboard' : 'Login as Admin'}
          </Link>
        </div>
        <div className="card" data-aos="fade-left">
          <h3>For Security & Hosts</h3>
          <ul className="muted">
            <li>Hosts: create visitors and schedule appointments</li>
            <li>Security: scan QR for check-in/out</li>
            <li>Both: view passes and schedules</li>
          </ul>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <Link to={user ? '/passes' : '/login'} className="btn secondary">View Passes</Link>
            <Link to={user ? '/scan' : '/login'} className="btn outline">Open Scanner</Link>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="section">
        <div className="card center" data-aos="fade-up">
          <div>
            <h3 style={{ marginTop: 0 }}>Get started in minutes</h3>
            <p className="muted">Register your org or user, then login to manage visits.</p>
            {!user ? (
              <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
                <Link to="/register-org" className="btn">Register Organization</Link>
                <Link to="/register-user" className="btn outline">Register User</Link>
              </div>
            ) : (
              <Link to="/visitors" className="btn">Add Visitor</Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}