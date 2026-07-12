const { query } = require('../../database/pool');

const run = (client, text, params) => (client || { query }).query(text, params);
const list = async () => (await query('SELECT id, code, name, description, parent_department_id, manager_user_id, status, created_at, updated_at FROM departments WHERE deleted_at IS NULL ORDER BY name')).rows;
const parentExists = async (id, client) => (await run(client, 'SELECT id FROM departments WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0] || null;
const managerExists = async (id, client) => (await run(client, 'SELECT id FROM users WHERE id = $1 AND deleted_at IS NULL', [id])).rows[0] || null;
const create = async (data, client) => (await run(client, `INSERT INTO departments (code, name, description, parent_department_id, manager_user_id) VALUES ($1, $2, $3, $4, $5) RETURNING id, code, name, description, parent_department_id, manager_user_id, status, created_at`, [data.code, data.name, data.description || null, data.parent_department_id || null, data.manager_user_id || null])).rows[0];

module.exports = { list, parentExists, managerExists, create };
