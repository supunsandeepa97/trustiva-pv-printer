const pool = require('../config/database');
const { success } = require('../utils/apiResponse');

async function getStats(req, res, next) {
  try {
    const cid = req.user.company_id;

    const [statusResult, dailyResult, monthlyResult, recentImportsResult, recentPrintsResult] = await Promise.all([
      pool.query(
        `SELECT
           COUNT(*) FILTER (WHERE status = 'printed')  AS printed,
           COUNT(*) FILTER (WHERE status = 'pending')  AS pending,
           COUNT(*) FILTER (WHERE status = 'draft')    AS draft,
           COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
           COUNT(*)                                    AS total,
           COALESCE(SUM(amount) FILTER (WHERE status = 'printed'), 0) AS total_printed_amount
         FROM payment_vouchers WHERE company_id = $1`,
        [cid]
      ),
      pool.query(
        `SELECT DATE(date) AS day, COUNT(*) AS count
         FROM payment_vouchers
         WHERE company_id = $1 AND date >= NOW() - INTERVAL '30 days'
         GROUP BY DATE(date) ORDER BY day ASC`,
        [cid]
      ),
      pool.query(
        `SELECT DATE_TRUNC('month', date) AS month, COUNT(*) AS count, SUM(amount) AS volume
         FROM payment_vouchers
         WHERE company_id = $1 AND date >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', date) ORDER BY month ASC`,
        [cid]
      ),
      pool.query(
        `SELECT id, filename, imported_rows, created_at FROM imports
         WHERE company_id = $1 ORDER BY created_at DESC LIMIT 5`,
        [cid]
      ),
      pool.query(
        `SELECT pl.printed_at, u.name AS printed_by, pv.voucher_no, pv.payee_name, pv.amount
         FROM print_logs pl
         JOIN payment_vouchers pv ON pv.id = pl.voucher_id
         LEFT JOIN users u ON u.id = pl.printed_by
         WHERE pv.company_id = $1 ORDER BY pl.printed_at DESC LIMIT 5`,
        [cid]
      ),
    ]);

    return success(res, {
      stats:         statusResult.rows[0],
      dailyChart:    dailyResult.rows,
      monthlyChart:  monthlyResult.rows,
      recentImports: recentImportsResult.rows,
      recentPrints:  recentPrintsResult.rows,
    });
  } catch (err) { next(err); }
}

module.exports = { getStats };
