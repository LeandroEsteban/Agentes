const { query } = require('../database/pool');

async function findAll(filters = {}) {
    let sql = `SELECT e.id, e.uuid, e.code, e.subject, e.description, e.status,
              e.department_id, e.owner_user_id, e.opened_at, e.closed_at,
              e.created_at, e.updated_at
              FROM expedients e WHERE e.deleted_at IS NULL`;
    const params = [];
    const conditions = [];

    if (filters.status) {
        conditions.push(`e.status = $${params.length + 1}`);
        params.push(filters.status);
    }
    if (filters.department_id) {
        conditions.push(`e.department_id = $${params.length + 1}`);
        params.push(filters.department_id);
    }
    if (filters.owner_user_id) {
        conditions.push(`e.owner_user_id = $${params.length + 1}`);
        params.push(filters.owner_user_id);
    }

    if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY e.opened_at DESC';

    const result = await query(sql, params);
    return result.rows;
}

async function findById(id) {
    const result = await query(
        `SELECT e.* FROM expedients e WHERE e.id = $1 AND e.deleted_at IS NULL`,
        [id]
    );
    return result.rows[0] || null;
}

async function create(data) {
    const result = await query(
        `INSERT INTO expedients (code, subject, description, status, department_id, owner_user_id)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, uuid, code, subject, status, opened_at, created_at`,
        [data.code, data.subject, data.description, data.status || 'open',
         data.department_id, data.owner_user_id]
    );
    return result.rows[0];
}

async function getDocuments(expedientId) {
    const result = await query(
        `SELECT ed.id, ed.document_id, ed.relation_type, ed.is_primary, ed.linked_at,
                d.title, d.document_number, d.folio
         FROM expedient_documents ed
         JOIN documents d ON d.id = ed.document_id
         WHERE ed.expedient_id = $1
         ORDER BY ed.linked_at DESC`,
        [expedientId]
    );
    return result.rows;
}

async function addDocument(data) {
    const result = await query(
        `INSERT INTO expedient_documents (expedient_id, document_id, relation_type, linked_by, is_primary)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, linked_at`,
        [data.expedient_id, data.document_id, data.relation_type || 'related',
         data.linked_by, data.is_primary || false]
    );
    return result.rows[0];
}

async function getEvents(expedientId) {
    const result = await query(
        `SELECT id, event_type, event_label, payload_json, occurred_at
         FROM expedient_events
         WHERE expedient_id = $1
         ORDER BY occurred_at DESC`,
        [expedientId]
    );
    return result.rows;
}

module.exports = { findAll, findById, create, getDocuments, addDocument, getEvents };
