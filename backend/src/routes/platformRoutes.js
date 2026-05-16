const express = require('express');
const router  = express.Router();
const { verifyToken, requirePlatformAdmin } = require('../middleware/auth');
const platform = require('../controllers/platformController');

router.get('/companies',                        verifyToken, requirePlatformAdmin, platform.listCompanies);
router.patch('/companies/:id/toggle',           verifyToken, requirePlatformAdmin, platform.toggleCompany);
router.get('/companies/:id/users',              verifyToken, requirePlatformAdmin, platform.getCompanyUsers);
router.post('/companies/:id/otp',              verifyToken, requirePlatformAdmin, platform.requestDeleteOtp);
router.delete('/companies/:id',                verifyToken, requirePlatformAdmin, platform.deleteCompany);
router.get('/bin',                             verifyToken, requirePlatformAdmin, platform.listBin);
router.post('/bin/:id/restore',               verifyToken, requirePlatformAdmin, platform.restoreCompany);
router.patch('/users/:id/toggle',               verifyToken, requirePlatformAdmin, platform.toggleUser);
router.patch('/users/:id',                      verifyToken, requirePlatformAdmin, platform.updateUser);
router.post('/users/:id/reset-password',        verifyToken, requirePlatformAdmin, platform.resetUserPassword);

module.exports = router;
