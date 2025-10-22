const path = require('path');
const fs = require('fs');

const projectRoot = path.join(__dirname, '..');
const uploadsRoot = path.join(projectRoot, 'uploads');
const qrDir = path.join(uploadsRoot, 'qr');

function ensureUploadsDirs() {
  fs.mkdirSync(qrDir, { recursive: true });
}

function buildQrFilename(pass) {
  const base = String(pass.code || pass._id || 'pass').replace(/[^A-Z0-9_-]/gi, '_');
  return `${base}.png`;
}

function getQrFileAbs(pass) {
  return path.join(qrDir, buildQrFilename(pass));
}

function getQrPublicUrl(pass) {
  return `/uploads/qr/${buildQrFilename(pass)}`;
}

module.exports = {
  projectRoot,
  uploadsRoot,
  qrDir,
  ensureUploadsDirs,
  buildQrFilename,
  getQrFileAbs,
  getQrPublicUrl
};