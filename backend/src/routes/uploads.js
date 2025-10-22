const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const { uploadsRoot } = require('../utils/uploads');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(uploadsRoot, 'misc')),
  filename: (req, file, cb) => {
    const safe = file.originalname.replace(/[^A-Z0-9._-]/gi, '_');
    cb(null, `${Date.now()}_${safe}`);
  }
});

const upload = multer({ storage });

// Example: POST /uploads/misc (form-data: file)
router.post('/misc', upload.single('file'), (req, res) => {
  res.json({ url: `/uploads/misc/${req.file.filename}` });
});

module.exports = router;