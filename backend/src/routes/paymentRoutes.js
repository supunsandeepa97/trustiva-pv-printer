const express = require('express');
const router  = express.Router();
const { verifyToken, requireRole } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const ctrl = require('../controllers/paymentController');
const { logAudit } = require('../middleware/audit');

const writers  = ['super_admin', 'finance_manager', 'finance_user'];
const managers = ['super_admin', 'finance_manager'];

router.get('/',             verifyToken, ctrl.getVouchers);
router.post('/',            verifyToken, requireRole(writers),  validate('createVoucher'), logAudit('create', 'payment_vouchers'), ctrl.createVoucher);
router.get('/:id',          verifyToken, ctrl.getVoucherById);
router.put('/:id',          verifyToken, requireRole(writers),  validate('updateVoucher'), logAudit('update', 'payment_vouchers'), ctrl.updateVoucher);
router.delete('/:id',       verifyToken, requireRole(managers), logAudit('delete', 'payment_vouchers'), ctrl.deleteVoucher);
router.post('/bulk-action', verifyToken, requireRole(writers),  logAudit('bulk_action', 'payment_vouchers'), ctrl.bulkAction);

module.exports = router;
