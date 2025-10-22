const { User } = require('../models/User');
const Organization = require('../models/Organization');
const Visitor = require('../models/Visitor');
const { hashPassword, verifyPassword } = require('../utils/password');
const { signAuthToken } = require('../utils/jwt');

function bad(res, msg, code = 400) {
  return res.status(code).json({ error: msg });
}

const ALLOWED_ROLES = new Set(['admin', 'security', 'host', 'visitor']);

async function registerOrg(req, res) {
  try {
    const { orgName, adminName, adminEmail, password } = req.body || {};
    if (!orgName || !adminName || !adminEmail || !password) {
      return bad(res, 'orgName, adminName, adminEmail and password are required');
    }

    const org = await Organization.create({ name: orgName });

    const passwordHash = await hashPassword(password);
    const adminUser = await User.create({
      orgId: org._id,
      orgIds: [org._id],
      name: adminName,
      email: adminEmail,
      role: 'admin',
      status: 'active',
      passwordHash
    });

    org.createdByUserId = adminUser._id;
    await org.save();

    const token = signAuthToken({
      userId: adminUser._id.toString(),
      orgId: org._id.toString(),
      role: adminUser.role,
      name: adminUser.name,
      email: adminUser.email
    });

    return res.status(201).json({
      token,
      user: { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: adminUser.role },
      org: { id: org._id, name: org.name }
    });
  } catch (e) {
    console.error('registerOrg error:', e);
    return bad(res, 'Failed to register organization', 500);
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return bad(res, 'email and password are required');

    const candidates = await User.find({ email }).sort({ createdAt: -1 }).limit(5);
    if (candidates.length === 0) return res.status(401).json({ error: 'Invalid credentials' });

    let user = candidates.find(u => (u.status || 'active') !== 'disabled') || candidates[0];

    const ok = await verifyPassword(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    let role = String(user.role || '').toLowerCase();
    if (!ALLOWED_ROLES.has(role)) {
      return bad(res, `Invalid role on user. Expected one of ${Array.from(ALLOWED_ROLES).join(', ')}`, 400);
    }
    if (role === 'visitor') {
      return bad(res, 'Visitor role cannot sign in to the staff dashboard with password', 403);
    }

    const org = await Organization.findById(user.orgId).lean();
    if (!org) return bad(res, 'User organization not found', 400);

    const token = signAuthToken({
      userId: user._id.toString(),
      orgId: user.orgId.toString(),
      role,
      name: user.name,
      email: user.email
    });

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role },
      org: { id: org._id, name: org.name }
    });
  } catch (e) {
    console.error('login error:', e);
    return bad(res, 'Login failed', 500);
  }
}

async function visitorLogin(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) return bad(res, 'email is required');

    const visitor = await Visitor.findOne({ email: String(email).toLowerCase() });
    if (!visitor) return res.status(404).json({ error: 'Visitor not found' });

    const org = await Organization.findById(visitor.orgId).lean();
    if (!org) return bad(res, 'Visitor organization not found', 400);

    const token = signAuthToken({
      userId: visitor._id.toString(),
      visitorId: visitor._id.toString(),
      orgId: visitor.orgId.toString(),
      role: 'visitor',
      name: `${visitor.firstName} ${visitor.lastName || ''}`.trim(),
      email: visitor.email
    });

    return res.json({
      token,
      user: { id: visitor._id, name: `${visitor.firstName} ${visitor.lastName || ''}`.trim(), email: visitor.email, role: 'visitor' },
      org: { id: org._id, name: org.name }
    });
  } catch (e) {
    console.error('visitorLogin error:', e);
    return bad(res, 'Login failed', 500);
  }
}

// NEW: Public list of organizations for visitor registration dropdown
async function publicOrgs(req, res) {
  try {
    const items = await Organization.find({}, { name: 1 }).sort({ name: 1 }).lean();
    res.json({ items: items.map(o => ({ id: o._id, name: o.name })) });
  } catch (e) {
    console.error('publicOrgs error:', e);
    return bad(res, 'Failed to list organizations', 500);
  }
}

// NEW: Visitor self-registration (only visitors can register themselves)
async function registerVisitor(req, res) {
  try {
    const { orgId, firstName, lastName, email, phone, company, notes, autoLogin = true } = req.body || {};
    if (!orgId || !firstName || !email) {
      return bad(res, 'orgId, firstName and email are required');
    }

    const org = await Organization.findById(orgId).lean();
    if (!org) return bad(res, 'Organization not found', 404);

    const existing = await Visitor.findOne({ orgId, email: String(email).toLowerCase() });
    if (existing) return bad(res, 'A visitor with this email already exists for this organization', 409);

    const v = await Visitor.create({
      orgId,
      firstName,
      lastName: lastName || '',
      email: String(email).toLowerCase(),
      phone: phone || '',
      company: company || '',
      notes: notes || ''
    });

    if (!autoLogin) {
      return res.status(201).json({
        message: 'Visitor registered',
        visitor: { id: v._id, firstName: v.firstName, lastName: v.lastName, email: v.email },
        org: { id: org._id, name: org.name }
      });
    }

    // Auto-issue a visitor token so they land in the visitor dashboard
    const token = signAuthToken({
      userId: v._id.toString(),
      visitorId: v._id.toString(),
      orgId: v.orgId.toString(),
      role: 'visitor',
      name: `${v.firstName} ${v.lastName || ''}`.trim(),
      email: v.email
    });

    return res.status(201).json({
      token,
      user: { id: v._id, name: `${v.firstName} ${v.lastName || ''}`.trim(), email: v.email, role: 'visitor' },
      org: { id: org._id, name: org.name }
    });
  } catch (e) {
    console.error('registerVisitor error:', e);
    return bad(res, 'Failed to register visitor', 500);
  }
}

// Deprecated for public use: keep to avoid 404 but block non-visitor roles
async function registerUser(req, res) {
  return bad(res, 'Public registration is for visitors only. Please use /auth/register-visitor.', 400);
}



async function myOrgs(req, res) {
  try {
    const { userId } = req.user || {};
    if (!userId) return bad(res, 'Not authenticated', 401);

    const user = await User.findById(userId).lean();
    if (!user) return bad(res, 'User not found', 404);

    const orgIds = new Set();
    if (Array.isArray(user.orgIds)) user.orgIds.forEach(id => orgIds.add(String(id)));
    if (user.orgId) orgIds.add(String(user.orgId));

    const ids = Array.from(orgIds);
    const orgs = await Organization.find({ _id: { $in: ids } }).lean();

    res.json({ items: orgs });
  } catch (e) {
    console.error('myOrgs error:', e);
    return bad(res, 'Failed to list organizations', 500);
  }
}

async function registerAccount(req, res) {
  try {
    const { name, email, password, phone } = req.body || {};
    if (!name || !email || !password) return bad(res, 'name, email and password are required');

    const existing = await User.findOne({ email: String(email).toLowerCase() });
    if (existing) return bad(res, 'Email already registered', 409);

    const passwordHash = await hashPassword(password);
    const u = await User.create({
      name,
      email: String(email).toLowerCase(),
      phone: phone || '',
      role: 'account',
      status: 'active',
      passwordHash
    });

    return res.status(201).json({
      user: { id: u._id, name: u.name, email: u.email, role: u.role }
    });
  } catch (e) {
    console.error('registerAccount error:', e);
    return bad(res, 'Failed to register user', 500);
  }
}

async function accountLogin(req, res) {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return bad(res, 'email and password are required');

    const user = await User.findOne({ email: String(email).toLowerCase(), role: 'account' });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await verifyPassword(password, user.passwordHash || '');
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const token = signAuthToken({
      userId: user._id.toString(),
      role: 'account',
      name: user.name,
      email: user.email
    });

    return res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email, role: 'account' }
    });
  } catch (e) {
    console.error('accountLogin error:', e);
    return bad(res, 'Login failed', 500);
  }
}

// List organizations the account has actually visited (has at least one pass)
async function accountVisitedOrganizations(req, res) {
  try {
    // 1) Derive email from token; fallback to Users collection
    let email = safeLower(req.user?.email);
    if (!email && req.user?.userId) {
      const u = await User.findById(req.user.userId).lean();
      email = safeLower(u?.email);
    }
    if (!email) {
      console.warn('accountVisitedOrganizations: missing email for userId=', req.user?.userId);
      return res.json({ items: [] });
    }

    // 2) Find visitor records with same email
    const visitors = await Visitor.find({ email }, { _id: 1, orgId: 1 }).lean();
    if (!visitors.length) {
      console.info('accountVisitedOrganizations: no visitors for email', email);
      return res.json({ items: [] });
    }

    const visitorIds = visitors.map(v => v._id);
    // 3) Aggregate passes grouped by orgId
    const agg = await Pass.aggregate([
      { $match: { visitorId: { $in: visitorIds } } },
      { $group: { _id: '$orgId', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    if (!agg.length) {
      console.info('accountVisitedOrganizations: no passes for visitors', visitorIds.map(String));
      return res.json({ items: [] });
    }

    const orgIds = agg.map(a => a._id);
    const orgs = await Organization.find({ _id: { $in: orgIds } }, { name: 1 }).lean();

    const orgMap = new Map(orgs.map(o => [String(o._id), o]));
    const items = agg
      .map(a => {
        const o = orgMap.get(String(a._id));
        return o ? { id: o._id, name: o.name, passes: a.count } : null;
      })
      .filter(Boolean);

    return res.json({ items });
  } catch (e) {
    console.error('accountVisitedOrganizations error:', e);
    return res.status(500).json({ error: 'Failed to list organizations' });
  }
}

// GET /auth/account-passes?orgId=...
// Lists passes for selected org for this account (matched by email)
async function accountPasses(req, res) {
  try {
    let email = safeLower(req.user?.email);
    if (!email && req.user?.userId) {
      const u = await User.findById(req.user.userId).lean();
      email = safeLower(u?.email);
    }
    if (!email) return res.status(401).json({ error: 'Not authenticated' });

    const { orgId, limit = 20, page = 1, status } = req.query || {};
    if (!orgId) return res.status(400).json({ error: 'orgId is required' });

    const visitors = await Visitor.find({ orgId, email }, { _id: 1 }).lean();
    if (!visitors.length) {
      return res.json({ items: [], total: 0, page: Number(page), limit: Number(limit) });
    }

    const vIds = visitors.map(v => v._id);
    const filter = { orgId, visitorId: { $in: vIds } };
    if (status) filter.status = status;

    const [items, total] = await Promise.all([
      Pass.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('visitorId', 'firstName lastName email phone')
        .lean(),
      Pass.countDocuments(filter)
    ]);

    return res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (e) {
    console.error('accountPasses error:', e);
    return res.status(500).json({ error: 'Failed to list passes' });
  }
}

// TEMP debug to verify what the token/middleware provides
async function debugWhoAmI(req, res) {
  return res.json({ user: req.user });
}

// Update `me` to support 'account' role (if your existing file lacks this)
async function me(req, res) {
  try {
    const { role, userId, visitorId } = req.user || {};
    const r = String(role || '').toLowerCase();

    if (r === 'visitor') {
      const v = await Visitor.findById(visitorId || userId).lean();
      if (!v) return bad(res, 'Visitor not found', 404);
      const org = await Organization.findById(v.orgId).lean();
      return res.json({
        user: { id: v._id, name: `${v.firstName} ${v.lastName || ''}`.trim(), email: v.email, role: 'visitor' },
        org: org ? { id: org._id, name: org.name } : null
      });
    }

    // staff and account users live in Users
    const u = await User.findById(userId).lean();
    if (!u) return bad(res, 'User not found', 404);
    let org = null;
    if (u.orgId) {
      const o = await Organization.findById(u.orgId).lean();
      if (o) org = { id: o._id, name: o.name };
    }

    return res.json({
      user: { id: u._id, name: u.name, email: u.email, role: String(u.role || '').toLowerCase(), status: u.status || 'active' },
      org
    });
  } catch (e) {
    console.error('me error:', e);
    return bad(res, 'Failed to fetch user', 500);
  }
}


module.exports = {
  registerOrg,
  login,
  visitorLogin,
  registerVisitor,
  registerUser, // deprecated public path
  publicOrgs,
  
  myOrgs,
  registerAccount,
  accountLogin,
  accountVisitedOrganizations,
  accountPasses,
  me,
  debugWhoAmI
};