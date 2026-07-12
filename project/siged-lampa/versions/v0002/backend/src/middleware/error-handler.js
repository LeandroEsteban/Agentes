const { AppError } = require('../shared/errors');
module.exports = (error, req, res, next) => { // eslint-disable-line no-unused-vars
    const known = error instanceof AppError;
    const malformedJson = error && error.type === 'entity.parse.failed';
    const status = known ? error.status : malformedJson ? 400 : 500;
    res.status(status).json({ error: {
        code: known ? error.code : malformedJson ? 'INVALID_JSON' : 'INTERNAL_ERROR',
        message: known ? error.message : malformedJson ? 'JSON invalido' : 'Error interno del servidor',
        request_id: req.requestId,
        details: known ? error.details : [],
    }});
};
