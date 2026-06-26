require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } });

async function reset() {
  const client = await pool.connect();
  try {
    const userRes = await client.query(
      `SELECT u.id AS user_id, u.company_id FROM users u WHERE u.email = 'supunsandeepa@yahoo.com' LIMIT 1`
    );
    if (!userRes.rows[0]) { console.error('User not found'); process.exit(1); }

    const { user_id, company_id } = userRes.rows[0];
    console.log(`Keeping user: ${user_id}, company: ${company_id}`);

    await client.query('BEGIN');

    const r1 = await client.query('DELETE FROM print_logs');
    console.log(`Deleted ${r1.rowCount} print_logs`);

    const r2 = await client.query('DELETE FROM payment_vouchers');
    console.log(`Deleted ${r2.rowCount} payment_vouchers`);

    const r3 = await client.query('DELETE FROM imports');
    console.log(`Deleted ${r3.rowCount} imports`);

    const r4 = await client.query('DELETE FROM audit_logs');
    console.log(`Deleted ${r4.rowCount} audit_logs`);

    const r5 = await client.query('DELETE FROM document_sequences');
    console.log(`Deleted ${r5.rowCount} document_sequences`);

    const r6 = await client.query('DELETE FROM voucher_templates WHERE company_id != $1', [company_id]);
    console.log(`Deleted ${r6.rowCount} voucher_templates (other companies)`);

    const r7 = await client.query('DELETE FROM settings WHERE company_id != $1', [company_id]);
    console.log(`Deleted ${r7.rowCount} settings rows (other companies)`);

    const r8 = await client.query('DELETE FROM users WHERE id != $1', [user_id]);
    console.log(`Deleted ${r8.rowCount} users`);

    const r9 = await client.query('DELETE FROM companies WHERE id != $1', [company_id]);
    console.log(`Deleted ${r9.rowCount} companies`);

    // Clear branding on the kept company so it starts fresh
    await client.query(
      `UPDATE companies SET logo_url = NULL, watermark_url = NULL WHERE id = $1`,
      [company_id]
    );
    console.log('Cleared company branding');

    await client.query('COMMIT');
    console.log('\nDone. Database is fresh.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

reset();
