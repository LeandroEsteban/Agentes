const express = require('express');
const authenticate = require('../../middleware/authentication');
const authorize = require('../../middleware/authorization');
const controller = require('./controller');

const router = express.Router();
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res)).catch(next);

router.get('/api/v1/public/news', wrap(controller.list('news')));
router.get('/api/v1/public/news/:slug', wrap(controller.news));
router.get('/api/v1/public/notices', wrap(controller.list('notices')));
router.get('/api/v1/public/calendar', wrap(controller.list('calendar')));

['news', 'notices', 'calendar'].forEach((kind) => {
    const path = `/api/v1/admin/public-content/${kind}`;
    router.get(path, authenticate, authorize('admin.access'), wrap(controller.adminList(kind)));
    router.post(path, authenticate, authorize('admin.access'), wrap(controller.create(kind)));
    router.patch(`${path}/:id`, authenticate, authorize('admin.access'), wrap(controller.update(kind)));
});

module.exports = router;
