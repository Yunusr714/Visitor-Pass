const { User } = require('../models/User');
const { hashPassword } = require('../utils/password');

const ALLOWED_ROLES = new Set(['admin', 'host', 'security']);

function bad(res, msg, code = 400) {
  return res.status(code).json({ error: msg });
}

// GET /users
async function listUsers(req, res) {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return bad(res, 'Missing org context', 400);
    const items = await User.find({ orgId })
      .select('-passwordHash')
      .sort({ createdAt: -1 })
      .lean();
    res.json({ items });
  } catch (e) {
    console.error('listUsers error:', e);
    bad(res, 'Failed to list users', 500);
  }
}

// POST /users
async function createUser(req, res) {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return bad(res, 'Missing org context', 400);

    const { name, email, role, phone, password } = req.body || {};
    if (!name || !email || !role) return bad(res, 'name, email and role are required');
    const r = String(role).toLowerCase();
    if (!ALLOWED_ROLES.has(r)) return bad(res, 'Invalid role');

    const exists = await User.findOne({ email: String(email).toLowerCase(), orgId });
    if (exists) return bad(res, 'User already exists in this organization', 409);

    const passwordHash = password ? await hashPassword(password) : undefined;

    const u = await User.create({
      orgId,
      orgIds: [orgId],
      name,
      email: String(email).toLowerCase(),
      role: r,
      phone: phone || '',
      status: 'active',
      passwordHash
    });

    const { passwordHash: _, ...safe } = u.toObject();
    res.status(201).json(safe);
  } catch (e) {
    console.error('createUser error:', e);
    bad(res, 'Failed to create user', 500);
  }
}

// PATCH /users/:id
async function updateUser(req, res) {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return bad(res, 'Missing org context', 400);

    const { id } = req.params;
    const { name, phone, role, status, password } = req.body || {};

    const u = await User.findOne({ _id: id, orgId });
    if (!u) return bad(res, 'User not found', 404);

    if (name !== undefined) u.name = name;
    if (phone !== undefined) u.phone = phone;
    if (status !== undefined) u.status = status;
    if (role !== undefined) {
      const r = String(role).toLowerCase();
      if (!ALLOWED_ROLES.has(r)) return bad(res, 'Invalid role');
      u.role = r;
    }
    if (password) {
      u.passwordHash = await hashPassword(password);
    }

    await u.save();
    const { passwordHash: _, ...safe } = u.toObject();
    res.json(safe);
  } catch (e) {
    console.error('updateUser error:', e);
    bad(res, 'Failed to update user', 500);
  }
}

// DELETE /users/:id
async function deleteUser(req, res) {
  try {
    const orgId = req.user?.orgId;
    if (!orgId) return bad(res, 'Missing org context', 400);

    const { id } = req.params;
    const u = await User.findOne({ _id: id, orgId });
    if (!u) return bad(res, 'User not found', 404);

    await u.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    console.error('deleteUser error:', e);
    bad(res, 'Failed to delete user', 500);
  }
}

module.exports = { listUsers, createUser, updateUser, deleteUser };