const crypto = require('crypto');
const { transaction } = require('../../database/transaction');
const { AppError } = require('../../shared/errors');
const { writeAudit } = require('../../shared/audit');
const repository = require('./repository');

const ensure = async (condition, code, message) => { if (!(await condition)) throw new AppError(404, code, message); };
const code = () => `EXP-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

async function create(data, actor, requestId) {
    return transaction(async (client) => {
        await ensure(repository.departmentExists(data.department_id, client), 'DEPARTMENT_NOT_FOUND', 'Departamento no encontrado');
        const item = await repository.create({ ...data, code: code(), owner_user_id: actor.id }, client);
        await repository.addEvent({ expedient_id: item.id, actor_user_id: actor.id, event_type: 'created', event_label: 'Expediente creado', payload: { code: item.code } }, client);
        await writeAudit(client, { eventName: 'expedient_created', moduleCode: 'M05', entityType: 'expedient', entityId: item.id, actor, requestId });
        return item;
    });
}

async function update(id, data, actor, requestId) {
    return transaction(async (client) => {
        await ensure(repository.find(id, client), 'EXPEDIENT_NOT_FOUND', 'Expediente no encontrado');
        if (data.department_id) await ensure(repository.departmentExists(data.department_id, client), 'DEPARTMENT_NOT_FOUND', 'Departamento no encontrado');
        if (data.owner_user_id) await ensure(repository.userExists(data.owner_user_id, client), 'USER_NOT_FOUND', 'Responsable no encontrado');
        const item = await repository.update(id, data, client);
        await repository.addEvent({ expedient_id: id, actor_user_id: actor.id, event_type: 'updated', event_label: 'Expediente actualizado', payload: data }, client);
        await writeAudit(client, { eventName: 'expedient_updated', moduleCode: 'M05', entityType: 'expedient', entityId: id, actor, requestId, payload: { fields: Object.keys(data) } });
        return item;
    });
}

async function linkDocument(id, data, actor, requestId) {
    return transaction(async (client) => {
        await ensure(repository.find(id, client), 'EXPEDIENT_NOT_FOUND', 'Expediente no encontrado');
        await ensure(repository.documentExists(data.document_id, client), 'DOCUMENT_NOT_FOUND', 'Documento no encontrado');
        try {
            const relationType = data.relation_type === 'support' ? 'related' : data.relation_type;
            const item = await repository.addDocument({ ...data, expedient_id: id, relation_type: relationType, linked_by: actor.id }, client);
            await repository.addEvent({ expedient_id: id, actor_user_id: actor.id, document_id: data.document_id, event_type: 'document_linked', event_label: 'Documento vinculado', payload: { relation_type: relationType, is_primary: data.is_primary } }, client);
            await writeAudit(client, { eventName: 'expedient_document_linked', moduleCode: 'M05', entityType: 'expedient', entityId: id, actor, requestId, payload: { document_id: data.document_id } });
            return item;
        } catch (error) {
            if (error.code === '23505') throw new AppError(409, 'DOCUMENT_ALREADY_LINKED', 'El documento ya esta vinculado al expediente');
            throw error;
        }
    });
}

async function addEvent(id, data, actor, requestId) {
    return transaction(async (client) => {
        await ensure(repository.find(id, client), 'EXPEDIENT_NOT_FOUND', 'Expediente no encontrado');
        if (data.document_id) await ensure(repository.documentExists(data.document_id, client), 'DOCUMENT_NOT_FOUND', 'Documento no encontrado');
        const item = await repository.addEvent({ ...data, expedient_id: id, actor_user_id: actor.id }, client);
        await writeAudit(client, { eventName: 'expedient_event_created', moduleCode: 'M05', entityType: 'expedient', entityId: id, actor, requestId, payload: { event_type: data.event_type } });
        return item;
    });
}

async function close(id, data, actor, requestId) {
    return transaction(async (client) => {
        const item = await repository.close(id, data.status, client);
        if (!item) throw new AppError(409, 'EXPEDIENT_NOT_CLOSABLE', 'El expediente no existe o ya fue cerrado');
        await repository.addEvent({ expedient_id: id, actor_user_id: actor.id, event_type: 'closed', event_label: data.event_label || 'Expediente cerrado', payload: { status: data.status } }, client);
        await writeAudit(client, { eventName: 'expedient_closed', moduleCode: 'M05', entityType: 'expedient', entityId: id, actor, requestId, payload: { status: data.status } });
        return item;
    });
}

async function details(id) { const item = await repository.details(id); if (!item) throw new AppError(404, 'EXPEDIENT_NOT_FOUND', 'Expediente no encontrado'); return item; }
async function events(id) { await details(id); return repository.getEvents(id); }

module.exports = { list: repository.list, create, update, linkDocument, addEvent, close, details, events };
