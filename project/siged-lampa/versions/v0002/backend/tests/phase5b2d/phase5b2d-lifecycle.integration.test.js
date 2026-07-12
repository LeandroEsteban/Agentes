const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../helpers/http-server');
const { createFixtures, cleanupFixtures, login, authHeader, databaseRows } = require('../helpers/phase5b2a-fixtures');

let server; let fx; let adminH; let reviewerH; let signerH;
const jsonH = (h) => ({ ...h, 'content-type': 'application/json' });

test.before(async () => {
  server = await startServer(); fx = await createFixtures();
  const admin = await login(server, '/api/v1/auth/login', { username: fx.admin.username, password: fx.password });
  const reviewer = await login(server, '/api/v1/auth/login', { username: fx.reviewer.username, password: fx.password });
  const signerL = await login(server, '/api/v1/auth/login', { username: fx.signer.username, password: fx.password });
  adminH = authHeader(admin.body.data.access_token);
  reviewerH = authHeader(reviewer.body.data.access_token);
  signerH = authHeader(signerL.body.data.access_token);
});

test.after(async () => { try { await cleanupFixtures(fx); } finally { await server.stop(); } });

test('INT-5B2D-001 Full document lifecycle: create -> version -> attachment -> review -> approve -> sign -> audit', async () => {
  const docBody = {
    document_type_id: fx.docType.id,
    title: `${fx.prefix} INT Lifecycle Document`,
    department_id: fx.departmentA.id,
    content: JSON.stringify({ body: 'Initial version content for lifecycle test' })
  };
  const created = await server.request('/api/v1/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(docBody) });
  assert.equal(created.response.status, 201);
  assert.ok(created.body.data.id);
  const docId = created.body.data.id;
  const pgDoc = await databaseRows('SELECT id, uuid, title FROM documents WHERE id=$1', [docId]);
  assert.equal(pgDoc.length, 1);
  assert.equal(pgDoc[0].title, docBody.title);

  const auditCreate = await databaseRows("SELECT event_name, actor_user_id FROM audit_events WHERE entity_id=$1 AND event_name='document_created'", [docId]);
  assert.equal(auditCreate.length, 1);
  assert.equal(auditCreate[0].actor_user_id, fx.admin.id);

  const vBody1 = { content: JSON.stringify({ body: 'Version 2 content added' }), change_summary: 'Expanded document body', is_major: true };
  const v1 = await server.request(`/api/v1/documents/${docId}/versions`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(vBody1) });
  assert.equal(v1.response.status, 201);
  assert.equal(v1.body.data.version_number, 2);
  assert.equal(v1.body.data.previous_version_id, created.body.data.version.id);

  const auditVersion = await databaseRows("SELECT event_name, payload_json FROM audit_events WHERE entity_id=$1 AND event_name='document_version_created'", [docId]);
  assert.equal(auditVersion.length, 1);
  assert.equal(auditVersion[0].payload_json.version_number, 2);

  const attBody = { file_name: 'lifecycle.txt', mime_type: 'text/plain', content_base64: Buffer.from('Lifecycle attachment').toString('base64') };
  const att = await server.request(`/api/v1/documents/${docId}/attachments`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(attBody) });
  assert.equal(att.response.status, 201);
  assert.ok(att.body.data.checksum_sha256);

  const rvBody = { reviewer_user_id: fx.reviewer.id, instructions: 'Please review this lifecycle document' };
  const review = await server.request(`/api/v1/documents/${docId}/submit-review`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(rvBody) });
  assert.equal(review.response.status, 201);
  let st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'in_revision');

  const reviews = await databaseRows("SELECT id FROM document_review_requests WHERE document_id=$1 AND status='pending'", [docId]);
  const replyBody = { decision: 'approved', observations: 'Lifecycle document approved for next stage' };
  const reply = await server.request(`/api/v1/reviews/${reviews[0].id}/reply`, { method: 'POST', headers: jsonH(reviewerH), body: JSON.stringify(replyBody) });
  assert.equal(reply.response.status, 201);
  st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'draft');

  const appBody = { approvers: [{ user_id: fx.signer.id, sequence_order: 1 }] };
  const app = await server.request(`/api/v1/documents/${docId}/approvals`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(appBody) });
  assert.equal(app.response.status, 201);
  st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'in_approval');

  const approvals = await databaseRows("SELECT id FROM document_approvals WHERE document_id=$1 AND status='pending'", [docId]);
  const decideBody = { decision: 'approved', decision_note: 'Approved for signing' };
  const decide = await server.request(`/api/v1/approvals/${approvals[0].id}/decision`, { method: 'POST', headers: jsonH(signerH), body: JSON.stringify(decideBody) });
  assert.equal(decide.response.status, 200);
  st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'approved');

  const sigBody = { signature_profile_id: fx.sigProfile.id, signature_mode: 'simulated' };
  const sig = await server.request(`/api/v1/documents/${docId}/signatures`, { method: 'POST', headers: jsonH(signerH), body: JSON.stringify(sigBody) });
  assert.equal(sig.response.status, 201);
  assert.ok(sig.body.data.signature_hash);
  assert.equal(sig.body.data.signature_hash.length, 64);
  st = await databaseRows('SELECT s.code FROM documents d JOIN document_statuses s ON s.id=d.status_id WHERE d.id=$1', [docId]);
  assert.equal(st[0].code, 'signed');

  const finalDetail = await server.request(`/api/v1/documents/${docId}`, { headers: adminH });
  assert.equal(finalDetail.response.status, 200);
  assert.equal(finalDetail.body.data.document.status, 'signed');
  assert.equal(finalDetail.body.data.versions.length, 2);
  assert.equal(finalDetail.body.data.attachments.length, 1);
  assert.equal(finalDetail.body.data.approvals.length, 1);
  assert.equal(finalDetail.body.data.signatures.length, 1);
  assert.ok(finalDetail.body.data.history.length >= 5);

  const allAudit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_type='document' AND entity_id=$1 ORDER BY occurred_at", [docId]);
  const eventNames = allAudit.map((r) => r.event_name);
  assert.ok(eventNames.includes('document_created'));
  assert.ok(eventNames.includes('document_version_created'));
  assert.ok(eventNames.includes('document_attachment_added'));
  assert.ok(eventNames.includes('document_review_requested'));
  assert.ok(eventNames.includes('document_review_replied'));
  assert.ok(eventNames.includes('document_approval_requested'));
  assert.ok(eventNames.includes('document_approval_decided'));
  assert.ok(eventNames.includes('document_signed_simulated'));

  const timeline = eventNames.join(' -> ');
  assert.ok(timeline.includes('document_created'));
  assert.ok(timeline.includes('document_review_requested'));
  assert.ok(timeline.includes('document_approval_requested'));
  assert.ok(timeline.includes('document_signed_simulated'));
});
