const service = require('./service');
const validators = require('./validators');

exports.list = async (req, res) => { const filters = validators.parse(validators.list, req.query); const result = await service.list(filters); res.json({ data: result.data, meta: { page: filters.page, size: filters.size, total: result.total } }); };
exports.create = async (req, res) => res.status(201).json({ data: await service.create(validators.parse(validators.create, req.body), req.actor, req.requestId) });
exports.details = async (req, res) => res.json({ data: await service.details(validators.parse(validators.id, req.params.id)) });
exports.update = async (req, res) => res.json({ data: await service.update(validators.parse(validators.id, req.params.id), validators.parse(validators.update, req.body), req.actor, req.requestId) });
exports.linkDocument = async (req, res) => res.status(201).json({ data: await service.linkDocument(validators.parse(validators.id, req.params.id), validators.parse(validators.documentLink, req.body), req.actor, req.requestId) });
exports.events = async (req, res) => res.json({ data: await service.events(validators.parse(validators.id, req.params.id)) });
exports.addEvent = async (req, res) => res.status(201).json({ data: await service.addEvent(validators.parse(validators.id, req.params.id), validators.parse(validators.event, req.body), req.actor, req.requestId) });
exports.close = async (req, res) => res.json({ data: await service.close(validators.parse(validators.id, req.params.id), validators.parse(validators.close, req.body), req.actor, req.requestId) });
