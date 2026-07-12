const { Pool } = require('pg');

const SCHEMA_SQL = `
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
`;

async function reset(options = {}) {
    const pool = options.pool || new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://siged:siged2026@localhost:5432/siged_lampa'
    });

    const env = process.env.APP_ENV || 'dev';

    if (env === 'production') {
        console.error('RESET BLOCKED: Cannot reset production database.');
        process.exit(1);
    }

    if (!options.force && env === 'qa') {
        console.error('RESET requires --force for QA environment.');
        process.exit(1);
    }

    const start = Date.now();

    try {
        await pool.query(SCHEMA_SQL);
        console.log(JSON.stringify({
            status: 'reset',
            environment: env,
            execution_ms: Date.now() - start
        }));
    } catch (err) {
        console.error(`Reset failed: ${err.message}`);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

if (require.main === module) {
    const force = process.argv.includes('--force');
    reset({ force });
}

module.exports = { reset };
