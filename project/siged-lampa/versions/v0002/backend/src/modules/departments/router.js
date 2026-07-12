const express = require('express');
const authenticate = require('../../middleware/authentication');
const authorize = require('../../middleware/authorization');
const { asyncRoute, validate } = require('../../shared/helpers/http');
const controller = require('./controller');
const validators = require('./validators');

const router = express.Router();
router.get('/api/v1/departments', authenticate, authorize('departments.view'), asyncRoute(controller.list));
router.post('/api/v1/departments', authenticate, authorize('departments.edit'), validate(validators.create), asyncRoute(controller.create));

module.exports = router;
