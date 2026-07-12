import type { Approval } from '../../features/documents/types';

export const approvalFixture = (overrides: Partial<Approval> = {}): Approval => ({
  id: 9,
  approver_user_id: 21,
  status: 'pending',
  ...overrides,
});
