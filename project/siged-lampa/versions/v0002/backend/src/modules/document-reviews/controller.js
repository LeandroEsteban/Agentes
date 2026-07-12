const service = require('./service');
const validators = require('./validators');
const context = (req) => ({ ip: req.ip, requestId: req.requestId });
exports.submit = async (req, res) => res.status(201).json({ data: await service.submit(validators.parse(validators.id, req.params.id), validators.parse(validators.requestReview, req.body), req.actor, context(req)) });
exports.reply = async (req, res) => res.status(201).json({ data: await service.reply(validators.parse(validators.id, req.params.id), validators.parse(validators.replyReview, req.body), req.actor, context(req)) });
exports.list = async (req, res) => res.json({ data: await service.list(validators.parse(validators.id, req.params.id), req.actor) });
