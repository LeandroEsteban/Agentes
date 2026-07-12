const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const seedsDir = path.join(__dirname, '..', 'seeds');

async function seed(options = {}) {
    const pool = options.pool || new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://siged:siged2026@localhost:5432/siged_lampa'
    });

    const files = fs.readdirSync(seedsDir)
        .filter(f => f.endsWith('.sql'))
        .sort();

    const results = [];

    for (const file of files) {
        const filePath = path.join(seedsDir, file);
        const sql = fs.readFileSync(filePath, 'utf-8');
        const start = Date.now();

        try {
            await pool.query(sql);
            results.push({ seed: file, status: 'applied', execution_ms: Date.now() - start });
        } catch (err) {
            results.push({ seed: file, status: 'failed', error: err.message });
        }
    }

    return results;
}

if (require.main === module) {
    const pool = new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://siged:siged2026@localhost:5432/siged_lampa'
    });

    seed({ pool })
        .then(results => {
            pool.end();
            console.log(JSON.stringify(results, null, 2));
            process.exit(results.some(r => r.status === 'failed') ? 1 : 0);
        })
        .catch(err => {
            console.error(err.message);
            process.exit(1);
        });
}

module.exports = { seed };
