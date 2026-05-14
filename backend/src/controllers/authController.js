const bcrypt   = require('bcryptjs');
const pool     = require('../config/database');
const { sign, signRefresh, verifyRefresh } = require('../config/jwt');
const { success, error } = require('../utils/apiResponse');
const { sendSignupRequestEmail } = require('../services/mailerService');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const result = await pool.query(
      `SELECT u.*, c.name AS company_name, c.is_active AS company_is_active
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1`,
      [email.toLowerCase().trim()]
    );
    const user = result.rows[0];
    if (!user) return error(res, 'Invalid email or password', 401);

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return error(res, 'Invalid email or password', 401);

    if (user.approval_status === 'pending')  return error(res, 'Your account is pending admin approval.', 403);
    if (user.approval_status === 'rejected') return error(res, 'Your access request was declined. Contact the administrator.', 403);
    if (!user.is_active) return error(res, 'Your account has been deactivated. Contact the administrator.', 403);
    if (!user.company_is_active) return error(res, 'Your company account is inactive. Please contact support.', 403);

    const payload = {
      id:                user.id,
      company_id:        user.company_id,
      company_name:      user.company_name,
      name:              user.name,
      email:             user.email,
      role:              user.role,
      is_platform_admin: user.is_platform_admin || false,
    };

    const token        = sign(payload);
    const refreshToken = signRefresh({ id: user.id, company_id: user.company_id });

    return success(res, { token, refreshToken, user: payload });
  } catch (err) {
    next(err);
  }
}

async function register(req, res, next) {
  try {
    const { name, email, password, role = 'finance_user' } = req.body;
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (company_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role`,
      [req.user.company_id, name, email.toLowerCase().trim(), hash, role]
    );
    return success(res, result.rows[0], 201);
  } catch (err) {
    if (err.code === '23505') return error(res, 'Email already registered', 409);
    next(err);
  }
}

async function refreshToken(req, res, next) {
  try {
    const { refreshToken: token } = req.body;
    if (!token) return error(res, 'Refresh token required', 400);

    let payload;
    try {
      payload = verifyRefresh(token);
    } catch {
      return error(res, 'Invalid or expired refresh token', 401);
    }

    const result = await pool.query(
      `SELECT u.*, c.name AS company_name FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1 AND u.is_active = TRUE`,
      [payload.id]
    );
    const user = result.rows[0];
    if (!user) return error(res, 'User not found', 401);

    const newPayload = {
      id:                user.id,
      company_id:        user.company_id,
      company_name:      user.company_name,
      name:              user.name,
      email:             user.email,
      role:              user.role,
      is_platform_admin: user.is_platform_admin || false,
    };

    return success(res, { token: sign(newPayload), user: newPayload });
  } catch (err) {
    next(err);
  }
}

async function forgotPassword(req, res, next) {
  try {
    const { email } = req.body;
    const result = await pool.query(
      'SELECT id, company_id FROM users WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase().trim()]
    );
    if (!result.rows[0]) {
      // Return success anyway to prevent email enumeration
      return success(res, { message: 'If that email exists, an OTP has been sent.' });
    }

    const otp     = String(Math.floor(100000 + Math.random() * 900000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const user    = result.rows[0];

    await pool.query(
      `INSERT INTO settings (company_id, key, value) VALUES ($1, $2, $3)
       ON CONFLICT (company_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [user.company_id, `otp_${user.id}`, JSON.stringify({ otp, expires })]
    );

    // In production: send email with OTP. For now, log without exposing the value.
    console.log(`[OTP] Generated for ${email} (expires ${expires})`);

    return success(res, { message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, otp, password } = req.body;
    const userResult = await pool.query(
      'SELECT id, company_id FROM users WHERE email = $1 AND is_active = TRUE',
      [email.toLowerCase().trim()]
    );
    const user = userResult.rows[0];
    if (!user) return error(res, 'Invalid request', 400);

    const settingResult = await pool.query(
      'SELECT value FROM settings WHERE company_id = $1 AND key = $2',
      [user.company_id, `otp_${user.id}`]
    );
    if (!settingResult.rows[0]) return error(res, 'No OTP found. Please request a new one.', 400);

    const { otp: storedOtp, expires } = JSON.parse(settingResult.rows[0].value);
    if (new Date() > new Date(expires)) return error(res, 'OTP has expired', 400);
    if (otp !== storedOtp) return error(res, 'Invalid OTP', 400);

    if (!password || password.length < 8)        return error(res, 'Password must be at least 8 characters', 400);
    if (!/[A-Z]/.test(password))                 return error(res, 'Password must contain an uppercase letter', 400);
    if (!/[0-9]/.test(password))                 return error(res, 'Password must contain a number', 400);
    if (!/[^A-Za-z0-9]/.test(password))          return error(res, 'Password must contain a special character', 400);

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
      [hash, user.id]
    );
    await pool.query(
      'DELETE FROM settings WHERE company_id = $1 AND key = $2',
      [user.company_id, `otp_${user.id}`]
    );

    return success(res, { message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

async function getMe(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT id, company_id, name, email, role, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function signupRequest(req, res, next) {
  const client = await pool.connect();
  try {
    const { name, email, password, message = '', company_name } = req.body;
    if (!name || !email || !password || !company_name)
      return error(res, 'Company name, your name, email and password are required', 400);

    await client.query('BEGIN');

    const companyResult = await client.query(
      `INSERT INTO companies (name) VALUES ($1) RETURNING id`,
      [company_name.trim()]
    );
    const company_id = companyResult.rows[0].id;

    const hash = await bcrypt.hash(password, 12);
    // First user of a new company always becomes super_admin (company owner)
    await client.query(
      `INSERT INTO users (company_id, name, email, password_hash, role, is_active, approval_status)
       VALUES ($1, $2, $3, $4, 'super_admin', FALSE, 'pending')`,
      [company_id, name.trim(), email.toLowerCase().trim(), hash]
    );

    await client.query('COMMIT');

    await sendSignupRequestEmail({ name: name.trim(), email: email.toLowerCase().trim(), role: 'super_admin', message, company_name: company_name.trim() });

    return success(res, { message: 'Request submitted. Awaiting admin approval.' }, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    if (err.code === '23505') return error(res, 'That email address is already registered.', 409);
    next(err);
  } finally {
    client.release();
  }
}

async function approveUser(req, res, next) {
  try {
    // Platform admin can approve anyone; company super_admin only within their company
    const query = req.user.is_platform_admin
      ? `UPDATE users SET approval_status = 'approved', is_active = TRUE, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, email, role, approval_status, is_active`
      : `UPDATE users SET approval_status = 'approved', is_active = TRUE, updated_at = NOW()
         WHERE id = $1 AND company_id = $2
         RETURNING id, name, email, role, approval_status, is_active`;
    const params = req.user.is_platform_admin ? [req.params.id] : [req.params.id, req.user.company_id];
    const result = await pool.query(query, params);
    if (!result.rows[0]) return error(res, 'User not found or access denied', 404);
    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function rejectUser(req, res, next) {
  try {
    const query = req.user.is_platform_admin
      ? `UPDATE users SET approval_status = 'rejected', is_active = FALSE, updated_at = NOW()
         WHERE id = $1
         RETURNING id, name, email, role, approval_status, is_active`
      : `UPDATE users SET approval_status = 'rejected', is_active = FALSE, updated_at = NOW()
         WHERE id = $1 AND company_id = $2
         RETURNING id, name, email, role, approval_status, is_active`;
    const params = req.user.is_platform_admin ? [req.params.id] : [req.params.id, req.user.company_id];
    const result = await pool.query(query, params);
    if (!result.rows[0]) return error(res, 'User not found or access denied', 404);
    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function getPendingRequests(req, res, next) {
  try {
    let result;
    if (req.user.is_platform_admin) {
      // Platform admin sees ALL pending users across all companies
      result = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.created_at, u.approval_status,
                c.name AS company_name
         FROM users u
         JOIN companies c ON c.id = u.company_id
         WHERE u.approval_status = 'pending'
         ORDER BY u.created_at DESC`
      );
    } else {
      // Company super_admin sees only pending users in THEIR company
      result = await pool.query(
        `SELECT u.id, u.name, u.email, u.role, u.created_at, u.approval_status,
                c.name AS company_name
         FROM users u
         JOIN companies c ON c.id = u.company_id
         WHERE u.approval_status = 'pending' AND u.company_id = $1
         ORDER BY u.created_at DESC`,
        [req.user.company_id]
      );
    }
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { login, register, refreshToken, forgotPassword, resetPassword, getMe, signupRequest, approveUser, rejectUser, getPendingRequests };
