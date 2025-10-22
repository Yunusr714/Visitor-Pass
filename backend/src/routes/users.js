const router = require('express').Router();
const { requireAuth, requireRoles } = require('../middleware/auth');
const {
  listUsers,
  createUser,
  updateUser,
  deleteUser
} = require('../controllers/usersController');

// Only admins manage users. Order matters: requireAuth before requireRoles.
router.get('/', requireAuth, requireRoles('admin'), listUsers);
router.post('/', requireAuth, requireRoles('admin'), createUser);
router.patch('/:id', requireAuth, requireRoles('admin'), updateUser);
router.delete('/:id', requireAuth, requireRoles('admin'), deleteUser);

module.exports = router;