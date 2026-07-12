const { AppError } = require('../../shared/errors');
const { transaction } = require('../../database/transaction');
const audit = require('../audit/service');
const repository = require('./repository');

const list = () => repository.list();

async function create(data, actor, context) {
    try {
        return await transaction(async (client) => {
            if (data.parent_department_id && !(await repository.parentExists(data.parent_department_id, client))) throw new AppError(422, 'PARENT_DEPARTMENT_NOT_FOUND', 'Departamento padre no encontrado');
            if (data.manager_user_id && !(await repository.managerExists(data.manager_user_id, client))) throw new AppError(422, 'MANAGER_NOT_FOUND', 'Usuario responsable no encontrado');
            const department = await repository.create(data, client);
            await audit.record({ eventName: 'department_created', moduleCode: 'M02', entityType: 'department', entityId: department.id, actor, ipAddress: context.ipAddress, payload: { request_id: context.requestId }, client });
            return department;
        });
    } catch (error) {
        if (error.code === '23505') throw new AppError(409, 'DEPARTMENT_CODE_EXISTS', 'El codigo de departamento ya existe');
        throw error;
    }
}

module.exports = { list, create };
