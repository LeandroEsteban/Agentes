const { query } = require('../../database/pool');

const run = (client, text, params) => (client || { query }).query(text, params);

async function findInternal(username) {
    const result = await query(
        `SELECT u.*, t.secret_hash AS two_factor_secret,
                (t.enabled_at IS NOT NULL AND t.disabled_at IS NULL) AS two_factor_enabled
         FROM users u
         LEFT JOIN two_factor_settings t ON t.user_id = u.id
         WHERE u.username = $1 AND u.status = 'active' AND u.deleted_at IS NULL`,
        [username]
    );
    return result.rows[0] || null;
}

async function findCitizen(email) {
    const result = await query(
        `SELECT c.*, p.full_name, p.phone
         FROM citizen_accounts c
         LEFT JOIN citizen_profiles p ON p.citizen_account_id = c.id
         WHERE lower(c.email) = lower($1) AND c.status = 'active' AND c.deleted_at IS NULL`,
        [email]
    );
    return result.rows[0] || null;
}

const createInternalSession = (userId, expiresAt) => run(null, 'INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id', [userId, 'pending', expiresAt]);
const setInternalSessionToken = (id, tokenHash, expiresAt) => run(null, 'UPDATE sessions SET token_hash = $2, expires_at = $3 WHERE id = $1', [id, tokenHash, expiresAt]);
const createCitizenSession = (citizenId, expiresAt) => run(null, 'INSERT INTO citizen_sessions (citizen_account_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id', [citizenId, 'pending', expiresAt]);
const setCitizenSessionToken = (id, tokenHash, expiresAt) => run(null, 'UPDATE citizen_sessions SET token_hash = $2, expires_at = $3 WHERE id = $1', [id, tokenHash, expiresAt]);
const revokeInternalSession = (id) => run(null, 'UPDATE sessions SET revoked_at = now() WHERE id = $1 AND revoked_at IS NULL', [id]);
const revokeCitizenSession = (id, citizenId) => run(null, 'UPDATE citizen_sessions SET revoked_at = now() WHERE id = $1 AND citizen_account_id = $2 AND revoked_at IS NULL', [id, citizenId]);
const citizenSessionActive = async (id, citizenId, tokenHash) => (await query('SELECT id FROM citizen_sessions WHERE id = $1 AND citizen_account_id = $2 AND token_hash = $3 AND revoked_at IS NULL AND expires_at > now()', [id, citizenId, tokenHash])).rows[0] || null;
const touchInternalLogin = (id) => run(null, 'UPDATE users SET last_login_at = now(), updated_at = now() WHERE id = $1', [id]);
const touchCitizenLogin = (id) => run(null, 'UPDATE citizen_accounts SET last_login_at = now(), updated_at = now() WHERE id = $1', [id]);
const rolesForUser = async (userId) => (await query('SELECT r.code FROM roles r JOIN user_roles ur ON ur.role_id = r.id WHERE ur.user_id = $1 ORDER BY r.code', [userId])).rows.map((row) => row.code);

async function findProfile(id) {
    const result = await query(
        `SELECT u.id, u.username, u.email, u.full_name, u.phone, u.job_title, u.notification_email, u.notification_web,
                d.id AS department_id, d.code AS department_code, d.name AS department_name,
                COALESCE(json_agg(DISTINCT jsonb_build_object('id', r.id, 'code', r.code, 'name', r.name)) FILTER (WHERE r.id IS NOT NULL), '[]') AS roles,
                COALESCE(array_agg(DISTINCT p.code) FILTER (WHERE p.code IS NOT NULL), ARRAY[]::varchar[]) AS permissions,
                (SELECT sp.id FROM signature_profiles sp WHERE sp.user_id = u.id AND sp.provider = 'simulated' ORDER BY sp.id LIMIT 1) AS signature_profile_id
         FROM users u
         LEFT JOIN departments d ON d.id = u.department_id
          LEFT JOIN user_roles ur ON ur.user_id = u.id
          LEFT JOIN roles r ON r.id = ur.role_id
          LEFT JOIN role_permissions rp ON rp.role_id = r.id
          LEFT JOIN permissions p ON p.id = rp.permission_id
         WHERE u.id = $1 AND u.status = 'active' AND u.deleted_at IS NULL
         GROUP BY u.id, d.id`, [id]
    );
    return result.rows[0] || null;
}

async function updateProfile(id, data) {
    const fields = Object.keys(data);
    const values = fields.map((field) => data[field]);
    const set = fields.map((field, index) => `${field} = $${index + 1}`);
    const result = await query(
        `UPDATE users SET ${set.join(', ')}, updated_at = now()
         WHERE id = $${values.length + 1} AND status = 'active' AND deleted_at IS NULL
         RETURNING id`, [...values, id]
    );
    return result.rows[0] || null;
}

async function findCitizenProfile(id) {
    const result = await query(`SELECT c.id, c.email, p.full_name, p.phone, p.address, p.commune
        FROM citizen_accounts c LEFT JOIN citizen_profiles p ON p.citizen_account_id = c.id
        WHERE c.id = $1 AND c.status = 'active' AND c.deleted_at IS NULL`, [id]);
    return result.rows[0] || null;
}

async function updateCitizenProfile(id, data) {
    const fields = Object.keys(data).filter((field) => ['full_name', 'phone'].includes(field));
    if (!fields.length) return null;
    const values = fields.map((field) => data[field]);
    const set = fields.map((field, index) => `${field} = $${index + 1}`);
    const result = await query(`UPDATE citizen_profiles SET ${set.join(', ')}, updated_at = now() WHERE citizen_account_id = $${values.length + 1} RETURNING id`, [...values, id]);
    return result.rows[0] || null;
}

module.exports = { findInternal, findCitizen, createInternalSession, setInternalSessionToken, createCitizenSession, setCitizenSessionToken, revokeInternalSession, revokeCitizenSession, citizenSessionActive, touchInternalLogin, touchCitizenLogin, rolesForUser, findProfile, updateProfile, findCitizenProfile, updateCitizenProfile };
