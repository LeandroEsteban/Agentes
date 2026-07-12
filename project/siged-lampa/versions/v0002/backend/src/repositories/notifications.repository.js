const { query } = require('../database/pool');
const listMine = (actor) => query(actor.actorType === 'citizen' ? 'SELECT * FROM notifications WHERE citizen_account_id=$1 ORDER BY sent_at DESC' : 'SELECT * FROM notifications WHERE user_id=$1 ORDER BY sent_at DESC', [actor.id]);
const readMine = (id, actor) => query(actor.actorType === 'citizen' ? 'UPDATE notifications SET is_read=true,read_at=now() WHERE id=$1 AND citizen_account_id=$2 RETURNING *' : 'UPDATE notifications SET is_read=true,read_at=now() WHERE id=$1 AND user_id=$2 RETURNING *', [id, actor.id]);
module.exports = { listMine, readMine };
