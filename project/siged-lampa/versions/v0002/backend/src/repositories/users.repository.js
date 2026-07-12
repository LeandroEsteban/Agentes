const { query } = require('../database/pool');

async function findAll(filters = {}) {
    let sql = 'SELECT id, uuid, department_id, username, email, full_name, job_title, status, last_login_at, created_at, updated_at FROM users WHERE deleted_at IS NULL';
    const params = [];
    const conditions = [];

    if (filters.status) {
        conditions.push(`status = $${params.length + 1}`);
        params.push(filters.status);
    }
    if (filters.department_id) {
        conditions.push(`department_id = $${params.length + 1}`);
        params.push(filters.department_id);
    }

    if (conditions.length > 0) {
        sql += ' AND ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY full_name ASC';

    const result = await query(sql, params);
    return result.rows;
}

async function findById(id) {
    const result = await query(
        `SELECT id, uuid, department_id, username, email, full_name, job_title, status, last_login_at, created_at, updated_at
         FROM users WHERE id = $1 AND deleted_at IS NULL`,
        [id]
    );
    return result.rows[0] || null;
}

async function findByUsername(username) {
    const result = await query(
        `SELECT * FROM users WHERE username = $1 AND deleted_at IS NULL`,
        [username]
    );
    return result.rows[0] || null;
}

async function findByEmail(email) {
    const result = await query(
        `SELECT * FROM users WHERE email = $1 AND deleted_at IS NULL`,
        [email]
    );
    return result.rows[0] || null;
}

async function create(data) {
    const result = await query(
        `INSERT INTO users (department_id, username, email, password_hash, full_name, job_title, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, uuid, username, email, full_name, created_at`,
        [data.department_id, data.username, data.email, data.password_hash,
         data.full_name, data.job_title, data.status || 'active']
    );
    return result.rows[0];
}

async function update(id, data) {
    const fields = [];
    const params = [];
    let idx = 1;

    for (const [key, value] of Object.entries(data)) {
        if (['department_id', 'email', 'full_name', 'job_title', 'status'].includes(key)) {
            fields.push(`${key} = $${idx}`);
            params.push(value);
            idx++;
        }
    }

    if (fields.length === 0) return null;

    fields.push(`updated_at = now()`);
    params.push(id);

    const result = await query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} AND deleted_at IS NULL
         RETURNING id, uuid, username, email, full_name, status, updated_at`,
        params
    );
    return result.rows[0] || null;
}

async function remove(id) {
    const result = await query(
        `UPDATE users SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [id]
    );
    return result.rows[0] || null;
}

async function getUserRoles(userId) {
    const result = await query(
        `SELECT r.id, r.code, r.name
         FROM roles r
         JOIN user_roles ur ON ur.role_id = r.id
         WHERE ur.user_id = $1`,
        [userId]
    );
    return result.rows;
}

module.exports = { findAll, findById, findByUsername, findByEmail, create, update, remove, getUserRoles };
