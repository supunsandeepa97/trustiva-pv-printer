const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/templateController');
const { logAudit } = require('../middleware/audit');

const managers = ['super_admin', 'finance_manager'];

router.get('/',                verifyToken, ctrl.getTemplates);
router.get('/:id',             verifyToken, ctrl.getTemplateById);
router.post('/',               verifyToken, requireRole(managers), logAudit('create', 'voucher_templates'), ctrl.createTemplate);
router.put('/:id',             verifyToken, requireRole(managers), logAudit('update', 'voucher_templates'), ctrl.updateTemplate);
router.delete('/:id',          verifyToken, requireRole(managers), logAudit('delete', 'voucher_templates'), ctrl.deleteTemplate);
router.post('/:id/set-default',verifyToken, requireRole(managers), logAudit('set_default', 'voucher_templates'), ctrl.setDefault);
router.post('/:id/duplicate',  verifyToken, requireRole(managers), logAudit('duplicate', 'voucher_templates'), ctrl.duplicateTemplate);

module.exports = router;
