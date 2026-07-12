const { z } = require('zod');

const id = z.coerce.number().int().positive();
const params = z.object({ id }).strict();
const pagination = z.object({ page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20), q: z.string().trim().max(200).optional(), department_id: id.optional(), status: z.enum(['active', 'inactive', 'suspended']).optional() }).strict();
const create = z.object({ username: z.string().trim().min(3).max(80), email: z.string().trim().email().max(254), full_name: z.string().trim().min(3).max(200), department_id: id, role_ids: z.array(id).min(1).max(20).refine((ids) => new Set(ids).size === ids.length, 'No se permiten roles duplicados'), job_title: z.string().trim().max(150).optional(), password: z.string().min(8).max(200).optional() }).strict();
const update = z.object({ email: z.string().trim().email().max(254).optional(), full_name: z.string().trim().min(3).max(200).optional(), department_id: id.nullable().optional(), role_ids: z.array(id).min(1).max(20).refine((ids) => new Set(ids).size === ids.length, 'No se permiten roles duplicados').optional(), job_title: z.string().trim().max(150).nullable().optional(), status: z.enum(['active', 'inactive', 'suspended']).optional() }).strict().refine((value) => Object.keys(value).length > 0, 'Debe enviar al menos un campo actualizable');
const permissions = z.object({ permission_ids: z.array(id).max(200).refine((ids) => new Set(ids).size === ids.length, 'No se permiten permisos duplicados') }).strict();

module.exports = { id, params, pagination, create, update, permissions };
