const express = require('express');
const router  = express.Router();
const { verifyToken } = require('../middleware/auth');
const ctrl = require('../controllers/printController');
const { logAudit } = require('../middleware/audit');

router.get('/:id/preview',      verifyToken, ctrl.previewVoucher);
router.post('/:id/pdf',         verifyToken, ctrl.generatePDF);
router.post('/bulk-pdf',        verifyToken, ctrl.generateBulkPDF);
router.post('/:id/mark-printed',verifyToken, logAudit('print', 'payment_vouchers'), ctrl.markPrinted);
router.get('/:id/logs',         verifyToken, ctrl.getPrintLogs);

module.exports = router;
