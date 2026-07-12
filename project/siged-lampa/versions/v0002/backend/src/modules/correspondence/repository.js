const { query } = require('../../database/pool');

const run = (client, sql, params) => (client || { query }).query(sql, params);

async function list(filters) {
    const params = [];
    const conditions = ['c.deleted_at IS NULL'];
    if (filters.direction) { params.push(filters.direction); conditions.push(`c.direction = $${params.length}`); }
    if (filters.status) { params.push(filters.status); conditions.push(`c.status = $${params.length}`); }
    if (filters.tracking_code) { params.push(`%${filters.tracking_code}%`); conditions.push(`c.tracking_code ILIKE $${params.length}`); }
    const where = conditions.join(' AND ');
    const count = await query(`SELECT count(*)::int AS total FROM correspondence c WHERE ${where}`, params);
    params.push(filters.size, (filters.page - 1) * filters.size);
    const rows = await query(
        `SELECT c.id, c.uuid, c.tracking_code, c.direction, c.subject, c.received_at, c.sent_at, c.priority, c.status, c.origin_entity_id, c.document_id, c.created_by, c.created_at, c.updated_at
         FROM correspondence c WHERE ${where} ORDER BY c.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
        params
    );
    return { data: rows.rows, total: count.rows[0].total };
}

async function find(id, client) { return (await run(client, 'SELECT * FROM correspondence WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0] || null; }
async function create(data, client) {
    return (await run(client,
        `INSERT INTO correspondence (tracking_code, direction, subject, origin_entity_id, received_at, sent_at, priority, document_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
        [data.tracking_code, data.direction, data.subject, data.origin_entity_id || null, data.received_at || null, data.sent_at || null, data.priority, data.document_id || null, data.created_by]
    )).rows[0];
}
async function update(id, data, client) {
    const values = [id];
    const fields = [];
    for (const field of ['subject', 'origin_entity_id', 'received_at', 'sent_at', 'priority', 'status']) {
        if (Object.prototype.hasOwnProperty.call(data, field)) { values.push(data[field]); fields.push(`${field} = $${values.length}`); }
    }
    fields.push('updated_at = now()');
    return (await run(client, `UPDATE correspondence SET ${fields.join(', ')} WHERE id = $1 AND deleted_at IS NULL RETURNING *`, values)).rows[0] || null;
}
async function close(id, data, client) { return (await run(client, `UPDATE correspondence SET status = $2, updated_at = now() WHERE id = $1 AND deleted_at IS NULL AND status NOT IN ('closed', 'cancelled') RETURNING *`, [id, data.status])).rows[0] || null; }
async function addRecipient(data, client) {
    return (await run(client,
        `INSERT INTO correspondence_recipients (correspondence_id, recipient_type, external_entity_id, department_id, delivery_channel)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.correspondence_id, data.recipient_type, data.external_entity_id || null, data.department_id || null, data.delivery_channel]
    )).rows[0];
}
async function addRoute(data, client) {
    return (await run(client,
        `INSERT INTO correspondence_routes (correspondence_id, from_department_id, to_department_id, assigned_user_id, instructions)
         VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [data.correspondence_id, data.from_department_id, data.to_department_id, data.assigned_user_id || null, data.instructions || null]
    )).rows[0];
}
async function markRouted(id, client) { return run(client, "UPDATE correspondence SET status = 'derived', updated_at = now() WHERE id = $1", [id]); }
async function linkResponse(id, documentId, client) { return (await run(client, "UPDATE correspondence SET document_id = $2, status = 'responded', updated_at = now() WHERE id = $1 AND deleted_at IS NULL RETURNING *", [id, documentId])).rows[0] || null; }
async function details(id) {
    const item = await find(id);
    if (!item) return null;
    const [recipients, routes] = await Promise.all([
        query('SELECT * FROM correspondence_recipients WHERE correspondence_id = $1 ORDER BY id', [id]),
        query('SELECT * FROM correspondence_routes WHERE correspondence_id = $1 ORDER BY routed_at DESC, id DESC', [id]),
    ]);
    return { ...item, recipients: recipients.rows, routes: routes.rows };
}
async function history(id) {
    return (await query(
        `SELECT cr.id, cr.from_department_id, cr.to_department_id, cr.assigned_user_id, cr.route_status, cr.routed_at, cr.accepted_at, cr.closed_at, cr.instructions,
                fd.name AS from_department_name, td.name AS to_department_name, u.full_name AS assigned_user_name
         FROM correspondence_routes cr JOIN departments fd ON fd.id = cr.from_department_id JOIN departments td ON td.id = cr.to_department_id
         LEFT JOIN users u ON u.id = cr.assigned_user_id WHERE cr.correspondence_id = $1 ORDER BY cr.routed_at DESC, cr.id DESC`, [id]
    )).rows;
}
async function originDepartment(id, client) {
    return (await run(client,
        `SELECT COALESCE((SELECT to_department_id FROM correspondence_routes WHERE correspondence_id = c.id ORDER BY routed_at DESC, id DESC LIMIT 1), u.department_id) AS department_id
         FROM correspondence c JOIN users u ON u.id = c.created_by WHERE c.id = $1`, [id]
    )).rows[0]?.department_id || null;
}
async function externalEntityExists(id, client) { return Boolean((await run(client, 'SELECT 1 FROM external_entities WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0]); }
async function departmentExists(id, client) { return Boolean((await run(client, 'SELECT 1 FROM departments WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0]); }
async function userExists(id, client) { return Boolean((await run(client, "SELECT 1 FROM users WHERE id = $1 AND status = 'active' AND deleted_at IS NULL", [id])).rows[0]); }
async function responseDocumentExists(id, client) { return Boolean((await run(client, `SELECT 1 FROM documents d JOIN document_statuses ds ON ds.id = d.status_id WHERE d.id = $1 AND d.deleted_at IS NULL AND ds.code IN ('signed', 'issued', 'emitted')`, [id])).rows[0]); }
async function createNotification(userId, correspondenceId, client) {
    if (!userId) return null;
    return run(client, 'INSERT INTO notifications (title, body, link_url, user_id) VALUES ($1, $2, $3, $4)', ['Correspondencia derivada', 'Tiene una correspondencia asignada para revision.', `/api/v1/correspondence/${correspondenceId}`, userId]);
}

module.exports = { list, find, create, update, close, addRecipient, addRoute, markRouted, linkResponse, details, history, originDepartment, externalEntityExists, departmentExists, userExists, responseDocumentExists, createNotification };
