const assert = require('node:assert/strict');
const { createApp } = require('../../src/app');
const { end } = require('../../src/database/pool');

function requireQaPostgres() {
    assert.equal(process.env.PERSISTENCE_MODE, 'postgres', 'API and integration tests require PERSISTENCE_MODE=postgres');
    assert.ok(process.env.QA_DATABASE_URL || process.env.DATABASE_URL, 'QA_DATABASE_URL or DATABASE_URL is required');
}

async function startServer() {
    requireQaPostgres();
    const server = await new Promise((resolve) => {
        const listener = createApp().listen(0, '127.0.0.1', () => resolve(listener));
    });
    const { port } = server.address();
    return {
        baseUrl: `http://127.0.0.1:${port}`,
        async request(route, options = {}) {
            const response = await fetch(`http://127.0.0.1:${port}${route}`, options);
            const contentType = response.headers.get('content-type') || '';
            const body = contentType.includes('application/json') ? await response.json() : null;
            return { response, body };
        },
        async stop() {
            await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
            await end();
        },
    };
}

async function internalToken(server) {
    const result = await server.request('/api/v1/auth/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: 'admin', password: 'admin123' }) });
    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    return result.body.data.access_token;
}

async function citizenToken(server) {
    const result = await server.request('/api/v1/auth/citizen-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email: 'ciudadano@email.com', password: 'ciudadano123' }) });
    assert.equal(result.response.status, 200, JSON.stringify(result.body));
    return result.body.data.access_token;
}

module.exports = { startServer, internalToken, citizenToken };
