const express = require('express');
const router  = express.Router();
const { verifyToken, requirePlatformAdmin } = require('../middleware/auth');
const platform = require('../controllers/platformController');
const { logAudit } = require('../middleware/audit');

router.get('/companies',                        verifyToken, requirePlatformAdmin, platform.listCompanies);
router.patch('/companies/:id/toggle',           verifyToken, requirePlatformAdmin, logAudit('toggle', 'companies'), platform.toggleCompany);
router.get('/companies/:id/users',              verifyToken, requirePlatformAdmin, platform.getCompanyUsers);
router.post('/companies/:id/otp',              verifyToken, requirePlatformAdmin, platform.requestDeleteOtp);
router.delete('/companies/:id',                verifyToken, requirePlatformAdmin, logAudit('delete', 'companies'), platform.deleteCompany);
router.get('/bin',                             verifyToken, requirePlatformAdmin, platform.listBin);
router.post('/bin/:id/restore',               verifyToken, requirePlatformAdmin, logAudit('restore', 'companies'), platform.restoreCompany);
router.patch('/users/:id/toggle',               verifyToken, requirePlatformAdmin, logAudit('toggle', 'users'), platform.toggleUser);
router.patch('/users/:id',                      verifyToken, requirePlatformAdmin, logAudit('update', 'users'), platform.updateUser);
router.post('/users/:id/reset-password',        verifyToken, requirePlatformAdmin, logAudit('reset_password', 'users'), platform.resetUserPassword);

module.exports = router;
