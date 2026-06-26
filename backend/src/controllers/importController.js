const path   = require('path');
const pool   = require('../config/database');
const engine = require('../services/importEngine');
const { success, error } = require('../utils/apiResponse');

const uploadDir = path.resolve(process.env.UPLOAD_DIR || './uploads');

// Resolve a client-supplied upload reference to a real file INSIDE the upload dir.
// Strips any directory components and verifies the result stays within uploadDir,
// preventing path-traversal / arbitrary file reads (e.g. "../.env", "/etc/passwd").
function resolveUploadPath(clientPath) {
  const safe = path.resolve(uploadDir, path.basename(String(clientPath)));
  if (safe !== uploadDir && !safe.startsWith(uploadDir + path.sep)) return null;
  return safe;
}

async function uploadAndPreview(req, res, next) {
  try {
    if (!req.file) return error(res, 'No file uploaded', 400);

    const filePath = req.file.path;
    const ext      = path.extname(req.file.originalname).toLowerCase().slice(1);
    const format   = ext === 'xls' ? 'xlsx' : ext;

    const { headers, rows } = engine.parseFile(filePath);
    if (!headers.length) return error(res, 'Could not parse file or file is empty', 400);

    const suggestedMapping = engine.autoMapColumns(headers);
    const previewRows      = rows.slice(0, 10).map(row =>
      Object.fromEntries(headers.map((h, i) => [h, row[i] ?? '']))
    );

    return success(res, {
      file: {
        path:         filePath,
        filename:     req.file.filename,
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

  // Never trust the client-supplied path — confine it to the upload directory.
  const safePath = resolveUploadPath(filePath);
  if (!safePath) return error(res, 'Invalid file path', 400);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { headers, rows } = engine.parseFile(safePath);
    const mappedRows        = engine.applyMapping(rows, headers, mapping);

    const result = await engine.saveImport({
      filePath:        safePath,
      filename:        filename || path.basename(safePath),
      format:          format || 'csv',
      mappedRows,
      skipDuplicates,
      userId:          req.user.id,
      companyId:       req.user.company_id,
      mappingTemplate,
    }, client);

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
