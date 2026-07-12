const { query } = require('../../database/pool');

const run = (client, text, params) => (client || { query }).query(text, params);
const listDocumentTypes = async () => (await query('SELECT id, code, name, description, retention_days, requires_signature, is_active, created_at, updated_at FROM document_types WHERE is_active = true ORDER BY name')).rows;
const createDocumentType = async (data, client) => (await run(client, `INSERT INTO document_types (code, name, description, retention_days, requires_signature, is_active) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, code, name, description, retention_days, requires_signature, is_active, created_at`, [data.code, data.name, data.description || null, data.retention_days, data.requires_signature, data.is_active])).rows[0];
const listProcedureTypes = async () => (await query('SELECT id, code, name, description, owner_department_id, requires_login, estimated_days, is_active FROM procedure_types ORDER BY name')).rows;
const departmentExists = async (id, client) => (await run(client, 'SELECT id FROM departments WHERE id = $1 AND deleted_at IS NULL AND status = $2', [id, 'active'])).rows[0] || null;
const createProcedureType = async (data, client) => (await run(client, `INSERT INTO procedure_types (code, name, description, owner_department_id, requires_login, estimated_days, is_active) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, code, name, description, owner_department_id, requires_login, estimated_days, is_active`, [data.code, data.name, data.description || null, data.owner_department_id, data.requires_login, data.estimated_days, data.is_active])).rows[0];
const updateProcedureType = async (id, data, client) => (await run(client, `UPDATE procedure_types SET code = $2, name = $3, description = $4, owner_department_id = $5, requires_login = $6, estimated_days = $7, is_active = $8, updated_at = now() WHERE id = $1 RETURNING id, code, name, description, owner_department_id, requires_login, estimated_days, is_active`, [id, data.code, data.name, data.description || null, data.owner_department_id, data.requires_login, data.estimated_days, data.is_active])).rows[0] || null;

async function listPublished(filters) {
    const params = [];
    const conditions = ['pp.is_active = true', 'pt.is_active = true'];
    if (filters.q) { params.push(`%${filters.q}%`); conditions.push(`(pp.title ILIKE $${params.length} OR pp.slug ILIKE $${params.length} OR pt.name ILIKE $${params.length})`); }
    if (filters.department_id) { params.push(filters.department_id); conditions.push(`pt.owner_department_id = $${params.length}`); }
    const where = conditions.join(' AND ');
    const count = await query(`SELECT count(*)::int AS total FROM published_procedures pp JOIN procedure_types pt ON pt.id = pp.procedure_type_id WHERE ${where}`, params);
    params.push(filters.size, (filters.page - 1) * filters.size);
    const rows = await query(`SELECT pp.id, pp.slug, pp.title, pp.instructions, pp.requirements_html, pp.published_at, pt.id AS procedure_type_id, pt.code AS procedure_type_code, pt.name AS procedure_type_name, d.id AS department_id, d.code AS department_code, d.name AS department_name FROM published_procedures pp JOIN procedure_types pt ON pt.id = pp.procedure_type_id JOIN departments d ON d.id = pt.owner_department_id WHERE ${where} ORDER BY pp.title ASC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { rows: rows.rows, total: count.rows[0].total };
}

const getPublished = async (id) => (await query(`SELECT pp.id, pp.slug, pp.title, pp.instructions, pp.requirements_html, pp.published_at, pt.id AS procedure_type_id, pt.code AS procedure_type_code, pt.name AS procedure_type_name, d.id AS department_id, d.code AS department_code, d.name AS department_name FROM published_procedures pp JOIN procedure_types pt ON pt.id = pp.procedure_type_id JOIN departments d ON d.id = pt.owner_department_id WHERE pp.id = $1 AND pp.is_active = true AND pt.is_active = true AND d.deleted_at IS NULL`, [id])).rows[0] || null;

module.exports = { listDocumentTypes, createDocumentType, listProcedureTypes, departmentExists, createProcedureType, updateProcedureType, listPublished, getPublished };
