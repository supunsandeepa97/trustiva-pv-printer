const pool = require('../config/database');
const { convertToWords } = require('./amountWords');
const { generateVoucherNumber } = require('../utils/numberGenerator');
const { parseAmount, parseDate, computeDuplicateHash } = require('./importEngine');

async function getVouchers(companyId, filters = {}) {
  const { status, date_from, date_to, search, import_id, sort = 'date', order = 'DESC' } = filters;
  const page  = Math.max(1, parseInt(filters.page, 10)  || 1);
  const limit = Math.min(5000, Math.max(1, parseInt(filters.limit, 10) || 2000));

  const conditions = ['pv.company_id = $1'];
  const params     = [companyId];
  let p = 2;

  if (status)    { conditions.push(`pv.status = $${p++}`);     params.push(status); }
  if (date_from) { conditions.push(`pv.date >= $${p++}`);      params.push(date_from); }
  if (date_to)   { conditions.push(`pv.date <= $${p++}`);      params.push(date_to); }
  if (import_id) { conditions.push(`pv.import_id = $${p++}`);  params.push(import_id); }
  if (search)    {
    conditions.push(`(pv.payee_name ILIKE $${p} OR pv.voucher_no ILIKE $${p} OR pv.description ILIKE $${p})`);
    params.push(`%${search}%`);
    p++;
  }

  const allowedSorts  = ['date','payee_name','amount','voucher_no','created_at'];
  const allowedOrders = ['ASC','DESC'];
  const safeSort  = allowedSorts.includes(sort)  ? sort  : 'date';
  const safeOrder = allowedOrders.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

  const where  = conditions.join(' AND ');
  const offset = (page - 1) * limit;

  const [dataResult, countResult] = await Promise.all([
    pool.query(
      `SELECT pv.*, vt.name AS template_name
       FROM payment_vouchers pv
       LEFT JOIN voucher_templates vt ON vt.id = pv.template_id AND vt.company_id = pv.company_id
       WHERE ${where}
       ORDER BY pv.${safeSort} ${safeOrder}
       LIMIT $${p} OFFSET $${p+1}`,
      [...params, limit, offset]
    ),
    pool.query(`SELECT COUNT(*) FROM payment_vouchers pv WHERE ${where}`, params),
  ]);

  return { rows: dataResult.rows, total: parseInt(countResult.rows[0].count), page, limit };
}

async function getVoucherById(id, companyId) {
  const result = await pool.query(
    `SELECT pv.*, vt.config AS template_config, vt.name AS template_name, vt.paper_size
     FROM payment_vouchers pv
     LEFT JOIN voucher_templates vt ON vt.id = pv.template_id AND vt.company_id = pv.company_id
     WHERE pv.id = $1 AND pv.company_id = $2`,
    [id, companyId]
  );
  return result.rows[0] || null;
}

async function assertTemplateOwnership(templateId, companyId, client) {
  if (!templateId) return;
  const result = await client.query(
    'SELECT id FROM voucher_templates WHERE id = $1 AND company_id = $2',
    [templateId, companyId]
  );
  if (!result.rows[0]) {
    throw Object.assign(new Error('Invalid template_id'), { status: 400 });
  }
}

async function createVoucher(data, userId, companyId) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await assertTemplateOwnership(data.template_id, companyId, client);

    const amount      = parseFloat(data.amount);
    const date        = parseDate(data.date) || data.date;
    const amountWords = convertToWords(amount);
    const hash        = computeDuplicateHash(data.payee_name, amount, date);
    const voucherNo   = await generateVoucherNumber(companyId, client);

    const result = await client.query(
      `INSERT INTO payment_vouchers
       (company_id, template_id, voucher_no, date, payee_name, amount, amount_words,
        description, bank_name, cheque_no, currency, account_name, prepared_by, status, duplicate_hash)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'pending',$14) RETURNING *`,
      [
        companyId, data.template_id || null, voucherNo, date, data.payee_name, amount, amountWords,
        data.description || null, data.bank_name || null, data.cheque_no || null,
        data.currency || 'LKR', data.account_name || null, data.prepared_by || null, hash,
      ]
    );

    await client.query('COMMIT');
    return result.rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

async function updateVoucher(id, data, companyId) {
  const allowed = ['date','payee_name','amount','description','bank_name','cheque_no','currency','account_name','prepared_by','status','template_id'];
  const sets    = [];
  const params  = [];
  let p = 1;

  if (data.template_id !== undefined) {
    await assertTemplateOwnership(data.template_id, companyId, pool);
  }

  for (const key of allowed) {
    if (data[key] !== undefined) {
      sets.push(`${key} = $${p++}`);
      params.push(data[key]);
    }
  }

  if (!sets.length) return null;

  // Recompute amount_words if amount changed
  if (data.amount !== undefined) {
    sets.push(`amount_words = $${p++}`);
    params.push(convertToWords(parseFloat(data.amount)));
  }

  sets.push(`updated_at = NOW()`);
  params.push(id, companyId);

  const result = await pool.query(
    `UPDATE payment_vouchers SET ${sets.join(',')} WHERE id = $${p} AND company_id = $${p+1} RETURNING *`,
    params
  );
  return result.rows[0] || null;
}

async function deleteVoucher(id, companyId) {
  await pool.query(
    `UPDATE payment_vouchers SET status = 'cancelled', updated_at = NOW() WHERE id = $1 AND company_id = $2`,
    [id, companyId]
  );
}

async function bulkAction(ids, action, companyId) {
  const statusMap = { cancel: 'cancelled', restore: 'pending', mark_printed: 'printed' };
  const status = statusMap[action];
  if (!status) throw new Error(`Unknown action: ${action}`);

  await pool.query(
    `UPDATE payment_vouchers SET status = $1, updated_at = NOW()
     WHERE id = ANY($2::uuid[]) AND company_id = $3`,
    [status, ids, companyId]
  );
}

module.exports = { getVouchers, getVoucherById, createVoucher, updateVoucher, deleteVoucher, bulkAction };
