const crypto = require('crypto');
const { AppError } = require('../../shared/errors');
const passwords = require('../../auth/password');
const tokens = require('../../auth/tokens');
const audit = require('../audit/service');
const repository = require('./repository');

const expiry = () => new Date(tokens.verifyToken(tokens.issueToken(0, 'internal', 0)).exp * 1000);

async function loginInternal(data, context) {
    const account = await repository.findInternal(data.username);
    if (!account || !(await passwords.verify(data.password, account.password_hash))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales invalidas');
    if (account.two_factor_enabled && (!data.otp_code || !(await passwords.verify(data.otp_code, account.two_factor_secret)))) throw new AppError(401, 'INVALID_OTP', 'Codigo de verificacion invalido');
    const expiresAt = expiry();
    const session = (await repository.createInternalSession(account.id, expiresAt)).rows[0];
    const accessToken = tokens.issueToken(account.id, 'internal', session.id);
    await Promise.all([repository.setInternalSessionToken(session.id, tokens.hashToken(accessToken), expiresAt), repository.touchInternalLogin(account.id)]);
    await audit.record({ eventName: 'login_succeeded', moduleCode: 'M01', entityType: 'session', entityId: session.id, actor: { id: account.id, actorType: 'internal' }, ipAddress: context.ipAddress, payload: { request_id: context.requestId } });
    return { access_token: accessToken, token: accessToken, user: { id: account.id, full_name: account.full_name, roles: await repository.rolesForUser(account.id) } };
}

async function loginCitizen(data, context) {
    const account = await repository.findCitizen(data.email);
    if (!account || !(await passwords.verify(data.password, account.password_hash))) throw new AppError(401, 'INVALID_CREDENTIALS', 'Credenciales invalidas');
    const expiresAt = expiry();
    const session = (await repository.createCitizenSession(account.id, expiresAt)).rows[0];
    const accessToken = tokens.issueToken(account.id, 'citizen', session.id);
    await Promise.all([repository.setCitizenSessionToken(session.id, tokens.hashToken(accessToken), expiresAt), repository.touchCitizenLogin(account.id), audit.record({ eventName: 'citizen_login_succeeded', moduleCode: 'M01', entityType: 'citizen_session', entityId: session.id, actor: { id: account.id, actorType: 'citizen' }, ipAddress: context.ipAddress, payload: { request_id: context.requestId } })]);
    return { access_token: accessToken, token: accessToken, citizen: { id: account.id, email: account.email, full_name: account.full_name } };
}

async function recover(data, context) {
    const identityHash = crypto.createHash('sha256').update(data.identifier.toLowerCase()).digest('hex');
    await audit.record({ eventName: 'password_recovery_requested', moduleCode: 'M01', entityType: 'account_recovery', ipAddress: context.ipAddress, payload: { channel: data.channel, identifier_hash: identityHash, request_id: context.requestId } });
}

async function getProfile(actor) {
    const profile = actor.actorType === 'citizen' ? await repository.findCitizenProfile(actor.id) : await repository.findProfile(actor.id);
    if (!profile) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Perfil no encontrado');
    return profile;
}

async function updateProfile(actor, data, context) {
    const updated = actor.actorType === 'citizen' ? await repository.updateCitizenProfile(actor.id, data) : await repository.updateProfile(actor.id, data);
    if (!updated) throw new AppError(404, 'PROFILE_NOT_FOUND', 'Perfil no encontrado');
    const profile = await getProfile(actor);
    await audit.record({ eventName: 'profile_updated', moduleCode: 'M01', entityType: 'user', entityId: actor.id, actor, ipAddress: context.ipAddress, payload: { fields: Object.keys(data), request_id: context.requestId } });
    return profile;
}

async function logout(actor, context) {
    if (actor.actorType === 'internal') await repository.revokeInternalSession(actor.sessionId);
    else await repository.revokeCitizenSession(actor.sessionId, actor.id);
    await audit.record({ eventName: 'logout', moduleCode: 'M01', entityType: 'session', entityId: actor.sessionId, actor, ipAddress: context.ipAddress, payload: { request_id: context.requestId } });
}

module.exports = { loginInternal, loginCitizen, recover, getProfile, updateProfile, logout };
