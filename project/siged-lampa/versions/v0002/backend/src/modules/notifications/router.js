const express = require('express');
const authenticate = require('../../middleware/authentication');
const citizenSession = require('../auth/citizen-session');
const { asyncRoute, validate } = require('../../shared/helpers/http');
const controller = require('./controller');
const validators = require('./validators');

const router = express.Router();
router.get('/api/v1/notifications', authenticate, citizenSession, validate(validators.list, 'query'), asyncRoute(controller.list));
router.patch('/api/v1/notifications/:id/read', authenticate, citizenSession, validate(validators.params, 'params'), asyncRoute(controller.markRead));

module.exports = router;
