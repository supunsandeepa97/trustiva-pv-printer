const pool = require('../config/database');
const { success, error } = require('../utils/apiResponse');

async function listCompanies(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.is_active,
        c.created_at,
        COUNT(DISTINCT u.id)::INT                                      AS user_count,
        COUNT(DISTINCT pv.id)::INT                                     AS voucher_count,
        COALESCE(SUM(pv.amount), 0)::NUMERIC                          AS total_amount,
        MAX(pv.created_at)                                             AS last_activity
      FROM companies c
      LEFT JOIN users u  ON u.company_id  = c.id
      LEFT JOIN payment_vouchers pv ON pv.company_id = c.id
      GROUP BY c.id
      ORDER BY c.created_at DESC
    `);
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
}

async function toggleCompany(req, res, next) {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `UPDATE companies
       SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1
       RETURNING id, name, is_active`,
      [id]
    );
    if (!result.rows[0]) return error(res, 'Company not found', 404);
    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
}

module.exports = { listCompanies, toggleCompany };
