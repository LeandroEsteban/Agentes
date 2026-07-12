const test = require('node:test');
const assert = require('node:assert/strict');
const { startServer, internalToken, citizenToken } = require('../helpers/http-server');

let server;
test.before(async () => { server = await startServer(); });
test.after(async () => { await server.stop(); });

test('public procedure detail only exposes an active published procedure', async () => {
    const list = await server.request('/api/v1/public/tramites');
    assert.equal(list.response.status, 200, JSON.stringify(list.body));
    const procedure = list.body.data[0];
    assert.ok(procedure, 'QA seed requires one published procedure');
    const detail = await server.request(`/api/v1/public/tramites/${procedure.id}`);
    assert.equal(detail.response.status, 200, JSON.stringify(detail.body));
    assert.equal(detail.body.data.id, procedure.id);
    const missing = await server.request('/api/v1/public/tramites/999999999');
    assert.equal(missing.response.status, 404);
});

test('external entity admin routes require admin and support list/create/update', async () => {
    const citizen = await citizenToken(server);
    const denied = await server.request('/api/v1/admin/external-entities', { headers: { authorization: `Bearer ${citizen}` } });
    assert.equal(denied.response.status, 403);
    const token = await internalToken(server);
    const headers = { authorization: `Bearer ${token}`, 'content-type': 'application/json' };
    const list = await server.request('/api/v1/admin/external-entities', { headers });
    assert.equal(list.response.status, 200, JSON.stringify(list.body));
    const name = `Phase6A-${Date.now()}`;
    const created = await server.request('/api/v1/admin/external-entities', { method: 'POST', headers, body: JSON.stringify({ entity_type: 'organization', name, status: 'active' }) });
    assert.equal(created.response.status, 201, JSON.stringify(created.body));
    const updated = await server.request(`/api/v1/admin/external-entities/${created.body.data.id}`, { method: 'PUT', headers, body: JSON.stringify({ entity_type: 'organization', name: `${name}-updated`, status: 'inactive' }) });
    assert.equal(updated.response.status, 200, JSON.stringify(updated.body));
    assert.equal(updated.body.data.status, 'inactive');
});
