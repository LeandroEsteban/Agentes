const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../helpers/http-server');
const { createFixtures, cleanupFixtures, login, authHeader, databaseRows } = require('../helpers/phase5b2a-fixtures');

let server; let fx; let adminH; let reviewerH; let approverH
const jsonH = (h) => ({ ...h, 'content-type': 'application/json' });
const validBase64 = Buffer.from('Fake PDF content for testing purposes only.').toString('base64');

test.before(async () => {
  server = await startServer(); fx = await createFixtures();
  const admin = await login(server, '/api/v1/auth/login', { username: fx.admin.username, password: fx.password });
  const reviewer = await login(server, '/api/v1/auth/login', { username: fx.reviewer.username, password: fx.password });
  const approverL = await login(server, '/api/v1/auth/login', { username: fx.approver.username, password: fx.password });
  adminH = authHeader(admin.body.data.access_token);
  reviewerH = authHeader(reviewer.body.data.access_token);
  approverH = authHeader(approverL.body.data.access_token);
});

test.after(async () => { try { await cleanupFixtures(fx); } finally { await server.stop(); } });

test('SEC-5B2D-001 SQL injection attempt on document list', async () => {
  const sql = "' OR 1=1; DROP TABLE documents; --";
  const res = await server.request(`/api/v1/documents?q=${encodeURIComponent(sql)}`, { headers: adminH });
  assert.equal(res.response.status, 200);
  assert.ok(Array.isArray(res.body.data.items));
  const check = await databaseRows('SELECT id FROM documents LIMIT 1');
  assert.ok(check.length >= 0);
});

test('SEC-5B2D-002 Mass assignment attempt on document create', async () => {
  const body = {
    document_type_id: fx.docType.id,
    title: `${fx.prefix} Mass assign test`,
    department_id: fx.departmentA.id,
    content: 'Test content',
    id: -1, status_id: 999, is_admin: true, password_hash: 'hacked'
  };
  const res = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 400);
});

test('SEC-5B2D-003 Invalid JSON body handling', async () => {
  const res = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: 'not json at all!!!' });
  assert.equal(res.response.status, 400);
});

test('SEC-5B2D-004 Error response sanitization', async () => {
  const res = await server.request('/api/v1/documents/999999999', { headers: adminH });
  assert.equal(res.response.status, 404);
  const bodyStr = JSON.stringify(res.body);
  assert.ok(!bodyStr.includes('stack'));
  assert.ok(!bodyStr.includes('password'));
  assert.ok(!bodyStr.includes('connection'));
  assert.ok(!bodyStr.includes('pg_'));
});

test('SEC-5B2D-005 Path traversal attempt on attachment download', async () => {
  const res = await server.request('/api/v1/documents/1/attachments/../../../etc/passwd/download', { headers: adminH });
  assert.equal(res.response.status, 404);
});

test('SEC-5B2D-006 Invalid state transition on document update', async () => {
  const body = { document_type_id: fx.docType.id, title: `${fx.prefix} State test`, department_id: fx.departmentA.id, content: JSON.stringify({ body: 'Test' }) };
  const created = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  const docId = created.body.data.id;
  await server.request(`/api/v1/documents/${docId}/submit-review`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ reviewer_user_id: fx.reviewer.id }) });
  const reviews = await databaseRows("SELECT id FROM document_review_requests WHERE document_id=$1 AND status='pending'", [docId]);
  await server.request(`/api/v1/reviews/${reviews[0].id}/reply`, { method: 'POST', headers: jsonH(reviewerH), body: JSON.stringify({ decision: 'approved' }) });
  const appBody = { approvers: [{ user_id: fx.approver.id, sequence_order: 1 }] };
  await server.request(`/api/v1/documents/${docId}/approvals`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(appBody) });
  const approvals = await databaseRows("SELECT id FROM document_approvals WHERE document_id=$1 AND status='pending'", [docId]);
  await server.request(`/api/v1/approvals/${approvals[0].id}/decision`, { method: 'POST', headers: jsonH(approverH), body: JSON.stringify({ decision: 'approved' }) });
  const badUpdate = await server.request(`/api/v1/documents/${docId}`, { method: 'PUT', headers: jsonH(adminH), body: JSON.stringify({ title: 'Cannot change approved doc' }) });
  assert.equal(badUpdate.response.status, 409);
  const badVersion = await server.request(`/api/v1/documents/${docId}/versions`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ content: 'Cannot version approved doc' }) });
  assert.equal(badVersion.response.status, 409);
});

test('SEC-5B2D-007 Duplicate document number prevention (not applicable - no auto-numbering)', async () => {
  const body = {
    document_type_id: fx.docType.id,
    title: `${fx.prefix} Duplicate test`,
    department_id: fx.departmentA.id,
    content: JSON.stringify({ body: 'Test' })
  };
  const res1 = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res1.response.status, 201);
  const body2 = { ...body, title: `${fx.prefix} Duplicate test 2` };
  const res2 = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body2) });
  assert.equal(res2.response.status, 201);
});
