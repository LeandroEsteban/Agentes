const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const passwords = require('../../src/auth/password');
const tokens = require('../../src/auth/tokens');
const authValidators = require('../../src/modules/auth/validators');
const userValidators = require('../../src/modules/users/validators');

test('password hashes verify only the original password', async () => {
    const hashed = await passwords.hash('correct-password');
    assert.equal(await passwords.verify('correct-password', hashed), true);
    assert.equal(await passwords.verify('incorrect-password', hashed), false);
});

test('tokens verify, reject tampering, and reject expiration', () => {
    const valid = tokens.issueToken(7, 'internal', 11);
    assert.deepEqual(tokens.verifyToken(valid).sub, '7');
    assert.throws(() => tokens.verifyToken(`${valid}x`));
    const expired = jwt.sign({ sub: '7', actor_type: 'internal', sid: '11' }, process.env.JWT_SECRET || 'development-only-change-me', { expiresIn: -1 });
    assert.throws(() => tokens.verifyToken(expired), /jwt expired/);
});

test('strict validators reject mass assignment, invalid email, ids, and pagination limits', () => {
    assert.equal(authValidators.login.safeParse({ username: 'admin', password: 'password1' }).success, true);
    assert.equal(authValidators.login.safeParse({ username: 'admin', password: 'password1', role: 'admin' }).success, false);
    assert.equal(authValidators.citizenLogin.safeParse({ email: 'invalid', password: 'password1' }).success, false);
    assert.equal(userValidators.id.safeParse('0').success, false);
    assert.equal(userValidators.pagination.safeParse({ page: 1, size: 101 }).success, false);
    assert.equal(userValidators.create.safeParse({ username: 'user', email: 'u@example.cl', full_name: 'User Example', department_id: 1, role_ids: [1, 1] }).success, false);
});
