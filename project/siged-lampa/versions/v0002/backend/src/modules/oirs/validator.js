const { z } = require('zod');
const { AppError } = require('../../shared/errors');

const id = z.coerce.number().int().positive();
const uuid = z.string().uuid();
const category = z.enum(['consulta', 'reclamo', 'sugerencia', 'felicitacion', 'solicitud']);
const create = z.object({
    category,
    subject: z.string().trim().min(1).max(300),
    body: z.string().trim().min(1).max(10000),
    name: z.string().trim().min(1).max(200).optional(),
    email: z.string().trim().email().max(254).optional(),
    phone: z.string().trim().min(3).max(40).optional(),
    consent: z.boolean().optional(),
}).strict();
const reply = z.object({ body: z.string().trim().min(1).max(10000), close_case: z.boolean().default(false) }).strict();
const message = z.object({ body: z.string().trim().min(1).max(10000) }).strict();
const status = z.object({ status: z.enum(['submitted', 'in_review', 'in_process', 'responded', 'closed', 'cancelled']) }).strict();
const route = z.object({ assigned_department_id: id.nullable().optional(), assigned_user_id: id.nullable().optional() }).strict();
const list = z.object({ page: z.coerce.number().int().positive().default(1), size: z.coerce.number().int().positive().max(100).default(20), status: status.shape.status.optional() }).strict();

function parse(schema, value) {
    const result = schema.safeParse(value);
    if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Solicitud invalida', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
    return result.data;
}

module.exports = { id, uuid, create, reply, message, status, route, list, parse };
