function executor(client) { return client; }

async function list(client, filters, actor) {
    const params = [actor.id];
    const conditions = ['d.deleted_at IS NULL', "(d.confidentiality_level <> 'secret' OR d.owner_user_id = $1)"];
    if (filters.q) { params.push(`%${filters.q}%`); conditions.push(`(d.title ILIKE $${params.length} OR d.folio ILIKE $${params.length} OR d.document_number ILIKE $${params.length})`); }
    if (filters.status) { params.push(filters.status); conditions.push(`s.code = $${params.length}`); }
    if (filters.type_id) { params.push(filters.type_id); conditions.push(`d.document_type_id = $${params.length}`); }
    if (filters.owner_id) { params.push(filters.owner_id); conditions.push(`d.owner_user_id = $${params.length}`); }
    if (filters.expedient_id) { params.push(filters.expedient_id); conditions.push(`EXISTS (SELECT 1 FROM expedient_documents ed WHERE ed.document_id = d.id AND ed.expedient_id = $${params.length})`); }
    const where = conditions.join(' AND ');
    const count = await executor(client).query(`SELECT count(*)::int AS total FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE ${where}`, params);
    params.push(filters.size, (filters.page - 1) * filters.size);
    const rows = await executor(client).query(`SELECT d.id,d.uuid,d.document_type_id,dt.code AS document_type_code,d.status_id,s.code AS status,d.owner_user_id,d.department_id,d.current_version_id,d.folio,d.document_number,d.title,d.summary,d.confidentiality_level,d.origin_type,d.due_date,d.created_at,d.updated_at FROM documents d JOIN document_statuses s ON s.id=d.status_id JOIN document_types dt ON dt.id=d.document_type_id WHERE ${where} ORDER BY d.created_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { total: count.rows[0].total, rows: rows.rows };
}

async function findDocument(client, documentId, lock = false) {
    const result = await executor(client).query(`SELECT d.*,s.code AS status,dt.code AS document_type_code FROM documents d JOIN document_statuses s ON s.id=d.status_id JOIN document_types dt ON dt.id=d.document_type_id WHERE d.id=$1 AND d.deleted_at IS NULL${lock ? ' FOR UPDATE' : ''}`, [documentId]);
    return result.rows[0] || null;
}
const typeExists = async (client, id) => (await executor(client).query('SELECT id FROM document_types WHERE id=$1', [id])).rows[0];
const departmentExists = async (client, id) => (await executor(client).query("SELECT id FROM departments WHERE id=$1 AND status='active' AND deleted_at IS NULL", [id])).rows[0];
const userExists = async (client, id) => (await executor(client).query("SELECT id FROM users WHERE id=$1 AND status='active' AND deleted_at IS NULL", [id])).rows[0];
const createDocument = async (client, data, actorId) => (await executor(client).query(`INSERT INTO documents (document_type_id,status_id,owner_user_id,department_id,title,summary,confidentiality_level,origin_type,due_date) SELECT $1,s.id,$2,$3,$4,$5,$6,$7,$8 FROM document_statuses s WHERE s.code='draft' RETURNING id,uuid,title,status_id,created_at`, [data.document_type_id, actorId, data.department_id, data.title, data.summary || null, data.confidentiality_level || 'public', data.origin_type || 'internal', data.due_date || null])).rows[0];
const createVersion = async (client, documentId, previousVersionId, versionNumber, data, actorId) => (await executor(client).query('INSERT INTO document_versions (document_id,version_number,previous_version_id,content_snapshot,change_summary,is_major,author_user_id) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id,version_number,previous_version_id,content_snapshot,change_summary,is_major,author_user_id,generated_at', [documentId, versionNumber, previousVersionId, data.content, data.change_summary || null, data.is_major || false, actorId])).rows[0];
const setCurrentVersion = (client, documentId, versionId) => executor(client).query('UPDATE documents SET current_version_id=$2,updated_at=now() WHERE id=$1', [documentId, versionId]);
async function updateDocument(client, documentId, data) { const fields = Object.keys(data); const params = fields.map((key) => data[key]); const assignments = fields.map((key, index) => `${key}=$${index + 1}`); params.push(documentId); return (await executor(client).query(`UPDATE documents SET ${assignments.join(',')},updated_at=now() WHERE id=$${params.length} RETURNING *`, params)).rows[0]; }
const createAttachment = async (client, data) => (await executor(client).query('INSERT INTO document_attachments (document_id,document_version_id,file_name,mime_type,storage_path,file_size,checksum_sha256,uploaded_by) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id,document_id,document_version_id,file_name,mime_type,file_size,checksum_sha256,created_at', [data.documentId, data.versionId, data.fileName, data.mimeType, data.storagePath, data.fileSize, data.checksum, data.actorId])).rows[0];
const createComment = async (client, data) => (await executor(client).query('INSERT INTO document_comments (document_id,author_user_id,version_id,comment_type,body) VALUES ($1,$2,$3,$4,$5) RETURNING *', [data.documentId, data.actorId, data.versionId || null, data.commentType || 'general', data.body])).rows[0];
async function detail(client, documentId) {
    const document = await findDocument(client, documentId);
    if (!document) return null;
    const db = executor(client);
    const [versions, attachments, comments, reviews, approvals, signatures, history] = await Promise.all([
        db.query('SELECT id,version_number,previous_version_id,change_summary,is_major,author_user_id,generated_at,created_at FROM document_versions WHERE document_id=$1 ORDER BY version_number DESC', [documentId]),
        db.query('SELECT id,document_version_id,file_name,mime_type,file_size,checksum_sha256,uploaded_by,created_at FROM document_attachments WHERE document_id=$1 ORDER BY created_at DESC', [documentId]),
        db.query('SELECT c.*,u.full_name AS author_name FROM document_comments c JOIN users u ON u.id=c.author_user_id WHERE c.document_id=$1 ORDER BY c.created_at DESC', [documentId]),
        db.query('SELECT r.*,u.full_name AS reviewer_name FROM document_review_requests r JOIN users u ON u.id=r.reviewer_user_id WHERE r.document_id=$1 ORDER BY r.created_at DESC', [documentId]),
        db.query('SELECT a.*,u.full_name AS approver_name FROM document_approvals a JOIN users u ON u.id=a.approver_user_id WHERE a.document_id=$1 ORDER BY a.sequence_order', [documentId]),
        db.query('SELECT s.*,u.full_name AS signer_name FROM document_signatures s JOIN users u ON u.id=s.signer_user_id WHERE s.document_id=$1 ORDER BY s.signed_at DESC', [documentId]),
        db.query("SELECT event_name,entity_type,entity_id,actor_user_id,payload_json,occurred_at FROM audit_events WHERE entity_type='document' AND entity_id=$1 ORDER BY occurred_at DESC", [documentId])
    ]);
    return { document, versions: versions.rows, attachments: attachments.rows, comments: comments.rows, reviews: reviews.rows, approvals: approvals.rows, signatures: signatures.rows, history: history.rows };
}
const listVersions = async (client, documentId) => (await executor(client).query('SELECT id,version_number,previous_version_id,change_summary,is_major,author_user_id,generated_at,created_at FROM document_versions WHERE document_id=$1 ORDER BY version_number DESC', [documentId])).rows;
const listAttachments = async (client, documentId) => (await executor(client).query('SELECT id,document_version_id,file_name,mime_type,file_size,checksum_sha256,uploaded_by,created_at FROM document_attachments WHERE document_id=$1 ORDER BY created_at DESC', [documentId])).rows;
const findAttachment = async (client, documentId, attachmentId) => (await executor(client).query('SELECT * FROM document_attachments WHERE id=$1 AND document_id=$2', [attachmentId, documentId])).rows[0] || null;
const listComments = async (client, documentId) => (await executor(client).query('SELECT c.*,u.full_name AS author_name FROM document_comments c JOIN users u ON u.id=c.author_user_id WHERE c.document_id=$1 ORDER BY c.created_at DESC', [documentId])).rows;
const history = async (client, documentId) => (await executor(client).query("SELECT event_name,entity_type,entity_id,actor_user_id,payload_json,occurred_at FROM audit_events WHERE entity_type='document' AND entity_id=$1 ORDER BY occurred_at DESC", [documentId])).rows;
module.exports = { list, findDocument, typeExists, departmentExists, userExists, createDocument, createVersion, setCurrentVersion, updateDocument, createAttachment, createComment, detail, listVersions, listAttachments, findAttachment, listComments, history };
