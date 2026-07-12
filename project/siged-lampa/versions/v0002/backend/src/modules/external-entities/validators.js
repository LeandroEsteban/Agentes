const { z } = require('zod');

const id = z.coerce.number().int().positive();
const entity = z.object({ entity_type: z.string().trim().min(2).max(30), name: z.string().trim().min(2).max(200), tax_id: z.string().trim().max(30).optional(), email: z.string().trim().email().max(254).optional(), phone: z.string().trim().max(40).optional(), address: z.string().trim().max(500).optional(), contact_name: z.string().trim().max(200).optional(), status: z.enum(['active', 'inactive']).default('active') }).strict();

module.exports = { params: z.object({ id }).strict(), entity };
