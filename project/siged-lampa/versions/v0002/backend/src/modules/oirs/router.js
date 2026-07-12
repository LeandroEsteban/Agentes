const express = require('express');
const authentication = require('../../auth/authentication');
const authenticate = require('../../middleware/authentication');
const authorize = require('../../middleware/authorization');
const { AppError } = require('../../shared/errors');
const controller = require('./controller');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);
const optionalCitizen = async (req, res, next) => {
    try {
        const header = req.headers.authorization;
        if (!header) return next();
        if (!header.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHENTICATED', 'Autenticacion requerida');
        req.actor = await authentication.authenticate(header.slice(7));
        next();
    } catch (error) { next(error); }
};

router.post('/api/v1/public/oirs', optionalCitizen, wrap(controller.create));
router.get('/api/v1/public/oirs/:id', wrap(controller.publicDetail));
router.get('/api/v1/public/oirs/:id/history', wrap(controller.publicHistory));
router.post('/api/v1/public/oirs/:id/messages', wrap(controller.publicMessage));
router.get('/api/v1/citizen/oirs/:id', authenticate, wrap(controller.citizenDetail));
router.get('/api/v1/citizen/oirs/:id/history', authenticate, wrap(controller.citizenHistory));
router.post('/api/v1/citizen/oirs/:id/messages', authenticate, wrap(controller.citizenMessage));
router.get('/api/v1/oirs', authenticate, authorize('oirs.view'), wrap(controller.list));
router.post('/api/v1/oirs/:id/reply', authenticate, authorize('oirs.respond'), wrap(controller.reply));
router.patch('/api/v1/oirs/:id/status', authenticate, authorize('oirs.respond'), wrap(controller.status));
router.patch('/api/v1/oirs/:id/route', authenticate, authorize('oirs.respond'), wrap(controller.route));

module.exports = router;
