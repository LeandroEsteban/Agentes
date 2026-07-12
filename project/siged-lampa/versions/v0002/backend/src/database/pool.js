const { Pool } = require('pg');

let pool = null;

function getPool() {
    if (!pool) {
        const env = process.env.APP_ENV || 'dev';
        let connectionString;

        if (env === 'qa') {
            connectionString = process.env.QA_DATABASE_URL || process.env.DATABASE_URL;
        } else if (env === 'production') {
            connectionString = process.env.DATABASE_URL;
        } else {
            connectionString = process.env.DEV_DATABASE_URL || process.env.DATABASE_URL;
        }

        if (!connectionString) throw new Error('DATABASE_URL is required for PostgreSQL persistence');

        pool = new Pool({
            connectionString,
            min: Number(process.env.DB_POOL_MIN || 0),
            max: Number(process.env.DB_POOL_MAX || 10),
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: Number(process.env.DB_CONNECTION_TIMEOUT_MS || 5000),
            query_timeout: Number(process.env.DB_QUERY_TIMEOUT_MS || 10000),
        });

        pool.on('error', (err) => {
            console.error('PostgreSQL pool error');
        });
    }
    return pool;
}

async function query(text, params) {
    const client = await getPool().connect();
    try {
        const result = await client.query(text, params);
        return result;
    } finally {
        client.release();
    }
}

async function end() {
    if (pool) {
        await pool.end();
        pool = null;
    }
}

module.exports = { getPool, query, end };
