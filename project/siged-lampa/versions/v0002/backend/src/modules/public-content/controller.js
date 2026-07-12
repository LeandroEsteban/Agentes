const service = require('./service');
const validator = require('./validator');

exports.list = (kind) => async (req, res) => res.json({ data: await service.publicList(kind, validator.parse(validator.page, req.query)) });
exports.news = async (req, res) => res.json({ data: await service.publicNews(validator.parse(validator.slug, req.params.slug)) });
const schemaFor = (kind) => validator[kind === 'news' ? 'news' : kind === 'notices' ? 'notice' : 'calendar'];
exports.adminList = (kind) => async (req, res) => res.json({ data: await service.adminList(kind) });
exports.create = (kind) => async (req, res) => res.status(201).json({ data: await service.save(kind, null, validator.parse(schemaFor(kind), req.body), req.actor, req.requestId, req.ip) });
exports.update = (kind) => async (req, res) => res.json({ data: await service.save(kind, validator.parse(validator.id, req.params.id), validator.parse(schemaFor(kind), req.body), req.actor, req.requestId, req.ip) });
