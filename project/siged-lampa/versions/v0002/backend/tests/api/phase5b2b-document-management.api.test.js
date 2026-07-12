const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../helpers/http-server');
const { createFixtures, cleanupFixtures, login, authHeader, databaseRows } = require('../helpers/phase5b2a-fixtures');

let server; let fx; let adminH; let officerH; let reviewerH; let approverH; let signerH; let citizenH;
const jsonH = (h) => ({ ...h, 'content-type': 'application/json' });
const validBase64 = Buffer.from('Fake PDF content for testing purposes only.').toString('base64');

test.before(async () => {
  server = await startServer(); fx = await createFixtures();
  const admin = await login(server, '/api/v1/auth/login', { username: fx.admin.username, password: fx.password });
  const officer = await login(server, '/api/v1/auth/login', { username: fx.officer.username, password: fx.password });
  const reviewer = await login(server, '/api/v1/auth/login', { username: fx.reviewer.username, password: fx.password });
  const approverL = await login(server, '/api/v1/auth/login', { username: fx.approver.username, password: fx.password });
  const signerL = await login(server, '/api/v1/auth/login', { username: fx.signer.username, password: fx.password });
  const citizen = await login(server, '/api/v1/auth/citizen-login', { email: fx.citizenA.email, password: fx.password });
  adminH = authHeader(admin.body.data.access_token);
  officerH = authHeader(officer.body.data.access_token);
  reviewerH = authHeader(reviewer.body.data.access_token);
  approverH = authHeader(approverL.body.data.access_token);
  signerH = authHeader(signerL.body.data.access_token);
  citizenH = authHeader(citizen.body.data.access_token);
});

test.after(async () => { try { await cleanupFixtures(fx); } finally { await server.stop(); } });

test('API-015 list documents respects filters, pagination and RBAC', async () => {
  const list = await server.request('/api/v1/documents?size=5', { headers: adminH });
  assert.equal(list.response.status, 200);
  assert.ok(Array.isArray(list.body.data.items));
  assert.equal(typeof list.body.data.total, 'number');
  assert.ok(list.body.data.items.some((d) => d.id === fx.docA.id));
  assert.equal(Object.hasOwn(list.body.data.items[0], 'password_hash'), false);
  assert.equal(Object.hasOwn(list.body.data.items[0], 'content_snapshot'), false);
  const denied = await server.request('/api/v1/documents', { headers: {} });
  assert.equal(denied.response.status, 401);
  const forbidden = await server.request('/api/v1/documents', { headers: citizenH });
  assert.equal(forbidden.response.status, 403);
});

test('API-016 create document persists with transaction and records audit', async () => {
  const body = {
    document_type_id: fx.docType.id,
    title: `${fx.prefix} Created Doc`,
    department_id: fx.departmentA.id,
    content: JSON.stringify({ body: 'Initial content' }),
    summary: 'Summary text',
    confidentiality_level: 'internal',
    origin_type: 'internal',
  };
  const res = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 201);
  assert.ok(res.body.data.id);
  assert.ok(res.body.data.version);
  assert.equal(res.body.data.version.version_number, 1);
  const rows = await databaseRows('SELECT id FROM documents WHERE id=$1', [res.body.data.id]);
  assert.equal(rows.length, 1);
  const audit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_id=$1 AND event_name='document_created'", [res.body.data.id]);
  assert.equal(audit.length, 1);
});

test('API-016 create document validates required fields', async () => {
  const missingType = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ title: 'No type', department_id: fx.departmentA.id }) });
  assert.equal(missingType.response.status, 400);
  const badType = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ document_type_id: 999999999, title: 'Bad type', department_id: fx.departmentA.id, content: 'x' }) });
  assert.equal(badType.response.status, 400);
  const badDept = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ document_type_id: fx.docType.id, title: 'Bad dept', department_id: 999999999, content: 'x' }) });
  assert.equal(badDept.response.status, 400);
});

test('API-017 document detail returns full joined payload', async () => {
  const res = await server.request(`/api/v1/documents/${fx.docA.id}`, { headers: adminH });
  assert.equal(res.response.status, 200);
  assert.ok(res.body.data.document);
  assert.equal(res.body.data.document.id, fx.docA.id);
  assert.ok(Array.isArray(res.body.data.versions));
  assert.ok(Array.isArray(res.body.data.attachments));
  assert.ok(Array.isArray(res.body.data.comments));
  assert.ok(Array.isArray(res.body.data.reviews));
  assert.ok(Array.isArray(res.body.data.approvals));
  assert.ok(Array.isArray(res.body.data.signatures));
  assert.ok(Array.isArray(res.body.data.history));
  assert.equal(res.body.data.versions.length, 1);
  assert.equal(res.body.data.versions[0].version_number, 1);
});

test('API-017 document detail rejects missing and unauthorized', async () => {
  const missing = await server.request('/api/v1/documents/999999999', { headers: adminH });
  assert.equal(missing.response.status, 404);
  const noAuth = await server.request(`/api/v1/documents/${fx.docA.id}`, { headers: {} });
  assert.equal(noAuth.response.status, 401);
  const forbidden = await server.request(`/api/v1/documents/${fx.docA.id}`, { headers: citizenH });
  assert.equal(forbidden.response.status, 403);
});

test('API-018 update document edits fields and records changes in audit', async () => {
  const res = await server.request(`/api/v1/documents/${fx.docA.id}`, { method: 'PUT', headers: jsonH(adminH), body: JSON.stringify({ title: `${fx.prefix} Updated Title`, summary: 'Updated summary' }) });
  assert.equal(res.response.status, 200);
  assert.equal(res.body.data.title, `${fx.prefix} Updated Title`);
  const audit = await databaseRows("SELECT event_name,payload_json FROM audit_events WHERE entity_id=$1 AND event_name='document_updated'", [fx.docA.id]);
  assert.equal(audit.length, 1);
  assert.ok(audit[0].payload_json.changes);
  assert.ok(audit[0].payload_json.changes.title);
});

test('API-018 update document enforces state machine', async () => {
  const signedDoc = await createSignedDoc();
  const blocked = await server.request(`/api/v1/documents/${signedDoc.id}`, { method: 'PUT', headers: jsonH(adminH), body: JSON.stringify({ title: 'Should fail' }) });
  assert.equal(blocked.response.status, 409);
});

test('API-020 create version increments version number sequentially', async () => {
  const orig = fx.docA.id;
  const v1 = await server.request(`/api/v1/documents/${orig}/versions`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ content: JSON.stringify({ body: 'Version 2 content' }), change_summary: 'Added section 2', is_major: true }) });
  assert.equal(v1.response.status, 201);
  assert.equal(v1.body.data.version_number, 2);
  assert.equal(v1.body.data.previous_version_id, fx.versionA.id);
  assert.equal(v1.body.data.is_major, true);
  const list = await server.request(`/api/v1/documents/${orig}/versions`, { headers: adminH });
  assert.equal(list.response.status, 200);
  assert.equal(list.body.data.length, 2);
});

test('API-020 version creation validates state machine', async () => {
  const signedDoc = await createSignedDoc();
  const blocked = await server.request(`/api/v1/documents/${signedDoc.id}/versions`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ content: 'New version' }) });
  assert.equal(blocked.response.status, 409);
});

test('API-019 add attachment stores file and records checksum', async () => {
  const body = { file_name: 'test.txt', mime_type: 'text/plain', content_base64: validBase64, description: 'Test attachment' };
  const res = await server.request(`/api/v1/documents/${fx.docA.id}/attachments`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 201);
  assert.ok(res.body.data.id);
  assert.equal(res.body.data.file_name, 'test.txt');
  assert.ok(res.body.data.checksum_sha256);
  const list = await server.request(`/api/v1/documents/${fx.docA.id}/attachments`, { headers: adminH });
  assert.equal(list.response.status, 200);
  assert.ok(list.body.data.some((a) => a.id === res.body.data.id));
});

test('API-019 attachment rejects invalid MIME and oversized', async () => {
  const invalidMime = { file_name: 'bad.exe', mime_type: 'application/x-msdownload', content_base64: validBase64 };
  const res = await server.request(`/api/v1/documents/${fx.docA.id}/attachments`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(invalidMime) });
  assert.equal(res.response.status, 400);
  const invalidB64 = { file_name: 'bad.txt', mime_type: 'text/plain', content_base64: '!!!invalid!!!' };
  const res2 = await server.request(`/api/v1/documents/${fx.docA.id}/attachments`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(invalidB64) });
  assert.equal(res2.response.status, 400);
});

test('API-021 submit review transitions document to in_revision', async () => {
  const doc = await createDraftDoc();
  const body = { reviewer_user_id: fx.reviewer.id, instructions: 'Please review this document' };
  const res = await server.request(`/api/v1/documents/${doc.id}/submit-review`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 201);
  assert.ok(res.body.data.id);
  assert.equal(res.body.data.reviewer_user_id, fx.reviewer.id);
  const status = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [doc.id]);
  assert.equal(status[0].code, 'in_revision');
  const list = await server.request(`/api/v1/documents/${doc.id}/reviews`, { headers: adminH });
  assert.equal(list.response.status, 200);
  assert.ok(list.body.data.some((r) => r.id === res.body.data.id));
});

test('API-021 submit review enforces business rules', async () => {
  const doc = await createDraftDoc();
  const selfReview = { reviewer_user_id: fx.admin.id, instructions: 'Self review' };
  const res = await server.request(`/api/v1/documents/${doc.id}/submit-review`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(selfReview) });
  assert.equal(res.response.status, 400);
  const badReviewer = { reviewer_user_id: 999999999, instructions: 'Bad reviewer' };
  const res2 = await server.request(`/api/v1/documents/${doc.id}/submit-review`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(badReviewer) });
  assert.equal(res2.response.status, 400);
  const signedDoc = await createSignedDoc();
  const res3 = await server.request(`/api/v1/documents/${signedDoc.id}/submit-review`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ reviewer_user_id: fx.reviewer.id }) });
  assert.equal(res3.response.status, 409);
});

test('API-022 reply to review records decision and returns to draft', async () => {
  const doc = await createDraftDoc();
  await server.request(`/api/v1/documents/${doc.id}/submit-review`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ reviewer_user_id: fx.reviewer.id }) });
  const reviews = await databaseRows("SELECT id FROM document_review_requests WHERE document_id=$1 AND reviewer_user_id=$2 AND status='pending'", [doc.id, fx.reviewer.id]);
  assert.ok(reviews.length > 0);
  const replyBody = { decision: 'approved', observations: 'Looks good' };
  const res = await server.request(`/api/v1/reviews/${reviews[0].id}/reply`, { method: 'POST', headers: jsonH(reviewerH), body: JSON.stringify(replyBody) });
  assert.equal(res.response.status, 201);
  assert.equal(res.body.data.decision, 'approved');
  const status = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [doc.id]);
  assert.equal(status[0].code, 'draft');
});

test('API-022 reply enforces reviewer identity via service check', async () => {
  const doc = await createDraftDoc();
  const rvBody = { reviewer_user_id: fx.reviewer.id };
  await server.request(`/api/v1/documents/${doc.id}/submit-review`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(rvBody) });
  const reviews = await databaseRows("SELECT id FROM document_review_requests WHERE document_id=$1 AND status='pending'", [doc.id]);
  const wrongUser = await server.request(`/api/v1/reviews/${reviews[0].id}/reply`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ decision: 'approved' }) });
  assert.equal(wrongUser.response.status, 403);
});

test('API-023 approval request creates sequential approvers and transitions to in_approval', async () => {
  const doc = await createDraftDoc();
  const appBody = { approvers: [
    { user_id: fx.approver.id, sequence_order: 1 },
    { user_id: fx.signer.id, sequence_order: 2 },
  ]};
  const res = await server.request(`/api/v1/documents/${doc.id}/approvals`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(appBody) });
  assert.equal(res.response.status, 201);
  assert.ok(Array.isArray(res.body.data));
  assert.equal(res.body.data.length, 2);
  const status = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [doc.id]);
  assert.equal(status[0].code, 'in_approval');
});

test('API-023 approval request enforces validations', async () => {
  const doc = await createDraftDoc();
  const dupes = { approvers: [
    { user_id: fx.approver.id, sequence_order: 1 },
    { user_id: fx.approver.id, sequence_order: 2 },
  ]};
  const res = await server.request(`/api/v1/documents/${doc.id}/approvals`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(dupes) });
  assert.equal(res.response.status, 400);
  const gaps = { approvers: [
    { user_id: fx.approver.id, sequence_order: 1 },
    { user_id: fx.signer.id, sequence_order: 3 },
  ]};
  const res2 = await server.request(`/api/v1/documents/${doc.id}/approvals`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(gaps) });
  assert.equal(res2.response.status, 400);
});

test('API-023 approval decision accepts and transitions to approved', async () => {
  const doc = await createDraftDoc();
  const appBody = { approvers: [{ user_id: fx.approver.id, sequence_order: 1 }] };
  await server.request(`/api/v1/documents/${doc.id}/approvals`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(appBody) });
  const approvals = await databaseRows("SELECT id FROM document_approvals WHERE document_id=$1 AND status='pending' ORDER BY sequence_order", [doc.id]);
  assert.equal(approvals.length, 1);
  const decide = await server.request(`/api/v1/approvals/${approvals[0].id}/decision`, { method: 'POST', headers: jsonH(approverH), body: JSON.stringify({ decision: 'approved', decision_note: 'Approved' }) });
  assert.equal(decide.response.status, 200);
  assert.equal(decide.body.data.status, 'approved');
  const status = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [doc.id]);
  assert.equal(status[0].code, 'approved');
});

test('API-023 approval rejection returns document to draft', async () => {
  const doc = await createDraftDoc();
  const appBody = { approvers: [{ user_id: fx.approver.id, sequence_order: 1 }] };
  await server.request(`/api/v1/documents/${doc.id}/approvals`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(appBody) });
  const approvals = await databaseRows("SELECT id FROM document_approvals WHERE document_id=$1 AND status='pending'", [doc.id]);
  const reject = await server.request(`/api/v1/approvals/${approvals[0].id}/decision`, { method: 'POST', headers: jsonH(approverH), body: JSON.stringify({ decision: 'rejected', decision_note: 'Needs changes' }) });
  assert.equal(reject.response.status, 200);
  assert.equal(reject.body.data.status, 'rejected');
  const status = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [doc.id]);
  assert.equal(status[0].code, 'draft');
});

test('API-024 sign document creates simulated signature with hash and integration_mode', async () => {
  const doc = await createApprovedDoc();
  const body = { signature_profile_id: fx.sigProfile.id, signature_mode: 'simulated' };
  const res = await server.request(`/api/v1/documents/${doc.id}/signatures`, { method: 'POST', headers: jsonH(signerH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 201);
  assert.ok(res.body.data.id);
  assert.equal(res.body.data.signer_user_id, fx.signer.id);
  assert.equal(res.body.data.signature_mode, 'simulated');
  assert.equal(res.body.data.signature_status, 'valid');
  assert.ok(res.body.data.signature_hash);
  assert.equal(res.body.data.signature_hash.length, 64);
  const status = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [doc.id]);
  assert.equal(status[0].code, 'signed');
  const list = await server.request(`/api/v1/documents/${doc.id}/signatures`, { headers: signerH });
  assert.equal(list.response.status, 200);
  assert.ok(list.body.data.length >= 1);
});

test('API-024 sign enforces preconditions', async () => {
  const doc = await createDraftDoc();
  const body = { signature_profile_id: fx.sigProfile.id, signature_mode: 'simulated' };
  const notApproved = await server.request(`/api/v1/documents/${doc.id}/signatures`, { method: 'POST', headers: jsonH(signerH), body: JSON.stringify(body) });
  assert.equal(notApproved.response.status, 409);
  const approvedDoc = await createApprovedDoc();
  const wrongProfile = { signature_profile_id: 999999999, signature_mode: 'simulated' };
  const res2 = await server.request(`/api/v1/documents/${approvedDoc.id}/signatures`, { method: 'POST', headers: jsonH(signerH), body: JSON.stringify(wrongProfile) });
  assert.equal(res2.response.status, 400);
});

test('comments add and list preserve context', async () => {
  const body = { body: `${fx.prefix} Test comment`, comment_type: 'general' };
  const res = await server.request(`/api/v1/documents/${fx.docA.id}/comments`, { method: 'POST', headers: jsonH(reviewerH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 201);
  assert.equal(res.body.data.body, `${fx.prefix} Test comment`);
  assert.equal(res.body.data.comment_type, 'general');
  const list = await server.request(`/api/v1/documents/${fx.docA.id}/comments`, { headers: adminH });
  assert.equal(list.response.status, 200);
  assert.ok(list.body.data.some((c) => c.id === res.body.data.id));
  assert.ok(list.body.data[0].author_name);
});

test('history endpoint returns audit trail', async () => {
  const res = await server.request(`/api/v1/documents/${fx.docA.id}/history`, { headers: adminH });
  assert.equal(res.response.status, 200);
  assert.ok(Array.isArray(res.body.data));
  assert.ok(res.body.data.length > 0);
  assert.ok(res.body.data.some((e) => e.event_name === 'document_updated'));
});

test('document full lifecycle transition flow', async () => {
  const body = {
    document_type_id: fx.docType.id,
    title: `${fx.prefix} Lifecycle Doc`,
    department_id: fx.departmentA.id,
    content: JSON.stringify({ body: 'Lifecycle content' }),
  };
  const created = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const docId = created.body.data.id;
  let st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'draft');
  const rvBody = { reviewer_user_id: fx.reviewer.id };
  const submitted = await server.request(`/api/v1/documents/${docId}/submit-review`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(rvBody) });
  assert.equal(submitted.response.status, 201);
  st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'in_revision');
  const reviews = await databaseRows("SELECT id FROM document_review_requests WHERE document_id=$1 AND status='pending'", [docId]);
  const replied = await server.request(`/api/v1/reviews/${reviews[0].id}/reply`, { method: 'POST', headers: jsonH(reviewerH), body: JSON.stringify({ decision: 'approved' }) });
  assert.equal(replied.response.status, 201);
  st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'draft');
  const appBody = { approvers: [{ user_id: fx.approver.id, sequence_order: 1 }] };
  const approved = await server.request(`/api/v1/documents/${docId}/approvals`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(appBody) });
  assert.equal(approved.response.status, 201);
  st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'in_approval');
  const approvals = await databaseRows("SELECT id FROM document_approvals WHERE document_id=$1 AND status='pending'", [docId]);
  const decided = await server.request(`/api/v1/approvals/${approvals[0].id}/decision`, { method: 'POST', headers: jsonH(approverH), body: JSON.stringify({ decision: 'approved' }) });
  assert.equal(decided.response.status, 200);
  st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'approved');
  const sigBody = { signature_profile_id: fx.sigProfile.id, signature_mode: 'simulated' };
  const signed = await server.request(`/api/v1/documents/${docId}/signatures`, { method: 'POST', headers: jsonH(signerH), body: JSON.stringify(sigBody) });
  assert.equal(signed.response.status, 201);
  st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'signed');
});

test('RBAC: documents.create required for POST', async () => {
  const body = { document_type_id: fx.docType.id, title: 'RBAC test', department_id: fx.departmentA.id, content: 'x' };
  const officerPost = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(officerH), body: JSON.stringify(body) });
  assert.equal(officerPost.response.status, 403);
  const reviewerPost = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(reviewerH), body: JSON.stringify(body) });
  assert.equal(reviewerPost.response.status, 403);
});

test('RBAC: documents.edit required for PUT', async () => {
  const officerPut = await server.request(`/api/v1/documents/${fx.docA.id}`, { method: 'PUT', headers: jsonH(officerH), body: JSON.stringify({ title: 'x' }) });
  assert.equal(officerPut.response.status, 403);
});

test('RBAC: documents.review required for review reply', async () => {
  const doc = await createDraftDoc();
  await server.request(`/api/v1/documents/${doc.id}/submit-review`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ reviewer_user_id: fx.reviewer.id }) });
  const reviews = await databaseRows("SELECT id FROM document_review_requests WHERE document_id=$1 AND status='pending'", [doc.id]);
  const officerReply = await server.request(`/api/v1/reviews/${reviews[0].id}/reply`, { method: 'POST', headers: jsonH(officerH), body: JSON.stringify({ decision: 'approved' }) });
  assert.equal(officerReply.response.status, 403);
});

test('RBAC: documents.sign required for signature', async () => {
  const doc = await createApprovedDoc();
  const body = { signature_profile_id: fx.sigProfile.id, signature_mode: 'simulated' };
  const officerSign = await server.request(`/api/v1/documents/${doc.id}/signatures`, { method: 'POST', headers: jsonH(officerH), body: JSON.stringify(body) });
  assert.equal(officerSign.response.status, 403);
});

test('audit events recorded for every document operation', async () => {
  const names = await databaseRows('SELECT DISTINCT event_name FROM audit_events WHERE event_name LIKE $1', ['document_%']);
  const eventNames = names.map((r) => r.event_name);
  assert.ok(eventNames.includes('document_created'));
  assert.ok(eventNames.includes('document_updated'));
  assert.ok(eventNames.includes('document_version_created'));
  assert.ok(eventNames.includes('document_attachment_added'));
  assert.ok(eventNames.includes('document_comment_added'));
  assert.ok(eventNames.includes('document_review_requested'));
  assert.ok(eventNames.includes('document_review_replied'));
  assert.ok(eventNames.includes('document_approval_requested'));
  assert.ok(eventNames.includes('document_approval_decided'));
  assert.ok(eventNames.includes('document_signed_simulated'));
});

async function createDraftDoc() {
  const body = {
    document_type_id: fx.docType.id,
    title: `${fx.prefix} Draft Doc ${Date.now()}`,
    department_id: fx.departmentA.id,
    content: JSON.stringify({ body: 'Temporary' }),
  };
  const res = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  return res.body.data;
}

async function createApprovedDoc() {
  const doc = await createDraftDoc();
  const appBody = { approvers: [{ user_id: fx.signer.id, sequence_order: 1 }] };
  await server.request(`/api/v1/documents/${doc.id}/approvals`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(appBody) });
  const approvals = await databaseRows("SELECT id FROM document_approvals WHERE document_id=$1 AND status='pending'", [doc.id]);
  await server.request(`/api/v1/approvals/${approvals[0].id}/decision`, { method: 'POST', headers: jsonH(signerH), body: JSON.stringify({ decision: 'approved' }) });
  return doc;
}

async function createSignedDoc() {
  const doc = await createApprovedDoc();
  const sigBody = { signature_profile_id: fx.sigProfile.id, signature_mode: 'simulated' };
  await server.request(`/api/v1/documents/${doc.id}/signatures`, { method: 'POST', headers: jsonH(signerH), body: JSON.stringify(sigBody) });
  return doc;
}
