import { request } from './client'
import type { ApiEnvelope } from './types'

export type OirsCase = { uuid: string; tracking_code: string; category: string; subject: string; status: string; submitted_at: string }
export type OirsMessage = { id: number; body: string; message_direction: string; sent_at: string }
export type OirsCreation = OirsCase & { tracking_token: string }
export type AnonymousOirsInput = { category: string; subject: string; body: string; name: string; email: string; consent: boolean }

const trackingHeaders = (trackingToken: string) => ({ 'x-oirs-tracking-token': trackingToken })

export const oirsApi = {
  create: (input: AnonymousOirsInput) => request<ApiEnvelope<OirsCreation>>('/api/v1/public/oirs', { method: 'POST', body: input }),
  detail: (id: string, trackingToken: string) => request<ApiEnvelope<OirsCase>>(`/api/v1/public/oirs/${encodeURIComponent(id)}`, { headers: trackingHeaders(trackingToken) }),
  history: (id: string, trackingToken: string) => request<ApiEnvelope<OirsMessage[]>>(`/api/v1/public/oirs/${encodeURIComponent(id)}/history`, { headers: trackingHeaders(trackingToken) }),
  postMessage: (id: string, trackingToken: string, body: string) => request<ApiEnvelope<OirsMessage>>(`/api/v1/public/oirs/${encodeURIComponent(id)}/messages`, { method: 'POST', headers: trackingHeaders(trackingToken), body: { body } }),
}
