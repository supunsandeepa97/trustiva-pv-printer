const express      = require('express');
const rateLimit    = require('express-rate-limit');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const auth = require('../controllers/authController');

// Strict limiter — only for credential/account-creation endpoints an attacker
// could brute-force. Deliberately NOT applied to the whole /auth router:
// polled endpoints like /me, /refresh, /pending-requests would exhaust this
// budget for every user behind the same IP (e.g. an office NAT).
const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      15,
  standardHeaders: true,
  legacyHeaders:   false,
  message:  { success: false, message: 'Too many requests. Please try again later.' },
});

router.post('/login',           strictLimiter, validate('login'),    auth.login);
router.post('/register',        verifyToken, requireRole(['super_admin']), validate('register'), auth.register);
router.post('/refresh',         auth.refreshToken);
router.post('/forgot-password', strictLimiter, auth.forgotPassword);
router.post('/reset-password',  strictLimiter, auth.resetPassword);
router.get('/me',               verifyToken, auth.getMe);
router.post('/signup-request',   strictLimiter, auth.signupRequest);
router.get('/companies',         auth.listCompanies);
router.post('/join-request',     strictLimiter, auth.joinRequest);
router.get('/pending-requests',  verifyToken, requireRole(['super_admin']), auth.getPendingRequests);
router.patch('/approve/:id',     verifyToken, requireRole(['super_admin']), auth.approveUser);
router.patch('/reject/:id',      verifyToken, requireRole(['super_admin']), auth.rejectUser);
// Note: requireRole(['super_admin']) allows both company super_admin AND platform admin
// (platform admin always has role='super_admin' on their own company)

module.exports = router;
