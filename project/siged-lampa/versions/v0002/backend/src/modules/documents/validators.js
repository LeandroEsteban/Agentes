const { z } = require('zod');
const { AppError } = require('../../shared/errors');

const id = z.coerce.number().int().positive();
const datetime = z.string().datetime({ offset: true });
const documentCreate = z.object({ document_type_id: id, title: z.string().trim().min(1).max(300), summary: z.string().trim().max(20000).optional(), department_id: id, confidentiality_level: z.enum(['public', 'internal', 'confidential', 'secret']).optional(), origin_type: z.enum(['internal', 'external', 'digital', 'physical']).optional(), due_date: datetime.optional(), content: z.string().min(1).max(2_000_000) }).strict();
const documentUpdate = z.object({ title: z.string().trim().min(1).max(300).optional(), summary: z.string().trim().max(20000).nullable().optional(), department_id: id.optional(), confidentiality_level: z.enum(['public', 'internal', 'confidential', 'secret']).optional(), origin_type: z.enum(['internal', 'external', 'digital', 'physical']).optional(), due_date: datetime.nullable().optional() }).strict().refine((value) => Object.keys(value).length > 0, 'Debe indicar al menos un campo editable');
const versionCreate = z.object({ content: z.string().min(1).max(2_000_000), change_summary: z.string().trim().max(5000).optional(), is_major: z.boolean().optional() }).strict();
const attachmentCreate = z.object({ file_name: z.string().trim().min(1).max(300), mime_type: z.string().max(100), content_base64: z.string().min(4), checksum_sha256: z.string().regex(/^[a-fA-F0-9]{64}$/).optional(), document_version_id: id.optional(), description: z.string().trim().max(1000).optional() }).strict();
const commentCreate = z.object({ body: z.string().trim().min(1).max(20000), comment_type: z.enum(['general', 'observation', 'correction', 'legal']).optional(), version_id: id.optional() }).strict();
const listQuery = z.object({ page: z.coerce.number().int().positive().default(1), size: z.coerce.number().int().min(1).max(100).default(20), q: z.string().trim().max(300).optional(), status: z.string().trim().max(30).optional(), type_id: id.optional(), owner_id: id.optional(), expedient_id: id.optional() }).strict();

function parse(schema, value) { const result = schema.safeParse(value); if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Solicitud inválida', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))); return result.data; }
module.exports = { id, documentCreate, documentUpdate, versionCreate, attachmentCreate, commentCreate, listQuery, parse };
