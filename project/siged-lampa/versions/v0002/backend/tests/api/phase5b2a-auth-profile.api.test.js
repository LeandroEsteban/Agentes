const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer } = require('../helpers/http-server');
const { createFixtures, cleanupFixtures, login, authHeader, databaseRows } = require('../helpers/phase5b2a-fixtures');

let server; let fixture;
test.before(async () => { server = await startServer(); fixture = await createFixtures(); });
test.after(async () => { try { await cleanupFixtures(fixture); } finally { await server.stop(); } });

test('API-001 internal login persists a signed revocable session and audits without sensitive data', async () => {
    const result = await login(server, '/api/v1/auth/login', { username: fixture.admin.username, password: fixture.password });
    assert.equal(result.response.status, 200); assert.ok(result.body.data.access_token.split('.').length === 3); assert.equal(JSON.stringify(result.body).includes(fixture.password), false);
    const sessions = await databaseRows('SELECT token_hash, revoked_at FROM sessions WHERE user_id = $1', [fixture.admin.id]);
    assert.equal(sessions.length, 1); assert.ok(sessions[0].token_hash); assert.equal(sessions[0].revoked_at, null);
    const audits = await databaseRows("SELECT payload_json FROM audit_events WHERE event_name = 'login_succeeded' AND actor_user_id = $1", [fixture.admin.id]);
    assert.ok(audits.length); assert.equal(JSON.stringify(audits).includes(result.body.data.access_token), false);
});

test('API-001 rejects invalid, inactive, manipulated and revoked internal sessions', async () => {
    for (const body of [{ username: fixture.admin.username, password: 'InvalidPass123!' }, { username: 'missing-user', password: fixture.password }, { username: fixture.inactiveUser.username, password: fixture.password }]) {
        const result = await login(server, '/api/v1/auth/login', body); assert.equal(result.response.status, 401);
    }
    const valid = await login(server, '/api/v1/auth/login', { username: fixture.admin.username, password: fixture.password }); const token = valid.body.data.access_token;
    const tampered = await server.request('/api/v1/profile/me', { headers: authHeader(`${token.slice(0, -1)}x`) }); assert.equal(tampered.response.status, 401);
    const logout = await server.request('/api/v1/auth/logout', { method: 'POST', headers: authHeader(token) }); assert.equal(logout.response.status, 204);
    const revoked = await server.request('/api/v1/profile/me', { headers: authHeader(token) }); assert.equal(revoked.response.status, 401); assert.equal(revoked.body.error.code, 'SESSION_REVOKED');
    const audits = await databaseRows("SELECT event_name FROM audit_events WHERE event_name = 'logout' AND actor_user_id = $1", [fixture.admin.id]); assert.equal(audits.length, 1);
});

test('API-002, API-004 and API-005 authenticate citizen identity without exposing an internal profile', async () => {
    const invalid = await login(server, '/api/v1/auth/citizen-login', { email: fixture.citizenA.email, password: 'InvalidPass123!' }); assert.equal(invalid.response.status, 401);
    const inactive = await login(server, '/api/v1/auth/citizen-login', { email: fixture.inactiveCitizen.email, password: fixture.password }); assert.equal(inactive.response.status, 401);
    const result = await login(server, '/api/v1/auth/citizen-login', { email: fixture.citizenA.email, password: fixture.password }); assert.equal(result.response.status, 200);
    const token = result.body.data.access_token; const sessions = await databaseRows('SELECT id FROM citizen_sessions WHERE citizen_account_id = $1 AND revoked_at IS NULL', [fixture.citizenA.id]); assert.equal(sessions.length, 1);
    const me = await server.request('/api/v1/profile/me', { headers: authHeader(token) }); assert.equal(me.response.status, 200); assert.equal(me.body.data.email, fixture.citizenA.email); assert.equal(me.body.data.username, undefined);
    const update = await server.request('/api/v1/profile/me', { method: 'PUT', headers: { ...authHeader(token), 'content-type': 'application/json' }, body: JSON.stringify({ full_name: 'Citizen A updated' }) }); assert.equal(update.response.status, 200);
    const internalOnly = await server.request('/api/v1/users', { headers: authHeader(token) }); assert.equal(internalOnly.response.status, 403);
    const logout = await server.request('/api/v1/auth/logout', { method: 'POST', headers: authHeader(token) }); assert.equal(logout.response.status, 204);
    const revoked = await server.request('/api/v1/notifications', { headers: authHeader(token) }); assert.equal(revoked.response.status, 401);
});

test('API-004 exposes only database-derived capabilities and the simulated signer profile', async () => {
    const profiles = [];
    for (const user of [fixture.admin, fixture.reviewer, fixture.approver, fixture.signer, fixture.officer]) {
        const session = await login(server, '/api/v1/auth/login', { username: user.username, password: fixture.password });
        assert.equal(session.response.status, 200);
        const response = await server.request('/api/v1/profile/me', { headers: authHeader(session.body.data.access_token) });
        assert.equal(response.response.status, 200, JSON.stringify(response.body));
        profiles.push([user, response.body.data]);
    }
    const profileFor = (user) => profiles.find(([candidate]) => candidate.id === user.id)[1];
    assert.ok(profileFor(fixture.admin).permissions.includes('documents.create'));
    assert.ok(profileFor(fixture.reviewer).permissions.includes('documents.review'));
    assert.ok(profileFor(fixture.approver).permissions.includes('documents.review'));
    assert.equal(profileFor(fixture.signer).signature_profile_id, fixture.sigProfile.id);
    assert.equal(profileFor(fixture.officer).permissions.length, 0);
    for (const [, profile] of profiles) {
        const serialized = JSON.stringify(profile);
        assert.equal(Object.hasOwn(profile, 'password_hash'), false);
        assert.equal(serialized.includes('token_hash'), false);
        assert.equal(serialized.includes('secret_hash'), false);
    }
});

test('API-003 recovers without disclosing account existence and validates body', async () => {
    const valid = await server.request('/api/v1/auth/recover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ channel: 'email', identifier: fixture.admin.email }) }); assert.equal(valid.response.status, 202);
    const invalid = await server.request('/api/v1/auth/recover', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ channel: 'sms', identifier: 'x' }) }); assert.equal(invalid.response.status, 400);
    const audits = await databaseRows("SELECT payload_json FROM audit_events WHERE event_name = 'password_recovery_requested'"); assert.ok(audits.some((row) => !JSON.stringify(row.payload_json).includes(fixture.admin.email)));
});
