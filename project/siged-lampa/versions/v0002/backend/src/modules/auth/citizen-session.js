const { AppError } = require('../../shared/errors');
const { hashToken } = require('../../auth/tokens');
const repository = require('./repository');

module.exports = async (req, res, next) => {
    try {
        if (req.actor.actorType !== 'citizen') return next();
        const token = req.get('authorization').slice(7);
        if (!(await repository.citizenSessionActive(req.actor.sessionId, req.actor.id, hashToken(token)))) throw new AppError(401, 'SESSION_REVOKED', 'Sesion invalida');
        return next();
    } catch (error) {
        return next(error);
    }
};
