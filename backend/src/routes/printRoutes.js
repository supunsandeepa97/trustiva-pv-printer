const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const ctrl = require('../controllers/printController');
const { logAudit } = require('../middleware/audit');

// Matches the write-access roles used in paymentRoutes.js — viewers may
// preview/view logs but must not be able to mutate voucher print state.
const writers = ['super_admin', 'finance_manager', 'finance_user'];

router.get('/:id/preview',      verifyToken, ctrl.previewVoucher);
router.post('/:id/pdf',         verifyToken, requireRole(writers), ctrl.generatePDF);
router.post('/bulk-pdf',        verifyToken, requireRole(writers), ctrl.generateBulkPDF);
router.post('/:id/mark-printed',verifyToken, requireRole(writers), logAudit('print', 'payment_vouchers'), ctrl.markPrinted);
router.get('/:id/logs',         verifyToken, ctrl.getPrintLogs);

module.exports = router;
