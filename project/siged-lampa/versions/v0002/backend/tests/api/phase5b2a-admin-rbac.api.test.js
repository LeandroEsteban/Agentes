const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../helpers/http-server');
const { createFixtures, cleanupFixtures, login, authHeader, databaseRows } = require('../helpers/phase5b2a-fixtures');

let server; let fixture; let adminHeaders; let officerHeaders; let citizenHeaders;
const jsonHeaders = (headers) => ({ ...headers, 'content-type': 'application/json' });
test.before(async () => { server = await startServer(); fixture = await createFixtures(); const admin = await login(server, '/api/v1/auth/login', { username: fixture.admin.username, password: fixture.password }); const officer = await login(server, '/api/v1/auth/login', { username: fixture.officer.username, password: fixture.password }); const citizen = await login(server, '/api/v1/auth/citizen-login', { email: fixture.citizenA.email, password: fixture.password }); adminHeaders = authHeader(admin.body.data.access_token); officerHeaders = authHeader(officer.body.data.access_token); citizenHeaders = authHeader(citizen.body.data.access_token); });
test.after(async () => { try { await cleanupFixtures(fixture); } finally { await server.stop(); } });

test('API-006 through API-010 derive RBAC from PostgreSQL permissions and omit sensitive fields', async () => {
    const list = await server.request('/api/v1/users?size=1', { headers: adminHeaders }); assert.equal(list.response.status, 200); assert.equal(Object.hasOwn(list.body.data[0], 'password_hash'), false);
    for (const headers of [officerHeaders, citizenHeaders, {}]) { const denied = await server.request('/api/v1/users', { headers }); assert.ok([401, 403].includes(denied.response.status)); }
    const created = await server.request('/api/v1/users', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ username: `${fixture.prefix}_newuser`, email: `${fixture.prefix}_newuser@example.test`, full_name: 'Fixture New User', department_id: fixture.departmentA.id, role_ids: [fixture.emptyRole.id], password: fixture.password }) }); assert.equal(created.response.status, 201);
    const duplicate = await server.request('/api/v1/users', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ username: `${fixture.prefix}_newuser`, email: `${fixture.prefix}_newuser@example.test`, full_name: 'Fixture New User', department_id: fixture.departmentA.id, role_ids: [fixture.emptyRole.id] }) }); assert.equal(duplicate.response.status, 409);
    const badRoles = await server.request('/api/v1/users', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ username: 'bad', email: 'invalid-email', full_name: 'x', department_id: fixture.departmentA.id, role_ids: [fixture.emptyRole.id, fixture.emptyRole.id] }) }); assert.equal(badRoles.response.status, 400);
    const updated = await server.request(`/api/v1/users/${created.body.data.id}`, { method: 'PUT', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ status: 'inactive' }) }); assert.equal(updated.response.status, 200);
    const missing = await server.request('/api/v1/users/999999999', { method: 'PUT', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ status: 'active' }) }); assert.equal(missing.response.status, 404);
    const roles = await server.request('/api/v1/roles', { headers: adminHeaders }); assert.equal(roles.response.status, 200); assert.ok(roles.body.data.some((role) => role.id === fixture.adminRole.id));
    const permissionRows = await databaseRows('SELECT p.code FROM user_roles ur JOIN roles r ON r.id=ur.role_id JOIN role_permissions rp ON rp.role_id=r.id JOIN permissions p ON p.id=rp.permission_id WHERE ur.user_id=$1', [fixture.admin.id]); assert.ok(permissionRows.some((row) => row.code === 'users.view'));
    const audits = await databaseRows("SELECT event_name FROM audit_events WHERE actor_user_id = $1 AND event_name IN ('user_created','user_updated')", [fixture.admin.id]); assert.equal(audits.length, 2);
});

test('API-011 through API-014 enforce their router permissions and persist audited catalog changes', async () => {
    const departments = await server.request('/api/v1/departments', { headers: adminHeaders }); assert.equal(departments.response.status, 200);
    const department = await server.request('/api/v1/departments', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: `${fixture.prefix}_C`.toUpperCase().slice(0, 30), name: `${fixture.prefix} Department C`, manager_user_id: fixture.admin.id }) }); assert.equal(department.response.status, 201);
    const duplicate = await server.request('/api/v1/departments', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: `${fixture.prefix}_C`.toUpperCase().slice(0, 30), name: `${fixture.prefix} duplicate` }) }); assert.equal(duplicate.response.status, 409);
    const badManager = await server.request('/api/v1/departments', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: `${fixture.prefix}_D`.toUpperCase().slice(0, 30), name: `${fixture.prefix} bad manager`, manager_user_id: 999999999 }) }); assert.equal(badManager.response.status, 422);
    const denied = await server.request('/api/v1/departments', { headers: officerHeaders }); assert.equal(denied.response.status, 403);
    const documentTypes = await server.request('/api/v1/document-types', { headers: adminHeaders }); assert.equal(documentTypes.response.status, 200);
    const documentType = await server.request('/api/v1/document-types', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: `${fixture.prefix}DT`.toUpperCase().slice(0, 30), name: `${fixture.prefix} Document Type`, retention_days: 10, requires_signature: false, is_active: true }) }); assert.equal(documentType.response.status, 201);
    const forbidden = await server.request('/api/v1/document-types', { method: 'POST', headers: jsonHeaders(citizenHeaders), body: JSON.stringify({ code: 'NO', name: 'No' }) }); assert.equal(forbidden.response.status, 403);
    const persisted = await databaseRows('SELECT id FROM document_types WHERE id = $1', [documentType.body.data.id]); assert.equal(persisted.length, 1);
});

test('supplemental procedure types and external entities use actual admin permissions, validation and audit', async () => {
    const procedure = await server.request('/api/v1/admin/procedure-types', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: `${fixture.prefix}PT`.toUpperCase().slice(0, 30), name: `${fixture.prefix} Procedure Type`, owner_department_id: fixture.departmentA.id, requires_login: true, estimated_days: 5, is_active: true }) }); assert.equal(procedure.response.status, 201);
    const procedureUpdate = await server.request(`/api/v1/admin/procedure-types/${procedure.body.data.id}`, { method: 'PUT', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ code: procedure.body.data.code, name: procedure.body.data.name, owner_department_id: fixture.departmentB.id, requires_login: true, estimated_days: 5, is_active: true }) }); assert.equal(procedureUpdate.response.status, 200);
    const entity = await server.request('/api/v1/admin/external-entities', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ entity_type: 'organization', name: `${fixture.prefix} external`, email: `${fixture.prefix}@entity.test`, status: 'active' }) }); assert.equal(entity.response.status, 201);
    const updated = await server.request(`/api/v1/admin/external-entities/${entity.body.data.id}`, { method: 'PUT', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ entity_type: 'organization', name: `${fixture.prefix} external updated`, status: 'inactive' }) }); assert.equal(updated.response.status, 200);
    const denied = await server.request('/api/v1/admin/external-entities', { headers: citizenHeaders }); assert.equal(denied.response.status, 403);
    const invalid = await server.request('/api/v1/admin/external-entities', { method: 'POST', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ entity_type: '' }) }); assert.equal(invalid.response.status, 400);
    const permissions = await server.request(`/api/v1/roles/${fixture.adminRole.id}/permissions`, { method: 'PUT', headers: jsonHeaders(adminHeaders), body: JSON.stringify({ permission_ids: fixture.permissionIds }) }); assert.equal(permissions.response.status, 200);
    const audit = await databaseRows("SELECT event_name FROM audit_events WHERE actor_user_id=$1 AND event_name IN ('external_entity_created','external_entity_updated')", [fixture.admin.id]); assert.equal(audit.length, 2);
});
