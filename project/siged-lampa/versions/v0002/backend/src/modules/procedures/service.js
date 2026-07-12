const { AppError } = require('../../shared/errors');
const { transaction } = require('../../database/transaction');
const audit = require('../audit/service');
const repository = require('./repository');

const page = (current, size, total) => ({ page: current, size, total, pages: Math.ceil(total / size) });
const listDocumentTypes = () => repository.listDocumentTypes();
const listProcedureTypes = () => repository.listProcedureTypes();

async function createDocumentType(data, actor, context) {
    try {
        return await transaction(async (client) => {
            const item = await repository.createDocumentType(data, client);
            await audit.record({ eventName: 'document_type_created', moduleCode: 'M02', entityType: 'document_type', entityId: item.id, actor, ipAddress: context.ipAddress, payload: { request_id: context.requestId }, client });
            return item;
        });
    } catch (error) {
        if (error.code === '23505') throw new AppError(409, 'DOCUMENT_TYPE_CODE_EXISTS', 'El codigo de tipo documental ya existe');
        throw error;
    }
}

const assertDepartment = async (id, client) => { if (!(await repository.departmentExists(id, client))) throw new AppError(422, 'DEPARTMENT_NOT_FOUND', 'Departamento no encontrado'); };

async function createProcedureType(data, actor, context) {
    try {
        return await transaction(async (client) => {
            await assertDepartment(data.owner_department_id, client);
            const item = await repository.createProcedureType(data, client);
            await audit.record({ eventName: 'procedure_type_created', moduleCode: 'M07', entityType: 'procedure_type', entityId: item.id, actor, ipAddress: context.ipAddress, payload: { request_id: context.requestId }, client });
            return item;
        });
    } catch (error) {
        if (error.code === '23505') throw new AppError(409, 'PROCEDURE_TYPE_CODE_EXISTS', 'El codigo de tipo de tramite ya existe');
        throw error;
    }
}

async function updateProcedureType(id, data, actor, context) {
    try {
        return await transaction(async (client) => {
            await assertDepartment(data.owner_department_id, client);
            const item = await repository.updateProcedureType(id, data, client);
            if (!item) throw new AppError(404, 'PROCEDURE_TYPE_NOT_FOUND', 'Tipo de tramite no encontrado');
            await audit.record({ eventName: 'procedure_type_updated', moduleCode: 'M07', entityType: 'procedure_type', entityId: id, actor, ipAddress: context.ipAddress, payload: { request_id: context.requestId }, client });
            return item;
        });
    } catch (error) {
        if (error.code === '23505') throw new AppError(409, 'PROCEDURE_TYPE_CODE_EXISTS', 'El codigo de tipo de tramite ya existe');
        throw error;
    }
}

async function listPublished(filters) {
    const result = await repository.listPublished(filters);
    return { data: result.rows, pagination: page(filters.page, filters.size, result.total) };
}

async function getPublished(id) {
    const procedure = await repository.getPublished(id);
    if (!procedure) throw new AppError(404, 'PUBLIC_PROCEDURE_NOT_FOUND', 'Tramite publico no encontrado');
    return procedure;
}

module.exports = { listDocumentTypes, createDocumentType, listProcedureTypes, createProcedureType, updateProcedureType, listPublished, getPublished };
