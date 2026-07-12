async function record(client, { eventName, moduleCode, entityType, entityId = null, actor, ipAddress = null, payload = {} }) {
    await client.query(
        `INSERT INTO audit_events (event_name, module_code, entity_type, entity_id, actor_user_id, actor_citizen_id, ip_address, payload_json)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb)`,
        [eventName, moduleCode, entityType, entityId, actor && actor.actorType === 'internal' ? actor.id : null,
            actor && actor.actorType === 'citizen' ? actor.id : null, ipAddress, JSON.stringify(payload)]
    );
}

async function writeAudit(client, event) {
    return record(client, {
        eventName: event.eventName,
        moduleCode: event.moduleCode,
        entityType: event.entityType,
        entityId: event.entityId,
        actor: event.actor,
        ipAddress: event.ipAddress || null,
        payload: { request_id: event.requestId || null, result: 'success', ...(event.payload || {}) },
    });
}

module.exports = { record, writeAudit };
