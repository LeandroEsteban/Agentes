const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, internalToken } = require('../helpers/http-server');

let server;
test.before(async () => { server = await startServer(); });
test.after(async () => { await server.stop(); });

test('logout revokes the PostgreSQL-backed session and blocks token reuse', async () => {
    const token = await internalToken(server);
    const logout = await server.request('/api/v1/auth/logout', { method: 'POST', headers: { authorization: `Bearer ${token}` } });
    assert.equal(logout.response.status, 204);
    const afterLogout = await server.request('/api/v1/profile/me', { headers: { authorization: `Bearer ${token}` } });
    assert.equal(afterLogout.response.status, 401);
    assert.equal(afterLogout.body.error.code, 'SESSION_REVOKED');
});
