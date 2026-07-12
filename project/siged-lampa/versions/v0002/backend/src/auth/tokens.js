const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { jwtSecret, jwtExpiresIn } = require('../config/env');
function issueToken(subject, actorType, sessionId) {
    return jwt.sign({ sub: String(subject), actor_type: actorType, sid: String(sessionId) }, jwtSecret, { expiresIn: jwtExpiresIn });
}
function hashToken(token) { return crypto.createHash('sha256').update(token).digest('hex'); }
function verifyToken(token) { return jwt.verify(token, jwtSecret); }
module.exports = { issueToken, hashToken, verifyToken };
