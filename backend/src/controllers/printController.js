const path   = require('path');
const fs     = require('fs');
const pool   = require('../config/database');
const { generateVoucherPDF, generateBulkPDF } = require('../services/pdfService');
const { success, error } = require('../utils/apiResponse');

async function previewVoucher(req, res, next) {
  try {
    const vResult = await pool.query(
      `SELECT pv.*, vt.config AS template_config, vt.name AS template_name, vt.paper_size
       FROM payment_vouchers pv
       LEFT JOIN voucher_templates vt ON vt.id = pv.template_id
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
       LEFT JOIN voucher_templates vt ON vt.id = pv.template_id
       WHERE pv.id = $1 AND pv.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    const voucher = vResult.rows[0];
    if (!voucher) return error(res, 'Voucher not found', 404);

    const cResult = await pool.query('SELECT * FROM companies WHERE id = $1', [req.user.company_id]);
    const company = cResult.rows[0];

    const template = { config: voucher.template_config, paper_size: voucher.paper_size };
    const { filePath, filename, url } = await generateVoucherPDF(voucher, company, template);

    // Log the print
    await pool.query(
      'INSERT INTO print_logs (voucher_id, printed_by, pdf_path, copies) VALUES ($1, $2, $3, $4)',
      [voucher.id, req.user.id, url, parseInt(req.query.copies || 1)]
    );
    await pool.query(
      `UPDATE payment_vouchers SET status = 'printed', updated_at = NOW() WHERE id = $1`,
      [voucher.id]
    );

    // Stream file to client
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    fs.createReadStream(filePath).pipe(res);
  } catch (err) { next(err); }
}

async function generateBulkPDFCtrl(req, res, next) {
  try {
    const { ids } = req.body;
    if (!ids?.length) return error(res, 'ids required', 400);

    const vResult = await pool.query(
      `SELECT pv.*, vt.config AS template_config, vt.paper_size
       FROM payment_vouchers pv
       LEFT JOIN voucher_templates vt ON vt.id = pv.template_id
       WHERE pv.id = ANY($1::uuid[]) AND pv.company_id = $2
       ORDER BY pv.date ASC, pv.voucher_no ASC`,
      [ids, req.user.company_id]
    );
    if (!vResult.rows.length) return error(res, 'No vouchers found', 404);

    const cResult = await pool.query('SELECT * FROM companies WHERE id = $1', [req.user.company_id]);
    const company = cResult.rows[0];
    const defaultTemplate = { config: vResult.rows[0].template_config };

    const { filePath, filename } = await generateBulkPDF(vResult.rows, company, defaultTemplate);

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
    fs.createReadStream(filePath).pipe(res);
  } catch (err) { next(err); }
}

async function markPrinted(req, res, next) {
  try {
    const copies = parseInt(req.body.copies || 1);
    await pool.query(
      'INSERT INTO print_logs (voucher_id, printed_by, copies) VALUES ($1, $2, $3)',
      [req.params.id, req.user.id, copies]
    );
    await pool.query(
      `UPDATE payment_vouchers SET status = 'printed', updated_at = NOW() WHERE id = $1 AND company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    return success(res, { message: 'Marked as printed' });
  } catch (err) { next(err); }
}

async function getPrintLogs(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT pl.*, u.name AS printed_by_name
       FROM print_logs pl
       LEFT JOIN users u ON u.id = pl.printed_by
       WHERE pl.voucher_id = $1
       ORDER BY pl.printed_at DESC`,
      [req.params.id]
    );
    return success(res, result.rows);
  } catch (err) { next(err); }
}

module.exports = { previewVoucher, generatePDF, generateBulkPDF: generateBulkPDFCtrl, markPrinted, getPrintLogs };
