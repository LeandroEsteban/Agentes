const { AppError } = require('../shared/errors');
const requireInternalAccess = (req, res, next) => {
    if (!req.actor || req.actor.actorType !== 'internal') return next(new AppError(403, 'FORBIDDEN', 'Acceso interno requerido'));
    next();
};
const requirePermission = (...permissions) => (req, res, next) => {
    if (!req.actor || req.actor.actorType !== 'internal' || !permissions.every((permission) => req.actor.permissions.includes(permission))) return next(new AppError(403, 'FORBIDDEN', 'No autorizado'));
    next();
};
const requireAnyPermission = (...permissions) => (req, res, next) => {
    if (!req.actor || req.actor.actorType !== 'internal' || !permissions.some((permission) => req.actor.permissions.includes(permission))) return next(new AppError(403, 'FORBIDDEN', 'No autorizado'));
    next();
};
const requireCitizenOwnership = (ownerId) => (req, res, next) => {
    if (!req.actor || req.actor.actorType !== 'citizen' || Number(ownerId(req)) !== req.actor.id) return next(new AppError(404, 'RESOURCE_NOT_FOUND', 'Recurso no encontrado'));
    next();
};
module.exports = requirePermission;
module.exports.requirePermission = requirePermission;
module.exports.requireAnyPermission = requireAnyPermission;
module.exports.requireCitizenOwnership = requireCitizenOwnership;
module.exports.requireInternalAccess = requireInternalAccess;
