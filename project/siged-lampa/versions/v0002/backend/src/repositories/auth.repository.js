const { query } = require('../database/pool');

const findInternal = async (username) => (await query('SELECT * FROM users WHERE username = $1 AND status = $2 AND deleted_at IS NULL', [username, 'active'])).rows[0] || null;
const findCitizen = async (email) => (await query('SELECT * FROM citizen_accounts WHERE email = $1 AND status = $2 AND deleted_at IS NULL', [email, 'active'])).rows[0] || null;
const permissions = async (userId) => (await query('SELECT DISTINCT p.code FROM permissions p JOIN role_permissions rp ON rp.permission_id=p.id JOIN user_roles ur ON ur.role_id=rp.role_id WHERE ur.user_id=$1', [userId])).rows.map((row) => row.code);
const createSession = async (userId, tokenHash, expiresAt) => (await query('INSERT INTO sessions (user_id, token_hash, expires_at) VALUES ($1,$2,$3) RETURNING id', [userId, tokenHash, expiresAt])).rows[0];
const setSessionToken = async (id, tokenHash, expiresAt) => query('UPDATE sessions SET token_hash=$2, expires_at=$3 WHERE id=$1', [id, tokenHash, expiresAt]);
const sessionActive = async (id, tokenHash) => (await query('SELECT id FROM sessions WHERE id=$1 AND token_hash=$2 AND revoked_at IS NULL AND expires_at > now()', [id, tokenHash])).rows[0] || null;
const revokeSession = async (id) => query('UPDATE sessions SET revoked_at=now() WHERE id=$1 AND revoked_at IS NULL', [id]);
const audit = async (event, actor, type, requestId) => query('INSERT INTO audit_events (event_name,module_code,entity_type,entity_id,actor_user_id,actor_citizen_id,payload_json) VALUES ($1,$2,$3,$4,$5,$6,$7)', [event, 'M01', 'session', null, type === 'internal' ? actor : null, type === 'citizen' ? actor : null, JSON.stringify({ request_id: requestId, result: 'success' })]);
module.exports = { findInternal, findCitizen, permissions, createSession, setSessionToken, sessionActive, revokeSession, audit };
