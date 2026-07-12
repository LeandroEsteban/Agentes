const { z } = require('zod');

const id = z.coerce.number().int().positive();
const params = z.object({ id }).strict();
const documentType = z.object({ code: z.string().trim().regex(/^[A-Z0-9_-]{2,30}$/), name: z.string().trim().min(2).max(200), description: z.string().trim().max(5000).optional(), retention_days: z.number().int().min(0).default(0), requires_signature: z.boolean().default(false), is_active: z.boolean().default(true) }).strict();
const procedureType = z.object({ code: z.string().trim().regex(/^[A-Z0-9_-]{2,30}$/), name: z.string().trim().min(2).max(200), description: z.string().trim().max(5000).optional(), owner_department_id: id, requires_login: z.boolean().default(false), estimated_days: z.number().int().positive().default(10), is_active: z.boolean().default(true) }).strict();
const publicList = z.object({ page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20), q: z.string().trim().max(200).optional(), department_id: id.optional() }).strict();

module.exports = { params, documentType, procedureType, publicList };
