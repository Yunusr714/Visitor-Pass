const router = require('express').Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const ctrl = require('../controllers/passesController');

router.use(requireAuth);

// Read/list allowed for visitors as well (so visitor dashboard can call /passes)
router.get('/', requireRoles('admin', 'security', 'host', 'account'), ctrl.listPasses);
router.post('/issue', requireRoles('admin', 'security'), ctrl.issuePass);
router.get('/:id', requireRoles('admin', 'security', 'host', 'account'), ctrl.getPass);
router.post('/:id/revoke', requireRoles('admin', 'security'), ctrl.revokePass);

// QR and PDF (read) should be available to visitor as well if they own the pass
router.get('/:id/qr.png', requireRoles('admin', 'security', 'host', 'account'), ctrl.qrPng);
router.get('/:id/badge.pdf', requireRoles('admin', 'security', 'host', 'account'), ctrl.badgePdf);

module.exports = router;