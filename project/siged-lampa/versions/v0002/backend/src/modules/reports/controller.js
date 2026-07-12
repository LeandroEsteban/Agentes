const service = require('./service');
const validators = require('./validators');

exports.dashboard = async (req, res) => res.json({ ok: true, data: await service.dashboard(validators.parse(validators.dashboard, req.query)) });
