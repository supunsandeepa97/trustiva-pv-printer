const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/templateController');

const managers = ['super_admin', 'finance_manager'];

router.get('/',                verifyToken, ctrl.getTemplates);
router.get('/:id',             verifyToken, ctrl.getTemplateById);
router.post('/',               verifyToken, requireRole(managers), ctrl.createTemplate);
router.put('/:id',             verifyToken, requireRole(managers), ctrl.updateTemplate);
router.delete('/:id',          verifyToken, requireRole(managers), ctrl.deleteTemplate);
router.post('/:id/set-default',verifyToken, requireRole(managers), ctrl.setDefault);
router.post('/:id/duplicate',  verifyToken, requireRole(managers), ctrl.duplicateTemplate);

module.exports = router;
