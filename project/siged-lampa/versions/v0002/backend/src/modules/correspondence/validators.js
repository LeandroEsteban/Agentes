const { z } = require('zod');
const { AppError } = require('../../shared/errors');

const id = z.coerce.number().int().positive();
const pagination = z.object({ page: z.coerce.number().int().positive().default(1), size: z.coerce.number().int().min(1).max(100).default(20) });
const direction = z.enum(['INBOUND', 'OUTBOUND']);
const priority = z.enum(['low', 'normal', 'high', 'urgent']);
const recipient = z.object({ recipient_type: z.enum(['external', 'internal', 'cc']), external_entity_id: id.optional(), department_id: id.optional(), delivery_channel: z.enum(['internal', 'email', 'physical', 'digital']).default('internal') }).refine((value) => value.external_entity_id || value.department_id, 'El destinatario requiere entidad o departamento');
const list = pagination.extend({ direction: direction.optional(), status: z.enum(['received', 'in_process', 'derived', 'responded', 'closed', 'cancelled']).optional(), tracking_code: z.string().trim().min(1).max(50).optional() });
const create = z.object({ direction, subject: z.string().trim().min(1).max(300), origin_entity_id: id.optional(), received_at: z.coerce.date().optional(), sent_at: z.coerce.date().optional(), priority: priority.default('normal'), document_id: id.optional(), recipients: z.array(recipient).max(100).optional() }).superRefine((value, ctx) => {
    if (value.direction === 'INBOUND' && !value.origin_entity_id) ctx.addIssue({ code: 'custom', path: ['origin_entity_id'], message: 'El remitente es obligatorio para correspondencia entrante' });
    if (value.direction === 'INBOUND' && !value.received_at) ctx.addIssue({ code: 'custom', path: ['received_at'], message: 'La fecha de ingreso es obligatoria' });
    if (value.direction === 'OUTBOUND' && !value.sent_at) ctx.addIssue({ code: 'custom', path: ['sent_at'], message: 'La fecha de envio es obligatoria' });
});
const update = z.object({ subject: z.string().trim().min(1).max(300).optional(), origin_entity_id: id.nullable().optional(), received_at: z.coerce.date().nullable().optional(), sent_at: z.coerce.date().nullable().optional(), priority: priority.optional(), status: z.enum(['received', 'in_process', 'derived', 'responded']).optional() }).refine((value) => Object.keys(value).length > 0, 'Debe indicar al menos un campo');
const route = z.object({ to_department_id: id, assigned_user_id: id.optional(), instructions: z.string().trim().min(1).max(10000).optional() });
const linkResponse = z.object({ document_id: id });
const close = z.object({ status: z.enum(['closed', 'cancelled']).default('closed'), observation: z.string().trim().min(1).max(10000) });

function parse(schema, value) {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    throw new AppError(400, 'VALIDATION_ERROR', 'Solicitud invalida', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
}

module.exports = { id, list, create, update, route, linkResponse, close, parse };
