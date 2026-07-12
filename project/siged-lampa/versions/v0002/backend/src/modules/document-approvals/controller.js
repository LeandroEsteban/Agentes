const service = require('./service');
const validators = require('./validators');
const context = (req) => ({ ip: req.ip, requestId: req.requestId });
exports.request = async (req, res) => res.status(201).json({ data: await service.request(validators.parse(validators.id, req.params.id), validators.parse(validators.approvalRequest, req.body), req.actor, context(req)) });
exports.decide = async (req, res) => res.json({ data: await service.decide(validators.parse(validators.id, req.params.id), validators.parse(validators.approvalDecision, req.body), req.actor, context(req)) });
exports.list = async (req, res) => res.json({ data: await service.list(validators.parse(validators.id, req.params.id), req.actor) });
