const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { imageMemoryUpload } = require('../middleware/upload');
const company  = require('../controllers/companyController');
const { logAudit } = require('../middleware/audit');

const managers = ['super_admin', 'finance_manager'];

router.get('/',                  verifyToken, company.getCompany);
router.put('/',                  verifyToken, requireRole(managers), validate('companyUpdate'), logAudit('update', 'companies'), company.updateCompany);
router.post('/logo',             verifyToken, requireRole(managers), imageMemoryUpload.single('logo'), logAudit('update_logo', 'companies'), company.uploadLogo);
router.post('/watermark',        verifyToken, requireRole(managers), imageMemoryUpload.single('watermark'), logAudit('update_watermark', 'companies'), company.uploadWatermark);
router.post('/signature/:slot',  verifyToken, requireRole(managers), imageMemoryUpload.single('signature'), logAudit('update_signature', 'companies'), company.uploadSignature);
router.get('/users',             verifyToken, requireRole(['super_admin']), company.getUsers);
router.post('/users',            verifyToken, requireRole(['super_admin']), logAudit('create', 'users'), company.createUser);
router.put('/users/:id',         verifyToken, requireRole(['super_admin']), logAudit('update', 'users'), company.updateUser);

module.exports = router;
