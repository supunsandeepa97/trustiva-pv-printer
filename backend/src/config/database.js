const { Pool } = require('pg');

// On Vercel each serverless instance handles ~one request at a time and should
// route through Neon's POOLED (-pooler) connection string. Keep the per-instance
// pool tiny so many concurrent lambdas don't exhaust Neon's connection limit;
// keepAlive avoids re-handshaking warm connections. Locally, use a larger pool.
const IS_SERVERLESS = !!process.env.VERCEL;
const POOL_MAX      = IS_SERVERLESS ? 3 : 20;
const IDLE_MS       = IS_SERVERLESS ? 10_000 : 30_000;

const PRIMARY_CONFIG = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: POOL_MAX,
      idleTimeoutMillis: IDLE_MS,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
      allowExitOnIdle: IS_SERVERLESS,
    }
  : {
      host:     process.env.DB_HOST     || 'localhost',
      port:     parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME     || 'trustiva_pv',
      user:     process.env.DB_USER     || 'postgres',
      password: process.env.DB_PASSWORD || '',
      max: POOL_MAX,
      idleTimeoutMillis: IDLE_MS,
      connectionTimeoutMillis: 10_000,
      keepAlive: true,
    };

const primaryPool = new Pool(PRIMARY_CONFIG);
const backupPool  = process.env.BACKUP_DATABASE_URL
  ? new Pool({
      connectionString: process.env.BACKUP_DATABASE_URL,
      ssl: { rejectUnauthorized: false },
      max: IS_SERVERLESS ? 2 : 5,
      idleTimeoutMillis: IDLE_MS,
      connectionTimeoutMillis: 8_000,
      keepAlive: true,
      allowExitOnIdle: IS_SERVERLESS,
    })
  : null;

// These error codes mean the server is unreachable — not a SQL mistake
const CONNECTION_ERROR_CODES = new Set([
  'ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE',
  '57P01', // admin_shutdown
  '57P03', // cannot_connect_now
  '08000', // connection_exception
  '08006', // connection_failure
  '08001', // sqlclient_unable_to_establish_sqlconnection
]);

function isConnectionError(err) {
  if (!err) return false;
  if (CONNECTION_ERROR_CODES.has(err.code)) return true;
  const msg = (err.message || '').toLowerCase();
  return msg.includes('econnrefused') || msg.includes('timeout') ||
         msg.includes('connection terminated') || msg.includes('server closed');
}

let usingBackup      = false;
let recoveryInterval = null;

function startRecoveryWatch() {
  if (recoveryInterval) return;
  recoveryInterval = setInterval(async () => {
    try {
      await primaryPool.query('SELECT 1');
      console.log('[DB] Primary DB recovered — switching back from backup');
      usingBackup = false;
      clearInterval(recoveryInterval);
      recoveryInterval = null;
    } catch {
      // Still down — keep checking
    }
  }, 30_000);
}

// Smart query/connect wrapper used by every controller
const pool = {
  query: async (text, values) => {
    if (!usingBackup) {
      try {
        return await primaryPool.query(text, values);
      } catch (err) {
        if (isConnectionError(err) && backupPool) {
          console.error('[DB] Primary unreachable — failing over to backup DB:', err.message);
          usingBackup = true;
          startRecoveryWatch();
          return await backupPool.query(text, values);
        }
        throw err;
      }
    }
    if (!backupPool) throw new Error('Primary DB is down and no backup DB is configured');
    return backupPool.query(text, values);
  },

  // Used by controllers that need transactions (e.g. signupRequest)
  connect: async () => {
    if (!usingBackup) {
      try {
        return await primaryPool.connect();
      } catch (err) {
        if (isConnectionError(err) && backupPool) {
          console.error('[DB] Primary unreachable on connect — failing over to backup DB:', err.message);
          usingBackup = true;
          startRecoveryWatch();
          return await backupPool.connect();
        }
        throw err;
      }
    }
    if (!backupPool) throw new Error('Primary DB is down and no backup DB is configured');
    return backupPool.connect();
  },

  // Expose raw pools for the backup service
  _primary:      primaryPool,
  _backup:       backupPool,
  get _usingBackup() { return usingBackup; },
};

primaryPool.on('error', err => console.error('[DB] Primary pool error:', err.message));
if (backupPool) backupPool.on('error', err => console.error('[DB] Backup pool error:', err.message));

module.exports = pool;
