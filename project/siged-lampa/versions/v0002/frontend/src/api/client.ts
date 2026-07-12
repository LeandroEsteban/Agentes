import { ApiError } from './errors';

const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
const timeoutMs = Number(import.meta.env.VITE_REQUEST_TIMEOUT_MS || 12_000);
let token: string | null = null;
export const setApiToken = (value: string | null) => { token = value; };
type Options = Omit<RequestInit, 'body'> & { body?: unknown; signal?: AbortSignal };

export async function request<T>(path: string, options: Options = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  const requestId = crypto.randomUUID();
  const headers = new Headers(options.headers);
  headers.set('Accept', 'application/json'); headers.set('X-Request-ID', requestId);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  let body: BodyInit | undefined;
  if (options.body instanceof FormData) body = options.body;
  else if (options.body !== undefined) { headers.set('Content-Type', 'application/json'); body = JSON.stringify(options.body); }
  try {
    const response = await fetch(`${baseUrl}${path}`, { ...options, headers, body, signal: options.signal || controller.signal });
    const contentType = response.headers.get('content-type') || '';
    const payload = contentType.includes('json') ? await response.json() as { error?: { code?: string; message?: string }; message?: string } : undefined;
    if (!response.ok) throw new ApiError(response.status, payload?.error?.code || `HTTP_${response.status}`, payload?.error?.message || payload?.message || 'No fue posible completar la solicitud', response.headers.get('x-request-id') || requestId);
    return payload as T;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') throw new ApiError(408, 'TIMEOUT', 'La solicitud excedio el tiempo de espera', requestId);
    throw new ApiError(0, 'NETWORK_ERROR', 'No fue posible conectar con el servicio', requestId);
  } finally { window.clearTimeout(timeout); }
}
