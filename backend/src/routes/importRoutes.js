const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const importCtrl = require('../controllers/importController');
const { logAudit } = require('../middleware/audit');

const writers = ['super_admin', 'finance_manager', 'finance_user'];

router.post('/upload',            verifyToken, requireRole(writers), upload.single('file'), importCtrl.uploadAndPreview);
router.post('/confirm',           verifyToken, requireRole(writers), logAudit('import', 'payment_vouchers'), importCtrl.confirmImport);
router.get('/',                   verifyToken, importCtrl.getImports);
router.get('/mapping-templates',  verifyToken, importCtrl.getMappingTemplates);
router.get('/:id',                verifyToken, importCtrl.getImportById);

module.exports = router;
