const path = require('path');
const { migrate } = require('../../../database/scripts/migrate');
const { seed } = require('../../../database/scripts/seed');
const { getPool } = require('./pool');

async function runMigrations() {
    const pool = getPool();
    const results = await migrate({ pool });
    return results;
}

async function runSeeds() {
    const pool = getPool();
    const results = await seed({ pool });
    return results;
}

module.exports = { runMigrations, runSeeds };
