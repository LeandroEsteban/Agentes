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
import { request } from '../api/client'

describe('CitizenRequestsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { CitizenRequestsPage } = await import('../features/citizen-requests/CitizenRequestsPage')
    return render(<MemoryRouter><CitizenRequestsPage /></MemoryRouter>)
  }

  it('muestra loading inicial', async () => {
    ;(request as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    await renderPage()
    expect(screen.getByText('Mis solicitudes')).toBeInTheDocument()
  })

  it('muestra lista de solicitudes', async () => {
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { items: [{ id: 1, uuid: 'u1', tracking_code: 'SOL-1', published_procedure_id: 1, status: 'submitted', submitted_at: '2025-01-01', resolved_at: null }, { id: 2, uuid: 'u2', tracking_code: 'SOL-2', published_procedure_id: 2, status: 'completed', submitted_at: '2025-02-01', resolved_at: null }], page: 1, size: 20, total: 2 } })
    await renderPage()
    await waitFor(() => expect(screen.getByText('SOL-1')).toBeInTheDocument())
    expect(screen.getByText('SOL-2')).toBeInTheDocument()
    expect(screen.getByText('Ingresada')).toBeInTheDocument()
  })

  it('muestra empty cuando no hay solicitudes', async () => {
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { items: [], page: 1, size: 20, total: 0 } })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Aún no tienes solicitudes')).toBeInTheDocument())
  })

  it('muestra error al fallar carga', async () => {
    ;(request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de red'))
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

  const created = { uuid: 'a0000000-0000-4000-8000-000000000001', tracking_code: 'OIRS-1', tracking_token: 'tracking-token' }
  const tracked = { ...created, category: 'reclamo', subject: 'Caso consultado', status: 'submitted', submitted_at: '2026-07-12T14:20:00Z' }

  it('muestra formulario OIRS y selector de flujos', async () => {
    await renderPage()
    expect(screen.getByText('Oficina de Informaciones, Reclamos y Sugerencias')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo de caso')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Ingresar una solicitud' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Consultar seguimiento' })).toBeInTheDocument()
  })

  it('valida campos requeridos', async () => {
    await renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByText('Enviar solicitud'))
    expect(await screen.findByText('Seleccione un tipo')).toBeInTheDocument()
  })

  it('envia caso OIRS exitosamente', async () => {
    ;(oirsApi.create as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: created })
    await renderPage()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Tipo de caso'), 'solicitud')
    await user.type(screen.getByLabelText('Asunto'), 'Asunto de prueba valido')
    await user.type(screen.getByLabelText('Descripción'), 'Descripcion detallada de mi solicitud de OIRS con mas de veinte caracteres')
    await user.type(screen.getByLabelText('Nombre'), 'Usuario QA')
    await user.type(screen.getByLabelText('Correo electrónico'), 'qa@example.test')
    await user.click(screen.getByLabelText('Acepto el tratamiento de mis datos para gestionar y responder esta solicitud OIRS'))
    await user.click(screen.getByText('Enviar solicitud'))
    expect(await screen.findByText('Solicitud OIRS registrada')).toBeInTheDocument()
    expect(screen.getByText(created.uuid)).toBeInTheDocument()
    expect(screen.getByText(created.tracking_code)).toBeInTheDocument()
    expect(screen.getByTestId('oirs-tracking-token')).toHaveTextContent(created.tracking_token)
    expect(screen.getByTestId('oirs-tracking-token').parentElement).toHaveClass('tracking-credential')
    await user.click(screen.getByRole('button', { name: 'Copiar token de seguimiento' }))
    expect(await screen.findByText(/Código copiado|No fue posible copiar automáticamente/)).toBeInTheDocument()
  })

  it('muestra error al fallar envio OIRS', async () => {
    ;(oirsApi.create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error al enviar caso'))
    await renderPage()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Tipo de caso'), 'reclamo')
    await user.type(screen.getByLabelText('Asunto'), 'Asunto de prueba valido')
    await user.type(screen.getByLabelText('Descripción'), 'Descripcion detallada de mi reclamo con mas de veinte caracteres')
    await user.type(screen.getByLabelText('Nombre'), 'Usuario QA')
    await user.type(screen.getByLabelText('Correo electrónico'), 'qa@example.test')
    await user.click(screen.getByLabelText('Acepto el tratamiento de mis datos para gestionar y responder esta solicitud OIRS'))
    await user.click(screen.getByText('Enviar solicitud'))
    expect(await screen.findByText('Error al enviar caso')).toBeInTheDocument()
  })

  it('previene doble envio mientras se envia', async () => {
    ;(oirsApi.create as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise((r) => setTimeout(r, 1000)))
    await renderPage()
    const user = userEvent.setup()
    await user.selectOptions(screen.getByLabelText('Tipo de caso'), 'sugerencia')
    await user.type(screen.getByLabelText('Asunto'), 'Asunto de prueba valido')
    await user.type(screen.getByLabelText('Descripción'), 'Descripcion detallada de mi sugerencia con mas de veinte caracteres')
    await user.type(screen.getByLabelText('Nombre'), 'Usuario QA')
    await user.type(screen.getByLabelText('Correo electrónico'), 'qa@example.test')
    await user.click(screen.getByLabelText('Acepto el tratamiento de mis datos para gestionar y responder esta solicitud OIRS'))
    await user.click(screen.getByText('Enviar solicitud'))
    expect(screen.getByText('Enviando solicitud...')).toBeDisabled()
  })

  it('consulta un caso, traduce el estado y muestra historial vacío', async () => {
    ;(oirsApi.detail as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: tracked })
    ;(oirsApi.history as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    await renderPage(); const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Consultar seguimiento' }))
    await user.type(screen.getByLabelText('Identificador del caso'), created.uuid)
    await user.type(screen.getByLabelText('Código de seguimiento'), created.tracking_token)
    await user.click(screen.getByRole('button', { name: 'Consultar estado' }))
    expect(await screen.findByTestId('oirs-status')).toHaveTextContent('Ingresada')
    expect(screen.getByText('Categoría')).toBeInTheDocument()
    expect(screen.getByText('Aún no hay mensajes')).toBeInTheDocument()
  })

  it('muestra mensajes con wrapping y permite enviar desde un caso consultado', async () => {
    ;(oirsApi.detail as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: tracked })
    ;(oirsApi.history as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [{ id: 1, message_direction: 'from_officer', body: 'Respuesta municipal', sent_at: '2026-07-12T15:10:00Z' }] })
    ;(oirsApi.postMessage as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { id: 2, message_direction: 'from_citizen', body: 'Nuevo antecedente', sent_at: '2026-07-12T16:00:00Z' } })
    await renderPage(); const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Consultar seguimiento' })); await user.type(screen.getByLabelText('Identificador del caso'), created.uuid); await user.type(screen.getByLabelText('Código de seguimiento'), created.tracking_token); await user.click(screen.getByRole('button', { name: 'Consultar estado' })); await screen.findByText('Respuesta municipal')
    expect(screen.getByText('Respuesta municipal')).toHaveClass('oirs-message-body')
    await user.type(screen.getByLabelText('Nuevo mensaje'), 'Nuevo antecedente'); await user.click(screen.getByRole('button', { name: 'Enviar mensaje' }))
    await waitFor(() => expect(oirsApi.postMessage).toHaveBeenCalledWith(created.uuid, created.tracking_token, 'Nuevo antecedente'))
    expect(await screen.findByText('Mensaje enviado correctamente.')).toBeInTheDocument()
  })

  it('impide mensajes vacíos y en casos cerrados o cancelados', async () => {
    ;(oirsApi.detail as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { ...tracked, status: 'closed' } })
    ;(oirsApi.history as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    await renderPage(); const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: 'Consultar seguimiento' })); await user.type(screen.getByLabelText('Identificador del caso'), created.uuid); await user.type(screen.getByLabelText('Código de seguimiento'), created.tracking_token); await user.click(screen.getByRole('button', { name: 'Consultar estado' })); await screen.findByText('Este caso ya no admite nuevos mensajes.')
    expect(screen.getByLabelText('Nuevo mensaje')).toBeDisabled(); expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeDisabled(); expect(oirsApi.postMessage).not.toHaveBeenCalled()
  })

  it('bloquea mensajes en un caso cancelado', async () => {
    ;(oirsApi.detail as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { ...tracked, status: 'cancelled' } }); ;(oirsApi.history as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    await renderPage(); const user = userEvent.setup(); await user.click(screen.getByRole('tab', { name: 'Consultar seguimiento' })); await user.type(screen.getByLabelText('Identificador del caso'), created.uuid); await user.type(screen.getByLabelText('Código de seguimiento'), created.tracking_token); await user.click(screen.getByRole('button', { name: 'Consultar estado' })); await screen.findByText('Cancelada')
    expect(screen.getByLabelText('Nuevo mensaje')).toBeDisabled(); expect(screen.getByRole('button', { name: 'Enviar mensaje' })).toBeDisabled()
  })

  it('muestra error al consultar seguimiento', async () => {
    ;(oirsApi.detail as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Token inválido'))
    await renderPage(); const user = userEvent.setup(); await user.click(screen.getByRole('tab', { name: 'Consultar seguimiento' })); await user.type(screen.getByLabelText('Identificador del caso'), created.uuid); await user.type(screen.getByLabelText('Código de seguimiento'), created.tracking_token); await user.click(screen.getByRole('button', { name: 'Consultar estado' }))
    expect(await screen.findByText('Token inválido')).toBeInTheDocument()
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
