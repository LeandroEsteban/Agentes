import { expect, type APIRequestContext } from '@playwright/test';

type Envelope<T> = { data: T };

async function login(request: APIRequestContext, username: string, password: string) {
  const response = await request.post('/api/v1/auth/internal-login', { data: { username, password } });
  expect(response.ok(), `fixture login ${username}`).toBeTruthy();
  return ((await response.json()) as Envelope<{ token: string }>).data.token;
}

export async function createCorrespondence(request: APIRequestContext, runId: number) {
  const adminToken = await login(request, 'admin', 'admin123');
  const officerToken = await login(request, 'funcionario', 'officer123');
  const [entitiesRes, deptsRes] = await Promise.all([
    request.get('/api/v1/admin/external-entities', { headers: { Authorization: `Bearer ${adminToken}` } }),
    request.get('/api/v1/departments', { headers: { Authorization: `Bearer ${officerToken}` } })
  ]);
  const entities = (await entitiesRes.json() as Envelope<{ id: number; name: string }[]>).data;
  const departments = (await deptsRes.json() as Envelope<{ id: number; code: string; name: string }[]>).data;
  const govEntity = entities.find((e) => e.name === 'Gobierno Regional')!;
  const response = await request.post('/api/v1/correspondence', {
    headers: { Authorization: `Bearer ${officerToken}` },
    data: {
      direction: 'OUTBOUND',
      subject: `E2E07-CORR-${runId}`,
      sent_at: new Date().toISOString(),
      priority: 'normal',
      recipients: [{ recipient_type: 'external', external_entity_id: govEntity.id, delivery_channel: 'email' }]
    }
  });
  expect(response.ok()).toBeTruthy();
  const correspondence = (await response.json() as Envelope<{ id: number; tracking_code: string }>).data;
  return { token: officerToken, correspondence, departments };
}
