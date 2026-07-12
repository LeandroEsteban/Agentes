const { AppError } = require('../../shared/errors');
const { transaction } = require('../../database/transaction');
const audit = require('../audit/service');
const repository = require('./repository');

const list = () => repository.list();
const contextPayload = (context) => ({ request_id: context.requestId });
async function create(data, actor, context) {
    return transaction(async (client) => {
        const item = await repository.create(data, client);
        await audit.record({ eventName: 'external_entity_created', moduleCode: 'M02', entityType: 'external_entity', entityId: item.id, actor, ipAddress: context.ipAddress, payload: contextPayload(context), client });
        return item;
    });
}
async function update(id, data, actor, context) {
    return transaction(async (client) => {
        const item = await repository.update(id, data, client);
        if (!item) throw new AppError(404, 'EXTERNAL_ENTITY_NOT_FOUND', 'Entidad externa no encontrada');
        await audit.record({ eventName: 'external_entity_updated', moduleCode: 'M02', entityType: 'external_entity', entityId: id, actor, ipAddress: context.ipAddress, payload: contextPayload(context), client });
        return item;
    });
}

module.exports = { list, create, update };
