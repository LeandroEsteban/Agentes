const express = require('express');
const authenticate = require('../../middleware/authentication');
const citizenSession = require('./citizen-session');
const { asyncRoute, validate } = require('../../shared/helpers/http');
const controller = require('./controller');
const validators = require('./validators');

const router = express.Router();
router.post('/api/v1/auth/login', validate(validators.login), asyncRoute(controller.login));
router.post('/api/v1/auth/internal-login', validate(validators.login), asyncRoute(controller.login));
router.post('/api/v1/auth/citizen-login', validate(validators.citizenLogin), asyncRoute(controller.citizenLogin));
router.post('/api/v1/auth/recover', validate(validators.recover), asyncRoute(controller.recover));
router.get('/api/v1/profile/me', authenticate, asyncRoute(controller.me));
router.put('/api/v1/profile/me', authenticate, validate(validators.profile), asyncRoute(controller.updateMe));
router.post('/api/v1/auth/logout', authenticate, citizenSession, asyncRoute(controller.logout));

module.exports = router;
