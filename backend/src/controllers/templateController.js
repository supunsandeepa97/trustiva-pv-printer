const pool = require('../config/database');
const { success, error } = require('../utils/apiResponse');

async function getTemplates(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM voucher_templates WHERE company_id = $1 ORDER BY is_default DESC, name ASC',
      [req.user.company_id]
    );
    return success(res, result.rows);
  } catch (err) { next(err); }
}

async function getTemplateById(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT * FROM voucher_templates WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows[0]) return error(res, 'Template not found', 404);
    return success(res, result.rows[0]);
  } catch (err) { next(err); }
}

async function createTemplate(req, res, next) {
  try {
    const { name, config, paper_size = 'A5_portrait' } = req.body;
    const result = await pool.query(
      `INSERT INTO voucher_templates (company_id, name, config, paper_size)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.company_id, name, JSON.stringify(config), paper_size]
    );
    return success(res, result.rows[0], 201);
  } catch (err) {
    if (err.code === '23505') return error(res, 'Template name already exists', 409);
    next(err);
  }
}

async function updateTemplate(req, res, next) {
  try {
    const { name, config, paper_size } = req.body;
    const result = await pool.query(
      `UPDATE voucher_templates SET
         name = COALESCE($1, name),
         config = COALESCE($2, config),
         paper_size = COALESCE($3, paper_size),
         updated_at = NOW()
       WHERE id = $4 AND company_id = $5 RETURNING *`,
      [name, config ? JSON.stringify(config) : null, paper_size, req.params.id, req.user.company_id]
    );
    if (!result.rows[0]) return error(res, 'Template not found', 404);
    return success(res, result.rows[0]);
  } catch (err) { next(err); }
}

async function deleteTemplate(req, res, next) {
  try {
    const result = await pool.query(
      'SELECT is_default FROM voucher_templates WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows[0]) return error(res, 'Template not found', 404);
    if (result.rows[0].is_default) return error(res, 'Cannot delete the default template', 400);
    await pool.query('DELETE FROM voucher_templates WHERE id = $1 AND company_id = $2', [req.params.id, req.user.company_id]);
    return success(res, { message: 'Template deleted' });
  } catch (err) { next(err); }
}

async function setDefault(req, res, next) {
  try {
    await pool.query(
      'UPDATE voucher_templates SET is_default = FALSE WHERE company_id = $1',
      [req.user.company_id]
    );
    const result = await pool.query(
      'UPDATE voucher_templates SET is_default = TRUE WHERE id = $1 AND company_id = $2 RETURNING *',
      [req.params.id, req.user.company_id]
    );
    if (!result.rows[0]) return error(res, 'Template not found', 404);
    return success(res, result.rows[0]);
  } catch (err) { next(err); }
}

async function duplicateTemplate(req, res, next) {
  try {
    const src = await pool.query(
      'SELECT * FROM voucher_templates WHERE id = $1 AND company_id = $2',
      [req.params.id, req.user.company_id]
    );
    if (!src.rows[0]) return error(res, 'Template not found', 404);
    const t = src.rows[0];
    const result = await pool.query(
      `INSERT INTO voucher_templates (company_id, name, config, paper_size, is_default)
       VALUES ($1, $2, $3, $4, FALSE) RETURNING *`,
      [req.user.company_id, `${t.name} (Copy)`, JSON.stringify(t.config), t.paper_size]
    );
    return success(res, result.rows[0], 201);
  } catch (err) { next(err); }
}

module.exports = { getTemplates, getTemplateById, createTemplate, updateTemplate, deleteTemplate, setDefault, duplicateTemplate };
