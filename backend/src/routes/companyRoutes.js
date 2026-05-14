const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { imageMemoryUpload } = require('../middleware/upload');
const company  = require('../controllers/companyController');

const managers = ['super_admin', 'finance_manager'];

router.get('/',                  verifyToken, company.getCompany);
router.put('/',                  verifyToken, requireRole(managers), validate('companyUpdate'), company.updateCompany);
router.post('/logo',             verifyToken, requireRole(managers), imageMemoryUpload.single('logo'), company.uploadLogo);
router.post('/watermark',        verifyToken, requireRole(managers), imageMemoryUpload.single('watermark'), company.uploadWatermark);
router.post('/signature/:slot',  verifyToken, requireRole(managers), imageMemoryUpload.single('signature'), company.uploadSignature);
router.get('/users',             verifyToken, requireRole(['super_admin']), company.getUsers);
router.put('/users/:id',         verifyToken, requireRole(['super_admin']), company.updateUser);

module.exports = router;
