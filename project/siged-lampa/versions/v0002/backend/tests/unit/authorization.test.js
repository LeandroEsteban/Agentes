const test = require('node:test');
const assert = require('node:assert/strict');
const { requirePermission, requireAnyPermission, requireCitizenOwnership } = require('../../src/middleware/authorization');

function invoke(middleware, actor, owner = () => 1) {
    return new Promise((resolve) => middleware({ actor }, {}, (error) => resolve(error)));
}

test('authorization grants only database-derived permission names', async () => {
    assert.equal(await invoke(requirePermission('documents.create'), { actorType: 'internal', permissions: ['documents.create'] }), undefined);
    const denied = await invoke(requirePermission('documents.create'), { actorType: 'internal', permissions: [] });
    assert.equal(denied.status, 403);
    assert.equal(await invoke(requireAnyPermission('documents.create', 'documents.read'), { actorType: 'internal', permissions: ['documents.read'] }), undefined);
});

test('citizen ownership hides another citizen resource', async () => {
    assert.equal(await invoke(requireCitizenOwnership(() => 9), { actorType: 'citizen', id: 9 }), undefined);
    const denied = await invoke(requireCitizenOwnership(() => 10), { actorType: 'citizen', id: 9 });
    assert.equal(denied.status, 404);
});
