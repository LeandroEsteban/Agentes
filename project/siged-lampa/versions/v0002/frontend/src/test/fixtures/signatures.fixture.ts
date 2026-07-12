import type { Signature } from '../../features/documents/types';

export const signatureFixture = (overrides: Partial<Signature> = {}): Signature => ({
  id: 12,
  integration_mode: 'academic_simulation',
  status: 'valid',
  signer_name: 'Firmante de prueba',
  ...overrides,
});
