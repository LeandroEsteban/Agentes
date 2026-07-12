const { query } = require('../../database/pool');

const create = (db, data) => db.query('INSERT INTO oirs_cases (tracking_code,category,subject,citizen_account_id,anonymous_name,anonymous_email,anonymous_phone,contact_consent) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,uuid,tracking_code,category,subject,status,submitted_at', [data.trackingCode, data.category, data.subject, data.citizenId || null, data.name || null, data.email || null, data.phone || null, data.consent || false]);
const setAnonymousTrackingHash = (db, caseId, hash) => db.query('UPDATE oirs_cases SET anonymous_tracking_hash=$2 WHERE id=$1', [caseId, hash]);
const createMessage = (db, caseId, author, direction, body, anonymousTrackingHash = null) => db.query('INSERT INTO oirs_messages (oirs_case_id,author_user_id,author_citizen_id,anonymous_tracking_hash,message_direction,body) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id,oirs_case_id,message_direction,body,sent_at', [caseId, author && author.actorType === 'internal' ? author.id : null, author && author.actorType === 'citizen' ? author.id : null, anonymousTrackingHash, direction, body]);
const findCitizenCase = (id, citizenId) => query('SELECT id,uuid,tracking_code,category,subject,status,citizen_account_id,assigned_department_id,assigned_user_id,submitted_at,closed_at FROM oirs_cases WHERE id=$1 AND citizen_account_id=$2', [id, citizenId]);
const findPublicCase = (uuid) => query('SELECT id,uuid,tracking_code,category,subject,status,citizen_account_id,anonymous_tracking_hash,assigned_department_id,submitted_at,closed_at FROM oirs_cases WHERE uuid=$1', [uuid]);
const findInternalCase = (id) => query('SELECT * FROM oirs_cases WHERE id=$1', [id]);
const list = (filters) => query(`SELECT id,uuid,tracking_code,category,subject,status,citizen_account_id,anonymous_name,anonymous_email,anonymous_phone,assigned_department_id,assigned_user_id,submitted_at,closed_at FROM oirs_cases WHERE ($1::text IS NULL OR status=$1) ORDER BY submitted_at DESC LIMIT $2 OFFSET $3`, [filters.status || null, filters.size, (filters.page - 1) * filters.size]);
const count = (status) => query('SELECT count(*)::int AS total FROM oirs_cases WHERE ($1::text IS NULL OR status=$1)', [status || null]);
const history = (caseId) => query('SELECT id,message_direction,body,sent_at,read_at FROM oirs_messages WHERE oirs_case_id=$1 ORDER BY sent_at,id', [caseId]);
const reply = (db, caseId, actor, body, close) => db.query(`WITH message AS (
    INSERT INTO oirs_messages (oirs_case_id,author_user_id,message_direction,body) VALUES ($1,$2,'from_officer',$3) RETURNING id,oirs_case_id,message_direction,body,sent_at
) UPDATE oirs_cases SET status=CASE WHEN $4 THEN 'closed' ELSE 'responded' END,closed_at=CASE WHEN $4 THEN now() ELSE NULL END,updated_at=now()
WHERE id=$1 AND status NOT IN ('closed','cancelled') RETURNING (SELECT row_to_json(message) FROM message) AS message,id,uuid,tracking_code,status,closed_at`, [caseId, actor.id, body, close]);
const updateStatus = (db, caseId, value) => db.query(`UPDATE oirs_cases SET status=$2,closed_at=CASE WHEN $2='closed' THEN now() ELSE NULL END,updated_at=now()
WHERE id=$1 AND status NOT IN ('closed','cancelled') AND NOT ($2='closed' AND status NOT IN ('responded','in_process')) RETURNING id,uuid,tracking_code,status,closed_at`, [caseId, value]);
const route = (db, caseId, value) => db.query(`UPDATE oirs_cases SET assigned_department_id=$2,assigned_user_id=$3,status=CASE WHEN status='submitted' THEN 'in_review' ELSE status END,updated_at=now()
WHERE id=$1 AND status NOT IN ('closed','cancelled') RETURNING id,uuid,tracking_code,status,assigned_department_id,assigned_user_id`, [caseId, value.assigned_department_id || null, value.assigned_user_id || null]);

module.exports = { create, setAnonymousTrackingHash, createMessage, findCitizenCase, findPublicCase, findInternalCase, list, count, history, reply, updateStatus, route };
