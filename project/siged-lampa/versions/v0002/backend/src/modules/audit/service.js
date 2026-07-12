const repository = require('./repository');

function event(name, module, entityType, entityId, actor, requestId, ipAddress, payload = {}) {
    return {
        name,
        module,
        entityType,
        entityId,
        actorUserId: actor && actor.actorType === 'internal' ? actor.id : null,
        actorCitizenId: actor && actor.actorType === 'citizen' ? actor.id : null,
        ipAddress: ipAddress || null,
        payload: { request_id: requestId || null, ...payload },
    };
}

async function record({ eventName, moduleCode, entityType, entityId = null, actor = null, ipAddress = null, payload = {}, client = null }) {
    const item = event(eventName, moduleCode, entityType, entityId, actor, payload.request_id || null, ipAddress, { ...payload, result: payload.result || 'success' });
    return client ? repository.write(client, item) : repository.writeDirect(item);
}

module.exports = { event, record, write: repository.write, writeDirect: repository.writeDirect };
