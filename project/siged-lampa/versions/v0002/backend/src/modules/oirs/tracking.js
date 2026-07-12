const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../../config/env');
const { AppError } = require('../../shared/errors');

const options = { issuer: 'siged-lampa', audience: 'oirs-tracking', expiresIn: process.env.OIRS_TRACKING_TOKEN_TTL || '90d' };

function issue(caseUuid) {
    return jwt.sign({ case_uuid: caseUuid, scope: 'oirs:tracking' }, jwtSecret, options);
}

function verify(token, caseUuid) {
    try {
        const payload = jwt.verify(token, jwtSecret, { issuer: options.issuer, audience: options.audience });
        if (payload.scope !== 'oirs:tracking' || payload.case_uuid !== caseUuid) throw new Error('tracking scope mismatch');
    } catch {
        throw new AppError(401, 'INVALID_OIRS_TRACKING_TOKEN', 'Token de seguimiento invalido o expirado');
    }
}

module.exports = { issue, verify };
