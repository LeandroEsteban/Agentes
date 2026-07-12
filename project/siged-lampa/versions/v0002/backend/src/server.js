const { createApp } = require('./app');
const { port } = require('./config/env');
const { end } = require('./database/pool');
const server = createApp().listen(port, () => console.log(`SIGED API listening on ${port}`));
const shutdown = async () => { server.close(async () => { await end(); process.exit(0); }); };
process.on('SIGINT', shutdown); process.on('SIGTERM', shutdown);
