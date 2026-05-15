const pool = require('../config/database');

async function generateVoucherNumber(companyId, client = null) {
  const db = client || pool;

  const result = await db.query(
    `INSERT INTO document_sequences (company_id, prefix, last_number)
     VALUES ($1,
       COALESCE((SELECT value FROM settings WHERE company_id = $1 AND key = 'voucher_prefix'), 'PV'),
       COALESCE((SELECT value::INT FROM settings WHERE company_id = $1 AND key = 'voucher_start'), 1001)
     )
     ON CONFLICT (company_id, prefix)
     DO UPDATE SET last_number = document_sequences.last_number + 1
     RETURNING prefix, last_number`,
    [companyId]
  );

  const { prefix, last_number } = result.rows[0];
  return `${prefix}-${String(last_number).padStart(4, '0')}`;
}

module.exports = { generateVoucherNumber };
