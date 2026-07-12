const { z } = require('zod');
const { AppError } = require('../../shared/errors');
const id = z.coerce.number().int().positive();
const datetime = z.string().datetime({ offset: true });
const requestReview = z.object({ reviewer_user_id: id, instructions: z.string().trim().max(10000).optional(), due_at: datetime.optional() }).strict();
const replyReview = z.object({ decision: z.enum(['approved', 'rejected', 'changes_requested', 'changes_required', 'needs_clarification']), observations: z.string().trim().max(20000).optional() }).strict();
function parse(schema, value) { const result = schema.safeParse(value); if (!result.success) throw new AppError(400, 'VALIDATION_ERROR', 'Solicitud inválida', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))); return result.data; }
module.exports = { id, requestReview, replyReview, parse };
