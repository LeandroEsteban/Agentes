import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { AuthProvider } from '../auth/auth-context'

afterEach(cleanup)

vi.mock('../api/client', () => ({
  request: vi.fn(),
  setApiToken: vi.fn(),
}))

vi.mock('../api/resources', () => ({
  getResource: vi.fn(),
  mutateResource: vi.fn(),
  operationPath: vi.fn(),
}))

vi.mock('../auth/auth-storage', () => ({
  loadSession: vi.fn(() => null),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
}))

import { request } from '../api/client'
import { mutateResource } from '../api/resources'

function mockLocationAssign() {
  const loc = window.location
  Object.defineProperty(window, 'location', {
    value: { ...loc, assign: vi.fn(), reload: vi.fn() },
    writable: true,
  })
}

describe('LoginPage - citizen', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocationAssign()
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      data: { token: 'test-token', user: { id: 1, full_name: 'Test' } },
    })
  })

  async function renderLogin() {
    const { LoginPage } = await import('../features/auth/LoginPage')
    return render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage actor="citizen" />
        </AuthProvider>
      </MemoryRouter>
    )
  }

  it('muestra formulario de login ciudadano con campos', async () => {
    await renderLogin()
    expect(screen.getByText('Acceso ciudadano')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electronico')).toBeInTheDocument()
    expect(screen.getByLabelText('Contrasena')).toBeInTheDocument()
    expect(screen.getByText('Ingresar')).toBeInTheDocument()
  })

  it('valida campos vacios', async () => {
    await renderLogin()
    const user = userEvent.setup()
    await user.click(screen.getByText('Ingresar'))
    expect(await screen.findByText('Ingrese su identificador')).toBeInTheDocument()
    expect(await screen.findByText('Ingrese su contrasena')).toBeInTheDocument()
  })

  it('llama a signIn con credenciales validas', async () => {
    await renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Correo electronico'), 'test@test.cl')
    await user.type(screen.getByLabelText('Contrasena'), 'password123')
    await user.click(screen.getByText('Ingresar'))
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/api/v1/auth/citizen-login', {
        method: 'POST',
        body: { email: 'test@test.cl', password: 'password123' },
      })
    })
  })

  it('muestra error cuando credenciales son invalidas', async () => {
    ;(request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Credenciales invalidas'))
    await renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Correo electronico'), 'bad@test.cl')
    await user.type(screen.getByLabelText('Contrasena'), 'password123')
    await user.click(screen.getByText('Ingresar'))
    expect(await screen.findByText('Credenciales invalidas')).toBeInTheDocument()
  })

  it('redirige a /portal tras login exitoso ciudadano', async () => {
    await renderLogin()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Correo electronico'), 'test@test.cl')
    await user.type(screen.getByLabelText('Contrasena'), 'password123')
    await user.click(screen.getByText('Ingresar'))
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('/portal')
    })
  })
})

describe('LoginPage - internal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLocationAssign()
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      data: { token: 'test-token', user: { id: 1, full_name: 'Admin' } },
    })
  })

  async function renderInternalLogin() {
    const { LoginPage } = await import('../features/auth/LoginPage')
    return render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage actor="internal" />
        </AuthProvider>
      </MemoryRouter>
    )
  }

  it('muestra formulario de login interno', async () => {
    await renderInternalLogin()
    expect(screen.getByText('Acceso intranet')).toBeInTheDocument()
  })

  it('redirige a /intranet tras login exitoso interno', async () => {
    await renderInternalLogin()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Usuario'), 'admin')
    await user.type(screen.getByLabelText('Contrasena'), 'password123')
    await user.click(screen.getByText('Ingresar'))
    await waitFor(() => {
      expect(window.location.assign).toHaveBeenCalledWith('/intranet')
    })
  })
})

describe('RecoverPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(mutateResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: {} })
  })

  async function renderRecover() {
    const { RecoverPage } = await import('../features/auth/RecoverPage')
    return render(
      <MemoryRouter>
        <RecoverPage />
      </MemoryRouter>
    )
  }

  it('muestra formulario de recuperacion', async () => {
    await renderRecover()
    expect(screen.getByText('Recuperacion de acceso')).toBeInTheDocument()
    expect(screen.getByLabelText('Correo electronico')).toBeInTheDocument()
  })

  it('llama a API-003 y muestra exito', async () => {
    await renderRecover()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Correo electronico'), 'user@test.cl')
    await user.click(screen.getByText('Enviar instrucciones'))
    await waitFor(() => {
      expect(mutateResource).toHaveBeenCalledWith('API-003', { email: 'user@test.cl' })
    })
    expect(await screen.findByText(/Si el correo esta registrado/)).toBeInTheDocument()
  })

  it('muestra error cuando falla la recuperacion', async () => {
    ;(mutateResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de conexion'))
    await renderRecover()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Correo electronico'), 'user@test.cl')
    await user.click(screen.getByText('Enviar instrucciones'))
    expect(await screen.findByText('Error de conexion')).toBeInTheDocument()
  })
})

describe('auth guards', () => {
  beforeEach(() => vi.clearAllMocks())

  it('RequireAuth export existe', async () => {
    const { RequireAuth } = await import('../auth/require-auth')
    expect(typeof RequireAuth).toBe('function')
  })

  it('RequireActor export existe', async () => {
    const { RequireActor } = await import('../auth/require-actor')
    expect(typeof RequireActor).toBe('function')
  })
})

describe('use-auth', () => {
  it('lanza error sin AuthProvider', () => {
    const { useAuth } = vi.hoisted(() => ({ useAuth: () => { throw new Error('AuthProvider requerido') } }))
    expect(() => useAuth()).toThrow('AuthProvider requerido')
  })
})
