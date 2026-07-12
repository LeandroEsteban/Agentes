import { request } from '../api/client';
import type { ApiEnvelope, ActorType, Session } from '../api/types';
type LoginResponse = { token: string; user?: Session['user']; citizen?: Session['user']; access_token?: string; actor?: Session['user'] };
export async function login(actorType: ActorType, identifier: string, password: string): Promise<Session> {
  const endpoint = actorType === 'internal' ? '/api/v1/auth/internal-login' : '/api/v1/auth/citizen-login';
  const body = actorType === 'internal' ? { username: identifier, password } : { email: identifier, password };
  const response = await request<ApiEnvelope<LoginResponse>>(endpoint, { method: 'POST', body });
  const data = response.data; return { token: data.token || data.access_token || '', actorType, user: data.user || data.citizen || data.actor || { id: 0 } };
}
export const profile = () => request<ApiEnvelope<Session['user']>>('/api/v1/profile/me');
export const logoutRequest = () => request<void>('/api/v1/auth/logout', { method: 'POST' });
