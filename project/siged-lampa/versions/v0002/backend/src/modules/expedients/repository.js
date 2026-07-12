const { query } = require('../../database/pool');

const run = (client, sql, params) => (client || { query }).query(sql, params);

async function list(filters) {
    const params = [];
    const conditions = ['e.deleted_at IS NULL'];
    if (filters.q) { params.push(`%${filters.q}%`); conditions.push(`(e.code ILIKE $${params.length} OR e.subject ILIKE $${params.length})`); }
    if (filters.status) { params.push(filters.status); conditions.push(`e.status = $${params.length}`); }
    if (filters.department_id) { params.push(filters.department_id); conditions.push(`e.department_id = $${params.length}`); }
    const where = conditions.join(' AND ');
    const count = await query(`SELECT count(*)::int AS total FROM expedients e WHERE ${where}`, params);
    params.push(filters.size, (filters.page - 1) * filters.size);
    const rows = await query(
        `SELECT e.id, e.uuid, e.code, e.subject, e.description, e.status, e.department_id, e.owner_user_id, e.opened_at, e.closed_at, e.created_at, e.updated_at
         FROM expedients e WHERE ${where} ORDER BY e.opened_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );
    return { data: rows.rows, total: count.rows[0].total };
}

async function find(id, client) {
    return (await run(client, `SELECT e.* FROM expedients e WHERE e.id = $1 AND e.deleted_at IS NULL`, [id])).rows[0] || null;
}

async function details(id) {
    const [expedient, documents, events] = await Promise.all([find(id), getDocuments(id), getEvents(id)]);
    return expedient && { ...expedient, documents, events };
}

async function create(data, client) {
    return (await run(client,
        `INSERT INTO expedients (code, subject, description, status, department_id, owner_user_id)
         VALUES ($1, $2, $3, 'open', $4, $5) RETURNING *`,
        [data.code, data.subject, data.description || null, data.department_id, data.owner_user_id]
    )).rows[0];
}

async function update(id, data, client) {
    const values = [id];
    const fields = [];
    for (const field of ['subject', 'description', 'department_id', 'owner_user_id', 'status']) {
        if (Object.prototype.hasOwnProperty.call(data, field)) { values.push(data[field]); fields.push(`${field} = $${values.length}`); }
    }
    fields.push('updated_at = now()');
    return (await run(client, `UPDATE expedients SET ${fields.join(', ')} WHERE id = $1 AND deleted_at IS NULL RETURNING *`, values)).rows[0] || null;
}

async function close(id, status, client) {
    return (await run(client, `UPDATE expedients SET status = $2, closed_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL AND closed_at IS NULL RETURNING *`, [id, status])).rows[0] || null;
}

async function getDocuments(expedientId) {
    return (await query(
        `SELECT ed.id, ed.document_id, ed.relation_type, ed.is_primary, ed.linked_by, ed.linked_at, d.title, d.document_number, d.folio
         FROM expedient_documents ed JOIN documents d ON d.id = ed.document_id AND d.deleted_at IS NULL
         WHERE ed.expedient_id = $1 ORDER BY ed.linked_at DESC`, [expedientId]
    )).rows;
}

async function addDocument(data, client) {
    return (await run(client,
        `INSERT INTO expedient_documents (expedient_id, document_id, relation_type, linked_by, is_primary)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.expedient_id, data.document_id, data.relation_type, data.linked_by, data.is_primary]
    )).rows[0];
}

async function getEvents(expedientId) {
    return (await query(
        `SELECT ee.id, ee.event_type, ee.event_label, ee.payload_json, ee.occurred_at, ee.actor_user_id, ee.document_id, u.full_name AS actor_name
         FROM expedient_events ee LEFT JOIN users u ON u.id = ee.actor_user_id
         WHERE ee.expedient_id = $1 ORDER BY ee.occurred_at DESC, ee.id DESC`, [expedientId]
    )).rows;
}

async function addEvent(data, client) {
    return (await run(client,
        `INSERT INTO expedient_events (expedient_id, actor_user_id, document_id, event_type, event_label, payload_json)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [data.expedient_id, data.actor_user_id, data.document_id || null, data.event_type, data.event_label || null, JSON.stringify(data.payload || {})]
    )).rows[0];
}

async function departmentExists(id, client) { return Boolean((await run(client, 'SELECT 1 FROM departments WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0]); }
async function userExists(id, client) { return Boolean((await run(client, "SELECT 1 FROM users WHERE id = $1 AND status = 'active' AND deleted_at IS NULL", [id])).rows[0]); }
async function documentExists(id, client) { return Boolean((await run(client, 'SELECT 1 FROM documents WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0]); }

module.exports = { list, find, details, create, update, close, getDocuments, addDocument, getEvents, addEvent, departmentExists, userExists, documentExists };
