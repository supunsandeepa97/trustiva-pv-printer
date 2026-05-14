# TRUSTIVA PRINTER
**Smart Financial Printing Platform** — Enterprise Payment Voucher Printing for Sri Lankan Finance Teams

---

## Overview

TRUSTIVA PRINTER is a full-stack web application that enables finance teams to:
- Import payment data exported from QuickBooks Desktop 2018
- Manage payment vouchers with status tracking
- Print pixel-perfect A5 payment vouchers with company branding
- Generate and download PDF vouchers
- Customize voucher templates with a live visual editor

---

## Architecture

```
Trustiva PV Printer/
├── frontend/      Next.js 14 App (port 3000)
├── backend/       Express.js API (port 4000)
├── assets/        Logo, watermarks, templates
└── docker-compose.yml
```

**Stack:** Next.js · React · Tailwind CSS · Express.js · PostgreSQL · pdf-lib · SheetJS

---

## Prerequisites

- Node.js 20+
- PostgreSQL 15+ (or Docker)
- npm 9+

---

## Quick Start — Docker (Recommended)

```bash
# 1. Clone / open the project
cd "Trustiva PV Printer"

# 2. Start all services
docker compose up -d

# 3. Open browser
# App:     http://localhost:3000
# API:     http://localhost:4000/api/v1/health
```

**Default login:**
- Email: `admin@trustiva.lk`
- Password: `Admin@123`

---

## Manual Setup

### Backend

```bash
cd backend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Edit .env — set DB_PASSWORD, JWT_SECRET, JWT_REFRESH_SECRET

# Create database
createdb trustiva_pv

# Run schema + seed
psql -U postgres -d trustiva_pv -f src/db/schema.sql
psql -U postgres -d trustiva_pv -f src/db/seed.sql

# Start development server
npm run dev
```

### Frontend

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

App: `http://localhost:3000`

---

## Environment Variables (backend/.env)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | API port | `4000` |
| `DB_HOST` | PostgreSQL host | `localhost` |
| `DB_PORT` | PostgreSQL port | `5432` |
| `DB_NAME` | Database name | `trustiva_pv` |
| `DB_USER` | DB user | `postgres` |
| `DB_PASSWORD` | DB password | *(required)* |
| `JWT_SECRET` | Access token secret (32+ chars) | *(required)* |
| `JWT_REFRESH_SECRET` | Refresh token secret | *(required)* |
| `CORS_ORIGIN` | Frontend URL | `http://localhost:3000` |
| `UPLOAD_DIR` | Upload directory | `./uploads` |
| `PDF_DIR` | PDF output directory | `./generated-pdfs` |
| `VOUCHER_PREFIX` | Default voucher prefix | `PV` |

---

## QuickBooks Desktop 2018 Export Guide

### Tab-Delimited Export
1. Open QuickBooks Desktop 2018
2. Go to **Reports → Vendors & Payables → Vendor Balance Detail**
3. Set your date range
4. Click **Excel → Create New Worksheet** or **Export → Tab Delimited File**
5. Save as `.txt` or `.csv`
6. Upload to TRUSTIVA PRINTER → Import Data

### Expected Columns
The import engine auto-detects these QB columns:
- `Vendor Name` → Payee Name
- `Date` → Date
- `Amount` → Amount
- `Memo` → Description
- `Check Number` → Cheque No
- `Account` → Account Name

---

## User Roles

| Role | Permissions |
|------|-------------|
| `super_admin` | Full access + user management |
| `finance_manager` | Import, manage, print, templates, settings |
| `finance_user` | Import and print vouchers |
| `viewer` | Read-only access |

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/v1/auth/login` | Login |
| GET | `/api/v1/dashboard` | Dashboard stats |
| POST | `/api/v1/imports/upload` | Upload + preview file |
| POST | `/api/v1/imports/confirm` | Confirm + save import |
| GET | `/api/v1/payments` | List vouchers (filterable) |
| POST | `/api/v1/print/:id/pdf` | Generate PDF |
| GET | `/api/v1/templates` | List templates |
| GET | `/api/v1/health` | Health check |

---

## Printing

- **Browser Print:** Click "Print Voucher" → uses `react-to-print` with A5 print CSS
- **PDF Download:** Click "Download PDF" → server-side pdf-lib A5 generation
- **Bulk PDF:** Select multiple vouchers → "Download PDFs" → single multi-page PDF

**Paper:** A5 Portrait (148mm × 210mm)

---

## Default Admin Credentials

| Field | Value |
|-------|-------|
| Email | `admin@trustiva.lk` |
| Password | `Admin@123` |

> **Change these immediately in production.**

---

## Future: Cheque Printing (Phase 2)

The architecture is ready for cheque printing integration:
- Bank templates (Seylan, Sampath, Commercial, HNB, BOC)
- X/Y coordinate calibration tool
- Printer offset settings
- Test print mode

---

## Support

TRUSTIVA PRINTER v1.0.0 · Built for Sri Lankan Finance Teams  
Enterprise Edition · © 2024 Trustiva
