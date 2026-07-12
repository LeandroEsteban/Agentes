const { AppError } = require('../shared/errors');
const passwords = require('./password');
const tokens = require('./tokens');
const repo = require('../repositories/auth.repository');
const citizenSessions = require('../modules/auth/repository');

async function login(identity, password, actorType, requestId) {
    const account = actorType === 'internal' ? await repo.findInternal(identity) : await repo.findCitizen(identity);
    if (!account || !(await passwords.verify(password, account.password_hash))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales inválidas');
    const session = await repo.createSession(account.id, 'pending', new Date(Date.now() + 3600000));
    const token = tokens.issueToken(account.id, actorType, session.id);
    await repo.setSessionToken(session.id, tokens.hashToken(token), new Date(tokens.verifyToken(token).exp * 1000));
    await repo.audit('login', account.id, actorType, requestId);
    return { token, actor: { id: account.id, actor_type: actorType }, session_id: session.id };
}
async function authenticate(token) {
    let payload;
    try { payload = tokens.verifyToken(token); } catch { throw new AppError(401, 'INVALID_TOKEN', 'Token inválido o expirado'); }
    if (payload.actor_type === 'internal' && !(await repo.sessionActive(payload.sid, tokens.hashToken(token)))) throw new AppError(401, 'SESSION_REVOKED', 'Sesión inválida');
    if (payload.actor_type === 'citizen' && !(await citizenSessions.citizenSessionActive(Number(payload.sid), Number(payload.sub), tokens.hashToken(token)))) throw new AppError(401, 'SESSION_REVOKED', 'Sesión inválida');
    return { id: Number(payload.sub), actorType: payload.actor_type, sessionId: Number(payload.sid), permissions: payload.actor_type === 'internal' ? await repo.permissions(payload.sub) : [] };
}
module.exports = { login, authenticate, logout: repo.revokeSession };
