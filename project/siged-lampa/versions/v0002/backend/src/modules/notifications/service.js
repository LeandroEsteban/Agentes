const { AppError } = require('../../shared/errors');
const audit = require('../audit/service');
const repository = require('./repository');

async function list(actor, filters) {
    const result = await repository.listMine(actor, filters);
    return { data: result.rows, pagination: { page: filters.page, size: filters.size, total: result.total, pages: Math.ceil(result.total / filters.size) } };
}

async function markRead(id, actor, context) {
    const notification = await repository.markRead(id, actor);
    if (!notification) throw new AppError(404, 'NOTIFICATION_NOT_FOUND', 'Notificacion no encontrada');
    await audit.record({ eventName: 'notification_read', moduleCode: 'M10', entityType: 'notification', entityId: id, actor, ipAddress: context.ipAddress, payload: { request_id: context.requestId } });
    return notification;
}

module.exports = { list, markRead };
