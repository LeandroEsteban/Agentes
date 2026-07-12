const { query } = require('../../database/pool');

const listMine = (citizenId, filters) => query(
    `SELECT id, uuid, tracking_code, published_procedure_id, status, submitted_at, resolved_at
     FROM citizen_requests WHERE citizen_account_id=$1 AND ($2::text IS NULL OR status=$2)
     ORDER BY submitted_at DESC LIMIT $3 OFFSET $4`,
    [citizenId, filters.status || null, filters.size, (filters.page - 1) * filters.size]
);
const countMine = (citizenId, status) => query('SELECT count(*)::int AS total FROM citizen_requests WHERE citizen_account_id=$1 AND ($2::text IS NULL OR status=$2)', [citizenId, status || null]);
const findMine = (id, citizenId) => query(
    `SELECT cr.id, cr.uuid, cr.tracking_code, cr.published_procedure_id, pp.title AS procedure_title,
            cr.status, cr.submitted_at, cr.resolved_at, cr.resolution_summary
     FROM citizen_requests cr JOIN published_procedures pp ON pp.id=cr.published_procedure_id
     WHERE cr.id=$1 AND cr.citizen_account_id=$2`, [id, citizenId]
);
const procedure = (id) => query('SELECT pp.id, pt.owner_department_id FROM published_procedures pp JOIN procedure_types pt ON pt.id=pp.procedure_type_id WHERE pp.id=$1 AND pp.is_active=true', [id]);
const create = (db, trackingCode, citizenId, procedureRow) => db.query('INSERT INTO citizen_requests (tracking_code,citizen_account_id,published_procedure_id,assigned_department_id) VALUES ($1,$2,$3,$4) RETURNING id,uuid,tracking_code,status,submitted_at', [trackingCode, citizenId, procedureRow.id, procedureRow.owner_department_id]);
const attachments = (id) => query('SELECT id,file_name,mime_type,file_size,created_at FROM citizen_request_attachments WHERE citizen_request_id=$1 ORDER BY id', [id]);
const history = (id) => query(
    `SELECT event_name, payload_json, occurred_at FROM audit_events
     WHERE entity_type='citizen_request' AND entity_id=$1 ORDER BY occurred_at`, [id]
);
const cancel = (db, id, citizenId, reason) => db.query(
    `UPDATE citizen_requests SET status='cancelled', resolved_at=now(), resolution_summary=COALESCE($3, resolution_summary), updated_at=now()
     WHERE id=$1 AND citizen_account_id=$2 AND status IN ('submitted','in_review')
     RETURNING id,uuid,tracking_code,status,submitted_at,resolved_at,resolution_summary`, [id, citizenId, reason || null]
);
module.exports = { listMine, countMine, findMine, procedure, create, attachments, history, cancel };
