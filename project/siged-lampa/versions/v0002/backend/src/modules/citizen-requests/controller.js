const service = require('./service');
const validator = require('./validator');

exports.create = async (req, res) => res.status(201).json({ data: await service.create(validator.parse(validator.requestId, req.params.id), validator.parse(validator.create, req.body), req.actor, req.requestId, req.ip) });
exports.legacyCreate = async (req, res) => {
    const data = validator.parse(validator.legacyCreate, req.body);
    const { published_procedure_id: procedureId, ...payload } = data;
    res.status(201).json({ data: await service.create(procedureId, payload, req.actor, req.requestId, req.ip) });
};
exports.list = async (req, res) => res.json({ data: await service.list(req.actor, validator.parse(validator.list, req.query)) });
exports.detail = async (req, res) => res.json({ data: await service.detail(validator.parse(validator.requestId, req.params.id), req.actor) });
exports.history = async (req, res) => res.json({ data: await service.history(validator.parse(validator.requestId, req.params.id), req.actor) });
exports.cancel = async (req, res) => res.json({ data: await service.cancel(validator.parse(validator.requestId, req.params.id), validator.parse(validator.cancel, req.body), req.actor, req.requestId, req.ip) });
