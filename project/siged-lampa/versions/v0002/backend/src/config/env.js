const environment = process.env.APP_ENV || 'dev';

if (environment === 'qa' && process.env.PERSISTENCE_MODE !== 'postgres') {
    throw new Error('QA requires PERSISTENCE_MODE=postgres');
}

module.exports = {
    environment,
    port: Number(process.env.PORT || 3000),
    jwtSecret: process.env.JWT_SECRET || 'development-only-change-me',
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '1h',
    bodyLimit: process.env.BODY_LIMIT || '1mb',
};
