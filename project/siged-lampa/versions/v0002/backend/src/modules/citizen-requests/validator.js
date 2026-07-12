const { z } = require('zod');
const { AppError } = require('../../shared/errors');

const requestId = z.coerce.number().int().positive();
const attachment = z.object({ file_token: z.string().min(1).max(500) }).strict();
const create = z.object({
    form_data: z.record(z.string(), z.unknown()).default({}),
    attachments: z.array(attachment).max(20).default([]),
}).strict();
const legacyCreate = create.extend({ published_procedure_id: requestId }).strict();
const list = z.object({
    page: z.coerce.number().int().positive().max(100000).default(1),
    size: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['submitted', 'in_review', 'in_process', 'completed', 'rejected', 'cancelled']).optional(),
}).strict();
const cancel = z.object({ reason: z.string().trim().min(1).max(2000).optional() }).strict();

function parse(schema, value) {
    const result = schema.safeParse(value);
    if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Solicitud invalida', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
    return result.data;
}

module.exports = { requestId, create, legacyCreate, list, cancel, parse };
