const { AppError } = require('../errors');

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function validate(schema, source = 'body') {
    return (req, res, next) => {
        const result = schema.safeParse(req[source]);
        if (!result.success) {
            return next(new AppError(400, 'VALIDATION_ERROR', 'Solicitud invalida', result.error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message }))));
        }
        req.validated = req.validated || {};
        req.validated[source] = result.data;
        return next();
    };
}

module.exports = { asyncRoute, validate };
