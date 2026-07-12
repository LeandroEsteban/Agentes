const service = require('./service');
const context = (req) => ({ requestId: req.requestId, ipAddress: req.ip });

const list = async (req, res) => res.json({ ok: true, data: await service.list() });
const create = async (req, res) => res.status(201).json({ ok: true, data: await service.create(req.validated.body, req.actor, context(req)) });
const update = async (req, res) => res.json({ ok: true, data: await service.update(req.validated.params.id, req.validated.body, req.actor, context(req)) });

module.exports = { list, create, update };
