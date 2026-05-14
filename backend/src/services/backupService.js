const cron = require('node-cron');
const pool = require('../config/database');

// Tables in FK-safe order (parents before children)
const TABLES = [
  { name: 'companies',          pk: 'id' },
  { name: 'users',              pk: 'id' },
  { name: 'voucher_templates',  pk: 'id' },
  { name: 'settings',          pk: 'id' },
  { name: 'imports',           pk: 'id' },
  { name: 'payment_vouchers',  pk: 'id' },
  { name: 'print_logs',        pk: 'id' },
  { name: 'audit_logs',        pk: 'id', recentOnly: true }, // only last 30 days
  { name: 'document_sequences', pk: null, compositePk: ['company_id', 'prefix'] },
];

async function syncTable(primary, backup, tableConfig) {
  const { name, pk, compositePk, recentOnly } = tableConfig;

  const whereClause = recentOnly
    ? `WHERE created_at >= NOW() - INTERVAL '30 days'`
    : '';
  const { rows } = await primary.query(`SELECT * FROM ${name} ${whereClause}`);

  if (rows.length === 0) return 0;

  const cols      = Object.keys(rows[0]);
  const colList   = cols.map(c => `"${c}"`).join(', ');
  const pkCols    = compositePk || [pk];
  const updateSet = cols
    .filter(c => !pkCols.includes(c))
    .map(c => `"${c}" = EXCLUDED."${c}"`)
    .join(', ');
  const conflictTarget = pkCols.map(c => `"${c}"`).join(', ');

  let upserted = 0;
  for (const row of rows) {
    const vals         = cols.map(c => row[c]);
    const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
    const doUpdate     = updateSet
      ? `DO UPDATE SET ${updateSet}`
      : 'DO NOTHING';
    await backup.query(
      `INSERT INTO ${name} (${colList}) VALUES (${placeholders})
       ON CONFLICT (${conflictTarget}) ${doUpdate}`,
      vals
    );
    upserted++;
  }
  return upserted;
}

async function runBackup() {
  const primary = pool._primary;
  const backup  = pool._backup;
  if (!backup) return;

  const start = Date.now();
  console.log('[Backup] Starting daily sync to backup DB…');

  let totalRows = 0;
  const errors  = [];

  for (const tableConfig of TABLES) {
    try {
      const count = await syncTable(primary, backup, tableConfig);
      console.log(`[Backup]   ${tableConfig.name}: ${count} rows synced`);
      totalRows += count;
    } catch (err) {
      console.error(`[Backup]   ${tableConfig.name}: FAILED — ${err.message}`);
      errors.push(tableConfig.name);
    }
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  if (errors.length === 0) {
    console.log(`[Backup] Sync complete — ${totalRows} rows in ${elapsed}s`);
  } else {
    console.error(`[Backup] Sync finished with errors in: ${errors.join(', ')} — ${elapsed}s`);
  }
}

function startBackupService() {
  if (!pool._backup) {
    console.log('[Backup] BACKUP_DATABASE_URL not set — automatic backup disabled');
    return;
  }

  // Daily at 2:00 AM Sri Lanka time
  cron.schedule('0 2 * * *', runBackup, { timezone: 'Asia/Colombo' });
  console.log('[Backup] Daily backup scheduled at 02:00 Asia/Colombo');
}

module.exports = { startBackupService, runBackup };
