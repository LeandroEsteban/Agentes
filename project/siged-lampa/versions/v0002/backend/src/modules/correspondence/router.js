const express = require('express');
const authenticate = require('../../middleware/authentication');
const authorize = require('../../middleware/authorization');
const controller = require('./controller');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const router = express.Router();
router.use(authenticate);
router.get('/api/v1/correspondence', authorize('correspondence.view'), wrap(controller.list));
router.post('/api/v1/correspondence', authorize('correspondence.create'), wrap(controller.create));
router.get('/api/v1/correspondence/:id', authorize('correspondence.view'), wrap(controller.details));
router.get('/api/v1/correspondence/:id/details', authorize('correspondence.view'), wrap(controller.details));
router.patch('/api/v1/correspondence/:id', authorize('correspondence.edit'), wrap(controller.update));
router.post('/api/v1/correspondence/:id/route', authorize('correspondence.edit'), wrap(controller.route));
router.post('/api/v1/correspondence/:id/link-response', authorize('correspondence.edit'), wrap(controller.linkResponse));
router.get('/api/v1/correspondence/:id/history', authorize('correspondence.view'), wrap(controller.history));
router.post('/api/v1/correspondence/:id/close', authorize('correspondence.edit'), wrap(controller.close));
module.exports = router;
