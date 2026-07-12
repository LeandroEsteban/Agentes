const crypto = require('crypto');
const { AppError } = require('../../shared/errors');
const { transaction } = require('../../database/transaction');
const repository = require('./repository');
const audit = require('../audit/service');
const tracking = require('./tracking');

function citizen(actor) {
    return actor && actor.actorType === 'citizen';
}

async function create(data, actor, requestId, ipAddress) {
    if (actor && !citizen(actor)) throw new AppError(403, 'CITIZEN_REQUIRED', 'La presentacion OIRS solo admite cuentas ciudadanas');
    if (!citizen(actor) && (!data.name || (!data.email && !data.phone) || data.consent !== true)) throw new AppError(400, 'VALIDATION_ERROR', 'OIRS anonima requiere nombre, contacto y consentimiento');
    return transaction(async (db) => {
        const item = (await repository.create(db, { trackingCode: `OIRS-${crypto.randomBytes(18).toString('base64url')}`, category: data.category, subject: data.subject, citizenId: citizen(actor) ? actor.id : null, name: data.name, email: data.email, phone: data.phone, consent: data.consent })).rows[0];
        const token = tracking.issue(item.uuid);
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        if (!citizen(actor)) await repository.setAnonymousTrackingHash(db, item.id, tokenHash);
        await repository.createMessage(db, item.id, actor || null, 'from_citizen', data.body, citizen(actor) ? null : tokenHash);
        await audit.write(db, audit.event('oirs_case_created', 'M08', 'oirs_case', item.id, actor || null, requestId, ipAddress, { category: item.category, anonymous: !citizen(actor) }));
        return { ...item, tracking_token: token };
    });
}

async function citizenCase(id, actor) {
    if (!citizen(actor)) throw new AppError(403, 'CITIZEN_REQUIRED', 'Se requiere una cuenta ciudadana');
    const item = (await repository.findCitizenCase(id, actor.id)).rows[0];
    if (!item) throw new AppError(404, 'OIRS_CASE_NOT_FOUND', 'Caso OIRS no encontrado');
    return item;
}

async function publicCase(uuid, token) {
    const item = (await repository.findPublicCase(uuid)).rows[0];
    if (!item) throw new AppError(404, 'OIRS_CASE_NOT_FOUND', 'Caso OIRS no encontrado');
    if (!token) throw new AppError(401, 'OIRS_TRACKING_TOKEN_REQUIRED', 'Se requiere token de seguimiento');
    tracking.verify(token, item.uuid);
    if (item.anonymous_tracking_hash && crypto.createHash('sha256').update(token).digest('hex') !== item.anonymous_tracking_hash) throw new AppError(401, 'INVALID_OIRS_TRACKING_TOKEN', 'Token de seguimiento invalido');
    return item;
}

async function history(item) {
    return (await repository.history(item.id)).rows;
}

async function addCitizenMessage(id, data, actor, requestId, ipAddress) {
    const item = await citizenCase(id, actor);
    if (['closed', 'cancelled'].includes(item.status)) throw new AppError(409, 'OIRS_CASE_CLOSED', 'El caso OIRS esta cerrado');
    return transaction(async (db) => {
        const message = (await repository.createMessage(db, item.id, actor, 'from_citizen', data.body)).rows[0];
        await audit.write(db, audit.event('oirs_citizen_message_created', 'M08', 'oirs_case', item.id, actor, requestId, ipAddress));
        return message;
    });
}

async function addAnonymousMessage(uuid, token, data, requestId, ipAddress) {
    const item = await publicCase(uuid, token);
    if (item.citizen_account_id) throw new AppError(403, 'CITIZEN_CASE_REQUIRED', 'El caso requiere autenticacion ciudadana');
    if (['closed', 'cancelled'].includes(item.status)) throw new AppError(409, 'OIRS_CASE_CLOSED', 'El caso OIRS esta cerrado');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    return transaction(async (db) => {
        const message = (await repository.createMessage(db, item.id, null, 'from_citizen', data.body, tokenHash)).rows[0];
        await audit.write(db, audit.event('oirs_anonymous_message_created', 'M08', 'oirs_case', item.id, null, requestId, ipAddress, { anonymous: true }));
        return message;
    });
}

async function list(filters) {
    const [items, count] = await Promise.all([repository.list(filters), repository.count(filters.status)]);
    return { items: items.rows, page: filters.page, size: filters.size, total: count.rows[0].total };
}

async function reply(id, data, actor, requestId, ipAddress) {
    return transaction(async (db) => {
        const item = (await repository.reply(db, id, actor, data.body, data.close_case)).rows[0];
        if (!item) throw new AppError(409, 'OIRS_CASE_NOT_RESPONDABLE', 'El caso no existe o no admite respuesta');
        await audit.write(db, audit.event('oirs_case_replied', 'M08', 'oirs_case', id, actor, requestId, ipAddress, { close_case: data.close_case }));
        return item;
    });
}

async function changeStatus(id, data, actor, requestId, ipAddress) {
    return transaction(async (db) => {
        const item = (await repository.updateStatus(db, id, data.status)).rows[0];
        if (!item) throw new AppError(409, 'OIRS_STATUS_NOT_ALLOWED', 'La transicion de estado no esta permitida');
        await audit.write(db, audit.event('oirs_status_changed', 'M08', 'oirs_case', id, actor, requestId, ipAddress, { status: data.status }));
        return item;
    });
}

async function assignRoute(id, data, actor, requestId, ipAddress) {
    return transaction(async (db) => {
        const item = (await repository.route(db, id, data)).rows[0];
        if (!item) throw new AppError(409, 'OIRS_ROUTE_NOT_ALLOWED', 'El caso no existe o esta cerrado');
        await audit.write(db, audit.event('oirs_case_routed', 'M08', 'oirs_case', id, actor, requestId, ipAddress, data));
        return item;
    });
}

module.exports = { create, citizenCase, publicCase, history, addCitizenMessage, addAnonymousMessage, list, reply, changeStatus, assignRoute };
