const express = require('express');
const authenticate = require('../../middleware/authentication');
const authorize = require('../../middleware/authorization');
const { asyncRoute, validate } = require('../../shared/helpers/http');
const controller = require('./controller');
const validators = require('./validators');

const router = express.Router();
router.get('/api/v1/admin/external-entities', authenticate, authorize('admin.access'), asyncRoute(controller.list));
router.post('/api/v1/admin/external-entities', authenticate, authorize('admin.access'), validate(validators.entity), asyncRoute(controller.create));
router.put('/api/v1/admin/external-entities/:id', authenticate, authorize('admin.access'), validate(validators.params, 'params'), validate(validators.entity), asyncRoute(controller.update));

module.exports = router;
