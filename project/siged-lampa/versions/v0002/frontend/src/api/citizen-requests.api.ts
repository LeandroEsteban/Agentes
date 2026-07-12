import { request } from './client'
import type { ApiEnvelope } from './types'

export type CitizenRequestSummary = { id: number; uuid: string; tracking_code: string; published_procedure_id: number; status: string; submitted_at: string; resolved_at: string | null }
export type CitizenRequestList = { items: CitizenRequestSummary[]; page: number; size: number; total: number }
export type CitizenRequestDetail = CitizenRequestSummary & { procedure_title: string; resolution_summary: string | null; attachments: Array<{ id: number; file_name: string; mime_type: string; file_size: number; created_at: string }>; history: Array<{ event_name: string; payload_json?: unknown; occurred_at: string }> }
export const citizenRequestsApi = {
  list: (params: { page: number; size: number; status?: string }) => { const query = new URLSearchParams({ page: String(params.page), size: String(params.size) }); if (params.status) query.set('status', params.status); return request<ApiEnvelope<CitizenRequestList>>(`/api/v1/citizen/requests?${query}`) },
  detail: (id: string) => request<ApiEnvelope<CitizenRequestDetail>>(`/api/v1/citizen/requests/${encodeURIComponent(id)}`),
  history: (id: string) => request<ApiEnvelope<CitizenRequestDetail['history']>>(`/api/v1/citizen/requests/${encodeURIComponent(id)}/history`),
  cancel: (id: string, reason?: string) => request<ApiEnvelope<CitizenRequestSummary>>(`/api/v1/citizen/requests/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: reason?.trim() ? { reason: reason.trim() } : {} })
}
