const { query } = require('../database/pool');

async function findAll(filters = {}) {
    let sql = `SELECT d.id, d.uuid, d.document_type_id, d.status_id, d.owner_user_id,
              d.department_id, d.current_version_id, d.folio, d.document_number,
              d.title, d.summary, d.confidentiality_level, d.origin_type,
              d.due_date, d.published_at, d.created_at, d.updated_at
              FROM documents d WHERE d.deleted_at IS NULL`;
    const params = [];
    const conditions = [];

    if (filters.status_id) {
        conditions.push(`d.status_id = $${params.length + 1}`);
        params.push(filters.status_id);
    }
    if (filters.document_type_id) {
        conditions.push(`d.document_type_id = $${params.length + 1}`);
        params.push(filters.document_type_id);
    }
    if (filters.owner_user_id) {
        conditions.push(`d.owner_user_id = $${params.length + 1}`);
        params.push(filters.owner_user_id);
    }
    if (filters.department_id) {
        conditions.push(`d.department_id = $${params.length + 1}`);
        params.push(filters.department_id);
    }

    if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY d.created_at DESC';

    const result = await query(sql, params);
    return result.rows;
}

async function findById(id) {
    const result = await query(
        `SELECT d.* FROM documents d WHERE d.id = $1 AND d.deleted_at IS NULL`,
        [id]
    );
    return result.rows[0] || null;
}

async function create(data) {
    const result = await query(
        `INSERT INTO documents (document_type_id, status_id, owner_user_id, department_id,
         folio, document_number, title, summary, confidentiality_level, origin_type, due_date)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING id, uuid, title, document_number, created_at`,
        [data.document_type_id, data.status_id, data.owner_user_id, data.department_id,
         data.folio, data.document_number, data.title, data.summary,
         data.confidentiality_level || 'public', data.origin_type || 'internal', data.due_date]
    );
    return result.rows[0];
}

async function getVersions(documentId) {
    const result = await query(
        `SELECT dv.id, dv.version_number, dv.previous_version_id, dv.change_summary,
                dv.is_major, dv.author_user_id, dv.generated_at
         FROM document_versions dv
         WHERE dv.document_id = $1
         ORDER BY dv.version_number DESC`,
        [documentId]
    );
    return result.rows;
}

async function createVersion(data) {
    const result = await query(
        `INSERT INTO document_versions (document_id, version_number, previous_version_id,
         content_snapshot, change_summary, is_major, author_user_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, version_number, generated_at`,
        [data.document_id, data.version_number, data.previous_version_id,
         data.content_snapshot, data.change_summary, data.is_major, data.author_user_id]
    );
    return result.rows[0];
}

module.exports = { findAll, findById, create, getVersions, createVersion };
