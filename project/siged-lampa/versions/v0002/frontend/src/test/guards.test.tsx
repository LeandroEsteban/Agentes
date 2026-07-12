import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

afterEach(cleanup)

vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return { ...actual, Navigate: () => <div data-testid="navigate" /> }
})

vi.mock('../auth/use-auth', () => ({
  useAuth: vi.fn(),
}))

import { useAuth } from '../auth/use-auth'

describe('RequireAuth', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderGuard(session: unknown, loading: boolean) {
    ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ session, loading })
    const { RequireAuth } = await import('../auth/require-auth')
    const { MemoryRouter } = await import('react-router-dom')
    return render(
      <MemoryRouter initialEntries={['/intranet/secret']}>
        <RequireAuth><p>contenido protegido</p></RequireAuth>
      </MemoryRouter>
    )
  }

  it('muestra loading mientras carga sesion', async () => {
    await renderGuard(null, true)
    expect(screen.getByText('Cargando informacion...')).toBeInTheDocument()
  })

  it('muestra children con sesion valida', async () => {
    await renderGuard({ token: 't', actorType: 'internal', user: { id: 1 } }, false)
    expect(screen.getByText('contenido protegido')).toBeInTheDocument()
  })

  it('protege ruta intranet sin sesion', async () => {
    await renderGuard(null, false)
    expect(screen.getByTestId('navigate')).toBeInTheDocument()
  })
})

describe('RequireActor', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderGuard(actorType: string | null) {
    ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ session: actorType ? { token: 't', actorType, user: { id: 1 } } : null, loading: false })
    const { RequireActor } = await import('../auth/require-actor')
    const { MemoryRouter } = await import('react-router-dom')
    return render(
      <MemoryRouter>
        <RequireActor actor="internal"><p>contenido interno</p></RequireActor>
      </MemoryRouter>
    )
  }

  it('muestra children con actor correcto', async () => {
    await renderGuard('internal')
    expect(screen.getByText('contenido interno')).toBeInTheDocument()
  })
})

describe('RequirePermission', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderGuard(permissions: string[], requiredPermission?: string) {
    ;(useAuth as ReturnType<typeof vi.fn>).mockReturnValue({ session: { token: 't', actorType: 'internal', user: { id: 1, permissions } }, loading: false })
    const { RequirePermission } = await import('../auth/require-permission')
    const { MemoryRouter } = await import('react-router-dom')
    return render(
      <MemoryRouter>
        <RequirePermission permission={requiredPermission}><p>contenido autorizado</p></RequirePermission>
      </MemoryRouter>
    )
  }

  it('muestra children con permiso valido', async () => {
    await renderGuard(['documents.view'], 'documents.view')
    expect(screen.getByText('contenido autorizado')).toBeInTheDocument()
  })

  it('permite acceso con admin.access', async () => {
    await renderGuard(['admin.access'], 'documents.view')
    expect(screen.getByText('contenido autorizado')).toBeInTheDocument()
  })

  it('permite acceso sin permission requerida', async () => {
    await renderGuard([])
    expect(screen.getByText('contenido autorizado')).toBeInTheDocument()
  })

  it('muestra denegado sin permiso', async () => {
    await renderGuard(['documents.view'], 'admin.access')
    expect(screen.getByText('Acceso restringido')).toBeInTheDocument()
  })
})
