const path   = require('path');
const fs     = require('fs');
const pool   = require('../config/database');
const engine = require('../services/importEngine');
const { success, error } = require('../utils/apiResponse');

// A UUID matcher for the opaque staging token round-tripped by the frontend as
// `filePath`/`path`. Guards the confirm lookup against garbage / injection.
const TOKEN_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// How long a staged upload stays valid before confirm must re-upload.
const STAGING_TTL_MS = 60 * 60 * 1000; // 1 hour

async function uploadAndPreview(req, res, next) {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);

    const filePath = req.file.path;
    const ext      = path.extname(req.file.originalname).toLowerCase().slice(1);
    const format   = ext === 'xls' ? 'xlsx' : ext;

    const { headers, rows } = engine.parseFile(filePath);
    if (!headers.length) return error(res, 'Could not parse file or file is empty', 400);

    // Persist the parsed payload server-side so /imports/confirm never needs the
    // ephemeral file again. On Vercel, confirm may hit a different lambda whose
    // /tmp does not contain this upload — reading from disk there fails with
    // ENOENT. The returned token IS the `path` the frontend round-trips.
    const staged = await pool.query(
      `INSERT INTO import_staging (company_id, created_by, filename, format, payload)
       VALUES ($1, $2, $3, $4, $5) RETURNING token`,
      [
        req.user.company_id,
        req.user.id,
        req.file.originalname,
        format,
        JSON.stringify({ headers, rows }),
      ]
    );
    const token = staged.rows[0].token;

    // The on-disk copy is no longer needed once parsed rows are staged in the DB.
    // Best-effort cleanup; harmless if the file is already gone.
    try { fs.unlinkSync(filePath); } catch { /* ignore */ }

    const suggestedMapping = engine.autoMapColumns(headers);
    const previewRows      = rows.slice(0, 10).map(row =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
    );

    return success(res, {
      file: {
        // Opaque token the frontend passes back as `filePath` on confirm.
        // Named `path` to preserve the existing frontend API contract.
        path:         token,
        filename:     req.file.originalname,
        originalName: req.file.originalname,
        format,
        totalRows:    rows.length,
      },
      headers,
      previewRows,
      suggestedMapping,
    });
  } catch (err) {
    next(err);
  }
}

async function confirmImport(req, res, next) {
  const { filePath, filename, format, mapping, skipDuplicates = true, batchName, mappingTemplate } = req.body;

  if (!filePath || !mapping) return error(res, 'filePath and mapping are required', 400);

  // `filePath` is now the opaque staging token issued by /imports/upload, not a
  // filesystem path. Validate its shape before hitting the DB.
  const token = String(filePath);
  if (!TOKEN_RE.test(token)) return error(res, 'Invalid or expired upload session — please re-upload', 400);

  // mapping must be a flat object of { field: columnIndex (non-negative int) }.
  if (typeof mapping !== 'object' || Array.isArray(mapping)) return error(res, 'Invalid mapping', 400);
  if (!Object.values(mapping).every(v => Number.isInteger(Number(v)) && Number(v) >= 0))
    return error(res, 'Invalid mapping: column indices must be non-negative integers', 400);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Look the parsed rows up by token — scoped to the caller's company so one
    // tenant can't confirm another's staged upload. Expired rows are treated as
    // not found so the user gets a clear re-upload message, not a stale import.
    const staged = await client.query(
      `SELECT filename, format, payload, created_at
         FROM import_staging
        WHERE token = $1 AND company_id = $2`,
      [token, req.user.company_id]
    );

    const stagingRow = staged.rows[0];
    if (!stagingRow || (Date.now() - new Date(stagingRow.created_at).getTime()) > STAGING_TTL_MS) {
      await client.query('ROLLBACK');
      return error(res, 'Upload session expired — please re-upload', 400);
    }

    const payload = stagingRow.payload || {};
    const headers = Array.isArray(payload.headers) ? payload.headers : [];
    const rows    = Array.isArray(payload.rows)    ? payload.rows    : [];

    const mappedRows = engine.applyMapping(rows, headers, mapping);

    const result = await engine.saveImport({
      filename:        filename || stagingRow.filename,
      format:          format || stagingRow.format || 'csv',
      mappedRows,
      skipDuplicates,
      userId:          req.user.id,
      companyId:       req.user.company_id,
      mappingTemplate,
    }, client);

    // Consume the staging row so it can't be replayed and doesn't accumulate.
    await client.query('DELETE FROM import_staging WHERE token = $1', [token]);

    await client.query('COMMIT');

    return success(res, result, 201);
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
}

async function getImports(req, res, next) {
  try {
    const { page = 1, limit = 20 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const result = await pool.query(
      `SELECT i.*, u.name AS created_by_name
       FROM imports i
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.company_id = $1
       ORDER BY i.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.company_id, parseInt(limit), offset]
    );
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM imports WHERE company_id = $1',
      [req.user.company_id]
    );
    return success(res, { rows: result.rows, total: parseInt(countResult.rows[0].count), page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
}

async function getImportById(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT i.*, u.name AS created_by_name,
              (SELECT COUNT(*) FROM payment_vouchers WHERE import_id = i.id) AS voucher_count
       FROM imports i
       LEFT JOIN users u ON u.id = i.created_by
       WHERE i.id = $1 AND i.company_id = $2`,
      [req.params.id, req.user.company_id]
    );
    if (!result.rows[0]) return error(res, 'Import not found', 404);
    return success(res, result.rows[0]);
  } catch (err) {
    next(err);
  }
}

async function getMappingTemplates(req, res, next) {
  try {
    const result = await pool.query(
      `SELECT DISTINCT ON (mapping_template->>'name')
              mapping_template->>'name' AS name, mapping_template
       FROM imports
       WHERE company_id = $1 AND mapping_template IS NOT NULL
       ORDER BY mapping_template->>'name', created_at DESC`,
      [req.user.company_id]
    );
    return success(res, result.rows);
  } catch (err) {
    next(err);
  }
}

module.exports = { uploadAndPreview, confirmImport, getImports, getImportById, getMappingTemplates };
