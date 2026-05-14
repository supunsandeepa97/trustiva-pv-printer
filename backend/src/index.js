require('dotenv').config();

const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const path         = require('path');
const rateLimit    = require('express-rate-limit');
const errorHandler = require('./middleware/error');

const app  = express();
const PORT = process.env.PORT || 4000;

// ─── Security ──────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' }, // allow images from /uploads
}));
app.use(cors({
  origin:      process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
}));

// ─── Body parsing ───────────────────────────────────────────
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static files ───────────────────────────────────────────
app.use('/uploads',        express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));
app.use('/generated-pdfs', express.static(path.resolve(process.env.PDF_DIR   || './generated-pdfs')));

// ─── Rate limiting on auth ──────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      15,
  message:  { success: false, message: 'Too many requests. Please try again later.' },
});

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/v1/auth',      authLimiter, require('./routes/authRoutes'));
app.use('/api/v1/company',   require('./routes/companyRoutes'));
app.use('/api/v1/imports',   require('./routes/importRoutes'));
app.use('/api/v1/payments',  require('./routes/paymentRoutes'));
app.use('/api/v1/print',     require('./routes/printRoutes'));
app.use('/api/v1/templates', require('./routes/templateRoutes'));
app.use('/api/v1/settings',  require('./routes/settingsRoutes'));
app.use('/api/v1/dashboard', require('./routes/dashboardRoutes'));
app.use('/api/v1/platform',  require('./routes/platformRoutes'));

// ─── Health check ────────────────────────────────────────────
app.get('/api/v1/health', (req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
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
  });
}

module.exports = app;
