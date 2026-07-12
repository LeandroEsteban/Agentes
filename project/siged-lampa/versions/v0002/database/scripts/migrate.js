const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { Pool } = require('pg');

const migrationsDir = path.join(__dirname, '..', 'migrations');

async function getFileHash(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    return crypto.createHash('sha256').update(content, 'utf-8').digest('hex');
}

async function getAppliedMigrations(pool) {
    const result = await pool.query(
        "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'schema_migrations')"
    );
    if (!result.rows[0].exists) {
        return [];
    }
    const rows = await pool.query(
        'SELECT version, checksum_sha256 FROM schema_migrations ORDER BY version'
    );
    return rows.rows;
}

async function migrate(options = {}) {
    const pool = options.pool || new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://siged:siged2026@localhost:5432/siged_lampa'
    });

    const applied = await getAppliedMigrations(pool);
    const appliedMap = new Map(applied.map(r => [r.version, r.checksum_sha256]));

    const files = fs.readdirSync(migrationsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    const results = [];

    for (const file of files) {
        const version = file.replace(/\.sql$/, '');
        const filePath = path.join(migrationsDir, file);
        const currentHash = await getFileHash(filePath);

        if (appliedMap.has(version)) {
            const storedHash = appliedMap.get(version);
            if (storedHash !== currentHash) {
                throw new Error(
                    `Migration ${version} hash mismatch: stored=${storedHash}, current=${currentHash}. ` +
                    'Migration modified after application.'
                );
            }
            results.push({ version, status: 'skipped', reason: 'already applied' });
            continue;
        }

        const sql = fs.readFileSync(filePath, 'utf-8');
        const start = Date.now();

        try {
            await pool.query('BEGIN');
            await pool.query(sql);

            // 001 creates the ledger, so it can be recorded in the same transaction.
            await pool.query(
                `INSERT INTO schema_migrations (version, checksum_sha256, execution_ms) VALUES ($1, $2, $3)`,
                [version, currentHash, Date.now() - start]
            );

            await pool.query('COMMIT');
            results.push({ version, status: 'applied', execution_ms: Date.now() - start });
        } catch (err) {
            await pool.query('ROLLBACK');
            results.push({ version, status: 'failed', error: err.message });
            throw new Error(`Migration ${version} failed: ${err.message}`);
        }
    }

    return results;
}

if (require.main === module) {
    migrate()
        .then(results => {
            console.log(JSON.stringify(results, null, 2));
            process.exit(results.some(r => r.status === 'failed') ? 1 : 0);
        })
        .catch(err => {
            console.error(err.message);
            process.exit(1);
        });
}

module.exports = { migrate };
