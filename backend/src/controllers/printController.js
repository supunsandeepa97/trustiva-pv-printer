const pool   = require('../config/database');
const { generateVoucherPDF, generateBulkPDF } = require('../services/pdfService');
const { success, error } = require('../utils/apiResponse');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function clampCopies(raw) {
  const n = parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return Math.min(n, 100);
}

async function previewVoucher(req, res, next) {
  try {
    const vResult = await pool.query(
      `SELECT pv.*, vt.config AS template_config, vt.name AS template_name, vt.paper_size
       FROM payment_vouchers pv
       LEFT JOIN voucher_templates vt ON vt.id = pv.template_id AND vt.company_id = pv.company_id
       WHERE pv.id = $1 AND pv.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    const voucher = vResult.rows[0];
    if (!voucher) return error(res, 'Voucher not found', 404);

    const cResult = await pool.query('SELECT * FROM companies WHERE id = $1', [req.user.company_id]);
    const company = cResult.rows[0];

    return success(res, { voucher, company });
  } catch (err) { next(err); }
}

async function generatePDF(req, res, next) {
  try {
    const vResult = await pool.query(
      `SELECT pv.*, vt.config AS template_config, vt.name AS template_name, vt.paper_size
       FROM payment_vouchers pv
       LEFT JOIN voucher_templates vt ON vt.id = pv.template_id AND vt.company_id = pv.company_id
       WHERE pv.id = $1 AND pv.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    const voucher = vResult.rows[0];
    if (!voucher) return error(res, 'Voucher not found', 404);

    const cResult = await pool.query('SELECT * FROM companies WHERE id = $1', [req.user.company_id]);
    const company = cResult.rows[0];

    const template = { config: voucher.template_config, paper_size: voucher.paper_size };
    const { bytes, filename } = await generateVoucherPDF(voucher, company, template);

    // Log the print
    await pool.query(
      'INSERT INTO print_logs (voucher_id, printed_by, copies) VALUES ($1, $2, $3)',
      [voucher.id, req.user.id, clampCopies(req.query.copies)]
    );
    await pool.query(
      `UPDATE payment_vouchers SET status = 'printed', updated_at = NOW() WHERE id = $1`,
      [voucher.id]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(bytes));
  } catch (err) { next(err); }
}

async function generateBulkPDFCtrl(req, res, next) {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) return error(res, 'ids required', 400);
    if (ids.length > 1000) return error(res, 'Too many items (max 1000 per request)', 400);
    if (!ids.every(id => typeof id === 'string' && UUID_RE.test(id))) return error(res, 'ids must be valid UUIDs', 400);

    const vResult = await pool.query(
      `SELECT pv.*, vt.config AS template_config, vt.paper_size
       FROM payment_vouchers pv
       LEFT JOIN voucher_templates vt ON vt.id = pv.template_id AND vt.company_id = pv.company_id
       WHERE pv.id = ANY($1::uuid[]) AND pv.company_id = $2
       ORDER BY pv.date ASC, pv.voucher_no ASC`,
      [ids, req.user.company_id]
    );
    if (!vResult.rows.length) return error(res, 'No vouchers found', 404);

    const cResult = await pool.query('SELECT * FROM companies WHERE id = $1', [req.user.company_id]);
    const company = cResult.rows[0];
    const defaultTemplate = { config: vResult.rows[0].template_config };

    const { bytes, filename } = await generateBulkPDF(vResult.rows, company, defaultTemplate);

    // Log prints
    for (const v of vResult.rows) {
      await pool.query(
        'INSERT INTO print_logs (voucher_id, printed_by, copies) VALUES ($1, $2, 1)',
        [v.id, req.user.id]
      );
    }
    await pool.query(
      `UPDATE payment_vouchers SET status = 'printed', updated_at = NOW()
       WHERE id = ANY($1::uuid[]) AND company_id = $2`,
      [ids, req.user.company_id]
    );

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(Buffer.from(bytes));
  } catch (err) { next(err); }
}

async function markPrinted(req, res, next) {
  try {
    const copies = clampCopies(req.body.copies);
    // Scope by company first; only log the print if the voucher is actually theirs.
    const upd = await pool.query(
      `UPDATE payment_vouchers SET status = 'printed', updated_at = NOW() WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (upd.rowCount === 0) return error(res, 'Voucher not found', 404);
    await pool.query(
      'INSERT INTO print_logs (voucher_id, printed_by, copies) VALUES ($1, $2, $3)',
      [req.params.id, req.user.id, copies]
    );
    return success(res, { message: 'Marked as printed' });
  } catch (err) { next(err); }
}

async function getPrintLogs(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT pl.*, u.name AS printed_by_name
       FROM print_logs pl
       JOIN payment_vouchers pv ON pv.id = pl.voucher_id
       LEFT JOIN users u ON u.id = pl.printed_by
       WHERE pl.voucher_id = $1 AND pv.company_id = $2
       ORDER BY pl.printed_at DESC`,
      [req.params.id, req.user.company_id]
    );
    return success(res, result.rows);
  } catch (err) { next(err); }
}

module.exports = { previewVoucher, generatePDF, generateBulkPDF: generateBulkPDFCtrl, markPrinted, getPrintLogs };
