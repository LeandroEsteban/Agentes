const crypto = require('crypto');
const { transaction } = require('../../database/transaction');
const { AppError } = require('../../shared/errors');
const { writeAudit } = require('../../shared/audit');
const repository = require('./repository');

const trackingCode = () => `COR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
const ensure = async (condition, code, message) => { if (!(await condition)) throw new AppError(404, code, message); };

async function create(data, actor, requestId) {
    return transaction(async (client) => {
        if (data.origin_entity_id) await ensure(repository.externalEntityExists(data.origin_entity_id, client), 'EXTERNAL_ENTITY_NOT_FOUND', 'Entidad de origen no encontrada');
        if (data.document_id) await ensure(repository.responseDocumentExists(data.document_id, client), 'DOCUMENT_NOT_EMITTED', 'El documento asociado debe estar emitido o firmado');
        for (const item of data.recipients || []) {
            if (item.external_entity_id) await ensure(repository.externalEntityExists(item.external_entity_id, client), 'EXTERNAL_ENTITY_NOT_FOUND', 'Entidad destinataria no encontrada');
            if (item.department_id) await ensure(repository.departmentExists(item.department_id, client), 'DEPARTMENT_NOT_FOUND', 'Departamento destinatario no encontrado');
        }
        const item = await repository.create({ ...data, tracking_code: trackingCode(), created_by: actor.id }, client);
        for (const recipient of data.recipients || []) await repository.addRecipient({ ...recipient, correspondence_id: item.id }, client);
        await writeAudit(client, { eventName: 'correspondence_created', moduleCode: 'M06', entityType: 'correspondence', entityId: item.id, actor, requestId });
        return item;
    });
}

async function update(id, data, actor, requestId) {
    return transaction(async (client) => {
        await ensure(repository.find(id, client), 'CORRESPONDENCE_NOT_FOUND', 'Correspondencia no encontrada');
        if (data.origin_entity_id) await ensure(repository.externalEntityExists(data.origin_entity_id, client), 'EXTERNAL_ENTITY_NOT_FOUND', 'Entidad de origen no encontrada');
        const item = await repository.update(id, data, client);
        await writeAudit(client, { eventName: 'correspondence_updated', moduleCode: 'M06', entityType: 'correspondence', entityId: id, actor, requestId, payload: { fields: Object.keys(data) } });
        return item;
    });
}

async function route(id, data, actor, requestId) {
    return transaction(async (client) => {
        const item = await repository.find(id, client);
        if (!item) throw new AppError(404, 'CORRESPONDENCE_NOT_FOUND', 'Correspondencia no encontrada');
        if (['closed', 'cancelled'].includes(item.status)) throw new AppError(409, 'CORRESPONDENCE_NOT_ROUTABLE', 'La correspondencia esta cerrada');
        await ensure(repository.departmentExists(data.to_department_id, client), 'DEPARTMENT_NOT_FOUND', 'Departamento destino no encontrado');
        if (data.assigned_user_id) await ensure(repository.userExists(data.assigned_user_id, client), 'USER_NOT_FOUND', 'Responsable no encontrado');
        const fromDepartmentId = await repository.originDepartment(id, client);
        if (!fromDepartmentId) throw new AppError(409, 'ORIGIN_DEPARTMENT_REQUIRED', 'No fue posible determinar el departamento de origen');
        if (Number(fromDepartmentId) === data.to_department_id) throw new AppError(409, 'SAME_DEPARTMENT_ROUTE', 'No puede derivar al mismo departamento');
        const routeItem = await repository.addRoute({ ...data, correspondence_id: id, from_department_id: fromDepartmentId }, client);
        await repository.markRouted(id, client);
        await repository.createNotification(data.assigned_user_id, id, client);
        await writeAudit(client, { eventName: 'correspondence_routed', moduleCode: 'M06', entityType: 'correspondence', entityId: id, actor, requestId, payload: { to_department_id: data.to_department_id, assigned_user_id: data.assigned_user_id || null } });
        return routeItem;
    });
}

async function linkResponse(id, data, actor, requestId) {
    return transaction(async (client) => {
        const item = await repository.find(id, client);
        if (!item) throw new AppError(404, 'CORRESPONDENCE_NOT_FOUND', 'Correspondencia no encontrada');
        if (['closed', 'cancelled'].includes(item.status)) throw new AppError(409, 'CORRESPONDENCE_NOT_RESPONDABLE', 'La correspondencia esta cerrada');
        await ensure(repository.responseDocumentExists(data.document_id, client), 'DOCUMENT_NOT_EMITTED', 'El documento debe estar emitido o firmado');
        const updated = await repository.linkResponse(id, data.document_id, client);
        await writeAudit(client, { eventName: 'correspondence_response_linked', moduleCode: 'M06', entityType: 'correspondence', entityId: id, actor, requestId, payload: { document_id: data.document_id } });
        return updated;
    });
}

async function close(id, data, actor, requestId) {
    return transaction(async (client) => {
        const item = await repository.close(id, data, client);
        if (!item) throw new AppError(409, 'CORRESPONDENCE_NOT_CLOSABLE', 'La correspondencia no existe o ya esta cerrada');
        await writeAudit(client, { eventName: 'correspondence_closed', moduleCode: 'M06', entityType: 'correspondence', entityId: id, actor, requestId, payload: { status: data.status, observation: data.observation } });
        return item;
    });
}

async function details(id) { const item = await repository.details(id); if (!item) throw new AppError(404, 'CORRESPONDENCE_NOT_FOUND', 'Correspondencia no encontrada'); return item; }
async function history(id) { await details(id); return repository.history(id); }

module.exports = { list: repository.list, create, update, route, linkResponse, close, details, history };
