const express = require('express');
const authenticate = require('../../middleware/authentication');
const authorize = require('../../middleware/authorization');
const controller = require('./controller');
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const router = express.Router();
router.post('/api/v1/documents/:id/signatures', authenticate, authorize('documents.sign'), wrap(controller.sign));
router.get('/api/v1/documents/:id/signatures', authenticate, authorize('documents.view'), wrap(controller.list));
module.exports = router;
