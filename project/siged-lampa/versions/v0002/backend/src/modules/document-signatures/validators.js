const { z } = require('zod');
const { AppError } = require('../../shared/errors');
const id = z.coerce.number().int().positive();
const signatureCreate = z.object({ signature_profile_id: id, signature_mode: z.literal('simulated').default('simulated') }).strict();
function parse(schema, value) { const result = schema.safeParse(value); if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Solicitud inválida', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))); return result.data; }
module.exports = { id, signatureCreate, parse };
