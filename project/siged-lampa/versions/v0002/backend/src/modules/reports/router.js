const express = require('express');
const authenticate = require('../../middleware/authentication');
const authorize = require('../../middleware/authorization');
const controller = require('./controller');

const router = express.Router();
router.get('/api/v1/reports/dashboard', authenticate, authorize('reports.view'), (req, res, next) => Promise.resolve(controller.dashboard(req, res)).catch(next));
module.exports = router;
