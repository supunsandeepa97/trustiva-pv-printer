require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const path         = require('path');
const rateLimit    = require('express-rate-limit');
const errorHandler = require('./middleware/error');
const pool         = require('./config/database');
const { startBackupService, runBackup } = require('./services/backupService');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Security ──────────────────────────────────────────────
app.set('trust proxy', 1); // behind Vercel's proxy — required for correct client IP in rate limiting
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images from /uploads
}));
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000').split(',').map(s => s.trim());
const allowAnyOrigin = allowedOrigins.includes('*');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowAnyOrigin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  // Never combine a wildcard origin with credentials — unsafe and rejected by browsers.
  credentials: !allowAnyOrigin,
}));

// ─── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static files (local only — not needed on serverless) ───
if (!process.env.VERCEL) {
  app.use('/uploads',        express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));
  app.use('/generated-pdfs', express.static(path.resolve(process.env.PDF_DIR   || './generated-pdfs')));
}

// ─── Rate limiting ──────────────────────────────────────────
// Strict per-endpoint limiting for login/reset/signup lives in authRoutes.js —
// applying it to the whole /auth router would throttle polled endpoints
// (/me, /refresh, /pending-requests) and lock out every user behind one IP.
// Generous global safety-net limiter (well above normal usage) against abuse.
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      1000,
  standardHeaders: true,
  legacyHeaders:   false,
  message:  { success: false, message: 'Too many requests. Please try again later.' },
});
app.use('/api/', globalLimiter);

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/v1/auth',      require('./routes/authRoutes'));
app.use('/api/v1/company',   require('./routes/companyRoutes'));
app.use('/api/v1/imports',   require('./routes/importRoutes'));
app.use('/api/v1/payments',  require('./routes/paymentRoutes'));
app.use('/api/v1/print',     require('./routes/printRoutes'));
app.use('/api/v1/templates', require('./routes/templateRoutes'));
app.use('/api/v1/settings',  require('./routes/settingsRoutes'));
app.use('/api/v1/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/v1/platform',  require('./routes/platformRoutes'));

// ─── Health check ────────────────────────────────────────────
app.get('/api/v1/health', async (req, res) => {
  let dbOk = false;
  try { await pool.query('SELECT 1'); dbOk = true; } catch { /* down */ }
  const status = dbOk ? 'ok' : 'degraded';
  res.status(dbOk ? 200 : 503).json({
    success: dbOk,
    data: {
      status,
      db:        dbOk ? (pool._usingBackup ? 'backup' : 'primary') : 'down',
      backup:    pool._backup ? 'configured' : 'not configured',
      timestamp: new Date().toISOString(),
    },
  });
});

// ─── Manual backup trigger (internal use) ────────────────────
app.post('/api/v1/backup/run', async (req, res) => {
  const secret = req.headers['x-backup-secret'];
  if (!secret || secret !== process.env.BACKUP_SECRET) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }
  // Await so the serverless function stays alive until the backup genuinely
  // finishes — Vercel freezes/tears down the function right after the
  // response is sent, killing any unawaited background work.
  try {
    await runBackup();
    res.json({ success: true, data: { message: 'Backup completed' } });
  } catch (err) {
    console.error('[Backup] Manual trigger failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── Vercel Cron backup trigger ──────────────────────────────
app.get('/api/v1/backup/run', async (req, res) => {
  if (!process.env.CRON_SECRET || req.headers.authorization !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  // Await so the serverless function stays alive until the backup genuinely
  // finishes — Vercel freezes/tears down the function right after the
  // response is sent, killing any unawaited background work.
  try {
    await runBackup();
    res.json({ success: true, data: { message: 'Backup completed' } });
  } catch (err) {
    console.error('[Backup] Cron trigger failed:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// ─── 404 ────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// ─── Error handler ───────────────────────────────────────────
app.use(errorHandler);

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`TRUSTIVA PRINTER backend running on http://localhost:${PORT}`);
    if (!process.env.VERCEL) startBackupService();
  });
}

module.exports = app;
