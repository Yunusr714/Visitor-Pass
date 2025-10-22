import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import AOS from 'aos';

import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Appointments from './pages/Appointments.jsx';
import Passes from './pages/Passes.jsx';
import Scan from './pages/Scan.jsx';
import Users from './pages/admin/Users.jsx';
import VisitorDashboard from './pages/VisitorDashboard.jsx';

import RequireAuth from './components/RequireAuth.jsx';
import RequireRole from './components/RequireRole.jsx';
import NavBar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import RegisterOrg from './pages/RegisterOrg.jsx';
import RegisterVisitor from './pages/RegisterUser.jsx';
import RegisterUser from './pages/RegisterUser.jsx';
import MyPasses from './pages/MyPasses.jsx';
import MyOrganizations from './pages/MyOrganizations.jsx';

export default function App() {
  const location = useLocation();
  useEffect(() => { AOS.refresh(); }, [location.pathname]);

  return (
    <div className="app">
      <NavBar />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
  <Route path="/my-organizations" element={<RequireAuth><RequireRole roles={['account']}><MyOrganizations /></RequireRole></RequireAuth>} />
        <Route path="/my-passes" element={<RequireAuth><RequireRole roles={['account']}><MyPasses /></RequireRole></RequireAuth>} />
        <Route path="/register-user" element={<RegisterUser />} />

        {/* Staff/visitor existing routes (keep) */}
        <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/visitor" element={<RequireAuth><RequireRole roles={['visitor']}><VisitorDashboard /></RequireRole></RequireAuth>} />
        
      
          <Route path="/appointments" element={<RequireAuth><RequireRole roles={['admin','security','host']}><Appointments /></RequireRole></RequireAuth>} />
          <Route path="/passes" element={<RequireAuth><RequireRole roles={['admin','security','host']}><Passes /></RequireRole></RequireAuth>} />
          <Route path="/scan" element={<RequireAuth><RequireRole roles={['admin','security']}><Scan /></RequireRole></RequireAuth>} />
  <Route path="/register-org" element={<RegisterOrg />} />
        <Route path="/register-visitor" element={<RegisterVisitor />} />

          <Route path="/admin/users" element={<RequireAuth><RequireRole roles={['admin']}><Users /></RequireRole></RequireAuth>} />
<Route path="/visitor" element={<RequireAuth><RequireRole roles={['visitor']}><VisitorDashboard /></RequireRole></RequireAuth>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      <Footer />
    </div>
  );
}