const pool = require('../config/database');

function logAudit(action, tableName = null) {
  return (req, res, next) => {
    const originalJson = res.json.bind(res);
    res.json = function (data) {
      if (data && data.success && req.user) {
        const recordId = req.params.id || (data.data && data.data.id) || null;
        pool.query(
          `INSERT INTO audit_logs (company_id, user_id, action, table_name, record_id, ip_address)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            req.user.company_id,
            req.user.id,
            action,
            tableName,
            recordId,
            req.ip,
          ]
        ).catch(err => console.error('Audit log error:', err.message));
      }
      return originalJson(data);
    };
    next();
  };
}

module.exports = { logAudit };
