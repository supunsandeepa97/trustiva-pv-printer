// DB-backed OTP store — one active OTP per company for platform delete actions.
// Persisted in the settings table (not in-memory) so the OTP and its attempt
// counter survive Vercel serverless cold starts / multiple lambda instances.
const crypto = require('crypto');
const pool   = require('../config/database');

const MAX_ATTEMPTS = 5;
const TTL_MS       = 10 * 60 * 1000;
const OTP_KEY      = 'delete_otp';

function generate() {
  return crypto.randomInt(100000, 1000000).toString();
}

async function clear(companyId) {
  await pool.query('DELETE FROM settings WHERE company_id = $1 AND key = $2', [companyId, OTP_KEY]);
}

async function set(companyId) {
  const otp     = generate();
  const expires = new Date(Date.now() + TTL_MS).toISOString();
  await pool.query(
    `INSERT INTO settings (company_id, key, value) VALUES ($1, $2, $3)
     ON CONFLICT (company_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
    [companyId, OTP_KEY, JSON.stringify({ otp, expires, attempts: 0 })]
  );
  return otp;
}

async function verify(otp, companyId) {
  const result = await pool.query(
    'SELECT value FROM settings WHERE company_id = $1 AND key = $2',
    [companyId, OTP_KEY]
  );
  if (!result.rows[0]) return false;

  const stored   = JSON.parse(result.rows[0].value);
  const attempts = stored.attempts || 0;

  if (new Date() > new Date(stored.expires)) { await clear(companyId); return false; }

  if (stored.otp !== otp) {
    const newAttempts = attempts + 1;
    if (newAttempts >= MAX_ATTEMPTS) {
      await clear(companyId);
    } else {
      await pool.query(
        `UPDATE settings SET value = $1, updated_at = NOW() WHERE company_id = $2 AND key = $3`,
        [JSON.stringify({ otp: stored.otp, expires: stored.expires, attempts: newAttempts }), companyId, OTP_KEY]
      );
    }
    return false;
  }

  await clear(companyId);
  return true;
}

module.exports = { set, verify };
