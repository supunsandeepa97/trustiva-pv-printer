const pool    = require('../config/database');
const bcrypt  = require('bcryptjs');
const { success, error } = require('../utils/apiResponse');

function genTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[Math.floor(Math.random() * chars.length)];
  return pwd;
}

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

async function getCompanyUsers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, approval_status, created_at
       FROM users WHERE company_id = $1 ORDER BY created_at`,
      [req.params.id]
    );
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
}

async function toggleUser(req, res, next) {
  try {
    const { id } = req.params;
    // Never deactivate yourself
    if (id === req.user.id) return error(res, 'Cannot deactivate your own account', 400);
    const result = await pool.query(
      `UPDATE users SET is_active = NOT is_active, updated_at = NOW()
       WHERE id = $1 RETURNING id, name, email, is_active`,
      [id]
    );
    if (!result.rows[0]) return error(res, 'User not found', 404);
    return success(res, result.rows[0]);
  } catch (err) { next(err); }
}

async function updateUser(req, res, next) {
  try {
    const { id } = req.params;
    const { name, email } = req.body;
    if (!name && !email) return error(res, 'Provide name or email to update', 400);

    // Email uniqueness check
    if (email) {
      const existing = await pool.query(
        `SELECT id FROM users WHERE email = $1 AND id != $2`, [email, id]
      );
      if (existing.rows.length > 0) return error(res, 'Email already in use', 409);
    }

    const sets = [];
    const vals = [];
    let i = 1;
    if (name)  { sets.push(`name = $${i++}`);  vals.push(name); }
    if (email) { sets.push(`email = $${i++}`); vals.push(email); }
    sets.push(`updated_at = NOW()`);
    vals.push(id);

    const result = await pool.query(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING id, name, email, role, is_active, approval_status`,
      vals
    );
    if (!result.rows[0]) return error(res, 'User not found', 404);
    return success(res, result.rows[0]);
  } catch (err) { next(err); }
}

async function resetUserPassword(req, res, next) {
  try {
    const { id } = req.params;
    const tempPwd  = genTempPassword();
    const hash     = await bcrypt.hash(tempPwd, 10);
    const result   = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, name, email`,
      [hash, id]
    );
    if (!result.rows[0]) return error(res, 'User not found', 404);
    return success(res, { ...result.rows[0], temp_password: tempPwd });
  } catch (err) { next(err); }
}

module.exports = { listCompanies, toggleCompany, getCompanyUsers, toggleUser, updateUser, resetUserPassword };
