require('dotenv').config();
const { connectDB } = require('../src/lib/db');
const Organization = require('../src/models/Organization');
const { User } = require('../src/models/User');
const Visitor = require('../src/models/Visitor');
const Appointment = require('../src/models/Appointment');
const Pass = require('../src/models/Pass');
const { hashPassword } = require('../src/utils/password');

async function run() {
  await connectDB();
  console.log('Seeding demo data...');

  const org = await Organization.create({ name: 'RGUKT' });
  const admin = await User.create({
    orgId: org._id, name: 'Admin', email: 'admin@gmail.com',
    role: 'admin', status: 'active', passwordHash: await hashPassword('Admin123!')
  });
  const host = await User.create({
    orgId: org._id, name: 'Host', email: 'host@gmail.come',
    role: 'host', status: 'active', passwordHash: await hashPassword('Host123!')
  });
  const sec = await User.create({
    orgId: org._id, name: 'Security', email: 'security@gmail.com',
    role: 'security', status: 'active', passwordHash: await hashPassword('Security123!')
  });

  const visitor = await Visitor.create({
    orgId: org._id, firstName: 'Shajida', lastName: 'S', email: 'shajida@gmail.com', phone: '+919000000000', company: 'RGUKT'
  });

  const now = new Date();
  const end = new Date(now.getTime() + 60 * 60 * 1000);

  const appt = await Appointment.create({
    orgId: org._id, hostUserId: host._id, visitorId: visitor._id,
    purpose: 'Demo Tour', location: 'Main', startTime: now, endTime: end, status: 'approved'
  });

  const pass = await Pass.create({
    orgId: org._id, appointmentId: appt._id, visitorId: visitor._id,
    issuedByUserId: admin._id, code: 'PASS-DEMO1234', validFrom: now, validTo: end, status: 'issued',
    qrPayload: JSON.stringify({ code: 'PASS-DEMO1234', orgId: String(org._id), v: 1 })
  });

  console.log('Seeded:', { org: org._id.toString(), admin: admin.email, host: host.email, security: sec.email, pass: pass.code });
  process.exit(0);
}

run().catch((e) => { console.error(e); process.exit(1); });