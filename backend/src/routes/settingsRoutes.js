const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/settingsController');

router.get('/',  verifyToken, ctrl.getSettings);
router.put('/',  verifyToken, requireRole(['super_admin','finance_manager']), ctrl.upsertSettings);

module.exports = router;
