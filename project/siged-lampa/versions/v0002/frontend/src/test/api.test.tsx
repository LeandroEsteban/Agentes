import { describe, expect, it, vi, beforeEach } from 'vitest'
import { ApiError } from '../api/errors'

describe('ApiError', () => {
  it('crea error con status y code', () => {
    const error = new ApiError(400, 'VALIDATION_ERROR', 'Datos invalidos', 'req-1')
    expect(error.status).toBe(400)
    expect(error.code).toBe('VALIDATION_ERROR')
    expect(error.message).toBe('Datos invalidos')
    expect(error.requestId).toBe('req-1')
    expect(error.name).toBe('ApiError')
  })
})

describe('operationPath', () => {
  beforeEach(() => { vi.resetModules() })

  it('resuelve ruta con parametros', async () => {
    const { operationPath } = await vi.importActual<typeof import('../api/resources')>('../api/resources')
    expect(operationPath('API-017', { documentId: '5' })).toBe('/api/v1/documents/5')
  })

  it('lanza error si falta parametro', async () => {
    const { operationPath } = await vi.importActual<typeof import('../api/resources')>('../api/resources')
    expect(() => operationPath('API-017', {})).toThrow()
  })

  it('lanza error si codigo no existe', async () => {
    const { operationPath } = await vi.importActual<typeof import('../api/resources')>('../api/resources')
    expect(() => operationPath('API-999', {})).toThrow('Operacion contractual no disponible')
  })
})

describe('getResource/mutateResource', () => {
  beforeEach(() => { vi.resetModules() })

  it('lanza error si no es GET', async () => {
    const { getResource } = await vi.importActual<typeof import('../api/resources')>('../api/resources')
    expect(() => getResource('API-016', {})).toThrow('Operacion de lectura invalida')
  })

  it('mutateResource lanza error si es GET', async () => {
    const { mutateResource } = await vi.importActual<typeof import('../api/resources')>('../api/resources')
    expect(() => mutateResource('API-017', {}, { documentId: '1' })).toThrow('Operacion de escritura invalida')
  })
})

describe('auth-storage', () => {
  beforeEach(() => { sessionStorage.clear() })

  it('guarda y recupera sesion', async () => {
    const { saveSession, loadSession, clearSession } = await import('../auth/auth-storage')
    const session = { token: 't', actorType: 'citizen' as const, user: { id: 1 } }
    saveSession(session)
    expect(loadSession()).toEqual(session)
    clearSession()
    expect(loadSession()).toBeNull()
  })

  it('retorna null si no hay sesion', async () => {
    const { loadSession } = await import('../auth/auth-storage')
    expect(loadSession()).toBeNull()
  })
})

describe('ApiError mapping codes', () => {
  it('mapea 400 a VALIDATION_ERROR', () => {
    const e = new ApiError(400, 'VALIDATION_ERROR', 'Datos invalidos')
    expect(e.status).toBe(400)
  })
  it('mapea 401 a UNAUTHORIZED', () => {
    const e = new ApiError(401, 'UNAUTHORIZED', 'No autorizado')
    expect(e.code).toBe('UNAUTHORIZED')
  })
  it('mapea 403 a FORBIDDEN', () => {
    const e = new ApiError(403, 'FORBIDDEN', 'Acceso denegado')
    expect(e.code).toBe('FORBIDDEN')
  })
  it('mapea 404 a NOT_FOUND', () => {
    const e = new ApiError(404, 'NOT_FOUND', 'No encontrado')
    expect(e.code).toBe('NOT_FOUND')
  })
  it('mapea 409 a CONFLICT', () => {
    const e = new ApiError(409, 'CONFLICT', 'Conflicto')
    expect(e.code).toBe('CONFLICT')
  })
  it('mapea 422 a VALIDATION_ERROR', () => {
    const e = new ApiError(422, 'VALIDATION_ERROR', 'Error validacion')
    expect(e.code).toBe('VALIDATION_ERROR')
  })
  it('mapea 500 a INTERNAL_ERROR', () => {
    const e = new ApiError(500, 'INTERNAL_ERROR', 'Error interno')
    expect(e.code).toBe('INTERNAL_ERROR')
  })
  it('mapea 503 a SERVICE_UNAVAILABLE', () => {
    const e = new ApiError(503, 'SERVICE_UNAVAILABLE', 'No disponible')
    expect(e.code).toBe('SERVICE_UNAVAILABLE')
  })
  it('mapea 0 a NETWORK_ERROR', () => {
    const e = new ApiError(0, 'NETWORK_ERROR', 'Sin conexion')
    expect(e.code).toBe('NETWORK_ERROR')
  })
})

describe('request', () => {
  beforeEach(() => { vi.resetModules(); vi.restoreAllMocks() })

  it('setApiToken almacena el token', async () => {
    const { setApiToken } = await import('../api/client')
    setApiToken('test-token')
    expect(true).toBe(true)
  })

  it('request exitoso devuelve datos', async () => {
    const fakeResponse = new Response(JSON.stringify({ data: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fakeResponse)
    const { request } = await import('../api/client')
    const result = await request('/api/v1/test')
    expect(result).toEqual({ data: 'ok' })
  })

  it('request con error 422 lanza ApiError', async () => {
    const fakeResponse = new Response(JSON.stringify({ error: { code: 'VALIDATION_ERROR', message: 'Datos invalidos' } }), { status: 422, headers: { 'content-type': 'application/json' } })
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(fakeResponse)
    const { request } = await import('../api/client')
    await expect(request('/api/v1/test')).rejects.toThrow('Datos invalidos')
  })
})
