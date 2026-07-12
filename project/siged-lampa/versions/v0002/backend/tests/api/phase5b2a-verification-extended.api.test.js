const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../helpers/http-server');
const { createFixtures, cleanupFixtures, login, authHeader, databaseRows } = require('../helpers/phase5b2a-fixtures');

let server; let fixture;
let adminHeaders; let officerHeaders; let citizenAHeaders; let citizenBHeaders;
const jsonHeaders = (h) => ({ ...h, 'content-type': 'application/json' });
const sqlInjection = "' OR '1'='1";

let oirsSqlCaseId = null;
test.before(async () => {
    server = await startServer();
    fixture = await createFixtures();
    const admin = await login(server, '/api/v1/auth/login', { username: fixture.admin.username, password: fixture.password });
    const officer = await login(server, '/api/v1/auth/login', { username: fixture.officer.username, password: fixture.password });
    const a = await login(server, '/api/v1/auth/citizen-login', { email: fixture.citizenA.email, password: fixture.password });
    const b = await login(server, '/api/v1/auth/citizen-login', { email: fixture.citizenB.email, password: fixture.password });
    adminHeaders = authHeader(admin.body.data.access_token);
    officerHeaders = authHeader(officer.body.data.access_token);
    citizenAHeaders = authHeader(a.body.data.access_token);
    citizenBHeaders = authHeader(b.body.data.access_token);
});

test.after(async () => {
    try {
        if (oirsSqlCaseId) {
            await databaseRows('DELETE FROM oirs_messages WHERE oirs_case_id = $1', [oirsSqlCaseId]);
            await databaseRows('DELETE FROM oirs_cases WHERE id = $1', [oirsSqlCaseId]);
        }
        await databaseRows('DELETE FROM oirs_messages WHERE oirs_case_id IN (SELECT id FROM oirs_cases WHERE subject LIKE $1)', [`${fixture.prefix}%`]);
        await databaseRows('DELETE FROM oirs_cases WHERE subject LIKE $1', [`${fixture.prefix}%`]);
        await cleanupFixtures(fixture);
    } finally { await server.stop(); }
});

test('API-001 internal login rejects missing fields and treats SQL injection as literal value', async () => {
    const emptyBody = await server.request('/api/v1/auth/login', { method: 'POST', headers: jsonHeaders({}), body: '{"username":"","password":""}' });
    assert.equal(emptyBody.response.status, 400);
    const noUsername = await server.request('/api/v1/auth/login', { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ password: fixture.password }) });
    assert.equal(noUsername.response.status, 400);
    const noPassword = await server.request('/api/v1/auth/login', { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ username: fixture.admin.username }) });
    assert.equal(noPassword.response.status, 400);
    const sql = await server.request('/api/v1/auth/login', { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ username: sqlInjection, password: fixture.password }) });
    assert.equal(sql.response.status, 401);
    assert.equal(JSON.stringify(sql.body).includes('stack'), false);
    assert.equal(JSON.stringify(sql.body).includes('POSTGRES'), false);
});

test('API-002 citizen login rejects unknown email and validates email format before authentication', async () => {
    const unknown = await server.request('/api/v1/auth/citizen-login', { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ email: 'nonexistent@test.test', password: fixture.password }) });
    assert.equal(unknown.response.status, 401);
    assert.equal(unknown.body.error.code, 'INVALID_CREDENTIALS');
    const missing = await server.request('/api/v1/auth/citizen-login', { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ password: fixture.password }) });
    assert.equal(missing.response.status, 400);
});

test('API-003 recovery does not enumerate accounts and treats SQL injection as literal value', async () => {
    const unknown = await server.request('/api/v1/auth/recover', { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ channel: 'email', identifier: 'unknown@test.test' }) });
    assert.equal(unknown.response.status, 202);
    const known = await server.request('/api/v1/auth/recover', { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ channel: 'email', identifier: fixture.admin.email }) });
    assert.equal(known.response.status, 202);
    assert.equal(unknown.body.data.accepted, known.body.data.accepted);
    const sqlIdent = await server.request('/api/v1/auth/recover', { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ channel: 'email', identifier: sqlInjection }) });
    assert.equal(sqlIdent.response.status, 202);
    const unknownAudit = await databaseRows("SELECT payload_json FROM audit_events WHERE event_name = 'password_recovery_requested' ORDER BY occurred_at DESC LIMIT 1");
    assert.equal(JSON.stringify(unknownAudit[0].payload_json).includes('unknown@test.test'), false);
});

test('API-004 and API-005 reject tampered tokens and enforce schema validation', async () => {
    const tampered = await server.request('/api/v1/profile/me', { headers: authHeader(`${citizenAHeaders.authorization.slice(7).slice(0, -1)}x`) });
    assert.equal(tampered.response.status, 401);
    const internalProfile = await server.request('/api/v1/profile/me', { headers: adminHeaders });
    assert.equal(internalProfile.response.status, 200);
    assert.equal(Object.hasOwn(internalProfile.body.data, 'password_hash'), false);
    const emptyUpdate = await server.request('/api/v1/profile/me', { method: 'PUT', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({}) });
    assert.equal(emptyUpdate.response.status, 400);
    const massAssign = await server.request('/api/v1/profile/me', { method: 'PUT', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ full_name: 'Valid Name', is_admin: true, role: 'superadmin' }) });
    assert.equal(massAssign.response.status, 400);
    const valid = await server.request('/api/v1/profile/me', { method: 'PUT', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ full_name: 'citizen a' }) });
    assert.equal(valid.response.status, 200);
});

test('API-007 through API-010 admin endpoints reject all unauthorized actors and validate mass assignment', async () => {
    for (const headers of [{}, citizenAHeaders, officerHeaders]) {
        for (const route of ['/api/v1/users', '/api/v1/roles']) {
            const result = await server.request(route, { headers });
            assert.ok([401, 403].includes(result.response.status), `${route} should reject got ${result.response.status}`);
        }
    }
    const createCitizen = await server.request('/api/v1/users', { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ username: 'test', email: 't@t.com', full_name: 'Test', department_id: fixture.departmentA.id, role_ids: [fixture.emptyRole.id] }) });
    assert.equal(createCitizen.response.status, 403);
    const updateCitizen = await server.request(`/api/v1/users/${fixture.admin.id}`, { method: 'PUT', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ status: 'inactive' }) });
    assert.equal(updateCitizen.response.status, 403);
    const massAssign = await server.request('/api/v1/users', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ username: `${fixture.prefix}_mass`, email: `${fixture.prefix}_mass@test.test`, full_name: 'Mass', department_id: fixture.departmentA.id, role_ids: [fixture.emptyRole.id], password_hash: 'shouldnotwork', is_admin: true }) });
    assert.equal(massAssign.response.status, 400);
    const rolesReplaceDenied = await server.request(`/api/v1/roles/${fixture.adminRole.id}/permissions`, { method: 'PUT', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ permission_ids: [] }) });
    assert.equal(rolesReplaceDenied.response.status, 403);
});

test('API-009 RBAC chain verified from database tables', async () => {
    const rbacChain = await databaseRows(
        'SELECT p.code FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=$1',
        [fixture.admin.id]
    );
    const codes = rbacChain.map((r) => r.code);
    assert.ok(codes.includes('users.view'));
    assert.ok(codes.includes('roles.view'));
    assert.ok(codes.includes('roles.edit'));
    const emptyChain = await databaseRows(
        'SELECT p.code FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=$1',
        [fixture.officer.id]
    );
    assert.equal(emptyChain.length, 0);
});

test('API-010 replace permissions rejects nonexistent role and invalid permission IDs', async () => {
    const nonexistent = await server.request('/api/v1/roles/999999999/permissions', { method: 'PUT', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ permission_ids: [] }) });
    assert.equal(nonexistent.response.status, 404);
    const invalidPerms = await server.request(`/api/v1/roles/${fixture.adminRole.id}/permissions`, { method: 'PUT', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ permission_ids: [999999999] }) });
    assert.equal(invalidPerms.response.status, 422);
});

test('API-011 through API-014 department and document-type endpoints reject unauthorized actors and validate codes', async () => {
    for (const headers of [{}, citizenAHeaders, officerHeaders]) {
        const deptResult = await server.request('/api/v1/departments', { headers });
        assert.ok([401, 403].includes(deptResult.response.status));
        const dtResult = await server.request('/api/v1/document-types', { headers });
        assert.ok([401, 403].includes(dtResult.response.status));
    }
    const officerCreateDept = await server.request('/api/v1/departments', { method: 'POST', headers: jsonHeaders(officerHeaders), body: JSON.stringify({ code: 'TEST', name: 'Test' }) });
    assert.equal(officerCreateDept.response.status, 403);
    const citizenCreateDept = await server.request('/api/v1/departments', { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ code: 'TEST', name: 'Test' }) });
    assert.equal(citizenCreateDept.response.status, 403);
    const officerCreateDT = await server.request('/api/v1/document-types', { method: 'POST', headers: jsonHeaders(officerHeaders), body: JSON.stringify({ code: 'TEST', name: 'Test', retention_days: 0, requires_signature: false, is_active: true }) });
    assert.equal(officerCreateDT.response.status, 403);
    const deptCodeLower = await server.request('/api/v1/departments', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: 'lowercase', name: 'Lowercase code' }) });
    assert.equal(deptCodeLower.response.status, 400);
    const dtCodeLower = await server.request('/api/v1/document-types', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: 'lowercase', name: 'Lowercase code', retention_days: 0, requires_signature: false, is_active: true }) });
    assert.equal(dtCodeLower.response.status, 400);
    const dtDuplicate = await server.request('/api/v1/document-types', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: fixture.prefix.slice(0, 30).toUpperCase(), name: `${fixture.prefix} DT Duplicate`, retention_days: 0, requires_signature: false, is_active: true }) });
    assert.equal(dtDuplicate.response.status, 201);
    const dtDuplicate2 = await server.request('/api/v1/document-types', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: fixture.prefix.slice(0, 30).toUpperCase(), name: `${fixture.prefix} DT Duplicate 2`, retention_days: 0, requires_signature: false, is_active: true }) });
    assert.equal(dtDuplicate2.response.status, 409);
});

test('API-034 request creation rejects anonymous and internal, enforces audit', async () => {
    const anonymous = await server.request(`/api/v1/public/tramites/${fixture.publishedProcedure.id}/requests`, { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ form_data: {}, attachments: [] }) });
    assert.equal(anonymous.response.status, 401);
    const internal = await server.request(`/api/v1/public/tramites/${fixture.publishedProcedure.id}/requests`, { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ form_data: {}, attachments: [] }) });
    assert.equal(internal.response.status, 403);
    const valid = await server.request(`/api/v1/public/tramites/${fixture.publishedProcedure.id}/requests`, { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({}) });
    assert.equal(valid.response.status, 201);
    const auditFound = await databaseRows("SELECT event_name FROM audit_events WHERE actor_citizen_id=$1 AND event_name='citizen_request_created'", [fixture.citizenA.id]);
    assert.ok(auditFound.length >= 1);
});

test('API-035 my requests enforces ownership and rejects internal and anonymous access', async () => {
    const anonymous = await server.request('/api/v1/citizen/requests', {});
    assert.equal(anonymous.response.status, 401);
    const internal = await server.request('/api/v1/citizen/requests', { headers: adminHeaders });
    assert.equal(internal.response.status, 403);
    const citizenBlist = await server.request('/api/v1/citizen/requests', { headers: citizenBHeaders });
    assert.equal(citizenBlist.response.status, 200);
    assert.ok(citizenBlist.body.data.items.every((item) => item.id !== fixture.requestA.id));
});

test('API-036 request detail rejects anonymous and nonexistent IDs', async () => {
    const anonymous = await server.request(`/api/v1/citizen/requests/${fixture.requestA.id}`, {});
    assert.equal(anonymous.response.status, 401);
    const nonexistent = await server.request('/api/v1/citizen/requests/999999999', { headers: citizenAHeaders });
    assert.equal(nonexistent.response.status, 404);
});

test('API-037 OIRS create rejects internal actor, invalid categories and anonymous without consent', async () => {
    const internal = await server.request('/api/v1/public/oirs', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ category: 'consulta', subject: 'Test OIRS', body: 'Test body' }) });
    assert.equal(internal.response.status, 403);
    const sqlSubject = await server.request('/api/v1/public/oirs', { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ category: 'consulta', subject: sqlInjection, body: 'Test body' }) });
    assert.equal(sqlSubject.response.status, 201);
    oirsSqlCaseId = sqlSubject.body.data.id;
    const missingCat = await server.request('/api/v1/public/oirs', { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ body: 'Test', subject: 'Test' }) });
    assert.equal(missingCat.response.status, 400);
    const invalidCat = await server.request('/api/v1/public/oirs', { method: 'POST', headers: jsonHeaders(citizenAHeaders), body: JSON.stringify({ category: 'invalid', subject: 'Test', body: 'Test' }) });
    assert.equal(invalidCat.response.status, 400);
    const anonymousNoConsent = await server.request('/api/v1/public/oirs', { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ category: 'consulta', subject: 'Anon no consent', body: 'Test', email: 'anon@test.test' }) });
    assert.equal(anonymousNoConsent.response.status, 400);
    const anonymousNoContact = await server.request('/api/v1/public/oirs', { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ category: 'consulta', subject: 'Anon no contact', body: 'Test', consent: true }) });
    assert.equal(anonymousNoContact.response.status, 400);
});

test('API-038 OIRS reply rejects anonymous, nonexistent case and validates authorization', async () => {
    const anonymous = await server.request(`/api/v1/oirs/${fixture.oirsA.id}/reply`, { method: 'POST', headers: jsonHeaders({}), body: JSON.stringify({ body: 'Test' }) });
    assert.equal(anonymous.response.status, 401);
    const nonexistent = await server.request('/api/v1/oirs/999999999/reply', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ body: 'Test', close_case: false }) });
    assert.ok([409, 500].includes(nonexistent.response.status));
    const officerReply = await server.request(`/api/v1/oirs/${fixture.oirsA.id}/reply`, { method: 'POST', headers: jsonHeaders(officerHeaders), body: JSON.stringify({ body: 'Officer reply', close_case: false }) });
    assert.equal(officerReply.response.status, 403);
    const sqlBody = await server.request(`/api/v1/oirs/${fixture.oirsA.id}/reply`, { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ body: sqlInjection, close_case: false }) });
    assert.equal(sqlBody.response.status, 201);
    const auditFound = await databaseRows("SELECT event_name FROM audit_events WHERE actor_user_id=$1 AND event_name='oirs_case_replied'", [fixture.admin.id]);
    assert.ok(auditFound.length >= 1);
});

test('API-040 notifications enforce recipient ownership and reject invalid pagination', async () => {
    const internalNotifications = await server.request('/api/v1/notifications?is_read=false', { headers: adminHeaders });
    assert.equal(internalNotifications.response.status, 200);
    assert.ok(internalNotifications.body.data.some((item) => item.id === fixture.notificationInternal.id));
    const citizenAList = await server.request('/api/v1/notifications?is_read=false', { headers: citizenAHeaders });
    assert.equal(citizenAList.response.status, 200);
    assert.ok(citizenAList.body.data.every((item) => item.id !== fixture.notificationInternal.id));
    const pageExcessive = await server.request('/api/v1/notifications?size=200', { headers: citizenAHeaders });
    assert.equal(pageExcessive.response.status, 400);
    const invalidSort = await server.request('/api/v1/notifications?page=-1', { headers: citizenAHeaders });
    assert.equal(invalidSort.response.status, 400);
    const markRead = await server.request(`/api/v1/notifications/${fixture.notificationCitizen.id}/read`, { method: 'PATCH', headers: citizenAHeaders });
    assert.equal(markRead.response.status, 200);
    const auditRead = await databaseRows("SELECT event_name FROM audit_events WHERE actor_citizen_id=$1 AND event_name='notification_read'", [fixture.citizenA.id]);
    assert.equal(auditRead.length, 1);
});

test('SQL injection treated as data across all query and body parameters', async () => {
    const publicTramites = await server.request(`/api/v1/public/tramites?q=${encodeURIComponent(sqlInjection)}`);
    assert.equal(publicTramites.response.status, 200);
    assert.equal(JSON.stringify(publicTramites.body).includes('syntax'), false);
    assert.equal(JSON.stringify(publicTramites.body).includes('error'), false);
    const departments = await server.request('/api/v1/departments', { headers: adminHeaders });
    assert.equal(departments.response.status, 200);
    const usersSearch = await server.request(`/api/v1/users?q=${encodeURIComponent(sqlInjection)}`, { headers: adminHeaders });
    assert.equal(usersSearch.response.status, 200);
    assert.equal(usersSearch.body.data.length, 0);
});

test('Mass assignment blocked across write endpoints via Zod .strict()', async () => {
    const createAdminUser = await server.request('/api/v1/users', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ username: `${fixture.prefix}_masstest`, email: `${fixture.prefix}_masstest@test.test`, full_name: 'Mass Test', department_id: fixture.departmentA.id, role_ids: [fixture.adminRole.id], password_hash: 'hacked', is_superadmin: true, extra_field: 'test' }) });
    assert.equal(createAdminUser.response.status, 400);
    const createDept = await server.request('/api/v1/departments', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: `${fixture.prefix}_MA`.toUpperCase().slice(0, 30), name: 'Mass Dept', is_system: true, extra: 'x' }) });
    assert.equal(createDept.response.status, 400);
});

test('Error responses never expose stack, SQL or connection strings', async () => {
    const errorCases = [
        { method: 'POST', headers: jsonHeaders({}), path: '/api/v1/auth/login', body: JSON.stringify({ username: sqlInjection, password: 'x' }) },
        { method: 'GET', headers: {}, path: '/api/v1/profile/me' },
        { method: 'POST', headers: jsonHeaders({}), path: '/api/v1/auth/citizen-login', body: JSON.stringify({ email: 'nonexistent@test.test', password: 'invalidshort' }) },
    ];
    for (const c of errorCases) {
        const result = await server.request(c.path, { method: c.method, headers: c.headers, body: c.body });
        const text = JSON.stringify(result.body);
        assert.equal(text.includes('stack'), false, `${c.path} should not expose stack`);
        assert.equal(text.includes('POSTGRES'), false, `${c.path} should not expose POSTGRES`);
        assert.equal(text.includes('connection'), false, `${c.path} should not expose connection`);
    }
});

test('Audit events include actor and request_id; anonymous events excluded from actor check', async () => {
    const allEvents = await databaseRows("SELECT event_name, payload_json, actor_user_id, actor_citizen_id FROM audit_events WHERE payload_json->>'request_id' IS NOT NULL ORDER BY occurred_at DESC LIMIT 50");
    assert.ok(allEvents.length > 0);
    for (const event of allEvents) {
        if (event.event_name === 'password_recovery_requested' || event.event_name === 'oirs_case_created' || event.event_name === 'oirs_anonymous_message_created') {
            continue;
        }
        assert.ok(event.actor_user_id || event.actor_citizen_id, `Event ${event.event_name} missing actor`);
        const text = JSON.stringify(event.payload_json);
        assert.equal(text.includes('access_token'), false, `${event.event_name} should not expose access_token`);
    }
});

test('Anonymous OIRS audit preserves context without inventing an actor or leaking tracking credentials', async () => {
    const event = (await databaseRows("SELECT event_name, entity_type, entity_id, actor_user_id, actor_citizen_id, payload_json FROM audit_events WHERE event_name='oirs_anonymous_message_created' ORDER BY occurred_at DESC LIMIT 1"))[0];
    assert.ok(event, 'Anonymous OIRS message must create an audit event');
    assert.equal(event.event_name, 'oirs_anonymous_message_created');
    assert.equal(event.entity_type, 'oirs_case');
    assert.ok(event.entity_id);
    assert.equal(event.actor_user_id, null);
    assert.equal(event.actor_citizen_id, null);
    assert.equal(event.payload_json.anonymous, true);
    assert.ok(event.payload_json.request_id);
    const payload = JSON.stringify(event.payload_json);
    assert.equal(payload.includes('tracking_token'), false);
    assert.equal(payload.includes('access_token'), false);
    assert.equal(payload.includes('body'), false);
});
