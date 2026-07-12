const { query } = require('../../database/pool');

const run = (client, text, params) => (client || { query }).query(text, params);

async function list(filters) {
    const params = [];
    const conditions = ['u.deleted_at IS NULL'];
    if (filters.q) { params.push(`%${filters.q}%`); conditions.push(`(u.username ILIKE $${params.length} OR u.email ILIKE $${params.length} OR u.full_name ILIKE $${params.length})`); }
    if (filters.department_id) { params.push(filters.department_id); conditions.push(`u.department_id = $${params.length}`); }
    if (filters.status) { params.push(filters.status); conditions.push(`u.status = $${params.length}`); }
    const where = conditions.join(' AND ');
    const count = await query(`SELECT count(*)::int AS total FROM users u WHERE ${where}`, params);
    params.push(filters.size, (filters.page - 1) * filters.size);
    const rows = await query(`SELECT u.id, u.username, u.email, u.full_name, u.job_title, u.status, u.last_login_at, u.created_at, d.id AS department_id, d.code AS department_code, d.name AS department_name FROM users u LEFT JOIN departments d ON d.id = u.department_id WHERE ${where} ORDER BY u.full_name ASC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { rows: rows.rows, total: count.rows[0].total };
}

const departmentExists = async (id, client) => (await run(client, 'SELECT id FROM departments WHERE id = $1 AND deleted_at IS NULL AND status = $2', [id, 'active'])).rows[0] || null;
const userExists = async (id, client) => (await run(client, 'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0] || null;
const rolesCount = async (ids, client) => Number((await run(client, 'SELECT count(*) AS count FROM roles WHERE id = ANY($1::bigint[])', [ids])).rows[0].count);
const permissionsCount = async (ids, client) => Number((await run(client, 'SELECT count(*) AS count FROM permissions WHERE id = ANY($1::bigint[])', [ids])).rows[0].count);

const createUser = async (data, client) => (await run(client, `INSERT INTO users (department_id, username, email, password_hash, full_name, job_title) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, username, email, full_name, job_title, status, created_at`, [data.department_id, data.username, data.email, data.password_hash, data.full_name, data.job_title || null])).rows[0];
const setRoles = (userId, roleIds, assignedBy, client) => run(client, 'INSERT INTO user_roles (user_id, role_id, assigned_by) SELECT $1, role_id, $3 FROM unnest($2::bigint[]) AS role_id', [userId, roleIds, assignedBy]);
const clearRoles = (userId, client) => run(client, 'DELETE FROM user_roles WHERE user_id = $1', [userId]);

async function updateUser(id, data, client) {
    const allowed = ['email', 'full_name', 'department_id', 'job_title', 'status'];
    const fields = Object.keys(data).filter((field) => allowed.includes(field));
    if (!fields.length) return userExists(id, client);
    const params = fields.map((field) => data[field]);
    const set = fields.map((field, index) => `${field} = $${index + 1}`);
    const result = await run(client, `UPDATE users SET ${set.join(', ')}, updated_at = now() WHERE id = $${params.length + 1} AND deleted_at IS NULL RETURNING id, username, email, full_name, job_title, status, updated_at`, [...params, id]);
    return result.rows[0] || null;
}

const listRoles = async () => (await query(`SELECT r.id, r.code, r.name, r.description, r.is_system, count(rp.permission_id)::int AS permission_count FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id GROUP BY r.id ORDER BY r.name`)).rows;
const roleExists = async (id, client) => (await run(client, 'SELECT id FROM roles WHERE id = $1', [id])).rows[0] || null;
const clearPermissions = (roleId, client) => run(client, 'DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
const setPermissions = (roleId, permissionIds, grantedBy, client) => permissionIds.length ? run(client, 'INSERT INTO role_permissions (role_id, permission_id, granted_by) SELECT $1, permission_id, $3 FROM unnest($2::bigint[]) AS permission_id', [roleId, permissionIds, grantedBy]) : null;
const roleWithPermissions = async (id, client) => (await run(client, `SELECT r.id, r.code, r.name, COALESCE(array_agg(rp.permission_id) FILTER (WHERE rp.permission_id IS NOT NULL), '{}') AS permission_ids FROM roles r LEFT JOIN role_permissions rp ON rp.role_id = r.id WHERE r.id = $1 GROUP BY r.id`, [id])).rows[0] || null;

module.exports = { list, departmentExists, userExists, rolesCount, permissionsCount, createUser, setRoles, clearRoles, updateUser, listRoles, roleExists, clearPermissions, setPermissions, roleWithPermissions };
