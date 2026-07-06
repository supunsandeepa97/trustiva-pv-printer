const pool = require('../config/database');
const { success, error } = require('../utils/apiResponse');
const { isReservedKey } = require('../utils/reservedSettingsKeys');

async function getSettings(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT key, value FROM settings WHERE company_id = $1',
      [req.user.company_id]
    );
    const settings = {};
    result.rows.forEach(r => { if (!isReservedKey(r.key)) settings[r.key] = r.value; });
    return success(res, settings);
  } catch (err) { next(err); }
}

async function upsertSettings(req, res, next) {
  try {
    const pairs = Object.entries(req.body);
    if (!pairs.length) return success(res, {});
    if (pairs.some(([key]) => isReservedKey(key))) {
      return error(res, 'Invalid setting key', 400);
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const [key, value] of pairs) {
        await client.query(
          `INSERT INTO settings (company_id, key, value)
           VALUES ($1, $2, $3)
           ON CONFLICT (company_id, key) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()`,
          [req.user.company_id, key, String(value)]
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    return success(res, { message: 'Settings saved' });
  } catch (err) { next(err); }
}

module.exports = { getSettings, upsertSettings };
