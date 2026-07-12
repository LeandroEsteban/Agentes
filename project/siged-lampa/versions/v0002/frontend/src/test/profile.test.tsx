import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

afterEach(cleanup)

vi.mock('../api/resources', () => ({
  getResource: vi.fn(),
  mutateResource: vi.fn(),
  operationPath: vi.fn(),
}))

vi.mock('../auth/auth-storage', () => ({
  loadSession: vi.fn(() => ({ token: 't', actorType: 'internal', user: { id: 1, full_name: 'Test', email: 'test@test.cl', permissions: [] } })),
  saveSession: vi.fn(),
  clearSession: vi.fn(),
}))

import { getResource, mutateResource } from '../api/resources'

describe('ProfilePage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { ProfilePage } = await import('../features/auth/ProfilePage')
    return render(
      <MemoryRouter>
        <ProfilePage />
      </MemoryRouter>
    )
  }

  it('muestra loading inicial', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    await renderPage()
    expect(screen.getByText('Cargando informacion...')).toBeInTheDocument()
  })

  it('carga y muestra datos del perfil', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { full_name: 'Juan Perez', email: 'juan@test.cl' } })
    await renderPage()
    await waitFor(() => {
      expect(screen.getByDisplayValue('Juan Perez')).toBeInTheDocument()
    })
    expect(screen.getByDisplayValue('juan@test.cl')).toBeInTheDocument()
    expect(screen.getByText('Guardar cambios')).toBeInTheDocument()
  })

  it('muestra empty state cuando no hay datos', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })
    await renderPage()
    expect(await screen.findByText('No hay informacion de perfil disponible.')).toBeInTheDocument()
  })

  it('muestra error y permite reintentar', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de conexion'))
    await renderPage()
    expect(await screen.findByText('Error de conexion')).toBeInTheDocument()
    expect(screen.getByText('Reintentar')).toBeInTheDocument()
  })

  it('actualiza perfil exitosamente', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { full_name: 'Juan Perez', email: 'juan@test.cl' } })
    ;(mutateResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })
    await renderPage()
    await waitFor(() => expect(screen.getByDisplayValue('Juan Perez')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Nombre completo'))
    await user.type(screen.getByLabelText('Nombre completo'), 'Nuevo Nombre')
    await user.clear(screen.getByLabelText('Correo electronico'))
    await user.type(screen.getByLabelText('Correo electronico'), 'nuevo@test.cl')
    await user.click(screen.getByText('Guardar cambios'))
    await waitFor(() => {
      expect(mutateResource).toHaveBeenCalledWith('API-005', { full_name: 'Nuevo Nombre', email: 'nuevo@test.cl' })
    })
    expect(await screen.findByText('Perfil actualizado correctamente')).toBeInTheDocument()
  })

  it('muestra error al fallar actualizacion', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { full_name: 'Juan Perez', email: 'juan@test.cl' } })
    ;(mutateResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error al actualizar'))
    await renderPage()
    await waitFor(() => expect(screen.getByDisplayValue('Juan Perez')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Guardar cambios'))
    expect(await screen.findByText('Error al actualizar')).toBeInTheDocument()
  })

  it('valida campos requeridos', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { full_name: 'Juan Perez', email: 'juan@test.cl' } })
    await renderPage()
    await waitFor(() => expect(screen.getByDisplayValue('Juan Perez')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.clear(screen.getByLabelText('Nombre completo'))
    await user.click(screen.getByText('Guardar cambios'))
    expect(await screen.findByText('El nombre es requerido')).toBeInTheDocument()
  })
})
