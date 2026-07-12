const { z } = require('zod');
const { AppError } = require('../../shared/errors');

const id = z.coerce.number().int().positive();
const slug = z.string().trim().min(1).max(150).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const page = z.object({ page: z.coerce.number().int().positive().default(1), size: z.coerce.number().int().positive().max(100).default(20) }).strict();
const news = z.object({ slug, title: z.string().trim().min(1).max(300), summary: z.string().max(5000).nullable().optional(), content_html: z.string().min(1).max(100000), status: z.enum(['draft', 'published', 'archived']).default('draft') }).strict();
const notice = z.object({ title: z.string().trim().min(1).max(300), body_html: z.string().min(1).max(100000), notice_type: z.enum(['general', 'urgent', 'emergency', 'celebration']).default('general'), status: z.enum(['draft', 'active', 'expired']).default('draft'), start_at: z.coerce.date(), end_at: z.coerce.date() }).strict().refine((value) => value.end_at >= value.start_at, { message: 'end_at debe ser posterior a start_at', path: ['end_at'] });
const calendar = z.object({ title: z.string().trim().min(1).max(300), description: z.string().max(10000).nullable().optional(), start_at: z.coerce.date(), end_at: z.coerce.date(), audience: z.enum(['public', 'internal', 'department']).default('public'), location: z.string().max(300).nullable().optional(), status: z.enum(['scheduled', 'confirmed', 'cancelled', 'completed']).default('scheduled'), department_id: id.nullable().optional() }).strict().refine((value) => value.end_at >= value.start_at, { message: 'end_at debe ser posterior a start_at', path: ['end_at'] });

function parse(schema, value) {
    const result = schema.safeParse(value);
    if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Solicitud invalida', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
    return result.data;
}

module.exports = { id, slug, page, news, notice, calendar, parse };
