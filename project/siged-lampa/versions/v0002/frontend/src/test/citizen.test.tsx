import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useParams } from 'react-router-dom'

afterEach(cleanup)

vi.mock('../api/client', () => ({ request: vi.fn(), setApiToken: vi.fn() }))
vi.mock('../api/resources', () => ({ getResource: vi.fn(), mutateResource: vi.fn(), operationPath: vi.fn() }))
vi.mock('../api/endpoints', () => ({ api: { procedures: vi.fn(), procedure: vi.fn(), createOirs: vi.fn(), notifications: vi.fn(), citizenRequests: vi.fn(), createCitizenRequest: vi.fn(), publicContent: vi.fn(), externalEntities: vi.fn(), createExternalEntity: vi.fn() } }))
vi.mock('../api/oirs.api', () => ({ oirsApi: { create: vi.fn(), detail: vi.fn(), history: vi.fn(), postMessage: vi.fn() } }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: vi.fn() }
})

import { getResource, mutateResource } from '../api/resources'
import { api } from '../api/endpoints'
import { oirsApi } from '../api/oirs.api'

describe('CitizenRequestsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { CitizenRequestsPage } = await import('../features/citizen-requests/CitizenRequestsPage')
    return render(<MemoryRouter><CitizenRequestsPage /></MemoryRouter>)
  }

  it('muestra loading inicial', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    await renderPage()
    expect(screen.getByText('Mis solicitudes')).toBeInTheDocument()
  })

  it('muestra lista de solicitudes', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: [
        { id: 1, subject: 'Solicitud 1', status: 'pending', created_at: '2025-01-01' },
        { id: 2, subject: 'Solicitud 2', status: 'approved', created_at: '2025-02-01' },
      ],
    })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Solicitud 1')).toBeInTheDocument())
    expect(screen.getByText('Solicitud 2')).toBeInTheDocument()
  })

  it('muestra empty cuando no hay solicitudes', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    await renderPage()
    await waitFor(() => expect(screen.getByText('No tiene solicitudes registradas.')).toBeInTheDocument())
  })

  it('muestra error al fallar carga', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de red'))
    await renderPage()
    expect(await screen.findByText('Error de red')).toBeInTheDocument()
  })
})

describe('RequestFormPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ procedureId: '1' })
  })
  const procedure = { id: 1, slug: 'test', title: 'Test Tramite', instructions: 'Siga las instrucciones', department_name: 'Test Dept' }

  async function renderPage() {
    const { RequestFormPage } = await import('../pages/portal')
    return render(<MemoryRouter initialEntries={['/portal/requests/new/1']}><RequestFormPage /></MemoryRouter>)
  }

  it('muestra loading y luego carga el tramite', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: procedure })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Test Tramite')).toBeInTheDocument())
    expect(screen.getByText('Siga las instrucciones')).toBeInTheDocument()
  })

  it('muestra error al fallar carga de tramite', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Tramite no encontrado'))
    await renderPage()
    expect(await screen.findByText('Tramite no encontrado')).toBeInTheDocument()
  })

  it('llama a API-034 al enviar formulario', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: procedure })
    ;(mutateResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { id: 1 } })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Enviar solicitud')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Asunto'), 'Mi solicitud de prueba con mas texto')
    await user.type(screen.getByLabelText('Descripcion'), 'Descripcion detallada de mi solicitud')
    await user.click(screen.getByText('Enviar solicitud'))
    await waitFor(() => {
      expect(mutateResource).toHaveBeenCalledWith('API-034', expect.any(Object), { procedureId: '1' })
    })
  })
})

describe('OirsPage - public', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { OirsPage } = await import('../pages/portal')
    return render(<MemoryRouter><OirsPage /></MemoryRouter>)
  }

  it('muestra formulario OIRS', async () => {
    await renderPage()
    expect(screen.getByText('Oficina de Informaciones, Reclamos y Sugerencias')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de caso')).toBeInTheDocument()
  })

  it('valida campos requeridos', async () => {
    await renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByText('Enviar caso'))
    expect(await screen.findByText('Seleccione un tipo')).toBeInTheDocument()
  })

  it('envia caso OIRS exitosamente', async () => {
    ;(oirsApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { uuid: 'a0000000-0000-4000-8000-000000000001', tracking_code: 'OIRS-1', tracking_token: 'tracking-token' } })
    await renderPage()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Tipo de caso'), 'solicitud')
    await user.type(screen.getByLabelText('Asunto'), 'Asunto de prueba valido')
    await user.type(screen.getByLabelText('Descripcion'), 'Descripcion detallada de mi solicitud de OIRS con mas de veinte caracteres')
    await user.type(screen.getByLabelText('Nombre'), 'Usuario QA')
    await user.type(screen.getByLabelText('Correo electronico'), 'qa@example.test')
    await user.click(screen.getByLabelText('Acepto el tratamiento de mis datos para responder esta OIRS'))
    await user.click(screen.getByText('Enviar caso'))
    expect(await screen.findByText('Tu solicitud OIRS fue registrada. Guarda este codigo de seguimiento para consultar su estado.')).toBeInTheDocument()
  })

  it('muestra error al fallar envio OIRS', async () => {
    ;(oirsApi.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error al enviar caso'))
    await renderPage()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Tipo de caso'), 'reclamo')
    await user.type(screen.getByLabelText('Asunto'), 'Asunto de prueba valido')
    await user.type(screen.getByLabelText('Descripcion'), 'Descripcion detallada de mi reclamo con mas de veinte caracteres')
    await user.type(screen.getByLabelText('Nombre'), 'Usuario QA')
    await user.type(screen.getByLabelText('Correo electronico'), 'qa@example.test')
    await user.click(screen.getByLabelText('Acepto el tratamiento de mis datos para responder esta OIRS'))
    await user.click(screen.getByText('Enviar caso'))
    expect(await screen.findByText('Error al enviar caso')).toBeInTheDocument()
  })

  it('previene doble envio mientras se envia', async () => {
    ;(oirsApi.create as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise((r) => setTimeout(r, 1000)))
    await renderPage()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Tipo de caso'), 'sugerencia')
    await user.type(screen.getByLabelText('Asunto'), 'Asunto de prueba valido')
    await user.type(screen.getByLabelText('Descripcion'), 'Descripcion detallada de mi sugerencia con mas de veinte caracteres')
    await user.type(screen.getByLabelText('Nombre'), 'Usuario QA')
    await user.type(screen.getByLabelText('Correo electronico'), 'qa@example.test')
    await user.click(screen.getByLabelText('Acepto el tratamiento de mis datos para responder esta OIRS'))
    await user.click(screen.getByText('Enviar caso'))
    expect(screen.getByText('Enviando caso...')).toBeDisabled()
  })
})

describe('NotificationsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { NotificationsPage } = await import('../pages/portal')
    return render(<MemoryRouter><NotificationsPage /></MemoryRouter>)
  }

  it('muestra lista de notificaciones', async () => {
    ;(api.notifications as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: [{ id: 1, title: 'Notif 1', message: 'Msg 1', is_read: false }],
    })
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Notif 1')).toBeInTheDocument()
      expect(screen.getByText('Sin leer')).toBeInTheDocument()
    })
  })

  it('muestra error al fallar notificaciones', async () => {
    ;(api.notifications as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de carga'))
    await renderPage()
    expect(await screen.findByText('Error de carga')).toBeInTheDocument()
  })
})
