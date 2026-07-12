import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

afterEach(cleanup)

vi.mock('../api/client', () => ({ request: vi.fn(), setApiToken: vi.fn() }))
vi.mock('../api/resources', () => ({ getResource: vi.fn(), mutateResource: vi.fn(), operationPath: vi.fn() }))

import { getResource, mutateResource } from '../api/resources'
import { request } from '../api/client'

const correspondence = { id: 1, tracking_number: 'CORR-001', subject: 'Correspondencia Test', sender_name: 'Remitente', recipient_name: 'Destinatario', direction: 'incoming', status: 'active', created_at: '2025-01-01' }

describe('CorrespondenceListPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { CorrespondenceListPage } = await import('../features/correspondence/CorrespondenceListPage')
    return render(<MemoryRouter><CorrespondenceListPage /></MemoryRouter>)
  }

  it('muestra loading inicial', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    await renderPage()
    expect(screen.getByText('Correspondencia')).toBeInTheDocument()
  })

  it('muestra lista de correspondencia', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [correspondence], pagination: { page: 1, size: 20, total: 1, pages: 1 } })
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('CORR-001')).toBeInTheDocument()
      expect(screen.getByText('Correspondencia Test')).toBeInTheDocument()
    })
  })

  it('muestra empty cuando no hay registros', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [], pagination: { page: 1, size: 20, total: 0, pages: 1 } })
    await renderPage()
    await waitFor(() => expect(screen.getByText('No hay registros para mostrar.')).toBeInTheDocument())
  })

  it('muestra error y reintentar', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de carga'))
    await renderPage()
    expect(await screen.findByText('Error de carga')).toBeInTheDocument()
    expect(screen.getByText('Reintentar')).toBeInTheDocument()
  })

  it('tiene enlace a nueva correspondencia', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [correspondence], pagination: { page: 1, size: 20, total: 1, pages: 1 } })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Nueva correspondencia')).toBeInTheDocument())
  })
})

describe('CorrespondenceCreatePage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { CorrespondenceCreatePage } = await import('../features/correspondence/CorrespondenceCreatePage')
    return render(<MemoryRouter><CorrespondenceCreatePage /></MemoryRouter>)
  }

  it('muestra formulario de creacion', async () => {
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    await renderPage()
    expect(screen.getByText('Nueva correspondencia')).toBeInTheDocument()
    expect(screen.getByLabelText('Asunto *')).toBeInTheDocument()
  })

  it('valida campos requeridos', async () => {
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    await renderPage()
    const user = userEvent.setup()
    await user.click(screen.getByText('Guardar correspondencia'))
    expect(await screen.findByText('El asunto es requerido')).toBeInTheDocument()
    expect(await screen.findByText('El remitente es requerido')).toBeInTheDocument()
  })

  it('crea correspondencia via API-030', async () => {
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    ;(mutateResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })
    await renderPage()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Asunto *'), 'Nueva Correspondencia')
    await user.type(screen.getByLabelText('Remitente *'), 'Remitente Test')
    await user.type(screen.getByLabelText('Destinatario *'), 'Destinatario Test')
    await user.click(screen.getByText('Guardar correspondencia'))
    await waitFor(() => {
      expect(mutateResource).toHaveBeenCalledWith('API-030', expect.objectContaining({ subject: 'Nueva Correspondencia' }))
    })
  })

  it('muestra error al fallar creacion', async () => {
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    ;(mutateResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de creacion'))
    await renderPage()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Asunto *'), 'Nueva Correspondencia')
    await user.type(screen.getByLabelText('Remitente *'), 'Remitente Test')
    await user.type(screen.getByLabelText('Destinatario *'), 'Destinatario Test')
    await user.click(screen.getByText('Guardar correspondencia'))
    expect(await screen.findByText('Error de creacion')).toBeInTheDocument()
  })
})
