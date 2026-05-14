const svc = require('../services/voucherService');
const { success, error } = require('../utils/apiResponse');

async function getVouchers(req, res, next) {
  try {
    const data = await svc.getVouchers(req.user.company_id, req.query);
    return success(res, data);
  } catch (err) { next(err); }
}

async function getVoucherById(req, res, next) {
  try {
    const v = await svc.getVoucherById(req.params.id, req.user.company_id);
    if (!v) return error(res, 'Voucher not found', 404);
    return success(res, v);
  } catch (err) { next(err); }
}

async function createVoucher(req, res, next) {
  try {
    const v = await svc.createVoucher(req.body, req.user.id, req.user.company_id);
    return success(res, v, 201);
  } catch (err) {
    if (err.code === '23505') return error(res, 'Voucher number already exists', 409);
    next(err);
  }
}

async function updateVoucher(req, res, next) {
  try {
    const v = await svc.updateVoucher(req.params.id, req.body, req.user.company_id);
    if (!v) return error(res, 'Voucher not found', 404);
    return success(res, v);
  } catch (err) { next(err); }
}

async function deleteVoucher(req, res, next) {
  try {
    await svc.deleteVoucher(req.params.id, req.user.company_id);
    return success(res, { message: 'Voucher cancelled' });
  } catch (err) { next(err); }
}

async function bulkAction(req, res, next) {
  try {
    const { ids, action } = req.body;
    if (!ids?.length || !action) return error(res, 'ids and action required', 400);
    await svc.bulkAction(ids, action, req.user.company_id);
    return success(res, { message: 'Bulk action applied', count: ids.length });
  } catch (err) { next(err); }
}

module.exports = { getVouchers, getVoucherById, createVoucher, updateVoucher, deleteVoucher, bulkAction };
