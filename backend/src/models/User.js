const { Schema, model } = require('mongoose');

// Added 'account' to support end-user accounts
const ROLES = ['admin', 'security', 'host', 'visitor', 'account'];

const UserSchema = new Schema({
  // Existing staff fields (orgId, orgIds) are optional for 'account' users
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  orgIds: [{ type: Schema.Types.ObjectId, ref: 'Organization', index: true }],

  name: { type: String, required: true },
  email: { type: String, required: true, index: true },
  phone: { type: String },
  role: { type: String, enum: ROLES, required: true },
  status: { type: String, default: 'active' },
  passwordHash: { type: String }
}, { timestamps: true });

module.exports = {
  User: model('User', UserSchema),
  ROLES
};