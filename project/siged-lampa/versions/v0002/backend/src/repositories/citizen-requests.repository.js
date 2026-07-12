const { query } = require('../database/pool');

async function findAll(filters = {}) {
    let sql = `SELECT cr.id, cr.uuid, cr.tracking_code, cr.citizen_account_id,
              cr.published_procedure_id, cr.assigned_department_id, cr.expedient_id,
              cr.status, cr.submitted_at, cr.resolved_at, cr.resolution_summary,
              cr.created_at, cr.updated_at
              FROM citizen_requests cr`;
    const params = [];
    const conditions = [];

    if (filters.citizen_account_id) {
        conditions.push(`cr.citizen_account_id = $${params.length + 1}`);
        params.push(filters.citizen_account_id);
    }
    if (filters.status) {
        conditions.push(`cr.status = $${params.length + 1}`);
        params.push(filters.status);
    }

    if (conditions.length > 0) {
        sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY cr.submitted_at DESC';

    const result = await query(sql, params);
    return result.rows;
}

async function findById(id) {
    const result = await query(
        `SELECT cr.* FROM citizen_requests cr WHERE cr.id = $1`,
        [id]
    );
    return result.rows[0] || null;
}

async function findByTrackingCode(code) {
    const result = await query(
        `SELECT cr.* FROM citizen_requests cr WHERE cr.tracking_code = $1`,
        [code]
    );
    return result.rows[0] || null;
}

async function create(data) {
    const result = await query(
        `INSERT INTO citizen_requests (tracking_code, citizen_account_id, published_procedure_id,
         assigned_department_id, status)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, uuid, tracking_code, status, submitted_at, created_at`,
        [data.tracking_code, data.citizen_account_id, data.published_procedure_id,
         data.assigned_department_id, data.status || 'submitted']
    );
    return result.rows[0];
}

async function getAttachments(requestId) {
    const result = await query(
        `SELECT id, file_name, mime_type, storage_path, file_size, checksum_sha256, created_at
         FROM citizen_request_attachments
         WHERE citizen_request_id = $1`,
        [requestId]
    );
    return result.rows;
}

module.exports = { findAll, findById, findByTrackingCode, create, getAttachments };
