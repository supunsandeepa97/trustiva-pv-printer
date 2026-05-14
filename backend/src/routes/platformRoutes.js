const express = require('express');
const router  = express.Router();
const { verifyToken, requirePlatformAdmin } = require('../middleware/auth');
const platform = require('../controllers/platformController');

router.get('/companies',           verifyToken, requirePlatformAdmin, platform.listCompanies);
router.patch('/companies/:id/toggle', verifyToken, requirePlatformAdmin, platform.toggleCompany);

module.exports = router;
