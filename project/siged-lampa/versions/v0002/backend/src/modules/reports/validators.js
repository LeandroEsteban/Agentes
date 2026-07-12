const { z } = require('zod');
const { AppError } = require('../../shared/errors');

const dashboard = z.object({ from: z.coerce.date().optional(), to: z.coerce.date().optional(), department_id: z.coerce.number().int().positive().optional() }).refine((value) => !value.from || !value.to || value.from <= value.to, { message: 'El rango de fechas no es valido', path: ['to'] });

function parse(schema, value) {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    throw new AppError(400, 'VALIDATION_ERROR', 'Solicitud invalida', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })));
}

module.exports = { dashboard, parse };
