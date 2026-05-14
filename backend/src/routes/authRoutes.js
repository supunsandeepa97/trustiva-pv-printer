const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const auth = require('../controllers/authController');

router.post('/login',           validate('login'),    auth.login);
router.post('/register',        verifyToken, requireRole(['super_admin']), validate('register'), auth.register);
router.post('/refresh',         auth.refreshToken);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password',  auth.resetPassword);
router.get('/me',               verifyToken, auth.getMe);
router.post('/signup-request',   auth.signupRequest);
router.get('/pending-requests',  verifyToken, requireRole(['super_admin']), auth.getPendingRequests);
router.patch('/approve/:id',     verifyToken, requireRole(['super_admin']), auth.approveUser);
router.patch('/reject/:id',      verifyToken, requireRole(['super_admin']), auth.rejectUser);
// Note: requireRole(['super_admin']) allows both company super_admin AND platform admin
// (platform admin always has role='super_admin' on their own company)

module.exports = router;
