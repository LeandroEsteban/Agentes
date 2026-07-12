const express = require('express');
const authenticate = require('../../middleware/authentication');
const authorize = require('../../middleware/authorization');
const { asyncRoute, validate } = require('../../shared/helpers/http');
const controller = require('./controller');
const validators = require('./validators');

const router = express.Router();
router.get('/api/v1/users', authenticate, authorize('users.view'), validate(validators.pagination, 'query'), asyncRoute(controller.list));
router.post('/api/v1/users', authenticate, authorize('users.create'), validate(validators.create), asyncRoute(controller.create));
router.put('/api/v1/users/:id', authenticate, authorize('users.edit'), validate(validators.params, 'params'), validate(validators.update), asyncRoute(controller.update));
router.get('/api/v1/roles', authenticate, authorize('roles.view'), asyncRoute(controller.roles));
router.put('/api/v1/roles/:id/permissions', authenticate, authorize('roles.edit'), validate(validators.params, 'params'), validate(validators.permissions), asyncRoute(controller.replacePermissions));

module.exports = router;
