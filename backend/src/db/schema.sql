-- TRUSTIVA PRINTER — PostgreSQL Schema
-- Run: psql -U postgres -d trustiva_pv -f schema.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- companies (FK target — created first)
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name          TEXT NOT NULL,
  address       TEXT,
  phone         TEXT,
  email         TEXT,
  tax_number    TEXT,
  logo_url      TEXT,
  watermark_url TEXT,
  settings      JSONB DEFAULT '{}'::JSONB,
  is_active     BOOLEAN NOT NULL DEFAULT TRUE,
  deleted_at    TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- users
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id    UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'finance_user'
                  CHECK (role IN ('super_admin','finance_manager','finance_user','viewer')),
  is_active           BOOLEAN NOT NULL DEFAULT TRUE,
  is_platform_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  approval_status TEXT NOT NULL DEFAULT 'approved'
                    CHECK (approval_status IN ('pending','approved','rejected')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_users_company  ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_users_email    ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_approval ON users(company_id, approval_status);

-- ============================================================
-- voucher_templates (referenced by payment_vouchers)
-- ============================================================
CREATE TABLE IF NOT EXISTS voucher_templates (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  config     JSONB NOT NULL DEFAULT '{}'::JSONB,
  paper_size TEXT NOT NULL DEFAULT 'A5_portrait',
  is_default BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, name)
);

CREATE INDEX IF NOT EXISTS idx_templates_company ON voucher_templates(company_id);

-- ============================================================
-- imports
-- ============================================================
CREATE TABLE IF NOT EXISTS imports (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id       UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by       UUID REFERENCES users(id),
  filename         TEXT NOT NULL,
  format           TEXT NOT NULL CHECK (format IN ('xlsx','csv','txt')),
  total_rows       INTEGER NOT NULL DEFAULT 0,
  imported_rows    INTEGER NOT NULL DEFAULT 0,
  duplicate_count  INTEGER NOT NULL DEFAULT 0,
  error_count      INTEGER NOT NULL DEFAULT 0,
  status           TEXT NOT NULL DEFAULT 'completed'
                     CHECK (status IN ('pending','processing','completed','failed')),
  mapping_template JSONB,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_imports_company ON imports(company_id);
CREATE INDEX IF NOT EXISTS idx_imports_created ON imports(company_id, created_at DESC);

-- ============================================================
-- import_staging (serverless-safe two-step upload → confirm handoff)
-- ============================================================
-- On Vercel, /imports/upload and /imports/confirm are separate lambda
-- invocations that may land on different instances with different ephemeral
-- /tmp filesystems, so the uploaded file written during "upload" is frequently
-- gone during "confirm". Instead of re-reading the file from disk on confirm,
-- the upload step persists the parsed rows+headers here keyed by a token; the
-- confirm step looks them up by that token. Rows are short-lived (one import
-- session) and cleaned up on confirm / by the expiry sweep.
CREATE TABLE IF NOT EXISTS import_staging (
  token        UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id   UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES users(id) ON DELETE SET NULL,
  filename     TEXT NOT NULL,
  format       TEXT NOT NULL,
  payload      JSONB NOT NULL,            -- { headers: [...], rows: [[...], ...] }
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_import_staging_company ON import_staging(company_id);
CREATE INDEX IF NOT EXISTS idx_import_staging_created ON import_staging(created_at);

-- ============================================================
-- payment_vouchers (core table)
-- ============================================================
CREATE TABLE IF NOT EXISTS payment_vouchers (
  id             UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id     UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  import_id      UUID REFERENCES imports(id) ON DELETE SET NULL,
  template_id    UUID REFERENCES voucher_templates(id) ON DELETE SET NULL,
  voucher_no     TEXT NOT NULL,
  date           DATE NOT NULL,
  payee_name     TEXT NOT NULL,
  amount         NUMERIC(15,2) NOT NULL,
  amount_words   TEXT,
  description    TEXT,
  bank_name      TEXT,
  cheque_no      TEXT,
  currency       TEXT NOT NULL DEFAULT 'LKR',
  account_name   TEXT,
  prepared_by    TEXT,
  status         TEXT NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('draft','pending','printed','cancelled')),
  duplicate_hash TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, voucher_no)
);

CREATE INDEX IF NOT EXISTS idx_pv_company_status ON payment_vouchers(company_id, status);
CREATE INDEX IF NOT EXISTS idx_pv_import ON payment_vouchers(import_id);
CREATE INDEX IF NOT EXISTS idx_pv_hash ON payment_vouchers(company_id, duplicate_hash);
CREATE INDEX IF NOT EXISTS idx_pv_date ON payment_vouchers(company_id, date DESC);

-- ============================================================
-- print_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS print_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  voucher_id UUID NOT NULL REFERENCES payment_vouchers(id) ON DELETE CASCADE,
  printed_by UUID REFERENCES users(id),
  printed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pdf_path   TEXT,
  copies     INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS idx_print_logs_voucher ON print_logs(voucher_id);

-- ============================================================
-- settings (key-value per company)
-- ============================================================
CREATE TABLE IF NOT EXISTS settings (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  key        TEXT NOT NULL,
  value      TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, key)
);

CREATE INDEX IF NOT EXISTS idx_settings_company ON settings(company_id);

-- ============================================================
-- document_sequences (atomic voucher numbering)
-- ============================================================
CREATE TABLE IF NOT EXISTS document_sequences (
  company_id  UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  prefix      TEXT NOT NULL,
  last_number INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (company_id, prefix)
);

-- ============================================================
-- audit_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_logs (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  company_id UUID REFERENCES companies(id) ON DELETE SET NULL,
  user_id    UUID REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,
  table_name TEXT,
  record_id  UUID,
  old_data   JSONB,
  new_data   JSONB,
  ip_address TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_company ON audit_logs(company_id, created_at DESC);

-- ============================================================
-- Helper: update updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_vouchers_updated_at
  BEFORE UPDATE ON payment_vouchers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE OR REPLACE TRIGGER trg_templates_updated_at
  BEFORE UPDATE ON voucher_templates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
