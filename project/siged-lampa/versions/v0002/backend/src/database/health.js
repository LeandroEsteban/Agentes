const { getPool } = require('./pool');
const fs = require('fs');
const path = require('path');

const FUNCTIONAL_TABLES = [
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

async function healthCheck() {
    const pool = getPool();
    const result = {
        status: 'unhealthy',
        database: 'postgresql',
        connection: 'error',
        migrations: 'unknown',
        functional_tables: 0,
        persistence_mode: process.env.PERSISTENCE_MODE || 'postgres',
        details: {}
    };

    try {
        // Connection test
        const connResult = await pool.query('SELECT 1 as ok');
        result.connection = connResult.rows[0].ok === 1 ? 'ok' : 'error';

        // Count functional tables
        let tableCount = 0;
        for (const tableName of FUNCTIONAL_TABLES) {
            const tblResult = await pool.query(
                `SELECT EXISTS (SELECT FROM information_schema.tables
                 WHERE table_schema = 'public' AND table_name = $1) as exists`,
                [tableName]
            );
            if (tblResult.rows[0].exists) tableCount++;
        }
        result.functional_tables = tableCount;

        // Check migrations
        const migResult = await pool.query(
            `SELECT EXISTS (SELECT FROM information_schema.tables
             WHERE table_schema = 'public' AND table_name = 'schema_migrations') as exists`
        );
        if (migResult.rows[0].exists) {
            const appResult = await pool.query(
                `SELECT COUNT(*) as cnt FROM schema_migrations`
            );
            const totalMigrations = fs.readdirSync(path.resolve(__dirname, '../../../database/migrations')).filter((name) => name.endsWith('.sql')).length;
            const applied = parseInt(appResult.rows[0].cnt);
            result.migrations = applied >= totalMigrations ? 'up_to_date' :
                `${applied}/${totalMigrations} applied`;
            result.details.migrations_applied = applied;
            result.details.migrations_expected = totalMigrations;
        } else {
            result.migrations = 'no_schema_migrations_table';
        }

        result.status = (result.connection === 'ok' && result.functional_tables === 40 && result.migrations === 'up_to_date') ? 'healthy' : 'unhealthy';
    } catch (err) {
        result.status = 'unhealthy';
        result.connection = 'error';
        result.details.error = 'database unavailable';
    }

    return result;
}

module.exports = { healthCheck };
