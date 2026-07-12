import type { Document } from '../../features/documents/types';

export const documentFixture = (overrides: Partial<Document> = {}): Document => ({
  id: 1,
  title: 'Documento Test',
  status: 'draft',
  created_at: '2025-01-01T00:00:00.000Z',
  document_type_name: 'Oficio',
  department_name: 'Departamento de prueba',
  created_by_name: 'Funcionario documental',
  ...overrides,
});
