const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, internalToken, citizenToken } = require('../helpers/http-server');

let server;
test.before(async () => { server = await startServer(); });
test.after(async () => { await server.stop(); });

test('internal and citizen authentication enforce credentials and actor boundaries with PostgreSQL', async () => {
    const invalid = await server.request('/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json', 'x-request-id': 'api-invalid-login' }, body: JSON.stringify({ username: 'admin', password: 'wrong-password' }) });
    assert.equal(invalid.response.status, 401);
    assert.equal(invalid.body.error.code, 'INVALID_CREDENTIALS');
    assert.equal(invalid.response.headers.get('x-request-id'), 'api-invalid-login');

    const token = await internalToken(server);
    const me = await server.request('/api/v1/profile/me', { headers: { authorization: `Bearer ${token}` } });
    assert.equal(me.response.status, 200);
    assert.equal(me.body.data.username, 'admin');

    const citizen = await citizenToken(server);
    const citizenOnInternal = await server.request('/api/v1/users', { headers: { authorization: `Bearer ${citizen}` } });
    assert.equal(citizenOnInternal.response.status, 403);
    const missing = await server.request('/api/v1/profile/me');
    assert.equal(missing.response.status, 401);
});
