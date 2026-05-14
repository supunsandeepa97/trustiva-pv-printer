-- TRUSTIVA PRINTER — Seed Data
-- Run after schema.sql

-- Default company (platform owner's company)
INSERT INTO companies (id, name, address, phone, email, tax_number, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'TRUSTIVA (PVT) LTD',
  'No. 1, Finance Street, Colombo 03, Sri Lanka',
  '+94 11 234 5678',
  'finance@trustiva.lk',
  'VAT-123456789',
  TRUE
) ON CONFLICT (id) DO NOTHING;

-- Platform admin
INSERT INTO users (id, company_id, name, email, password_hash, role, is_platform_admin)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Super Admin',
  'supunsandeepa@yahoo.com',
  '$2a$12$82uewTxI/sgVupapq8HE0Ox/ysVnikeNpqJEf6gwbv/lE.8O.mRve',
  'super_admin',
  TRUE
) ON CONFLICT DO NOTHING;

-- Ensure platform admin flag is set on existing rows (idempotent)
UPDATE users SET is_platform_admin = TRUE WHERE email = 'supunsandeepa@yahoo.com';
UPDATE companies SET is_active = TRUE WHERE id = '00000000-0000-0000-0000-000000000001';

-- Default voucher template (Standard A5)
INSERT INTO voucher_templates (id, company_id, name, config, paper_size, is_default)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000001',
  'Standard A5',
  '{
    "visible_fields": ["logo","voucher_no","date","payee_name","amount","amount_words","description","bank_name","cheque_no","account_name","currency","prepared_by","signature"],
    "styles": {
      "headerBg": "#0F172A",
      "titleColor": "#FFFFFF",
      "accentColor": "#2563EB",
      "fontSize": 11
    },
    "signature_labels": {
      "left": "Prepared By",
      "center": "Checked By",
      "right": "Approved By"
    },
    "footer_text": "",
    "show_watermark": false,
    "watermark_text": "TRUSTIVA"
  }'::JSONB,
  'A5_portrait',
  TRUE
) ON CONFLICT DO NOTHING;

-- Default settings
INSERT INTO settings (company_id, key, value) VALUES
  ('00000000-0000-0000-0000-000000000001', 'voucher_prefix', 'PV'),
  ('00000000-0000-0000-0000-000000000001', 'voucher_start', '1001'),
  ('00000000-0000-0000-0000-000000000001', 'default_template_id', '00000000-0000-0000-0000-000000000003'),
  ('00000000-0000-0000-0000-000000000001', 'default_currency', 'LKR'),
  ('00000000-0000-0000-0000-000000000001', 'default_copies', '1')
ON CONFLICT (company_id, key) DO NOTHING;

-- Document sequence
INSERT INTO document_sequences (company_id, prefix, last_number)
VALUES ('00000000-0000-0000-0000-000000000001', 'PV', 1000)
ON CONFLICT DO NOTHING;
