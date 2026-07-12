const service = require('./service');

const context = (req) => ({ requestId: req.requestId, ipAddress: req.ip });
const list = async (req, res) => { const result = await service.list(req.actor, req.validated.query); res.json({ ok: true, ...result }); };
const markRead = async (req, res) => res.json({ ok: true, data: await service.markRead(req.validated.params.id, req.actor, context(req)) });

module.exports = { list, markRead };
