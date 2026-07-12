const crypto = require('crypto');
const passwords = require('../../src/auth/password');
const { getPool } = require('../../src/database/pool');

const permissionCodes = ['users.view', 'users.create', 'users.edit', 'roles.view', 'roles.edit', 'departments.view', 'departments.edit', 'documents.view', 'documents.create', 'documents.edit', 'documents.review', 'documents.sign', 'admin.access', 'tramites.edit', 'oirs.view', 'oirs.respond', 'expedients.view', 'expedients.create', 'expedients.edit', 'correspondence.view', 'correspondence.create', 'correspondence.edit', 'reports.view', 'public.content.manage'];
const one = async (text, params) => (await getPool().query(text, params)).rows[0];
const many = async (text, params) => (await getPool().query(text, params)).rows;

async function createFixtures() {
    const prefix = `p5b2b_${crypto.randomBytes(8).toString('hex')}`;
    const passwordHash = await passwords.hash('FixturePass123!');
    const departmentA = await one('INSERT INTO departments (code, name) VALUES ($1, $2) RETURNING id', [`${prefix}_a`.slice(0, 30), `${prefix} Department A`]);
    const departmentB = await one('INSERT INTO departments (code, name) VALUES ($1, $2) RETURNING id', [`${prefix}_b`.slice(0, 30), `${prefix} Department B`]);
    const permissions = await Promise.all(permissionCodes.map(async (code) => {
        const existing = await one('SELECT id FROM permissions WHERE code = $1', [code]);
        return existing || one('INSERT INTO permissions (code, name, module_code) VALUES ($1, $2, $3) RETURNING id', [code, `${prefix} ${code}`, 'TEST']);
    }));
    const adminRole = await one('INSERT INTO roles (code, name, description) VALUES ($1, $2, $3) RETURNING id', [`${prefix}_admin`, `${prefix} Admin`, 'Phase 5B.2B fixture']);
    const reviewRole = await one('INSERT INTO roles (code, name, description) VALUES ($1, $2, $3) RETURNING id', [`${prefix}_review`, `${prefix} Review`, 'Phase 5B.2B review role']);
    const emptyRole = await one('INSERT INTO roles (code, name, description) VALUES ($1, $2, $3) RETURNING id', [`${prefix}_none`, `${prefix} No permissions`, 'Phase 5B.2B fixture']);
    await getPool().query('INSERT INTO role_permissions (role_id, permission_id) SELECT $1, unnest($2::bigint[])', [adminRole.id, permissions.map((item) => item.id)]);
    await getPool().query('INSERT INTO role_permissions (role_id, permission_id) SELECT $1, id FROM permissions WHERE code IN ($2,$3,$4)', [reviewRole.id, 'documents.view', 'documents.review', 'documents.sign']);
    const user = async (suffix, roleId, status = 'active', deptId = null) => one('INSERT INTO users (department_id, username, email, password_hash, full_name, status) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id, username, email', [deptId || departmentA.id, `${prefix}_${suffix}`.slice(0, 80), `${prefix}_${suffix}@example.test`, passwordHash, `${prefix} ${suffix}`, status]);
    const admin = await user('admin', adminRole.id);
    const officer = await user('officer', emptyRole.id);
    const reviewer = await user('reviewer', reviewRole.id);
    const approver = await user('approver', reviewRole.id);
    const signer = await user('signer', reviewRole.id);
    const inactiveUser = await user('inactive', emptyRole.id, 'inactive');
    await getPool().query('INSERT INTO user_roles (user_id, role_id) VALUES ($1,$2),($3,$4),($5,$4),($6,$4),($7,$8),($9,$10)', [admin.id, adminRole.id, reviewer.id, reviewRole.id, approver.id, signer.id, inactiveUser.id, emptyRole.id, officer.id, emptyRole.id]);
    const citizen = async (suffix, status = 'active') => {
        const account = await one('INSERT INTO citizen_accounts (email, password_hash, status) VALUES ($1,$2,$3) RETURNING id, email', [`${prefix}_${suffix}@citizen.test`, passwordHash, status]);
        await getPool().query('INSERT INTO citizen_profiles (citizen_account_id, national_id, full_name, phone) VALUES ($1,$2,$3,$4)', [account.id, crypto.createHash('sha256').update(`${prefix}-${suffix}`).digest('hex').slice(0, 18), `${prefix} citizen ${suffix}`, '+56912345678']);
        return account;
    };
    const citizenA = await citizen('a'); const citizenB = await citizen('b'); const inactiveCitizen = await citizen('inactive', 'inactive');
    const procedureType = await one('INSERT INTO procedure_types (code, name, owner_department_id, requires_login, estimated_days) VALUES ($1,$2,$3,true,10) RETURNING id', [`${prefix}_procedure`.slice(0, 30), `${prefix} procedure`, departmentA.id]);
    const publishedProcedure = await one('INSERT INTO published_procedures (procedure_type_id, slug, title, instructions, published_by) VALUES ($1,$2,$3,$4,$5) RETURNING id', [procedureType.id, `${prefix}-published`, `${prefix} Published procedure`, 'Fixture instructions', admin.id]);
    const unpublishedProcedure = await one('INSERT INTO published_procedures (procedure_type_id, slug, title, instructions, is_active, published_by) VALUES ($1,$2,$3,$4,false,$5) RETURNING id', [procedureType.id, `${prefix}-hidden`, `${prefix} Hidden procedure`, 'Hidden instructions', admin.id]);
    const requestA = await one('INSERT INTO citizen_requests (tracking_code, citizen_account_id, published_procedure_id, assigned_department_id) VALUES ($1,$2,$3,$4) RETURNING id', [`${prefix}-request`, citizenA.id, publishedProcedure.id, departmentA.id]);
    const oirsA = await one('INSERT INTO oirs_cases (tracking_code, category, subject, citizen_account_id) VALUES ($1,$2,$3,$4) RETURNING id', [`${prefix}-oirs`, 'consulta', `${prefix} OIRS`, citizenA.id]);
    await getPool().query('INSERT INTO oirs_messages (oirs_case_id, author_citizen_id, message_direction, body) VALUES ($1,$2,$3,$4)', [oirsA.id, citizenA.id, 'from_citizen', 'Fixture message']);
    const notificationCitizen = await one('INSERT INTO notifications (title, body, citizen_account_id) VALUES ($1,$2,$3) RETURNING id', [`${prefix} citizen notification`, 'Fixture notification', citizenA.id]);
    const notificationInternal = await one('INSERT INTO notifications (title, body, user_id) VALUES ($1,$2,$3) RETURNING id', [`${prefix} internal notification`, 'Fixture notification', admin.id]);
    const docType = await one('INSERT INTO document_types (code, name, retention_days, requires_signature, is_active) VALUES ($1,$2,365,true,true) RETURNING id', [`5BB_${prefix.slice(0, 26)}`.toUpperCase(), `${prefix} Document Type`]);
    const docStatusDraft = await one("SELECT id FROM document_statuses WHERE code='draft'");
    const docA = await one('INSERT INTO documents (document_type_id, status_id, owner_user_id, department_id, title) VALUES ($1,$2,$3,$4,$5) RETURNING id,uuid', [docType.id, docStatusDraft.id, admin.id, departmentA.id, `${prefix} Document A`]);
    const versionA = await one('INSERT INTO document_versions (document_id, version_number, previous_version_id, content_snapshot, author_user_id) VALUES ($1,1,NULL,$2,$3) RETURNING id', [docA.id, JSON.stringify({ body: `${prefix} Version 1 content` }), admin.id]);
    await getPool().query('UPDATE documents SET current_version_id=$2 WHERE id=$1', [docA.id, versionA.id]);
    const sigProfile = await one('INSERT INTO signature_profiles (user_id, display_name, position_label, provider) VALUES ($1,$2,$3,$4) RETURNING id', [signer.id, `${prefix} Signer`, 'Director', 'simulated']);
    return { prefix, password: 'FixturePass123!', departmentA, departmentB, adminRole, reviewRole, emptyRole, admin, officer, reviewer, approver, signer, inactiveUser, citizenA, citizenB, inactiveCitizen, procedureType, publishedProcedure, unpublishedProcedure, requestA, oirsA, notificationCitizen, notificationInternal, docType, docA, versionA, sigProfile, permissionIds: permissions.map((item) => item.id) };
}

async function cleanupFixtures(fixture) {
    if (!fixture) return;
    const ids = (values) => values.filter(Boolean);
    const users = ids([fixture.admin && fixture.admin.id, fixture.officer && fixture.officer.id, fixture.reviewer && fixture.reviewer.id, fixture.approver && fixture.approver.id, fixture.signer && fixture.signer.id, fixture.inactiveUser && fixture.inactiveUser.id]);
    const citizens = ids([fixture.citizenA.id, fixture.citizenB.id, fixture.inactiveCitizen.id]);
    const allFixtureUsers = (await many('SELECT id FROM users WHERE username LIKE $1', [`${fixture.prefix}%`])).map((row) => row.id);
    await getPool().query('DELETE FROM audit_events WHERE entity_id = ANY($1::bigint[]) OR actor_user_id = ANY($1::bigint[]) OR actor_citizen_id = ANY($2::bigint[])', [allFixtureUsers, citizens]);
    await getPool().query('DELETE FROM news_posts WHERE title LIKE $1', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM public_notices WHERE title LIKE $1', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM calendar_events WHERE title LIKE $1', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM external_entities WHERE name LIKE $1', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM document_signatures WHERE document_id IN (SELECT id FROM documents WHERE title LIKE $1)', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM document_approvals WHERE document_id IN (SELECT id FROM documents WHERE title LIKE $1)', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM document_review_responses WHERE review_request_id IN (SELECT id FROM document_review_requests WHERE document_id IN (SELECT id FROM documents WHERE title LIKE $1))', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM document_review_requests WHERE document_id IN (SELECT id FROM documents WHERE title LIKE $1)', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM expedient_documents WHERE expedient_id IN (SELECT id FROM expedients WHERE subject LIKE $1)', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM document_comments WHERE document_id IN (SELECT id FROM documents WHERE title LIKE $1)', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM document_attachments WHERE document_id IN (SELECT id FROM documents WHERE title LIKE $1)', [`${fixture.prefix}%`]);
    await getPool().query('UPDATE documents SET current_version_id=NULL WHERE title LIKE $1', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM document_versions WHERE document_id IN (SELECT id FROM documents WHERE title LIKE $1)', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM signature_profiles WHERE lower(display_name) LIKE lower($1)', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM expedient_events WHERE expedient_id IN (SELECT id FROM expedients WHERE subject LIKE $1 OR owner_user_id = ANY($2::bigint[]))', [`${fixture.prefix}%`, allFixtureUsers]);
    await getPool().query('DELETE FROM expedient_documents WHERE expedient_id IN (SELECT id FROM expedients WHERE subject LIKE $1 OR owner_user_id = ANY($2::bigint[]))', [`${fixture.prefix}%`, allFixtureUsers]);
    await getPool().query('DELETE FROM expedients WHERE subject LIKE $1 OR owner_user_id = ANY($2::bigint[])', [`${fixture.prefix}%`, allFixtureUsers]);
    await getPool().query('DELETE FROM documents WHERE title LIKE $1', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM document_types WHERE lower(code) LIKE lower($1)', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM correspondence_routes WHERE correspondence_id IN (SELECT id FROM correspondence WHERE subject LIKE $1 OR created_by = ANY($2::bigint[]))', [`${fixture.prefix}%`, allFixtureUsers]);
    await getPool().query('DELETE FROM correspondence_recipients WHERE correspondence_id IN (SELECT id FROM correspondence WHERE subject LIKE $1 OR created_by = ANY($2::bigint[]))', [`${fixture.prefix}%`, allFixtureUsers]);
    await getPool().query('DELETE FROM notifications WHERE title LIKE $1', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM correspondence WHERE subject LIKE $1 OR created_by = ANY($2::bigint[])', [`${fixture.prefix}%`, allFixtureUsers]);
    await getPool().query('DELETE FROM notifications WHERE user_id = ANY($1::bigint[]) OR citizen_account_id = ANY($2::bigint[])', [users, citizens]);
    await getPool().query('DELETE FROM oirs_messages WHERE oirs_case_id IN (SELECT id FROM oirs_cases WHERE subject LIKE $1)', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM oirs_cases WHERE subject LIKE $1', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM citizen_request_attachments WHERE citizen_request_id IN (SELECT id FROM citizen_requests WHERE citizen_account_id = ANY($1::bigint[]))', [citizens]);
    await getPool().query('DELETE FROM citizen_requests WHERE citizen_account_id = ANY($1::bigint[])', [citizens]);
    await getPool().query('DELETE FROM published_procedures WHERE id = ANY($1::bigint[])', [[fixture.publishedProcedure && fixture.publishedProcedure.id, fixture.unpublishedProcedure && fixture.unpublishedProcedure.id].filter(Boolean)]);
    await getPool().query('DELETE FROM procedure_types WHERE lower(code) LIKE lower($1)', [`${fixture.prefix}%`]);
    await getPool().query('DELETE FROM citizen_sessions WHERE citizen_account_id = ANY($1::bigint[])', [citizens]);
    await getPool().query('DELETE FROM citizen_profiles WHERE citizen_account_id = ANY($1::bigint[])', [citizens]);
    await getPool().query('DELETE FROM citizen_accounts WHERE id = ANY($1::bigint[])', [citizens]);
    await getPool().query('DELETE FROM sessions WHERE user_id = ANY($1::bigint[])', [allFixtureUsers]);
    await getPool().query('DELETE FROM role_permissions WHERE role_id = ANY($1::bigint[]) OR granted_by = ANY($2::bigint[])', [[fixture.adminRole && fixture.adminRole.id, fixture.reviewRole && fixture.reviewRole.id, fixture.emptyRole && fixture.emptyRole.id].filter(Boolean), allFixtureUsers]);
    await getPool().query('DELETE FROM user_roles WHERE user_id = ANY($1::bigint[]) OR assigned_by = ANY($1::bigint[])', [allFixtureUsers]);
    await getPool().query('UPDATE departments SET manager_user_id = NULL WHERE manager_user_id = ANY($1::bigint[])', [allFixtureUsers]);
    await getPool().query('DELETE FROM users WHERE id = ANY($1::bigint[])', [allFixtureUsers]);
    await getPool().query('DELETE FROM roles WHERE id = ANY($1::bigint[])', [[fixture.adminRole && fixture.adminRole.id, fixture.reviewRole && fixture.reviewRole.id, fixture.emptyRole && fixture.emptyRole.id].filter(Boolean)]);
    await getPool().query('DELETE FROM departments WHERE name LIKE $1', [`${fixture.prefix}%`]);
}

const login = async (server, route, body) => { const result = await server.request(route, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); return result; };
const authHeader = (token) => ({ authorization: `Bearer ${token}` });
const databaseRows = (text, params) => many(text, params);

module.exports = { createFixtures, cleanupFixtures, login, authHeader, databaseRows };
