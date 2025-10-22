const router = require('express').Router();
const ctrl = require('../controllers/authController');
const { requireAuth } = require('../middleware/auth');

// Public
router.post('/register-visitor', ctrl.registerVisitor);
router.get('/public-orgs', ctrl.publicOrgs);

// Keep endpoint but block non-visitor usage (returns 400)
router.post('/register-user', ctrl.registerUser);


// Protected

router.post('/register-org', ctrl.registerOrg);
router.post('/login', ctrl.login);
router.post('/visitor-login', ctrl.visitorLogin);

// New account (end-user) routes
router.post('/register-account', ctrl.registerAccount);
router.post('/account-login', ctrl.accountLogin);
router.get('/account-organizations', requireAuth, ctrl.accountVisitedOrganizations);
router.get('/account-passes', requireAuth, ctrl.accountPasses);

// TEMP: quickly inspect decoded token/user
router.get('/debug/whoami', requireAuth, ctrl.debugWhoAmI);
// Profile
router.get('/me', requireAuth, ctrl.me);
router.get('/my-orgs', requireAuth, ctrl.myOrgs); // keep if you a

module.exports = router;