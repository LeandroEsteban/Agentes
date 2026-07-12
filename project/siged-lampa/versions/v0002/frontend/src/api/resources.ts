import { request } from './client';
import { operations } from './generated/operations';
import type { ApiEnvelope } from './types';

export function operationPath(code: string, parameters: Record<string, string | undefined> = {}) {
  const operation = operations[code];
  if (!operation) throw new Error(`Operacion contractual no disponible para UI: ${code}`);
  return operation.path.replace(/\{([^}]+)\}/g, (_, name) => {
    const value = parameters[name];
    if (!value) throw new Error(`Falta el parametro ${name} para ${code}`);
    return encodeURIComponent(value);
  });
}

export function getResource<T = unknown>(code: string, parameters?: Record<string, string | undefined>) {
  const operation = operations[code];
  if (!operation || operation.method !== 'GET') throw new Error(`Operacion de lectura invalida: ${code}`);
  const path = operationPath(code, parameters);
  const pathParameters = new Set([...operation.path.matchAll(/\{([^}]+)\}/g)].map((match) => match[1]));
  const query = new URLSearchParams();
  Object.entries(parameters || {}).forEach(([name, value]) => {
    if (value && !pathParameters.has(name)) query.set(name, value);
  });
  return request<ApiEnvelope<T>>(`${path}${query.size ? `?${query}` : ''}`);
}

export function mutateResource<T = unknown>(code: string, body: unknown, parameters?: Record<string, string | undefined>) {
  const operation = operations[code];
  if (!operation || operation.method === 'GET') throw new Error(`Operacion de escritura invalida: ${code}`);
  return request<ApiEnvelope<T>>(operationPath(code, parameters), { method: operation.method, body });
}
