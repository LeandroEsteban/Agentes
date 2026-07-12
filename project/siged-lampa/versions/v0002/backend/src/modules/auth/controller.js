const service = require('./service');

const context = (req) => ({ requestId: req.requestId, ipAddress: req.ip });
const login = async (req, res) => res.json({ ok: true, data: await service.loginInternal(req.validated.body, context(req)) });
const citizenLogin = async (req, res) => res.json({ ok: true, data: await service.loginCitizen(req.validated.body, context(req)) });
const recover = async (req, res) => { await service.recover(req.validated.body, context(req)); res.status(202).json({ ok: true, data: { accepted: true } }); };
const me = async (req, res) => res.json({ ok: true, data: await service.getProfile(req.actor) });
const updateMe = async (req, res) => res.json({ ok: true, data: await service.updateProfile(req.actor, req.validated.body, context(req)) });
const logout = async (req, res) => { await service.logout(req.actor, context(req)); res.status(204).end(); };

module.exports = { login, citizenLogin, recover, me, updateMe, logout };
