const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, internalToken, citizenToken } = require('../helpers/http-server');

let server;
test.before(async () => { server = await startServer(); });
test.after(async () => { await server.stop(); });

test('QA health, PostgreSQL and both authentication modes are operational', async () => {
    const health = await server.request('/health');
    assert.equal(health.response.status, 200);
    assert.equal(health.body.status, 'healthy');
    assert.ok(health.response.headers.get('x-request-id'));

    const database = await server.request('/health/database');
    assert.equal(database.response.status, 200);
    assert.equal(database.body.database, 'postgresql');
    assert.equal(database.body.connection, 'ok');
    assert.equal(database.body.migrations, 'up_to_date');

    assert.ok(await internalToken(server));
    assert.ok(await citizenToken(server));
});
