const { query } = require('../../database/pool');

async function listMine(actor, filters) {
    const recipient = actor.actorType === 'citizen' ? 'citizen_account_id' : 'user_id';
    const params = [actor.id];
    let where = `${recipient} = $1`;
    if (filters.is_read !== undefined) { params.push(filters.is_read); where += ` AND is_read = $${params.length}`; }
    const count = await query(`SELECT count(*)::int AS total FROM notifications WHERE ${where}`, params);
    params.push(filters.size, (filters.page - 1) * filters.size);
    const rows = await query(`SELECT id, uuid, channel, title, body, link_url, is_read, sent_at, read_at FROM notifications WHERE ${where} ORDER BY sent_at DESC LIMIT $${params.length - 1} OFFSET $${params.length}`, params);
    return { rows: rows.rows, total: count.rows[0].total };
}

async function markRead(id, actor) {
    const recipient = actor.actorType === 'citizen' ? 'citizen_account_id' : 'user_id';
    const result = await query(`UPDATE notifications SET is_read = true, read_at = COALESCE(read_at, now()) WHERE id = $1 AND ${recipient} = $2 RETURNING id, uuid, channel, title, body, link_url, is_read, sent_at, read_at`, [id, actor.id]);
    return result.rows[0] || null;
}

module.exports = { listMine, markRead };
