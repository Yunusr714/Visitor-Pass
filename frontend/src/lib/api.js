const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function getToken() {
  return localStorage.getItem('token');
}

async function request(path, { method = 'GET', body, headers } = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {})
    },
    body: body ? JSON.stringify(body) : undefined
  });

  if (res.status === 401) {
    localStorage.removeItem('token');
    window.location.href = '/login';
    return;
  }

  const ct = res.headers.get('content-type') || '';
  const data = ct.includes('application/json') ? await res.json() : await res.text();

  if (!res.ok) throw new Error(data?.error || (typeof data === 'string' ? data : 'Request failed'));
  return data;
}

function makeQS(params = {}) {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== '')
  ).toString();
  return q ? `?${q}` : '';
}

export const api = {
  // Staff (admin/host/security)
  login: (email, password) =>
    request('/auth/login', { method: 'POST', body: { email, password } }),
  me: () => request('/auth/me'),
  myOrgs: () => request('/auth/my-orgs'),

  // End-user "account" flow (register + login, then view visited orgs/passes)
  registerAccount: (payload) =>
    request('/auth/register-account', { method: 'POST', body: payload }),
  accountLogin: (email, password) =>
    request('/auth/account-login', { method: 'POST', body: { email, password } }),
  accountOrganizations: () => request('/auth/account-organizations'),
  accountPasses: (params = {}) => request(`/auth/account-passes${makeQS(params)}`),

  // Optional: legacy visitor email-only login (keep if you still support visitor role)
  visitorLogin: (email) =>
    request('/auth/visitor-login', { method: 'POST', body: { email } }),

  // Organization (admin self-serve)
  registerOrg: (payload) =>
    request('/auth/register-org', { method: 'POST', body: payload }),

  // Visitors (staff-managed)
  createVisitor: (payload) =>
    request('/visitors', { method: 'POST', body: payload }),
  listVisitors: (params = {}) => request(`/visitors${makeQS(params)}`),

  // Appointments
  createAppointment: (payload) =>
    request('/appointments', { method: 'POST', body: payload }),
  listAppointments: (params = {}) => request(`/appointments${makeQS(params)}`),

  // Passes
  issuePass: (payload) =>
    request('/passes/issue', { method: 'POST', body: payload }),
  listPasses: (params = {}) => request(`/passes${makeQS(params)}`),

  // Check logs / scanning
  listCheckLogs: (params = {}) => request(`/check-logs${makeQS(params)}`),
  scan: (payload) => request('/check-logs/scan', { method: 'POST', body: payload }),

  // Admin users
  listUsers: (params = {}) => request(`/users${makeQS(params)}`),
  createUser: (payload) => request('/users', { method: 'POST', body: payload }),

  // Asset helpers
  passQrUrl: (id) => `${API_URL}/passes/${id}/qr.png`,
  passPdfUrl: (id) => `${API_URL}/passes/${id}/badge.pdf`
};

export { API_URL, request };