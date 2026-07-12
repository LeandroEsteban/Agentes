import { expect, type APIRequestContext } from '@playwright/test';

type Envelope<T> = { data: T };

async function login(request: APIRequestContext, username: string, password: string) {
  const response = await request.post('/api/v1/auth/internal-login', { data: { username, password } });
  expect(response.ok(), `fixture login ${username}`).toBeTruthy();
  return ((await response.json()) as Envelope<{ token: string }>).data.token;
}

export async function createExpedient(request: APIRequestContext, runId: number) {
  const token = await login(request, 'funcionario', 'officer123');
  const depts = await request.get('/api/v1/departments', { headers: { Authorization: `Bearer ${token}` } });
  const departments = (await depts.json() as Envelope<{ id: number; code: string }[]>).data;
  const rentas = departments.find((d) => d.code === 'RENTAS')!;
  const response = await request.post('/api/v1/expedients', {
    headers: { Authorization: `Bearer ${token}` },
    data: { subject: `E2E06-EXP-${runId}`, description: `Fixture expediente ${runId}`, department_id: rentas.id }
  });
  expect(response.ok()).toBeTruthy();
  const expedient = (await response.json() as Envelope<{ id: number; code: string }>).data;
  return { token, expedient };
}

export async function closeExpedient(request: APIRequestContext, token: string, expedientId: number) {
  const response = await request.post(`/api/v1/expedients/${expedientId}/close`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { status: 'closed' }
  });
  expect(response.ok()).toBeTruthy();
}

export async function ensureDocumentExists(request: APIRequestContext, runId: number) {
  const token = await login(request, 'funcionario', 'officer123');
  const [typesResponse, deptsResponse] = await Promise.all([
    request.get('/api/v1/document-types', { headers: { Authorization: `Bearer ${token}` } }),
    request.get('/api/v1/departments', { headers: { Authorization: `Bearer ${token}` } })
  ]);
  const types = (await typesResponse.json() as Envelope<{ id: number }[]>).data;
  const departments = (await deptsResponse.json() as Envelope<{ id: number }[]>).data;
  const response = await request.post('/api/v1/documents', {
    headers: { Authorization: `Bearer ${token}` },
    data: { title: `E2E06-DOC-${runId}`, content: `Linked document ${runId}`, document_type_id: types[0].id, department_id: departments[0].id }
  });
  expect(response.ok()).toBeTruthy();
  return { token, document: (await response.json() as Envelope<{ id: number; title: string }>).data };
}

export async function linkDocumentToExpedient(request: APIRequestContext, token: string, expedientId: number, documentId: number) {
  const response = await request.post(`/api/v1/expedients/${expedientId}/documents`, {
    headers: { Authorization: `Bearer ${token}` },
    data: { document_id: documentId, relation_type: 'related' }
  });
  expect(response.ok()).toBeTruthy();
}
