const { z } = require('zod');
const { AppError } = require('../../shared/errors');

const id = z.coerce.number().int().positive();
const pagination = z.object({ page: z.coerce.number().int().positive().default(1), size: z.coerce.number().int().min(1).max(100).default(20) });
const status = z.enum(['open', 'in_progress', 'closed', 'archived']);

const list = pagination.extend({ q: z.string().trim().min(1).max(300).optional(), status: status.optional(), department_id: id.optional() });
const create = z.object({ subject: z.string().trim().min(1).max(300), description: z.string().trim().max(10000).optional(), department_id: id });
const update = z.object({ subject: z.string().trim().min(1).max(300).optional(), description: z.string().trim().max(10000).nullable().optional(), department_id: id.optional(), owner_user_id: id.optional(), status: z.enum(['open', 'in_progress']).optional() }).refine((value) => Object.keys(value).length > 0, 'Debe indicar al menos un campo');
const documentLink = z.object({ document_id: id, relation_type: z.enum(['related', 'generated', 'received', 'resolution', 'support']).default('related'), is_primary: z.boolean().default(false) });
const event = z.object({ event_type: z.string().trim().min(1).max(50), event_label: z.string().trim().min(1).max(200).optional(), document_id: id.optional(), payload: z.record(z.string(), z.unknown()).optional() });
const close = z.object({ status: z.enum(['closed', 'archived']).default('closed'), event_label: z.string().trim().min(1).max(200).optional() });

function parse(schema, value) {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    throw new AppError(400, 'VALIDATION_ERROR', 'Solicitud invalida', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
}

module.exports = { id, list, create, update, documentLink, event, close, parse };
