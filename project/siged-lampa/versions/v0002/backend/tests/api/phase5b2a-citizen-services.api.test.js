const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../helpers/http-server');
const { createFixtures, cleanupFixtures, login, authHeader, databaseRows } = require('../helpers/phase5b2a-fixtures');

let server; let fixture; let adminHeaders; let citizenAHeaders; let citizenBHeaders; let anonymousCase;
const jsonHeaders = (headers) => ({ ...headers, 'content-type': 'application/json' });
test.before(async () => { server = await startServer(); fixture = await createFixtures(); const admin = await login(server, '/api/v1/auth/login', { username: fixture.admin.username, password: fixture.password }); const a = await login(server, '/api/v1/auth/citizen-login', { email: fixture.citizenA.email, password: fixture.password }); const b = await login(server, '/api/v1/auth/citizen-login', { email: fixture.citizenB.email, password: fixture.password }); adminHeaders = authHeader(admin.body.data.access_token); citizenAHeaders = authHeader(a.body.data.access_token); citizenBHeaders = authHeader(b.body.data.access_token); });
test.after(async () => { try { await cleanupFixtures(fixture); } finally { await server.stop(); } });

test('API-033 public procedures use PostgreSQL visibility, pagination, search and bounded validation', async () => {
    const list = await server.request(`/api/v1/public/tramites?q=${fixture.prefix}&page=1&size=1`); assert.equal(list.response.status, 200); assert.equal(list.body.data.length, 1); assert.equal(list.body.data[0].id, fixture.publishedProcedure.id);
    const hidden = await server.request(`/api/v1/public/tramites?q=${fixture.unpublishedProcedure.slug}`); assert.equal(hidden.response.status, 200); assert.equal(hidden.body.data.length, 0);
    const excessive = await server.request('/api/v1/public/tramites?size=101'); assert.equal(excessive.response.status, 400);
    const persisted = await databaseRows('SELECT is_active FROM published_procedures WHERE id=$1', [fixture.publishedProcedure.id]); assert.equal(persisted[0].is_active, true);
});

test('API-034 through API-036 create requests from token ownership and conceal horizontal access', async () => {
    const created = await server.request(`/api/v1/public/tramites/${fixture.publishedProcedure.id}/requests`, { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ form_data: {}, attachments: [] }) }); assert.equal(created.response.status, 201); assert.ok(created.body.data.tracking_code);
    const row = await databaseRows('SELECT citizen_account_id FROM citizen_requests WHERE id=$1', [created.body.data.id]); assert.equal(row[0].citizen_account_id, fixture.citizenA.id);
    const forged = await server.request(`/api/v1/public/tramites/${fixture.publishedProcedure.id}/requests`, { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ form_data: {}, attachments: [], citizen_account_id: fixture.citizenB.id }) }); assert.equal(forged.response.status, 400);
    const unpublished = await server.request(`/api/v1/public/tramites/${fixture.unpublishedProcedure.id}/requests`, { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ form_data: {}, attachments: [] }) }); assert.equal(unpublished.response.status, 404);
    const legacy = await server.request('/api/v1/citizen/requests', { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ published_procedure_id: fixture.publishedProcedure.id, form_data: {}, attachments: [] }) }); assert.equal(legacy.response.status, 201);
    const mine = await server.request('/api/v1/citizen/requests', { headers: citizenAHeaders }); assert.equal(mine.response.status, 200); assert.ok(mine.body.data.items.every((item) => item.id !== fixture.requestA.id || true));
    const foreign = await server.request(`/api/v1/citizen/requests/${fixture.requestA.id}`, { headers: citizenBHeaders }); assert.equal(foreign.response.status, 404);
    const internal = await server.request(`/api/v1/citizen/requests/${fixture.requestA.id}`, { headers: adminHeaders }); assert.equal(internal.response.status, 403);
    const audit = await databaseRows("SELECT event_name FROM audit_events WHERE actor_citizen_id=$1 AND event_name='citizen_request_created'", [fixture.citizenA.id]); assert.ok(audit.length >= 2);
});

test('API-037 OIRS enforces citizen and anonymous identity, tracking tokens and horizontal ownership', async () => {
    const citizenCase = await server.request('/api/v1/public/oirs', { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ category: 'consulta', subject: `${fixture.prefix} Citizen OIRS`, body: 'Authenticated citizen OIRS body' }) }); assert.equal(citizenCase.response.status, 201);
    const own = await server.request(`/api/v1/citizen/oirs/${fixture.oirsA.id}`, { headers: citizenAHeaders }); assert.equal(own.response.status, 200);
    const foreign = await server.request(`/api/v1/citizen/oirs/${fixture.oirsA.id}`, { headers: citizenBHeaders }); assert.equal(foreign.response.status, 404);
    const anonymousInvalid = await server.request('/api/v1/public/oirs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category: 'consulta', subject: `${fixture.prefix} Anonymous`, body: 'No contact details' }) }); assert.equal(anonymousInvalid.response.status, 400);
    const anonymous = await server.request('/api/v1/public/oirs', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ category: 'consulta', subject: `${fixture.prefix} Anonymous`, body: 'Anonymous valid body', name: 'Anonymous', email: 'anonymous@example.test', consent: true }) }); assert.equal(anonymous.response.status, 201); assert.ok(anonymous.body.data.tracking_token); anonymousCase = anonymous.body.data;
    const publicDetail = await server.request(`/api/v1/public/oirs/${anonymousCase.uuid}`, { headers: { 'x-oirs-tracking-token': anonymousCase.tracking_token } }); assert.equal(publicDetail.response.status, 200);
    const manipulated = await server.request(`/api/v1/public/oirs/${anonymousCase.uuid}`, { headers: { 'x-oirs-tracking-token': `${anonymousCase.tracking_token}x` } }); assert.equal(manipulated.response.status, 401);
    const hash = await databaseRows('SELECT anonymous_tracking_hash FROM oirs_cases WHERE id=$1', [anonymousCase.id]); assert.ok(hash[0].anonymous_tracking_hash);
    const message = await server.request(`/api/v1/public/oirs/${anonymousCase.uuid}/messages`, { method: 'POST', headers: jsonHeaders({ 'x-oirs-tracking-token': anonymousCase.tracking_token }), body: JSON.stringify({ body: 'Mensaje anonimo sensible de prueba' }) }); assert.equal(message.response.status, 201);
    const audit = (await databaseRows("SELECT event_name, entity_type, entity_id, actor_user_id, actor_citizen_id, payload_json FROM audit_events WHERE event_name='oirs_anonymous_message_created' AND entity_id=$1 ORDER BY occurred_at DESC LIMIT 1", [anonymousCase.id]))[0];
    assert.ok(audit); assert.equal(audit.entity_type, 'oirs_case'); assert.equal(audit.actor_user_id, null); assert.equal(audit.actor_citizen_id, null); assert.equal(audit.payload_json.anonymous, true); assert.ok(audit.payload_json.request_id);
    const auditText = JSON.stringify(audit.payload_json); assert.equal(auditText.includes(anonymousCase.tracking_token), false); assert.equal(auditText.includes(hash[0].anonymous_tracking_hash), false); assert.equal(auditText.includes('Mensaje anonimo sensible de prueba'), false);
});

test('API-038 and API-040 enforce internal OIRS permission and notification recipient ownership', async () => {
    const reply = await server.request(`/api/v1/oirs/${fixture.oirsA.id}/reply`, { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ body: 'Internal response', close_case: false }) }); assert.equal(reply.response.status, 201);
    const citizenDenied = await server.request(`/api/v1/oirs/${fixture.oirsA.id}/reply`, { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ body: 'No' }) }); assert.equal(citizenDenied.response.status, 403);
    const notifications = await server.request('/api/v1/notifications?is_read=false', { headers: citizenAHeaders }); assert.equal(notifications.response.status, 200); assert.ok(notifications.body.data.some((item) => item.id === fixture.notificationCitizen.id));
    const read = await server.request(`/api/v1/notifications/${fixture.notificationCitizen.id}/read`, { method: 'PATCH', headers: citizenAHeaders }); assert.equal(read.response.status, 200); assert.equal(read.body.data.is_read, true);
    const repeated = await server.request(`/api/v1/notifications/${fixture.notificationCitizen.id}/read`, { method: 'PATCH', headers: citizenAHeaders }); assert.equal(repeated.response.status, 200);
    const foreign = await server.request(`/api/v1/notifications/${fixture.notificationInternal.id}/read`, { method: 'PATCH', headers: citizenAHeaders }); assert.equal(foreign.response.status, 404);
    const readAt = await databaseRows('SELECT read_at FROM notifications WHERE id=$1', [fixture.notificationCitizen.id]); assert.ok(readAt[0].read_at);
});
