const bcrypt = require('bcryptjs');
const pool   = require('../config/database');
const { success, error } = require('../utils/apiResponse');

async function getCompany(req, res, next) {
  try {
    const companyResult = await pool.query(
      'SELECT * FROM companies WHERE id = $1',
      [req.user.company_id]
    );
    const company = companyResult.rows[0];
    if (!company) return error(res, 'Company not found', 404);

    const settingsResult = await pool.query(
      'SELECT key, value FROM settings WHERE company_id = $1',
      [req.user.company_id]
    );
    const settings = {};
    settingsResult.rows.forEach(row => { settings[row.key] = row.value; });

    return success(res, { ...company, settings });
  } catch (err) {
    next(err);
  }
}

async function updateCompany(req, res, next) {
  try {
    const { name, address, phone, email, tax_number } = req.body;
    const result = await pool.query(
      `UPDATE companies
       SET name = COALESCE($1, name),
           address = COALESCE($2, address),
           phone = COALESCE($3, phone),
           email = COALESCE($4, email),
           tax_number = COALESCE($5, tax_number),
           updated_at = NOW()
       WHERE id = $6
       RETURNING *`,
      [name, address, phone, email, tax_number, req.user.company_id]
    );
    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function uploadLogo(req, res, next) {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    await pool.query(
      'UPDATE companies SET logo_url = $1, updated_at = NOW() WHERE id = $2',
      [dataUrl, req.user.company_id]
    );
    return success(res, { logo_url: dataUrl });
  } catch (err) {
    next(err);
  }
}

async function uploadWatermark(req, res, next) {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    await pool.query(
      'UPDATE companies SET watermark_url = $1, updated_at = NOW() WHERE id = $2',
      [dataUrl, req.user.company_id]
    );
    return success(res, { watermark_url: dataUrl });
  } catch (err) {
    next(err);
  }
}

async function uploadSignature(req, res, next) {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);
    const slot   = req.params.slot || 'left';
    const dataUrl = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    await pool.query(
      `INSERT INTO settings (company_id, key, value) VALUES ($1, $2, $3)
       ON CONFLICT (company_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [req.user.company_id, `signature_${slot}`, dataUrl]
    );
    return success(res, { slot, url: dataUrl });
  } catch (err) {
    next(err);
  }
}

async function getUsers(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT id, name, email, role, is_active, approval_status, created_at
       FROM users WHERE company_id = $1 ORDER BY created_at`,
      [req.user.company_id]
    );
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
}

async function updateUser(req, res, next) {
  try {
    const { role, is_active } = req.body;
    const result = await pool.query(
      `UPDATE users SET
         role = COALESCE($1, role),
         is_active = COALESCE($2, is_active),
         updated_at = NOW()
       WHERE id = $3 AND company_id = $4
       RETURNING id, name, email, role, is_active`,
      [role, is_active, req.params.id, req.user.company_id]
    );
    if (!result.rows[0]) return error(res, 'User not found', 404);
    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function createUser(req, res, next) {
  try {
    const { name, email, password, role } = req.body;
    const ALLOWED_ROLES = ['finance_manager', 'finance_user', 'viewer'];

    if (!name?.trim() || !email?.trim() || !password || !role) {
      return error(res, 'Name, email, password and role are required', 400);
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return error(res, 'Invalid role', 400);
    }

    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase().trim()]);
    if (existing.rows.length > 0) return error(res, 'Email already registered', 409);

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (company_id, name, email, password_hash, role, is_active, approval_status)
       VALUES ($1, $2, $3, $4, $5, TRUE, 'approved')
       RETURNING id, name, email, role, is_active, approval_status, created_at`,
      [req.user.company_id, name.trim(), email.toLowerCase().trim(), hash, role]
    );
    return success(res, result.rows[0], 201);
  } catch (err) {
    next(err);
  }
}

module.exports = { getCompany, updateCompany, uploadLogo, uploadWatermark, uploadSignature, getUsers, updateUser, createUser };
