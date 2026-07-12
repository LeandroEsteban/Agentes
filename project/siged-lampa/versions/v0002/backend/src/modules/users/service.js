const crypto = require('crypto');
const { AppError } = require('../../shared/errors');
const { transaction } = require('../../database/transaction');
const passwords = require('../../auth/password');
const audit = require('../audit/service');
const repository = require('./repository');

const pagination = (page, size, total) => ({ page, size, total, pages: Math.ceil(total / size) });

async function list(filters) {
    const result = await repository.list(filters);
    return { data: result.rows, pagination: pagination(filters.page, filters.size, result.total) };
}

const assertDepartment = async (id, client) => { if (!(await repository.departmentExists(id, client))) throw new AppError(422, 'DEPARTMENT_NOT_FOUND', 'Departamento no encontrado'); };
const assertRoles = async (ids, client) => { if (await repository.rolesCount(ids, client) !== ids.length) throw new AppError(422, 'ROLE_NOT_FOUND', 'Uno o mas roles no existen'); };

async function create(data, actor, context) {
    try {
        return await transaction(async (client) => {
            await assertDepartment(data.department_id, client);
            await assertRoles(data.role_ids, client);
            const password = data.password || crypto.randomBytes(24).toString('base64url');
            const user = await repository.createUser({ ...data, password_hash: await passwords.hash(password) }, client);
            await repository.setRoles(user.id, data.role_ids, actor.id, client);
            await audit.record({ eventName: 'user_created', moduleCode: 'M02', entityType: 'user', entityId: user.id, actor, ipAddress: context.ipAddress, payload: { role_ids: data.role_ids, request_id: context.requestId }, client });
            return { ...user, role_ids: data.role_ids };
        });
    } catch (error) {
        if (error.code === '23505') throw new AppError(409, 'USER_ALREADY_EXISTS', 'El nombre de usuario o correo ya existe');
        throw error;
    }
}

async function update(id, data, actor, context) {
    try {
        return await transaction(async (client) => {
            if (!(await repository.userExists(id, client))) throw new AppError(404, 'USER_NOT_FOUND', 'Usuario no encontrado');
            if (data.department_id) await assertDepartment(data.department_id, client);
            if (data.role_ids) await assertRoles(data.role_ids, client);
            const user = await repository.updateUser(id, data, client);
            if (data.role_ids) { await repository.clearRoles(id, client); await repository.setRoles(id, data.role_ids, actor.id, client); }
            await audit.record({ eventName: 'user_updated', moduleCode: 'M02', entityType: 'user', entityId: id, actor, ipAddress: context.ipAddress, payload: { fields: Object.keys(data), request_id: context.requestId }, client });
            return { ...user, ...(data.role_ids ? { role_ids: data.role_ids } : {}) };
        });
    } catch (error) {
        if (error.code === '23505') throw new AppError(409, 'USER_ALREADY_EXISTS', 'El correo ya existe');
        throw error;
    }
}

async function listRoles() { return repository.listRoles(); }

async function replacePermissions(id, permissionIds, actor, context) {
    return transaction(async (client) => {
        if (!(await repository.roleExists(id, client))) throw new AppError(404, 'ROLE_NOT_FOUND', 'Rol no encontrado');
        if (permissionIds.length && await repository.permissionsCount(permissionIds, client) !== permissionIds.length) throw new AppError(422, 'PERMISSION_NOT_FOUND', 'Uno o mas permisos no existen');
        await repository.clearPermissions(id, client);
        await repository.setPermissions(id, permissionIds, actor.id, client);
        await audit.record({ eventName: 'role_permissions_replaced', moduleCode: 'M02', entityType: 'role', entityId: id, actor, ipAddress: context.ipAddress, payload: { permission_ids: permissionIds, request_id: context.requestId }, client });
        return repository.roleWithPermissions(id, client);
    });
}

module.exports = { list, create, update, listRoles, replacePermissions };
