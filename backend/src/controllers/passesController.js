const { v4: uuidv4 } = require('uuid');
const QRCode = require('qrcode');
const PDFDocument = require('pdfkit');
const Pass = require('../models/Pass');
const Visitor = require('../models/Visitor');
const Appointment = require('../models/Appointment');
const Organization = require('../models/Organization');
const { User } = require('../models/User');
const { sendEmail } = require('../lib/notify');
const { ensureUploadsDirs, getQrFileAbs, getQrPublicUrl } = require('../utils/uploads');

/**
 * Helper: short unique code
 */
function shortCode(prefix = 'VP') {
  const s = uuidv4().replace(/-/g, '').slice(0, 10).toUpperCase();
  return `${prefix}-${s}`;
}

function safeLower(s) {
  return (s || '').toString().toLowerCase();
}

/**
 * Helper: check whether the authenticated request user is allowed to access data for targetOrgId
 */
async function ensureMembership(reqUser, targetOrgId) {
  if (!targetOrgId) return false;
  const requested = String(targetOrgId);

  const role = String(reqUser?.role || '').toLowerCase();
  if (role === 'visitor') {
    return String(reqUser.orgId || '') === requested;
  }
  if (role === 'account') {
    // account users are not staff; membership checks don’t apply
    return false;
  }

  const user = await User.findById(reqUser.userId).lean();
  if (!user) return false;
  const memberships = new Set((user.orgIds || []).map(String));
  if (user.orgId) memberships.add(String(user.orgId));
  return memberships.has(requested);
}

/**
 * List passes
 * - Staff/visitor: behaves as before (can filter by orgId, visitorId, status)
 * - Account users: returns ALL passes across ALL organizations for this account’s email.
 *   Adds orgName to each pass item.
 */
async function listPasses(req, res) {
  try {
    const { role, userId, visitorId: tokenVisitorId, email: tokenEmail } = req.user || {};
    const r = String(role || '').toLowerCase();

    // ACCOUNT: show all passes across orgs for the account email
    if (r === 'account') {
      // Derive email from token; fallback to Users table just in case
      let email = safeLower(tokenEmail);
      if (!email && req.user?.userId) {
        const u = await User.findById(req.user.userId).lean();
        email = safeLower(u?.email);
      }
      if (!email) {
        // Graceful: no email, no passes (don’t 500)
        return res.json({ items: [], total: 0, page: 1, limit: 20 });
      }

      const { status, limit = 20, page = 1 } = req.query;
      const visitors = await Visitor.find({ email }, { _id: 1, orgId: 1 }).lean();
      if (!visitors.length) {
        return res.json({ items: [], total: 0, page: Number(page), limit: Number(limit) });
      }
      const visitorIds = visitors.map(v => v._id);

      const filter = { visitorId: { $in: visitorIds } };
      if (status) filter.status = status;

      const [itemsRaw, total] = await Promise.all([
        Pass.find(filter)
          .sort({ createdAt: -1 })
          .skip((Number(page) - 1) * Number(limit))
          .limit(Number(limit))
          .populate('visitorId', 'firstName lastName email phone')
          .lean(),
        Pass.countDocuments(filter)
      ]);

      // Attach orgName to each pass
      const orgIds = Array.from(new Set(itemsRaw.map(p => String(p.orgId))));
      const orgs = await Organization.find({ _id: { $in: orgIds } }, { name: 1 }).lean();
      const orgMap = new Map(orgs.map(o => [String(o._id), o.name]));

      const items = itemsRaw.map(p => ({
        ...p,
        orgName: orgMap.get(String(p.orgId)) || 'Unknown'
      }));

      return res.json({ items, total, page: Number(page), limit: Number(limit) });
    }

    // STAFF/VISITOR: original behavior (supports ?orgId=, etc.)
    const { status, visitorId, limit = 20, page = 1 } = req.query;
    const requestedOrgId = req.query.orgId;
    let orgId = requestedOrgId || req.user.orgId;

    if (requestedOrgId) {
      const allowed = await ensureMembership(req.user, requestedOrgId);
      if (!allowed) return res.status(403).json({ error: 'Forbidden for this organization' });
    }

    const filter = { orgId };

    if (r === 'visitor') {
      filter.visitorId = tokenVisitorId || userId;
    } else {
      if (status) filter.status = status;
      if (visitorId) filter.visitorId = visitorId;
    }

    const [items, total] = await Promise.all([
      Pass.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .populate('visitorId', 'firstName lastName email phone'),
      Pass.countDocuments(filter)
    ]);

    res.json({ items, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    console.error('listPasses error:', err);
    res.status(500).json({ error: 'Failed to list passes' });
  }
}

async function issuePass(req, res) {
  try {
    const { orgId, userId } = req.user;
    const { visitorId, appointmentId } = req.body;
    let { validFrom, validTo } = req.body;

    const visitor = await Visitor.findOne({ _id: visitorId, orgId });
    if (!visitor) return res.status(400).json({ error: 'Visitor not found in your organization' });

    let appt = null;
    if (appointmentId) {
      appt = await Appointment.findOne({ _id: appointmentId, orgId, visitorId });
      if (!appt) return res.status(400).json({ error: 'Appointment not found for this visitor/org' });
    }

    const now = new Date();
    validFrom = validFrom ? new Date(validFrom) : appt?.startTime || now;
    validTo = validTo ? new Date(validTo) : appt?.endTime || new Date(validFrom.getTime() + 24 * 60 * 60 * 1000);
    if (validTo <= validFrom) return res.status(400).json({ error: 'validTo must be after validFrom' });

    const code = shortCode('PASS');

    const qrPayload = JSON.stringify({
      code,
      orgId: orgId.toString(),
      appointmentId: appt?._id?.toString() || null,
      v: 1
    });

    const pass = await Pass.create({
      orgId,
      appointmentId: appt?._id,
      visitorId,
      issuedByUserId: userId,
      code,
      validFrom,
      validTo,
      status: 'issued',
      qrPayload
    });

    // Ensure uploads dirs
    ensureUploadsDirs();

    // Write QR PNG to disk using pass.code as content
    const absPath = getQrFileAbs(pass);
    await QRCode.toFile(absPath, pass.code, { type: 'png', margin: 1, width: 256 });

    // Persist public URL and relative path on the pass
    pass.qrImageUrl = getQrPublicUrl(pass);  // e.g., /uploads/qr/PASS-XXXX.png
    pass.qrImagePath = pass.qrImageUrl.replace(/^\/uploads\//, ''); // optional relative recording
    await pass.save();

    // Notify visitor via email if available
    const whenTxt = `${new Date(validFrom).toLocaleString()} - ${new Date(validTo).toLocaleString()}`;
    if (visitor.email) {
      await sendEmail({
        to: visitor.email,
        subject: 'Your Visitor Pass',
        text: `Hi ${visitor.firstName},\n\nYour visitor pass (${pass.code}) has been issued.\nValid: ${whenTxt}\n\nPlease present the QR code at entry.\n`
      }).catch(() => {});
    }

    res.status(201).json(pass);
  } catch (err) {
    console.error('issuePass error:', err);
    res.status(500).json({ error: 'Failed to issue pass' });
  }
}

async function getPass(req, res) {
  try {
    const { user } = req;
    const pass = await Pass.findById(req.params.id)
      .populate('visitorId', 'firstName lastName email phone company photo')
      .populate('appointmentId', 'startTime endTime status')
      .populate('issuedByUserId', 'name email role');

    if (!pass) return res.status(404).json({ error: 'Pass not found' });

    const passOrgId = String(pass.orgId);
    const role = String(user?.role || '').toLowerCase();

    if (role === 'account') {
      // account user can only access passes for their email
      const v = await Visitor.findById(pass.visitorId).lean();
      const ok = v && safeLower(v.email) === safeLower(user.email);
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
    } else {
      const allowed = await ensureMembership(user, passOrgId);
      if (!allowed) {
        if (role === 'visitor') {
          if (String(user.visitorId || user.userId) !== String(pass.visitorId?._id || pass.visitorId)) {
            return res.status(403).json({ error: 'Forbidden' });
          }
        } else {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    }

    res.json(pass);
  } catch (err) {
    console.error('getPass error:', err);
    res.status(500).json({ error: 'Failed to fetch pass' });
  }
}

async function revokePass(req, res) {
  try {
    const { user } = req;
    const pass = await Pass.findById(req.params.id);
    if (!pass) return res.status(404).json({ error: 'Pass not found' });

    const allowed = await ensureMembership(user, String(pass.orgId));
    if (!allowed) return res.status(403).json({ error: 'Forbidden' });

    pass.status = 'revoked';
    await pass.save();
    res.json(pass);
  } catch (err) {
    console.error('revokePass error:', err);
    res.status(500).json({ error: 'Failed to revoke pass' });
  }
}

async function qrPng(req, res) {
  try {
    const pass = await Pass.findById(req.params.id);
    if (!pass) return res.status(404).json({ error: 'Pass not found' });

    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'account') {
      const v = await Visitor.findById(pass.visitorId).lean();
      const ok = v && safeLower(v.email) === safeLower(req.user.email);
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
    } else {
      const allowed = await ensureMembership(req.user, String(pass.orgId));
      if (!allowed) {
        if (role === 'visitor') {
          if (String(req.user.visitorId || req.user.userId) !== String(pass.visitorId)) {
            return res.status(403).json({ error: 'Forbidden' });
          }
        } else {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    }

    res.setHeader('Content-Type', 'image/png');
    const qrText = pass.code;
    const stream = QRCode.toFileStream(res, qrText, { type: 'png', margin: 1, width: 256 });
    stream.on('error', () => res.status(500).end());
  } catch (err) {
    console.error('qrPng error:', err);
    res.status(500).end();
  }
}

async function badgePdf(req, res) {
  try {
    const pass = await Pass.findById(req.params.id)
      .populate('visitorId', 'firstName lastName company photo')
      .lean();
    if (!pass) return res.status(404).json({ error: 'Pass not found' });

    const role = String(req.user?.role || '').toLowerCase();
    if (role === 'account') {
      const v = await Visitor.findById(pass.visitorId).lean();
      const ok = v && safeLower(v.email) === safeLower(req.user.email);
      if (!ok) return res.status(403).json({ error: 'Forbidden' });
    } else {
      const allowed = await ensureMembership(req.user, String(pass.orgId));
      if (!allowed) {
        if (role === 'visitor') {
          if (String(req.user.visitorId || req.user.userId) !== String(pass.visitorId)) {
            return res.status(403).json({ error: 'Forbidden' });
          }
        } else {
          return res.status(403).json({ error: 'Forbidden' });
        }
      }
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="pass-${pass.code}.pdf"`);

    const doc = new PDFDocument({ size: [300, 420], margin: 18 });
    doc.pipe(res);
    doc.roundedRect(10, 10, 280, 400, 12).stroke('#e5e7eb');

    doc.fontSize(16).text('Visitor Pass', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12).text(pass.code, { align: 'center' });

    doc.moveDown(1);
    doc.fontSize(14).text(`${pass.visitorId?.firstName || ''} ${pass.visitorId?.lastName || ''}`, { align: 'center' });
    if (pass.visitorId?.company) doc.fontSize(11).fillColor('#475569').text(pass.visitorId.company, { align: 'center' }).fillColor('#000');

    doc.moveDown(1);
    const qrData = await QRCode.toDataURL(pass.code, { margin: 0, width: 200 });
    doc.image(qrData, (300 - 200) / 2, doc.y, { width: 200 });

    doc.moveDown(1.2);
    doc.fontSize(10).fillColor('#475569')
      .text(`Valid: ${new Date(pass.validFrom).toLocaleString()} → ${new Date(pass.validTo).toLocaleString()}`, { align: 'center' })
      .fillColor('#000');

    doc.end();
  } catch (err) {
    console.error('badgePdf error:', err);
    res.status(500).json({ error: 'Failed to generate badge' });
  }
}

module.exports = { listPasses, issuePass, getPass, revokePass, qrPng, badgePdf };