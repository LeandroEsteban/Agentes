import type { Review } from '../../features/documents/types';

export const reviewFixture = (overrides: Partial<Review> = {}): Review => ({
  id: 5,
  status: 'pending',
  created_at: '2025-01-01T00:00:00.000Z',
  reviewer_name: 'Revisor de prueba',
  ...overrides,
});
