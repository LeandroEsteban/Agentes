const service = require('./service');
const validator = require('./validator');

exports.create = async (req, res) => res.status(201).json({ data: await service.create(validator.parse(validator.create, req.body), req.actor, req.requestId, req.ip) });
exports.publicDetail = async (req, res) => res.json({ data: await service.publicCase(validator.parse(validator.uuid, req.params.id), req.get('x-oirs-tracking-token')) });
exports.publicHistory = async (req, res) => { const item = await service.publicCase(validator.parse(validator.uuid, req.params.id), req.get('x-oirs-tracking-token')); res.json({ data: await service.history(item) }); };
exports.publicMessage = async (req, res) => res.status(201).json({ data: await service.addAnonymousMessage(validator.parse(validator.uuid, req.params.id), req.get('x-oirs-tracking-token'), validator.parse(validator.message, req.body), req.requestId, req.ip) });
exports.citizenDetail = async (req, res) => res.json({ data: await service.citizenCase(validator.parse(validator.id, req.params.id), req.actor) });
exports.citizenHistory = async (req, res) => { const item = await service.citizenCase(validator.parse(validator.id, req.params.id), req.actor); res.json({ data: await service.history(item) }); };
exports.citizenMessage = async (req, res) => res.status(201).json({ data: await service.addCitizenMessage(validator.parse(validator.id, req.params.id), validator.parse(validator.message, req.body), req.actor, req.requestId, req.ip) });
exports.list = async (req, res) => res.json({ data: await service.list(validator.parse(validator.list, req.query)) });
exports.reply = async (req, res) => res.status(201).json({ data: await service.reply(validator.parse(validator.id, req.params.id), validator.parse(validator.reply, req.body), req.actor, req.requestId, req.ip) });
exports.status = async (req, res) => res.json({ data: await service.changeStatus(validator.parse(validator.id, req.params.id), validator.parse(validator.status, req.body), req.actor, req.requestId, req.ip) });
exports.route = async (req, res) => res.json({ data: await service.assignRoute(validator.parse(validator.id, req.params.id), validator.parse(validator.route, req.body), req.actor, req.requestId, req.ip) });
