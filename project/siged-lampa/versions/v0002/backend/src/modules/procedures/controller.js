const service = require('./service');

const context = (req) => ({ requestId: req.requestId, ipAddress: req.ip });
const listDocumentTypes = async (req, res) => res.json({ ok: true, data: await service.listDocumentTypes() });
const createDocumentType = async (req, res) => res.status(201).json({ ok: true, data: await service.createDocumentType(req.validated.body, req.actor, context(req)) });
const listProcedureTypes = async (req, res) => res.json({ ok: true, data: await service.listProcedureTypes() });
const createProcedureType = async (req, res) => res.status(201).json({ ok: true, data: await service.createProcedureType(req.validated.body, req.actor, context(req)) });
const updateProcedureType = async (req, res) => res.json({ ok: true, data: await service.updateProcedureType(req.validated.params.id, req.validated.body, req.actor, context(req)) });
const listPublished = async (req, res) => { const result = await service.listPublished(req.validated.query); res.json({ ok: true, ...result }); };
const getPublished = async (req, res) => res.json({ ok: true, data: await service.getPublished(req.validated.params.id) });

module.exports = { listDocumentTypes, createDocumentType, listProcedureTypes, createProcedureType, updateProcedureType, listPublished, getPublished };
