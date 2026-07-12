const express = require('express');
const authenticate = require('../../middleware/authentication');
const controller = require('./controller');
const publicContent = require('../public-content/router');
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const router = express.Router();
router.post('/api/v1/public/tramites/:id/requests', authenticate, wrap(controller.create));
// ADR-005 keeps this compatibility route while clients migrate to the canonical URL.
router.post('/api/v1/citizen/requests', authenticate, (req, res, next) => {
    res.set('Deprecation', 'true');
    res.set('Sunset', '2027-01-01');
    res.set('Link', '</api/v1/public/tramites/{id}/requests>; rel="successor-version"');
    next();
}, wrap(controller.legacyCreate));
router.get('/api/v1/citizen/requests', authenticate, wrap(controller.list));
router.get('/api/v1/citizen/requests/:id/history', authenticate, wrap(controller.history));
router.get('/api/v1/citizen/requests/:id', authenticate, wrap(controller.detail));
router.post('/api/v1/citizen/requests/:id/cancel', authenticate, wrap(controller.cancel));
router.use(publicContent);
module.exports = router;
