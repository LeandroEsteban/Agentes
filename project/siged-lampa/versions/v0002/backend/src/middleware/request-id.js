const crypto = require('crypto');
module.exports = (req, res, next) => {
    req.requestId = req.get('x-request-id') || crypto.randomUUID();
    res.set('x-request-id', req.requestId);
    next();
};
