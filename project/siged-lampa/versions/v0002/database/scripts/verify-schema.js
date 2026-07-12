const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const EXPECTED_FUNCTIONAL_TABLES = [
    'users', 'roles', 'permissions', 'user_roles', 'role_permissions',
    'sessions', 'two_factor_settings',
    'departments', 'external_entities',
    'document_types', 'document_templates', 'document_statuses',
    'documents', 'document_versions', 'document_attachments',
    'document_comments', 'document_review_requests', 'document_review_responses',
    'document_approvals', 'document_signatures', 'signature_profiles',
    'expedients', 'expedient_documents', 'expedient_events',
    'correspondence', 'correspondence_recipients', 'correspondence_routes',
    'citizen_accounts', 'citizen_profiles', 'procedure_types',
    'published_procedures', 'citizen_requests', 'citizen_request_attachments',
    'oirs_cases', 'oirs_messages',
    'news_posts', 'public_notices', 'calendar_events',
    'notifications', 'audit_events'
];

async function verifySchema(options = {}) {
    const pool = options.pool || new Pool({
        connectionString: process.env.DATABASE_URL || 'postgresql://siged:siged2026@localhost:5432/siged_lampa'
    });

    const result = {
        status: 'ok',
        functional_tables: 0,
        technical_tables: 0,
        primary_keys: 0,
        foreign_keys: 0,
        unique_constraints: 0,
        check_constraints: 0,
        indexes: 0,
        tables_detail: [],
        migrations_applied: 0,
        migrations_pending: 17,
        checksums_valid: false,
        issues: []
    };

    // Check schema_migrations exists
    const techResult = await pool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') as exists`
    );
    if (techResult.rows[0].exists) {
        result.technical_tables = 1;
    }

    // Count functional tables
    for (const tableName of EXPECTED_FUNCTIONAL_TABLES) {
        const tblResult = await pool.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = $1) as exists`,
            [tableName]
        );
        const exists = tblResult.rows[0].exists;

        if (exists) {
            result.functional_tables++;
            result.tables_detail.push({ name: tableName, exists: true });

            // Count PKs
            const pkResult = await pool.query(
                `SELECT COUNT(*) as cnt FROM information_schema.table_constraints tc
                 JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
                 WHERE tc.table_name = $1 AND tc.constraint_type = 'PRIMARY KEY' AND tc.table_schema = 'public'`,
                [tableName]
            );
            result.primary_keys += parseInt(pkResult.rows[0].cnt);

            // Count FKs
            const fkResult = await pool.query(
                `SELECT COUNT(*) as cnt FROM information_schema.table_constraints
                 WHERE table_name = $1 AND constraint_type = 'FOREIGN KEY' AND table_schema = 'public'`,
                [tableName]
            );
            result.foreign_keys += parseInt(fkResult.rows[0].cnt);

            // Count UNIQUE
            const uqResult = await pool.query(
                `SELECT COUNT(*) as cnt FROM information_schema.table_constraints
                 WHERE table_name = $1 AND constraint_type = 'UNIQUE' AND table_schema = 'public'`,
                [tableName]
            );
            result.unique_constraints += parseInt(uqResult.rows[0].cnt);

            // Count CHECK
            const ckResult = await pool.query(
                `SELECT COUNT(*) as cnt FROM information_schema.table_constraints
                 WHERE table_name = $1 AND constraint_type = 'CHECK' AND table_schema = 'public'`,
                [tableName]
            );
            result.check_constraints += parseInt(ckResult.rows[0].cnt);
        } else {
            result.tables_detail.push({ name: tableName, exists: false });
            result.issues.push(`Missing functional table: ${tableName}`);
        }
    }

    // Count indexes
    const idxResult = await pool.query(
        `SELECT COUNT(*) as cnt FROM pg_indexes WHERE schemaname = 'public'`
    );
    result.indexes = parseInt(idxResult.rows[0].cnt);

    // Check migration status
    const migResult = await pool.query(
        `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'schema_migrations') as exists`
    );
    if (migResult.rows[0].exists) {
        const appliedResult = await pool.query(`SELECT version, checksum_sha256 FROM schema_migrations ORDER BY version`);
        result.migrations_applied = appliedResult.rows.length;
        result.migrations_versions = appliedResult.rows.map((row) => row.version);
        const files = fs.readdirSync(path.resolve(__dirname, '../migrations')).filter((file) => file.endsWith('.sql')).sort();
        const applied = new Map(appliedResult.rows.map((row) => [row.version, row.checksum_sha256]));
        result.migrations_pending = files.filter((file) => !applied.has(file.replace(/\.sql$/, ''))).length;
        const mismatches = files.filter((file) => {
            const version = file.replace(/\.sql$/, '');
            return applied.has(version) && applied.get(version) !== crypto.createHash('sha256').update(fs.readFileSync(path.resolve(__dirname, '../migrations', file), 'utf8')).digest('hex');
        });
        result.checksums_valid = mismatches.length === 0;
        if (result.migrations_applied !== files.length) result.issues.push(`Expected ${files.length} migrations, found ${result.migrations_applied}`);
        if (result.migrations_pending !== 0) result.issues.push(`${result.migrations_pending} migrations pending`);
        if (!result.checksums_valid) result.issues.push(`Migration checksum mismatch: ${mismatches.join(', ')}`);
    } else {
        result.issues.push('Missing schema_migrations table');
    }

    result.status = result.issues.length === 0 ? 'ok' : 'issues_found';
    await pool.end();
    return result;
}

if (require.main === module) {
    verifySchema()
        .then(result => {
            console.log(JSON.stringify(result, null, 2));
            process.exit(result.status === 'ok' ? 0 : 1);
        })
        .catch(err => {
            console.error(err.message);
            process.exit(1);
        });
}

module.exports = { verifySchema };
