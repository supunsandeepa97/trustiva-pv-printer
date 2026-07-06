const crypto   = require('crypto');
const bcrypt   = require('bcryptjs');
const pool     = require('../config/database');
const { sign, signRefresh, verifyRefresh } = require('../config/jwt');
const { success, error } = require('../utils/apiResponse');
const { sendSignupRequestEmail, sendPasswordResetEmail } = require('../services/mailerService');
const { hashOtp, otpHashEquals } = require('../utils/otpHash');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    // NOTE (B8): email is only UNIQUE per (company_id, email), so the same email can
    // exist in multiple companies. The login form does not send a company identifier,
    // so we cannot always disambiguate. We select ALL matching accounts deterministically
    // (oldest first) and authenticate against the first one whose password matches AND
    // which passes every account/company gate. This makes behaviour deterministic (never
    // row-order luck) and avoids logging a user into the wrong company when the wrong
    // account happens to sort first. A full fix requires a company picker on the login
    // screen — see summary. New cross-company duplicates are blocked going forward in the
    // signup/join/register paths.
    const result = await pool.query(
      `SELECT u.*, c.name AS company_name, c.is_active AS company_is_active, c.deleted_at AS company_deleted_at
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.email = $1
       ORDER BY u.created_at ASC, u.id ASC`,
      [email.toLowerCase().trim()]
    );
    if (result.rows.length === 0) return error(res, 'Invalid email or password', 401);

    // Gate an account exactly the way login does. Returns an { code, message } error tuple
    // for the first failing gate, or null when the account is fully loginable.
    const gate = (u) => {
      if (u.approval_status === 'pending')  return { code: 403, message: 'Your account is pending admin approval.' };
      if (u.approval_status === 'rejected') return { code: 403, message: 'Your access request was declined. Contact the administrator.' };
      if (!u.is_active)          return { code: 403, message: 'Your account has been deactivated. Contact the administrator.' };
      if (!u.company_is_active)  return { code: 403, message: 'Your company account is inactive. Please contact support.' };
      if (u.company_deleted_at)  return { code: 403, message: 'This company account has been deleted. Contact the platform administrator.' };
      return null;
    };

    // Collect EVERY account whose password matches. We compare against all candidates so a
    // duplicate email with a non-matching password (on any row) never masks a valid login
    // on another row. Among password matches we prefer a fully loginable account, so an
    // older suspended/pending duplicate does not lock the user out of a valid newer one.
    // Deterministic order (created_at ASC, id ASC) guarantees stable behaviour regardless
    // of DB row order.
    const matched = [];
    for (const candidate of result.rows) {
      // eslint-disable-next-line no-await-in-loop
      if (await bcrypt.compare(password, candidate.password_hash)) matched.push(candidate);
    }
    if (matched.length === 0) return error(res, 'Invalid email or password', 401);

    const user = matched.find((u) => gate(u) === null) || matched[0];
    const gateError = gate(user);
    if (gateError) return error(res, gateError.message, gateError.code);

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
    const normEmail = email.toLowerCase().trim();

    // B8 (forward prevention): block emails already used in ANY company, not just this one,
    // so we never create new cross-company duplicates that make login/reset ambiguous.
    const dupe = await pool.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [normEmail]);
    if (dupe.rows.length > 0) return error(res, 'Email already registered', 409);

    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      `INSERT INTO users (company_id, name, email, password_hash, role)
       VALUES ($1, $2, $3, $4, $5) RETURNING id, name, email, role`,
      [req.user.company_id, name, normEmail, hash, role]
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

    // B9: enforce the SAME account/company gates login does. Previously refresh only
    // checked u.is_active, so a user whose COMPANY was suspended (companies.is_active=false)
    // or soft-deleted (companies.deleted_at set) kept minting fresh 8h access tokens for the
    // full 7-day refresh-token lifetime. By re-checking approval_status, user.is_active,
    // company.is_active and company.deleted_at here, suspending a company locks users out
    // within one access-token lifetime (<= 8h) instead of 7 days.
    const result = await pool.query(
      `SELECT u.*, c.name AS company_name, c.is_active AS company_is_active, c.deleted_at AS company_deleted_at
       FROM users u
       JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
      [payload.id]
    );
    const user = result.rows[0];
    if (!user) return error(res, 'User not found', 401);

    // Match login's gate errors/status codes exactly.
    if (user.approval_status === 'pending')  return error(res, 'Your account is pending admin approval.', 403);
    if (user.approval_status === 'rejected') return error(res, 'Your access request was declined. Contact the administrator.', 403);
    if (!user.is_active)          return error(res, 'Your account has been deactivated. Contact the administrator.', 403);
    if (!user.company_is_active)  return error(res, 'Your company account is inactive. Please contact support.', 403);
    if (user.company_deleted_at)  return error(res, 'This company account has been deleted. Contact the platform administrator.', 403);

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
    // B8: existing rows may already contain cross-company duplicates for this email. The
    // forgot form does not send a company, so pick deterministically (oldest first) —
    // same ordering login uses — instead of relying on DB row order. New duplicates are
    // blocked in signup/join/register going forward.
    const result = await pool.query(
      'SELECT id, company_id FROM users WHERE email = $1 AND is_active = TRUE ORDER BY created_at ASC, id ASC',
      [email.toLowerCase().trim()]
    );
    if (!result.rows[0]) {
      // Return success anyway to prevent email enumeration
      return success(res, { message: 'If that email exists, an OTP has been sent.' });
    }

    const otp     = String(crypto.randomInt(100000, 1000000));
    const expires = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const user    = result.rows[0];

    await pool.query(
      `INSERT INTO settings (company_id, key, value) VALUES ($1, $2, $3)
       ON CONFLICT (company_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
      [user.company_id, `otp_${user.id}`, JSON.stringify({ otpHash: hashOtp(otp), expires, attempts: 0 })]
    );

    await sendPasswordResetEmail(otp, email.toLowerCase().trim());

    return success(res, { message: 'If that email exists, an OTP has been sent.' });
  } catch (err) {
    next(err);
  }
}

async function resetPassword(req, res, next) {
  try {
    const { email, otp, password } = req.body;
    // B8: mirror forgotPassword's deterministic selection (oldest first) so the OTP is
    // validated against the SAME account the OTP was issued for, even when legacy
    // cross-company duplicates exist for this email.
    const userResult = await pool.query(
      'SELECT id, company_id FROM users WHERE email = $1 AND is_active = TRUE ORDER BY created_at ASC, id ASC',
      [email.toLowerCase().trim()]
    );
    const user = userResult.rows[0];
    if (!user) return error(res, 'Invalid request', 400);

    const settingResult = await pool.query(
      'SELECT value FROM settings WHERE company_id = $1 AND key = $2',
      [user.company_id, `otp_${user.id}`]
    );
    if (!settingResult.rows[0]) return error(res, 'No OTP found. Please request a new one.', 400);

    const stored = JSON.parse(settingResult.rows[0].value);
    const { otpHash: storedHash, expires } = stored;
    const attempts = stored.attempts || 0;
    if (new Date() > new Date(expires)) {
      await pool.query(
        'DELETE FROM settings WHERE company_id = $1 AND key = $2',
        [user.company_id, `otp_${user.id}`]
      );
      return error(res, 'OTP has expired', 400);
    }
    if (!otpHashEquals(hashOtp(String(otp || '')), storedHash)) {
      const newAttempts = attempts + 1;
      if (newAttempts >= 5) {
        // Too many wrong tries — invalidate the OTP and force a fresh request
        await pool.query(
          'DELETE FROM settings WHERE company_id = $1 AND key = $2',
          [user.company_id, `otp_${user.id}`]
        );
        return error(res, 'Too many incorrect attempts. Please request a new OTP.', 400);
      }
      await pool.query(
        `UPDATE settings SET value = $1, updated_at = NOW() WHERE company_id = $2 AND key = $3`,
        [JSON.stringify({ otpHash: storedHash, expires, attempts: newAttempts }), user.company_id, `otp_${user.id}`]
      );
      return error(res, 'Invalid OTP', 400);
    }

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
      `SELECT u.id, u.company_id, u.name, u.email, u.role, u.is_platform_admin,
              u.approval_status, u.created_at, c.name AS company_name
       FROM users u JOIN companies c ON c.id = u.company_id
       WHERE u.id = $1`,
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

    const normEmail = email.toLowerCase().trim();

    await client.query('BEGIN');

    // B8 (forward prevention): email is only UNIQUE per company at the DB level, so the
    // same address could otherwise be registered under multiple companies — which makes
    // login/forgot/reset ambiguous. Reject if the email already exists in ANY company so
    // no NEW cross-company duplicates are created going forward.
    const dupe = await client.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [normEmail]);
    if (dupe.rows.length > 0) {
      await client.query('ROLLBACK');
      return error(res, 'That email address is already registered.', 409);
    }

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
      [company_id, name.trim(), normEmail, hash]
    );

    await client.query('COMMIT');

    await sendSignupRequestEmail({ name: name.trim(), email: normEmail, role: 'super_admin', message, company_name: company_name.trim() });

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

async function listCompanies(req, res, next) {
  try {
    const result = await pool.query(`
      SELECT DISTINCT c.id, c.name
      FROM companies c
      JOIN users u ON u.company_id = c.id
      WHERE c.is_active = TRUE
        AND u.role = 'super_admin'
        AND u.approval_status = 'approved'
      ORDER BY c.name
    `);
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
}

async function joinRequest(req, res, next) {
  try {
    const { company_id, name, email, password, role = 'finance_user', message = '' } = req.body;
    const ALLOWED_ROLES = ['finance_manager', 'finance_user', 'viewer'];

    if (!company_id || !name || !email || !password)
      return error(res, 'Company, name, email and password are required', 400);
    if (!ALLOWED_ROLES.includes(role))
      return error(res, 'Invalid role', 400);

    const companyCheck = await pool.query(
      'SELECT id, name FROM companies WHERE id = $1 AND is_active = TRUE',
      [company_id]
    );
    if (!companyCheck.rows[0]) return error(res, 'Company not found', 404);

    const normEmail = email.toLowerCase().trim();

    // B8 (forward prevention): reject if this email already exists in ANY company, not just
    // this one — prevents new cross-company duplicates that make login/reset ambiguous.
    const dupe = await pool.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [normEmail]);
    if (dupe.rows.length > 0) return error(res, 'That email address is already registered.', 409);

    const hash = await bcrypt.hash(password, 12);
    await pool.query(
      `INSERT INTO users (company_id, name, email, password_hash, role, is_active, approval_status)
       VALUES ($1, $2, $3, $4, $5, FALSE, 'pending')`,
      [company_id, name.trim(), normEmail, hash, role]
    );

    return success(res, { message: 'Request submitted. The company admin will review your request.' }, 201);
  } catch (err) {
    if (err.code === '23505') return error(res, 'That email address is already registered.', 409);
    next(err);
  }
}

module.exports = { login, register, refreshToken, forgotPassword, resetPassword, getMe, signupRequest, approveUser, rejectUser, getPendingRequests, listCompanies, joinRequest };
