const jwt = require('jsonwebtoken');

const ALLOWED_ROLES = new Set(['admin', 'security', 'host', 'visitor', 'account']);

function requireAuth(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    // 1) Try Bearer header
    let token = header.startsWith('Bearer ') ? header.slice(7) : '';
    // 2) Fallback to token in query (for image/pdf asset URLs)
    if (!token && req.query && req.query.token) {
      token = req.query.token;
    }
    if (!token) return res.status(401).json({ error: 'Unauthorized' });

    const payload = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      userId: payload.userId,
      visitorId: payload.visitorId,
      orgId: payload.orgId,
      role: String(payload.role || '').toLowerCase(),
      email: payload.email || '',
      name: payload.name || ''
    };

    if (req.user.role && !ALLOWED_ROLES.has(req.user.role)) {
      return res.status(403).json({ error: 'Invalid role' });
    }
    next();
  } catch (e) {
    console.error('requireAuth error:', e);
    return res.status(401).json({ error: 'Unauthorized' });
  }
}

function requireRoles(...roles) {
  const want = new Set(roles.map((r) => String(r).toLowerCase()));
  return (req, res, next) => {
    const role = String(req.user?.role || '').toLowerCase();
    if (!role || !want.has(role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  };
}

module.exports = { requireAuth, requireRoles };