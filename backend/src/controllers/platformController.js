const crypto  = require('crypto');
const pool    = require('../config/database');
const bcrypt  = require('bcryptjs');
const { success, error } = require('../utils/apiResponse');
const otpSvc  = require('../services/otpService');
const { sendDeleteOtpEmail } = require('../services/mailerService');

function genTempPassword() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let pwd = '';
  for (let i = 0; i < 10; i++) pwd += chars[crypto.randomInt(0, chars.length)];
  return pwd;
}

async function listCompanies(req, res, next) {
  try {
    // Users and vouchers are aggregated separately (not joined together) —
    // joining both tables directly and using COUNT(DISTINCT)/SUM over the
    // combined result multiplies voucher totals by the company's user count.
    const result = await pool.query(`
      SELECT
        c.id,
        c.name,
        c.email,
        c.phone,
        c.is_active,
        c.created_at,
        COALESCE(u.user_count, 0)::INT       AS user_count,
        COALESCE(v.voucher_count, 0)::INT    AS voucher_count,
        COALESCE(v.total_amount, 0)::NUMERIC AS total_amount,
        v.last_activity
      FROM companies c
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS user_count
        FROM users WHERE users.company_id = c.id
      ) u ON true
      LEFT JOIN LATERAL (
        SELECT COUNT(*) AS voucher_count, SUM(amount) AS total_amount, MAX(created_at) AS last_activity
        FROM payment_vouchers WHERE payment_vouchers.company_id = c.id
      ) v ON true
      WHERE c.deleted_at IS NULL
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
    const hash     = await bcrypt.hash(tempPwd, 12);
    const result   = await pool.query(
      `UPDATE users SET password_hash = $1, updated_at = NOW()
       WHERE id = $2 RETURNING id, name, email`,
      [hash, id]
    );
    if (!result.rows[0]) return error(res, 'User not found', 404);
    return success(res, { ...result.rows[0], temp_password: tempPwd });
  } catch (err) { next(err); }
}

async function requestDeleteOtp(req, res, next) {
  try {
    const { id } = req.params;
    const r = await pool.query(
      `SELECT name FROM companies WHERE id = $1 AND deleted_at IS NULL`, [id]
    );
    if (!r.rows[0]) return error(res, 'Company not found', 404);
    const otp = await otpSvc.set(id);
    await sendDeleteOtpEmail(otp, r.rows[0].name);
    return success(res, { message: 'OTP sent to admin email' });
  } catch (err) { next(err); }
}

async function deleteCompany(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    const { otp } = req.body;
    if (!otp) return error(res, 'OTP is required', 400);
    if (!(await otpSvc.verify(otp, id))) return error(res, 'Invalid or expired OTP', 400);

    // Protect platform owner's company
    const ownerCheck = await client.query(
      `SELECT u.id FROM users u WHERE u.company_id = $1 AND u.is_platform_admin = TRUE LIMIT 1`, [id]
    );
    if (ownerCheck.rows.length > 0) return error(res, 'Cannot delete the platform owner company', 403);

    await client.query('BEGIN');
    const r = await client.query(
      `UPDATE companies SET deleted_at = NOW(), updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL RETURNING id, name`,
      [id]
    );
    if (!r.rows[0]) { await client.query('ROLLBACK'); return error(res, 'Company not found', 404); }

    await client.query(
      `UPDATE users SET is_active = FALSE, updated_at = NOW() WHERE company_id = $1`, [id]
    );

    await client.query('COMMIT');
    return success(res, { message: `${r.rows[0].name} moved to bin` });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
}

async function listBin(req, res, next) {
  try {
    const r = await pool.query(`
      SELECT
        c.id, c.name, c.email, c.created_at, c.deleted_at,
        (c.deleted_at + INTERVAL '1 year') AS purge_at,
        EXTRACT(DAY FROM (c.deleted_at + INTERVAL '1 year') - NOW())::INT AS days_remaining,
        COUNT(DISTINCT u.id)::INT  AS user_count,
        COUNT(DISTINCT pv.id)::INT AS voucher_count
      FROM companies c
      LEFT JOIN users u  ON u.company_id = c.id
      LEFT JOIN payment_vouchers pv ON pv.company_id = c.id
      WHERE c.deleted_at IS NOT NULL AND c.deleted_at > NOW() - INTERVAL '1 year'
      GROUP BY c.id
      ORDER BY c.deleted_at DESC
    `);
    return success(res, r.rows);
  } catch (err) { next(err); }
}

async function restoreCompany(req, res, next) {
  const client = await pool.connect();
  try {
    const { id } = req.params;
    await client.query('BEGIN');
    const r = await client.query(
      `UPDATE companies SET deleted_at = NULL, updated_at = NOW()
       WHERE id = $1 AND deleted_at IS NOT NULL RETURNING id, name`,
      [id]
    );
    if (!r.rows[0]) { await client.query('ROLLBACK'); return error(res, 'Company not in bin', 404); }

    await client.query(
      `UPDATE users SET is_active = TRUE, updated_at = NOW()
       WHERE company_id = $1 AND approval_status = 'approved'`,
      [id]
    );

    await client.query('COMMIT');
    return success(res, { message: `${r.rows[0].name} restored successfully`, id });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally { client.release(); }
}

module.exports = {
  listCompanies, toggleCompany, getCompanyUsers,
  toggleUser, updateUser, resetUserPassword,
  requestDeleteOtp, deleteCompany, listBin, restoreCompany,
};
