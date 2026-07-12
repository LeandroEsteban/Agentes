import { expect, type APIRequestContext } from '@playwright/test';

type Envelope<T> = { data: T };
type Actor = { id: number; username: string };

async function login(request: APIRequestContext, username: string, password: string) {
  const response = await request.post('/api/v1/auth/internal-login', { data: { username, password } });
  expect(response.ok(), `fixture login ${username}`).toBeTruthy();
  return ((await response.json()) as Envelope<{ token: string }>).data.token;
}
async function users(request: APIRequestContext, token: string) {
  const response = await request.get('/api/v1/users', { headers: { Authorization: `Bearer ${token}` } });
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as Envelope<Actor[]>;
  return body.data;
}
export async function documentWithReviewAssigned(request: APIRequestContext) {
  const adminToken = await login(request, 'admin', 'admin123');
  const actors = await users(request, adminToken);
  const byName = (username: string) => { const actor = actors.find((item) => item.username === username); if (!actor) throw new Error(`QA actor missing: ${username}`); return actor; };
  const officerToken = await login(request, 'funcionario', 'officer123');
  const [typesResponse, departmentsResponse] = await Promise.all([
    request.get('/api/v1/document-types', { headers: { Authorization: `Bearer ${officerToken}` } }),
    request.get('/api/v1/departments', { headers: { Authorization: `Bearer ${officerToken}` } }),
  ]);
  const types = (await typesResponse.json() as Envelope<{ id: number }[]>).data;
  const departments = (await departmentsResponse.json() as Envelope<{ id: number }[]>).data;
  const runId = Date.now();
  const create = await request.post('/api/v1/documents', { headers: { Authorization: `Bearer ${officerToken}` }, data: { title: `E2E04-DOC-${runId}`, content: `Fixture ${runId}`, document_type_id: types[0].id, department_id: departments[0].id } });
  expect(create.ok()).toBeTruthy();
  const document = (await create.json() as Envelope<{ id: number; title: string }>).data;
  const submit = await request.post(`/api/v1/documents/${document.id}/submit-review`, { headers: { Authorization: `Bearer ${officerToken}` }, data: { reviewer_user_id: byName('revisor').id, instructions: 'Revision QA' } });
  expect(submit.ok()).toBeTruthy();
  return { document, officerToken, approver: byName('aprobador') };
}
export async function requestApproval(request: APIRequestContext, documentId: number, officerToken: string, approverId: number) {
  const response = await request.post(`/api/v1/documents/${documentId}/approvals`, { headers: { Authorization: `Bearer ${officerToken}` }, data: { approvers: [{ user_id: approverId, sequence_order: 1 }] } });
  expect(response.ok()).toBeTruthy();
}
export async function documentApprovedForSignature(request: APIRequestContext) {
  const fixture = await documentWithReviewAssigned(request);
  const reviewerToken = await login(request, 'revisor', 'reviewer123');
  const reviews = await request.get(`/api/v1/documents/${fixture.document.id}/reviews`, { headers: { Authorization: `Bearer ${reviewerToken}` } });
  const review = (await reviews.json() as Envelope<{ id: number }[]>).data[0];
  const reply = await request.post(`/api/v1/reviews/${review.id}/reply`, { headers: { Authorization: `Bearer ${reviewerToken}` }, data: { decision: 'approved', observations: 'Fixture approved' } });
  expect(reply.ok()).toBeTruthy();
  await requestApproval(request, fixture.document.id, fixture.officerToken, fixture.approver.id);
  const approverToken = await login(request, 'aprobador', 'reviewer123');
  const approvals = await request.get(`/api/v1/documents/${fixture.document.id}/approvals`, { headers: { Authorization: `Bearer ${approverToken}` } });
  const approval = (await approvals.json() as Envelope<{ id: number }[]>).data[0];
  const decision = await request.post(`/api/v1/approvals/${approval.id}/decision`, { headers: { Authorization: `Bearer ${approverToken}` }, data: { decision: 'approved', decision_note: 'Fixture approved' } });
  expect(decision.ok()).toBeTruthy();
  return fixture.document;
}
