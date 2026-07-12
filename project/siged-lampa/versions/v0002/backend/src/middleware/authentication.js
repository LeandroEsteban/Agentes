const auth = require('../auth/authentication');
const { AppError } = require('../shared/errors');
module.exports = async (req, res, next) => {
    try { const header = req.get('authorization'); if (!header || !header.startsWith('Bearer ')) throw new AppError(401, 'UNAUTHENTICATED', 'Autenticación requerida'); req.actor = await auth.authenticate(header.slice(7)); next(); } catch (error) { next(error); }
};
