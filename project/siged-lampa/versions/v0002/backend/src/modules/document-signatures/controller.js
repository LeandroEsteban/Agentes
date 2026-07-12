const service = require('./service');
const validators = require('./validators');
const context = (req) => ({ ip: req.ip, requestId: req.requestId });
exports.sign = async (req, res) => res.status(201).json({ data: await service.sign(validators.parse(validators.id, req.params.id), validators.parse(validators.signatureCreate, req.body), req.actor, context(req)) });
exports.list = async (req, res) => res.json({ data: await service.list(validators.parse(validators.id, req.params.id), req.actor) });
