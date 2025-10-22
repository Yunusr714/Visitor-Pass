/* Add qrImagePath/qrImageUrl fields to your existing Pass schema */
const { Schema, model } = require('mongoose');

const PassSchema = new Schema({
  orgId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
  appointmentId: { type: Schema.Types.ObjectId, ref: 'Appointment' },
  visitorId: { type: Schema.Types.ObjectId, ref: 'Visitor', index: true },
  issuedByUserId: { type: Schema.Types.ObjectId, ref: 'User' },
  code: { type: String, required: true, unique: true, index: true },
  validFrom: { type: Date, required: true },
  validTo: { type: Date, required: true },
  status: { type: String, default: 'issued', index: true },
  qrPayload: { type: String },

  // NEW: stored QR image info
  qrImagePath: { type: String }, // e.g., 'qr/PASS-XXXX.png' or 'uploads/qr/...'
  qrImageUrl: { type: String }   // e.g., '/uploads/qr/PASS-XXXX.png'
}, { timestamps: true });

module.exports = model('Pass', PassSchema);