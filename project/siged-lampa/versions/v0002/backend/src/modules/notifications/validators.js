const { z } = require('zod');

const id = z.coerce.number().int().positive();
const params = z.object({ id }).strict();
const isRead = z.enum(['true', 'false']).transform((value) => value === 'true');
const list = z.object({ page: z.coerce.number().int().min(1).default(1), size: z.coerce.number().int().min(1).max(100).default(20), is_read: isRead.optional() }).strict();

module.exports = { params, list };
