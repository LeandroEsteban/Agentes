const crypto = require('crypto');
const { AppError } = require('../../shared/errors');
const { transaction } = require('../../database/transaction');
const repository = require('./repository');
const audit = require('../audit/service');

function requireCitizen(actor) {
    if (!actor || actor.actorType !== 'citizen') throw new AppError(403, 'CITIZEN_REQUIRED', 'Se requiere una cuenta ciudadana');
}

async function create(procedureId, data, actor, requestId, ipAddress) {
    requireCitizen(actor);
    if (Object.keys(data.form_data).length) throw new AppError(422, 'FORM_DATA_SCHEMA_REQUIRED', 'El formulario requiere almacenamiento estructurado para solicitudes ciudadanas');
    if (data.attachments.length) throw new AppError(422, 'ATTACHMENTS_UNAVAILABLE', 'Los adjuntos requieren el flujo de almacenamiento ciudadano');
    const procedure = (await repository.procedure(procedureId)).rows[0];
    if (!procedure) throw new AppError(404, 'PROCEDURE_NOT_FOUND', 'Tramite no encontrado');
    return transaction(async (db) => {
        const item = (await repository.create(db, `SOL-${crypto.randomBytes(12).toString('hex').toUpperCase()}`, actor.id, procedure)).rows[0];
        await audit.write(db, audit.event('citizen_request_created', 'M07', 'citizen_request', item.id, actor, requestId, ipAddress, { procedure_id: procedureId }));
        return item;
    });
}

async function detail(id, actor) {
    requireCitizen(actor);
    const item = (await repository.findMine(id, actor.id)).rows[0];
    if (!item) throw new AppError(404, 'CITIZEN_REQUEST_NOT_FOUND', 'Solicitud no encontrada');
    const [attachments, history] = await Promise.all([repository.attachments(id), repository.history(id)]);
    return { ...item, attachments: attachments.rows, history: [{ event_name: 'citizen_request_submitted', occurred_at: item.submitted_at }, ...history.rows] };
}

async function list(actor, filters) {
    requireCitizen(actor);
    const [items, count] = await Promise.all([repository.listMine(actor.id, filters), repository.countMine(actor.id, filters.status)]);
    return { items: items.rows, page: filters.page, size: filters.size, total: count.rows[0].total };
}

async function history(id, actor) {
    const item = await detail(id, actor);
    return item.history;
}

async function cancel(id, data, actor, requestId, ipAddress) {
    requireCitizen(actor);
    return transaction(async (db) => {
        const item = (await repository.cancel(db, id, actor.id, data.reason)).rows[0];
        if (!item) throw new AppError(409, 'CITIZEN_REQUEST_NOT_CANCELLABLE', 'La solicitud no existe o no puede cancelarse');
        await audit.write(db, audit.event('citizen_request_cancelled', 'M07', 'citizen_request', item.id, actor, requestId, ipAddress, { reason: data.reason || null }));
        return item;
    });
}

module.exports = { create, detail, list, history, cancel };
