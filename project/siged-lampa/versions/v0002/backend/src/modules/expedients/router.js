const express = require('express');
const authenticate = require('../../middleware/authentication');
const authorize = require('../../middleware/authorization');
const controller = require('./controller');

const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const router = express.Router();
router.use(authenticate);
router.get('/api/v1/expedients', authorize('expedients.view'), wrap(controller.list));
router.post('/api/v1/expedients', authorize('expedients.create'), wrap(controller.create));
router.get('/api/v1/expedients/:id', authorize('expedients.view'), wrap(controller.details));
router.get('/api/v1/expedients/:id/details', authorize('expedients.view'), wrap(controller.details));
router.patch('/api/v1/expedients/:id', authorize('expedients.edit'), wrap(controller.update));
router.post('/api/v1/expedients/:id/documents', authorize('expedients.edit'), wrap(controller.linkDocument));
router.get('/api/v1/expedients/:id/events', authorize('expedients.view'), wrap(controller.events));
router.post('/api/v1/expedients/:id/events', authorize('expedients.edit'), wrap(controller.addEvent));
router.get('/api/v1/expedients/:id/history', authorize('expedients.view'), wrap(controller.events));
router.post('/api/v1/expedients/:id/close', authorize('expedients.edit'), wrap(controller.close));
module.exports = router;
