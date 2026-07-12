const service = require('./service');
const validators = require('./validators');

exports.list = async (req, res) => { const filters = validators.parse(validators.list, req.query); const result = await service.list(filters); res.json({ data: result.data, meta: { page: filters.page, size: filters.size, total: result.total } }); };
exports.create = async (req, res) => res.status(201).json({ data: await service.create(validators.parse(validators.create, req.body), req.actor, req.requestId) });
exports.details = async (req, res) => res.json({ data: await service.details(validators.parse(validators.id, req.params.id)) });
exports.update = async (req, res) => res.json({ data: await service.update(validators.parse(validators.id, req.params.id), validators.parse(validators.update, req.body), req.actor, req.requestId) });
exports.route = async (req, res) => res.status(201).json({ data: await service.route(validators.parse(validators.id, req.params.id), validators.parse(validators.route, req.body), req.actor, req.requestId) });
exports.linkResponse = async (req, res) => res.json({ data: await service.linkResponse(validators.parse(validators.id, req.params.id), validators.parse(validators.linkResponse, req.body), req.actor, req.requestId) });
exports.history = async (req, res) => res.json({ data: await service.history(validators.parse(validators.id, req.params.id)) });
exports.close = async (req, res) => res.json({ data: await service.close(validators.parse(validators.id, req.params.id), validators.parse(validators.close, req.body), req.actor, req.requestId) });
