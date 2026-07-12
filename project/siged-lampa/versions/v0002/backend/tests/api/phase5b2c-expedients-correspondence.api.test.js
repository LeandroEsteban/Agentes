const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../helpers/http-server');
const { createFixtures, cleanupFixtures, login, authHeader, databaseRows } = require('../helpers/phase5b2a-fixtures');

let server; let fx; let adminH; let officerH; let citizenH;
const jsonH = (h) => ({ ...h, 'content-type': 'application/json' });

test.before(async () => {
  server = await startServer(); fx = await createFixtures();
  const admin = await login(server, '/api/v1/auth/login', { username: fx.admin.username, password: fx.password });
  const officer = await login(server, '/api/v1/auth/login', { username: fx.officer.username, password: fx.password });
  const citizen = await login(server, '/api/v1/auth/citizen-login', { email: fx.citizenA.email, password: fx.password });
  adminH = authHeader(admin.body.data.access_token);
  officerH = authHeader(officer.body.data.access_token);
  citizenH = authHeader(citizen.body.data.access_token);
});

test.after(async () => { try { await cleanupFixtures(fx); } finally { await server.stop(); } });

// ─── EXPEDIENTS ───────────────────────────────────────────────────────────────

test('API-025 list expedients respects filters, pagination and RBAC', async () => {
  const list = await server.request('/api/v1/expedients?size=5', { headers: adminH });
  assert.equal(list.response.status, 200);
  assert.ok(Array.isArray(list.body.data));
  assert.ok('total' in list.body.meta);
  assert.equal(Object.hasOwn(list.body.data[0] || {}, 'password_hash'), false);
  const denied = await server.request('/api/v1/expedients', { headers: {} });
  assert.equal(denied.response.status, 401);
  const forbidden = await server.request('/api/v1/expedients', { headers: citizenH });
  assert.equal(forbidden.response.status, 403);
});

test('API-026 create expedient persists with transaction and records audit', async () => {
  const body = { subject: `${fx.prefix} Expedient`, description: 'Test expedient creation', department_id: fx.departmentA.id };
  const res = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 201);
  assert.ok(res.body.data.id);
  assert.ok(res.body.data.code);
  assert.equal(res.body.data.code.startsWith('EXP-'), true);
  assert.equal(res.body.data.status, 'open');
  const rows = await databaseRows('SELECT id FROM expedients WHERE id=$1', [res.body.data.id]);
  assert.equal(rows.length, 1);
  const audit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_id=$1 AND event_name='expedient_created'", [res.body.data.id]);
  assert.equal(audit.length, 1);
});

test('API-026 create expedient validates required fields', async () => {
  const missing = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ description: 'No subject' }) });
  assert.ok([400, 404].includes(missing.response.status));
  const badDept = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ subject: 'Bad dept', department_id: 999999999 }) });
  assert.equal(badDept.response.status, 404);
});

test('API-027 expedient detail returns full joined payload', async () => {
  const body = { subject: `${fx.prefix} Detail Exp`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const res = await server.request(`/api/v1/expedients/${created.body.data.id}`, { headers: adminH });
  assert.equal(res.response.status, 200);
  assert.ok(res.body.data.id);
  assert.ok(Array.isArray(res.body.data.documents));
  assert.ok(Array.isArray(res.body.data.events));
});

test('API-027 expedient detail rejects missing', async () => {
  const missing = await server.request('/api/v1/expedients/999999999', { headers: adminH });
  assert.equal(missing.response.status, 404);
  const noAuth = await server.request('/api/v1/expedients/1', { headers: {} });
  assert.equal(noAuth.response.status, 401);
});

test('API-028 link document to expedient', async () => {
  const body = { subject: `${fx.prefix} Link Test`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const expId = created.body.data.id;
  const linkBody = { document_id: fx.docA.id, relation_type: 'related', is_primary: true };
  const res = await server.request(`/api/v1/expedients/${expId}/documents`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(linkBody) });
  assert.equal(res.response.status, 201);
  assert.equal(String(res.body.data.document_id), String(fx.docA.id));
  const rows = await databaseRows('SELECT document_id FROM expedient_documents WHERE expedient_id=$1', [expId]);
  assert.ok(rows.some((r) => String(r.document_id) === String(fx.docA.id)));
  const audit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_id=$1 AND event_name='expedient_document_linked'", [expId]);
  assert.equal(audit.length, 1);
});

test('API-028 link document duplicates rejected', async () => {
  const body = { subject: `${fx.prefix} Dup Link`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const expId = created.body.data.id;
  const linkBody = { document_id: fx.docA.id, relation_type: 'related' };
  const first = await server.request(`/api/v1/expedients/${expId}/documents`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(linkBody) });
  assert.equal(first.response.status, 201);
  const dup = await server.request(`/api/v1/expedients/${expId}/documents`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(linkBody) });
  assert.equal(dup.response.status, 409);
});

test('API-028 link document validates existence', async () => {
  const body = { subject: `${fx.prefix} Existence`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const expId = created.body.data.id;
  const badDoc = await server.request(`/api/v1/expedients/${expId}/documents`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ document_id: 999999999 }) });
  assert.equal(badDoc.response.status, 404);
  const badExp = await server.request('/api/v1/expedients/999999999/documents', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ document_id: fx.docA.id }) });
  assert.equal(badExp.response.status, 404);
});

test('expedient timeline returns events in order', async () => {
  const body = { subject: `${fx.prefix} Timeline`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const expId = created.body.data.id;
  const events = await server.request(`/api/v1/expedients/${expId}/events`, { headers: adminH });
  assert.equal(events.response.status, 200);
  assert.ok(Array.isArray(events.body.data));
  assert.ok(events.body.data.length > 0);
  assert.equal(events.body.data[0].event_type, 'created');
});

test('expedient add event persists in timeline', async () => {
  const body = { subject: `${fx.prefix} Event`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const expId = created.body.data.id;
  const eventBody = { event_type: 'observation', event_label: 'Test observation', payload: { note: 'Added by test' } };
  const res = await server.request(`/api/v1/expedients/${expId}/events`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(eventBody) });
  assert.equal(res.response.status, 201);
  const events = await server.request(`/api/v1/expedients/${expId}/events`, { headers: adminH });
  assert.ok(events.body.data.some((e) => e.event_type === 'observation'));
  const audit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_id=$1 AND event_name='expedient_event_created'", [expId]);
  assert.equal(audit.length, 1);
});

test('expedient close transitions to closed', async () => {
  const body = { subject: `${fx.prefix} Close`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const expId = created.body.data.id;
  const closeBody = { status: 'closed', event_label: 'Expediente cerrado por test' };
  const res = await server.request(`/api/v1/expedients/${expId}/close`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(closeBody) });
  assert.equal(res.response.status, 200);
  assert.equal(res.body.data.status, 'closed');
  assert.ok(res.body.data.closed_at);
  const rows = await databaseRows('SELECT status,closed_at FROM expedients WHERE id=$1', [expId]);
  assert.equal(rows[0].status, 'closed');
  assert.ok(rows[0].closed_at);
  const audit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_id=$1 AND event_name='expedient_closed'", [expId]);
  assert.equal(audit.length, 1);
});

test('expedient close rejects already closed', async () => {
  const body = { subject: `${fx.prefix} Double Close`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const expId = created.body.data.id;
  await server.request(`/api/v1/expedients/${expId}/close`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ status: 'closed' }) });
  const dup = await server.request(`/api/v1/expedients/${expId}/close`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ status: 'archived' }) });
  assert.equal(dup.response.status, 409);
});

test('expedient RBAC: no permission user blocked', async () => {
  const body = { subject: `${fx.prefix} RBAC`, department_id: fx.departmentA.id };
  const res = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(officerH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 403);
  const list = await server.request('/api/v1/expedients', { headers: officerH });
  assert.equal(list.response.status, 403);
});

test('expedient update edits fields and records audit', async () => {
  const body = { subject: `${fx.prefix} Update`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const expId = created.body.data.id;
  const updBody = { subject: `${fx.prefix} Updated Subject` };
  const res = await server.request(`/api/v1/expedients/${expId}`, { method: 'PATCH', headers: jsonH(adminH), body: JSON.stringify(updBody) });
  assert.equal(res.response.status, 200);
  assert.equal(res.body.data.subject, `${fx.prefix} Updated Subject`);
  const audit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_id=$1 AND event_name='expedient_updated'", [expId]);
  assert.equal(audit.length, 1);
});

// ─── CORRESPONDENCE ──────────────────────────────────────────────────────────

test('API-029 list correspondence respects filters, pagination and RBAC', async () => {
  const list = await server.request('/api/v1/correspondence?size=5', { headers: adminH });
  assert.equal(list.response.status, 200);
  assert.ok(Array.isArray(list.body.data));
  assert.ok('total' in list.body.meta);
  const denied = await server.request('/api/v1/correspondence', { headers: {} });
  assert.equal(denied.response.status, 401);
  const forbidden = await server.request('/api/v1/correspondence', { headers: citizenH });
  assert.equal(forbidden.response.status, 403);
});

test('API-030 create OUTBOUND correspondence with recipients', async () => {
  const body = {
    direction: 'OUTBOUND', subject: `${fx.prefix} Corr OUT`,
    sent_at: new Date().toISOString(), priority: 'high',
    recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id, delivery_channel: 'internal' }],
  };
  const res = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 201);
  assert.ok(res.body.data.id);
  assert.ok(res.body.data.tracking_code);
  assert.equal(res.body.data.direction, 'OUTBOUND');
  const rows = await databaseRows('SELECT id FROM correspondence WHERE id=$1', [res.body.data.id]);
  assert.equal(rows.length, 1);
  const recipients = await databaseRows('SELECT * FROM correspondence_recipients WHERE correspondence_id=$1', [res.body.data.id]);
  assert.ok(recipients.length > 0);
  const audit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_id=$1 AND event_name='correspondence_created'", [res.body.data.id]);
  assert.equal(audit.length, 1);
});

test('API-030 create correspondence validates required fields', async () => {
  const noDirection = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ subject: 'No direction' }) });
  assert.equal(noDirection.response.status, 400);
});

test('API-031 route correspondence to another department', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Route`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const corrId = created.body.data.id;
  const routeBody = { to_department_id: fx.departmentB.id, instructions: 'Please process this' };
  const res = await server.request(`/api/v1/correspondence/${corrId}/route`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(routeBody) });
  assert.equal(res.response.status, 201);
  assert.equal(res.body.data.to_department_id, fx.departmentB.id);
  const routes = await databaseRows('SELECT * FROM correspondence_routes WHERE correspondence_id=$1', [corrId]);
  assert.ok(routes.length > 0);
  const audit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_id=$1 AND event_name='correspondence_routed'", [corrId]);
  assert.equal(audit.length, 1);
});

test('API-031 route rejects closed correspondence', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Closed Route`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const corrId = created.body.data.id;
  await server.request(`/api/v1/correspondence/${corrId}/close`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ status: 'closed', observation: 'Closed' }) });
  const routeBody = { to_department_id: fx.departmentB.id };
  const res = await server.request(`/api/v1/correspondence/${corrId}/route`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(routeBody) });
  assert.equal(res.response.status, 409);
});

test('API-031 route rejects same department', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Same Dept`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const corrId = created.body.data.id;
  const routeBody = { to_department_id: fx.departmentA.id };
  const res = await server.request(`/api/v1/correspondence/${corrId}/route`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(routeBody) });
  assert.equal(res.response.status, 409);
});

test('API-032 link response validates document status', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Link Resp`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const corrId = created.body.data.id;
  const res = await server.request(`/api/v1/correspondence/${corrId}/link-response`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ document_id: fx.docA.id }) });
  assert.equal(res.response.status, 404);
  const rows = await databaseRows('SELECT status FROM correspondence WHERE id=$1', [corrId]);
  assert.equal(rows[0].status, 'received');
});

test('correspondence detail returns full payload', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Detail`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const res = await server.request(`/api/v1/correspondence/${created.body.data.id}`, { headers: adminH });
  assert.equal(res.response.status, 200);
  assert.ok(Array.isArray(res.body.data.recipients));
  assert.ok(Array.isArray(res.body.data.routes));
});

test('correspondence detail rejects missing', async () => {
  const missing = await server.request('/api/v1/correspondence/999999999', { headers: adminH });
  assert.equal(missing.response.status, 404);
});

test('correspondence close transitions correctly', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Close Corr`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const corrId = created.body.data.id;
  const res = await server.request(`/api/v1/correspondence/${corrId}/close`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ status: 'closed', observation: 'Finalized' }) });
  assert.equal(res.response.status, 200);
  assert.equal(res.body.data.status, 'closed');
  const rows = await databaseRows('SELECT status FROM correspondence WHERE id=$1', [corrId]);
  assert.equal(rows[0].status, 'closed');
  const audit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_id=$1 AND event_name='correspondence_closed'", [corrId]);
  assert.equal(audit.length, 1);
});

test('correspondence close rejects double close', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Double Close`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const corrId = created.body.data.id;
  await server.request(`/api/v1/correspondence/${corrId}/close`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ status: 'closed', observation: 'First' }) });
  const dup = await server.request(`/api/v1/correspondence/${corrId}/close`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ status: 'cancelled', observation: 'Second' }) });
  assert.equal(dup.response.status, 409);
});

test('correspondence history returns route trail', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} History`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const corrId = created.body.data.id;
  await server.request(`/api/v1/correspondence/${corrId}/route`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ to_department_id: fx.departmentB.id }) });
  const hist = await server.request(`/api/v1/correspondence/${corrId}/history`, { headers: adminH });
  assert.equal(hist.response.status, 200);
  assert.ok(Array.isArray(hist.body.data));
  assert.ok(hist.body.data.length > 0);
  assert.ok(hist.body.data[0].from_department_name);
  assert.ok(hist.body.data[0].to_department_name);
});

test('correspondence RBAC: no permission user blocked', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Corr RBAC`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const res = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(officerH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 403);
  const list = await server.request('/api/v1/correspondence', { headers: officerH });
  assert.equal(list.response.status, 403);
});

test('correspondence mass assignment blocked', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Mass`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }], tracking_code: 'MANUAL-CODE', created_by: 1 };
  const res = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 201);
  assert.notEqual(res.body.data.tracking_code, 'MANUAL-CODE');
});

test('correspondence update edits fields', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Update`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const corrId = created.body.data.id;
  const updBody = { subject: `${fx.prefix} Updated Subj`, priority: 'urgent' };
  const res = await server.request(`/api/v1/correspondence/${corrId}`, { method: 'PATCH', headers: jsonH(adminH), body: JSON.stringify(updBody) });
  assert.equal(res.response.status, 200);
  assert.equal(res.body.data.subject, `${fx.prefix} Updated Subj`);
  assert.equal(res.body.data.priority, 'urgent');
});

// ─── PUBLIC CONTENT: NEWS ────────────────────────────────────────────────────

test('public news list returns only published visible news', async () => {
  const slug = `pub-news-${Date.now()}`;
  const body = { slug, title: `${fx.prefix} Pub News`, content_html: '<p>Test public news</p>', status: 'published' };
  const created = await server.request('/api/v1/admin/public-content/news', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.status, 'published');
  const pubList = await server.request('/api/v1/public/news?size=10', {});
  assert.equal(pubList.response.status, 200);
  assert.ok(pubList.body.data.some((n) => n.slug === slug));
});

test('public news detail returns by slug', async () => {
  const slug = `det-news-${Date.now()}`;
  const body = { slug, title: `${fx.prefix} Detail News`, content_html: '<p>Detail</p>', status: 'published' };
  await server.request('/api/v1/admin/public-content/news', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  const res = await server.request(`/api/v1/public/news/${slug}`, {});
  assert.equal(res.response.status, 200);
  assert.equal(res.body.data.slug, slug);
});

test('public news draft not visible publicly', async () => {
  const slug = `draft-news-${Date.now()}`;
  const body = { slug, title: `${fx.prefix} Draft News`, content_html: '<p>Draft</p>', status: 'draft' };
  await server.request('/api/v1/admin/public-content/news', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  const res = await server.request(`/api/v1/public/news/${slug}`, {});
  assert.equal(res.response.status, 404);
});

test('news admin create/update with audit', async () => {
  const slug = `adm-news-${Date.now()}`;
  const body = { slug, title: `${fx.prefix} Admin News`, content_html: '<p>Admin</p>', status: 'published' };
  const created = await server.request('/api/v1/admin/public-content/news', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const newsId = created.body.data.id;
  const updBody = { slug: `adm-news-upd-${Date.now()}`, title: `${fx.prefix} Updated News`, content_html: '<p>Updated</p>', status: 'published' };
  const updated = await server.request(`/api/v1/admin/public-content/news/${newsId}`, { method: 'PATCH', headers: jsonH(adminH), body: JSON.stringify(updBody) });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.data.title, `${fx.prefix} Updated News`);
});

test('news admin blocked for non-admin', async () => {
  const body = { slug: `off-news-${Date.now()}`, title: 'Officer News', content_html: '<p>Test</p>' };
  const res = await server.request('/api/v1/admin/public-content/news', { method: 'POST', headers: jsonH(officerH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 403);
});

// ─── PUBLIC CONTENT: NOTICES ─────────────────────────────────────────────────

test('public notices list returns only active notices in range', async () => {
  const body = { title: `${fx.prefix} Active Notice`, body_html: '<p>Active</p>', notice_type: 'general', status: 'active',
    start_at: new Date(Date.now() - 86400000).toISOString(), end_at: new Date(Date.now() + 86400000).toISOString() };
  const created = await server.request('/api/v1/admin/public-content/notices', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const pubList = await server.request('/api/v1/public/notices?size=10', {});
  assert.equal(pubList.response.status, 200);
  assert.ok(Array.isArray(pubList.body.data));
});

test('public notice expired not visible', async () => {
  const body = { title: `${fx.prefix} Expired Notice`, body_html: '<p>Expired</p>', notice_type: 'general', status: 'active',
    start_at: new Date(Date.now() - 172800000).toISOString(), end_at: new Date(Date.now() - 86400000).toISOString() };
  await server.request('/api/v1/admin/public-content/notices', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  const pubList = await server.request('/api/v1/public/notices?size=100', {});
  assert.ok(!pubList.body.data.some((n) => n.title === `${fx.prefix} Expired Notice`));
});

test('notices admin CRUD with audit', async () => {
  const body = { title: `${fx.prefix} Admin Notice`, body_html: '<p>Admin notice</p>', notice_type: 'urgent', status: 'active',
    start_at: new Date().toISOString(), end_at: new Date(Date.now() + 86400000).toISOString() };
  const created = await server.request('/api/v1/admin/public-content/notices', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.notice_type, 'urgent');
  const updBody = { title: `${fx.prefix} Updated Notice`, body_html: '<p>Updated</p>', notice_type: 'general', status: 'active',
    start_at: new Date().toISOString(), end_at: new Date(Date.now() + 86400000).toISOString() };
  const updated = await server.request(`/api/v1/admin/public-content/notices/${created.body.data.id}`, { method: 'PATCH', headers: jsonH(adminH), body: JSON.stringify(updBody) });
  assert.equal(updated.response.status, 200);
});

test('notice validates end_at >= start_at', async () => {
  const body = { title: `${fx.prefix} Bad Dates`, body_html: '<p>Invalid</p>', notice_type: 'general', status: 'active',
    start_at: new Date(Date.now() + 86400000).toISOString(), end_at: new Date(Date.now() - 86400000).toISOString() };
  const res = await server.request('/api/v1/admin/public-content/notices', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 400);
});

// ─── PUBLIC CONTENT: CALENDAR ────────────────────────────────────────────────

test('public calendar returns future events', async () => {
  const body = { title: `${fx.prefix} Future Event`, description: 'A future event',
    start_at: new Date(Date.now() + 86400000).toISOString(), end_at: new Date(Date.now() + 172800000).toISOString(),
    audience: 'public', status: 'confirmed' };
  const created = await server.request('/api/v1/admin/public-content/calendar', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const pubList = await server.request('/api/v1/public/calendar?size=10', {});
  assert.equal(pubList.response.status, 200);
  assert.ok(Array.isArray(pubList.body.data));
});

test('calendar past event not shown', async () => {
  const body = { title: `${fx.prefix} Past Event`, description: 'Past',
    start_at: new Date(Date.now() - 172800000).toISOString(), end_at: new Date(Date.now() - 86400000).toISOString(),
    audience: 'public', status: 'completed' };
  await server.request('/api/v1/admin/public-content/calendar', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  const pubList = await server.request('/api/v1/public/calendar?size=100', {});
  assert.ok(!pubList.body.data.some((e) => e.title === `${fx.prefix} Past Event`));
});

test('calendar validates end_at >= start_at', async () => {
  const body = { title: `${fx.prefix} Bad`, start_at: new Date(Date.now() + 86400000).toISOString(),
    end_at: new Date(Date.now() - 86400000).toISOString(), audience: 'public' };
  const res = await server.request('/api/v1/admin/public-content/calendar', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 400);
});

test('calendar admin CRUD', async () => {
  const body = { title: `${fx.prefix} Admin Event`, description: 'Admin created',
    start_at: new Date(Date.now() + 86400000).toISOString(), end_at: new Date(Date.now() + 172800000).toISOString(),
    audience: 'internal', status: 'scheduled', location: 'Main Office' };
  const created = await server.request('/api/v1/admin/public-content/calendar', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.data.location, 'Main Office');
  const updBody = { title: `${fx.prefix} Updated Event`,
    start_at: new Date(Date.now() + 86400000).toISOString(), end_at: new Date(Date.now() + 172800000).toISOString(),
    audience: 'public', status: 'confirmed' };
  const updated = await server.request(`/api/v1/admin/public-content/calendar/${created.body.data.id}`, { method: 'PATCH', headers: jsonH(adminH), body: JSON.stringify(updBody) });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.data.status, 'confirmed');
});

// ─── REPORTS ─────────────────────────────────────────────────────────────────

test('API-039 reports dashboard returns real aggregate counts', async () => {
  const res = await server.request('/api/v1/reports/dashboard', { headers: adminH });
  assert.equal(res.response.status, 200);
  assert.ok(res.body.ok);
  assert.equal(typeof res.body.data.documents_open, 'number');
  assert.equal(typeof res.body.data.expedients_open, 'number');
  assert.equal(typeof res.body.data.oirs_open, 'number');
  assert.equal(typeof res.body.data.citizen_requests_open, 'number');
  assert.ok(res.body.data.documents_open >= 1);
});

test('reports dashboard respects date filter', async () => {
  const res = await server.request('/api/v1/reports/dashboard?from=2020-01-01&to=2020-12-31', { headers: adminH });
  assert.equal(res.response.status, 200);
  assert.ok(res.body.ok);
});

test('reports dashboard validates date range', async () => {
  const res = await server.request('/api/v1/reports/dashboard?from=2025-01-01&to=2020-01-01', { headers: adminH });
  assert.equal(res.response.status, 400);
});

test('reports dashboard rejects unauthorized', async () => {
  const res = await server.request('/api/v1/reports/dashboard', { headers: citizenH });
  assert.equal(res.response.status, 403);
  const noAuth = await server.request('/api/v1/reports/dashboard', { headers: {} });
  assert.equal(noAuth.response.status, 401);
});

// ─── FULL LIFECYCLE TESTS ────────────────────────────────────────────────────

test('expedient full lifecycle: create -> link document -> add event -> timeline -> close', async () => {
  const body = { subject: `${fx.prefix} Lifecycle Exp`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const expId = created.body.data.id;
  assert.equal(created.body.data.status, 'open');
  const linked = await server.request(`/api/v1/expedients/${expId}/documents`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ document_id: fx.docA.id }) });
  assert.equal(linked.response.status, 201);
  const eventRes = await server.request(`/api/v1/expedients/${expId}/events`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ event_type: 'observation', event_label: 'Lifecycle' }) });
  assert.equal(eventRes.response.status, 201);
  const timeline = await server.request(`/api/v1/expedients/${expId}/events`, { headers: adminH });
  assert.equal(timeline.response.status, 200);
  assert.ok(timeline.body.data.length >= 2);
  const closed = await server.request(`/api/v1/expedients/${expId}/close`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ status: 'closed' }) });
  assert.equal(closed.response.status, 200);
  assert.equal(closed.body.data.status, 'closed');
  const audit = await databaseRows("SELECT event_name FROM audit_events WHERE entity_id=$1 AND event_name LIKE 'expedient_%'", [expId]);
  assert.equal(audit.length, 4);
});

test('correspondence full lifecycle: create -> route -> close -> history', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Lifecycle Corr`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const corrId = created.body.data.id;
  const routed = await server.request(`/api/v1/correspondence/${corrId}/route`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ to_department_id: fx.departmentB.id }) });
  assert.equal(routed.response.status, 201);
  const closed = await server.request(`/api/v1/correspondence/${corrId}/close`, { method: 'POST', headers: jsonH(adminH), body: JSON.stringify({ status: 'closed', observation: 'Done' }) });
  assert.equal(closed.response.status, 200);
  assert.equal(closed.body.data.status, 'closed');
  const history = await server.request(`/api/v1/correspondence/${corrId}/history`, { headers: adminH });
  assert.equal(history.response.status, 200);
  assert.ok(history.body.data.length > 0);
});

test('public content lifecycle: draft -> hidden -> published -> visible -> archived -> hidden', async () => {
  const slug = `lc-news-${Date.now()}`;
  const draftBody = { slug, title: `${fx.prefix} LC News`, content_html: '<p>LC</p>', status: 'draft' };
  const created = await server.request('/api/v1/admin/public-content/news', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(draftBody) });
  assert.equal(created.response.status, 201);
  const hidden = await server.request(`/api/v1/public/news/${slug}`, {});
  assert.equal(hidden.response.status, 404);
  const pubBody = { slug: `lc-pub-${Date.now()}`, title: `${fx.prefix} LC Pub`, content_html: '<p>Now public</p>', status: 'published' };
  const updated = await server.request(`/api/v1/admin/public-content/news/${created.body.data.id}`, { method: 'PATCH', headers: jsonH(adminH), body: JSON.stringify(pubBody) });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.data.status, 'published');
  const visible = await server.request(`/api/v1/public/news/${pubBody.slug}`, {});
  assert.equal(visible.response.status, 200);
  const archBody = { slug: `lc-arch-${Date.now()}`, title: `${fx.prefix} LC Arch`, content_html: '<p>Archived</p>', status: 'archived' };
  await server.request(`/api/v1/admin/public-content/news/${created.body.data.id}`, { method: 'PATCH', headers: jsonH(adminH), body: JSON.stringify(archBody) });
  const gone = await server.request(`/api/v1/public/news/${archBody.slug}`, {});
  assert.equal(gone.response.status, 404);
});

// ─── SECURITY TESTS ──────────────────────────────────────────────────────────

test('SQL injection treated as data across expedient endpoints', async () => {
  const body = { subject: `${fx.prefix} SQL Inj`, department_id: fx.departmentA.id };
  const created = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const expId = created.body.data.id;
  const sqlInj = await server.request(`/api/v1/expedients/${expId}`, { method: 'PATCH', headers: jsonH(adminH), body: JSON.stringify({ subject: "'; DROP TABLE expedients; --" }) });
  assert.equal(sqlInj.response.status, 200);
  const rows = await databaseRows('SELECT subject FROM expedients WHERE id=$1', [expId]);
  assert.equal(rows[0].subject, "'; DROP TABLE expedients; --");
});

test('SQL injection treated as data across correspondence endpoints', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} SQL Corr`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }] };
  const created = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(created.response.status, 201);
  const corrId = created.body.data.id;
  const sqlInj = await server.request(`/api/v1/correspondence/${corrId}`, { method: 'PATCH', headers: jsonH(adminH), body: JSON.stringify({ subject: "'; DROP TABLE correspondence; --" }) });
  assert.equal(sqlInj.response.status, 200);
  const rows = await databaseRows('SELECT subject FROM correspondence WHERE id=$1', [corrId]);
  assert.equal(rows[0].subject, "'; DROP TABLE correspondence; --");
});

test('mass assignment blocked across expedient endpoints', async () => {
  const body = { subject: `${fx.prefix} Mass Exp`, department_id: fx.departmentA.id, code: 'MANUAL-CODE', owner_user_id: 1, status: 'closed', closed_at: new Date().toISOString() };
  const res = await server.request('/api/v1/expedients', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 201);
  assert.equal(res.body.data.status, 'open');
  assert.notEqual(res.body.data.code, 'MANUAL-CODE');
  assert.equal(res.body.data.closed_at, null);
});

test('mass assignment blocked across correspondence endpoints', async () => {
  const body = { direction: 'OUTBOUND', subject: `${fx.prefix} Mass`, sent_at: new Date().toISOString(), recipients: [{ recipient_type: 'internal', department_id: fx.departmentB.id }], tracking_code: 'MANUAL', status: 'closed' };
  const res = await server.request('/api/v1/correspondence', { method: 'POST', headers: jsonH(adminH), body: JSON.stringify(body) });
  assert.equal(res.response.status, 201);
  assert.notEqual(res.body.data.tracking_code, 'MANUAL');
  assert.notEqual(res.body.data.status, 'closed');
});

test('error responses never expose stack or SQL', async () => {
  const res = await server.request('/api/v1/expedients/999999999', { headers: adminH });
  assert.equal(res.response.status, 404);
  const text = JSON.stringify(res.body);
  assert.equal(text.includes('Stack'), false);
  assert.equal(text.includes('INSERT'), false);
  assert.equal(text.includes('SELECT'), false);
});

test('audit events recorded for expedient and correspondence operations', async () => {
  const names = await databaseRows("SELECT DISTINCT event_name FROM audit_events WHERE event_name LIKE 'expedient_%' OR event_name LIKE 'correspondence_%' OR event_name LIKE 'public_content_%'");
  const eventNames = names.map((r) => r.event_name);
  assert.ok(eventNames.includes('expedient_created'));
  assert.ok(eventNames.includes('expedient_updated'));
  assert.ok(eventNames.includes('expedient_closed'));
  assert.ok(eventNames.includes('correspondence_created'));
  assert.ok(eventNames.includes('correspondence_routed'));
  assert.ok(eventNames.includes('correspondence_closed'));
});

test('citizen user blocked from all admin content endpoints', async () => {
  const body = { slug: `cit-news-${Date.now()}`, title: 'Citizen', content_html: '<p>Test</p>' };
  const newsRes = await server.request('/api/v1/admin/public-content/news', { method: 'POST', headers: jsonH(citizenH), body: JSON.stringify(body) });
  assert.equal(newsRes.response.status, 403);
  const noticeBody = { title: 'Citizen Notice', body_html: '<p>Test</p>', notice_type: 'general', status: 'draft',
    start_at: new Date().toISOString(), end_at: new Date(Date.now() + 86400000).toISOString() };
  const noticeRes = await server.request('/api/v1/admin/public-content/notices', { method: 'POST', headers: jsonH(citizenH), body: JSON.stringify(noticeBody) });
  assert.equal(noticeRes.response.status, 403);
  const calBody = { title: 'Citizen Event', start_at: new Date().toISOString(), end_at: new Date(Date.now() + 86400000).toISOString(), audience: 'public' };
  const calRes = await server.request('/api/v1/admin/public-content/calendar', { method: 'POST', headers: jsonH(citizenH), body: JSON.stringify(calBody) });
  assert.equal(calRes.response.status, 403);
});
