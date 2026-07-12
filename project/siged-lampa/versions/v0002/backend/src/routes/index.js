const express = require('express');
const { healthCheck } = require('../database/health');
const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);

function createRouter() {
    const router = express.Router();
    router.get('/health', asyncRoute(async (req, res) => res.json({ status: 'healthy', service: 'siged-lampa-api' })));
    router.get('/health/database', asyncRoute(async (req, res) => { const result = await healthCheck(); res.status(result.status === 'healthy' ? 200 : 503).json(result); }));
    return router;
}
module.exports = { createRouter };
