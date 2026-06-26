const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');
const { logAudit } = require('../middleware/audit');

router.get('/',  verifyToken, ctrl.getSettings);
router.put('/',  verifyToken, requireRole(['super_admin','finance_manager']), logAudit('update', 'settings'), ctrl.upsertSettings);

module.exports = router;
