const { query } = require('../../database/pool');

const run = (client, text, params) => (client || { query }).query(text, params);
const projection = 'id, uuid, entity_type, name, tax_id, email, phone, address, contact_name, status, created_at, updated_at';
const list = async () => (await query(`SELECT ${projection} FROM external_entities WHERE deleted_at IS NULL ORDER BY name`)).rows;
const create = async (data, client) => (await run(client, `INSERT INTO external_entities (entity_type, name, tax_id, email, phone, address, contact_name, status) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING ${projection}`, [data.entity_type, data.name, data.tax_id || null, data.email || null, data.phone || null, data.address || null, data.contact_name || null, data.status])).rows[0];
const update = async (id, data, client) => (await run(client, `UPDATE external_entities SET entity_type=$2, name=$3, tax_id=$4, email=$5, phone=$6, address=$7, contact_name=$8, status=$9, updated_at=now() WHERE id=$1 AND deleted_at IS NULL RETURNING ${projection}`, [id, data.entity_type, data.name, data.tax_id || null, data.email || null, data.phone || null, data.address || null, data.contact_name || null, data.status])).rows[0] || null;

module.exports = { list, create, update };
