const { query } = require('../../database/pool');

const write = (db, event) => db.query(
    'INSERT INTO audit_events (event_name,module_code,entity_type,entity_id,actor_user_id,actor_citizen_id,ip_address,payload_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [event.name, event.module, event.entityType, event.entityId, event.actorUserId, event.actorCitizenId, event.ipAddress, JSON.stringify(event.payload)]
);

const writeDirect = (event) => query(
    'INSERT INTO audit_events (event_name,module_code,entity_type,entity_id,actor_user_id,actor_citizen_id,ip_address,payload_json) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
    [event.name, event.module, event.entityType, event.entityId, event.actorUserId, event.actorCitizenId, event.ipAddress, JSON.stringify(event.payload)]
);

module.exports = { write, writeDirect };
