import { request } from './client';
import type { ApiEnvelope, ExternalEntity, Procedure } from './types';
export const api = {
  procedures: () => request<ApiEnvelope<Procedure[]>>('/api/v1/public/tramites'),
  procedure: (id: string) => request<ApiEnvelope<Procedure>>(`/api/v1/public/tramites/${id}`),
  externalEntities: () => request<ApiEnvelope<ExternalEntity[]>>('/api/v1/admin/external-entities'),
  createExternalEntity: (data: Omit<ExternalEntity, 'id'>) => request<ApiEnvelope<ExternalEntity>>('/api/v1/admin/external-entities', { method: 'POST', body: data }),
  createOirs: (data: { category: string; subject: string; body: string }) => request<ApiEnvelope<{ id: string }>>('/api/v1/public/oirs', { method: 'POST', body: data }),
  notifications: () => request<ApiEnvelope<Array<{ id: number; title: string; message: string; is_read: boolean }>>>('/api/v1/notifications'),
  createCitizenRequest: (procedureId: string) => request<ApiEnvelope<{ id: number }>>(`/api/v1/public/tramites/${encodeURIComponent(procedureId)}/requests`, { method: 'POST', body: { form_data: {}, attachments: [] } }),
  citizenRequests: () => request<ApiEnvelope<unknown>>('/api/v1/citizen/requests'),
  publicContent: (kind: 'news' | 'notices' | 'calendar') => request<ApiEnvelope<unknown>>(`/api/v1/public/${kind}`)
};
