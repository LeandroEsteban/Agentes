const { z } = require('zod');

const id = z.coerce.number().int().positive();
const create = z.object({ code: z.string().trim().regex(/^[A-Z0-9_-]{2,30}$/), name: z.string().trim().min(2).max(200), description: z.string().trim().max(5000).optional(), parent_department_id: id.nullable().optional(), manager_user_id: id.nullable().optional() }).strict();

module.exports = { create };
