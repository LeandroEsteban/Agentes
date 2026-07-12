import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useParams } from 'react-router-dom'

afterEach(cleanup)

vi.mock('../api/client', () => ({ request: vi.fn(), setApiToken: vi.fn() }))
vi.mock('../api/resources', () => ({ getResource: vi.fn(), mutateResource: vi.fn(), operationPath: vi.fn() }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: vi.fn() }
})

import { getResource, mutateResource } from '../api/resources'
import { request } from '../api/client'

const expedient = { id: 1, code: 'EXP-001', subject: 'Expediente Test', status: 'active', department_name: 'Depto A', created_at: '2025-01-01' }
const dept = { id: 1, code: 'DEPT-01', name: 'Depto A', status: 'active' }

describe('ExpedientsListPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { ExpedientsListPage } = await import('../features/expedients/ExpedientsListPage')
    return render(<MemoryRouter><ExpedientsListPage /></MemoryRouter>)
  }

  it('muestra loading inicial', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    await renderPage()
    expect(screen.getByText('Expedientes')).toBeInTheDocument()
  })

  it('muestra lista de expedientes', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [expedient], pagination: { page: 1, size: 20, total: 1, pages: 1 } })
    await renderPage()
    await waitFor(() => expect(screen.getByText('EXP-001')).toBeInTheDocument())
    expect(screen.getByText('Expediente Test')).toBeInTheDocument()
  })

  it('muestra empty cuando no hay expedientes', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [], pagination: { page: 1, size: 20, total: 0, pages: 1 } })
    await renderPage()
    await waitFor(() => expect(screen.getByText('No hay registros para mostrar.')).toBeInTheDocument())
  })

  it('muestra error y reintentar', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error al cargar expedientes'))
    await renderPage()
    expect(await screen.findByText('Error al cargar expedientes')).toBeInTheDocument()
  })

  it('crea expediente via API-026', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockImplementation((op: string) => {
      if (op === 'API-011') return Promise.resolve({ ok: true, data: [dept] })
      return Promise.resolve({ ok: true, data: [], pagination: { page: 1, size: 20, total: 0, pages: 1 } })
    })
    ;(mutateResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { id: 1 } })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Nuevo expediente')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Nuevo expediente'))
    await waitFor(() => expect(screen.getByText('Nuevo expediente')).toBeInTheDocument())
    await user.type(screen.getByLabelText('Asunto *'), 'Nuevo Expediente')
    await user.selectOptions(screen.getByLabelText('Departamento *'), '1')
    await user.click(screen.getByText('Crear expediente'))
    await waitFor(() => {
      expect(mutateResource).toHaveBeenCalledWith('API-026', { subject: 'Nuevo Expediente', department_id: 1, description: undefined })
    })
  })
})

describe('ExpedientDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ expedientId: '1' })
  })

  async function renderPage() {
    const { ExpedientDetailPage } = await import('../features/expedients/ExpedientDetailPage')
    return render(<MemoryRouter initialEntries={['/intranet/expedients/1']}><ExpedientDetailPage /></MemoryRouter>)
  }

  it('muestra detalle del expediente', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: expedient })
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Expediente EXP-001')).toBeInTheDocument()
      expect(screen.getByText('EXP-001')).toBeInTheDocument()
      expect(screen.getByText('active')).toBeInTheDocument()
    })
  })

  it('muestra tabs de navegacion', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: expedient })
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Detalle')).toBeInTheDocument()
      expect(screen.getByText('Documentos')).toBeInTheDocument()
      expect(screen.getByText('Eventos')).toBeInTheDocument()
      expect(screen.getByText('Historial')).toBeInTheDocument()
    })
  })

  it('muestra evento de timeline', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: expedient })
    ;(request as ReturnType<typeof vi.fn>).mockImplementation((op: string) => {
      if (op.includes('events')) return Promise.resolve({ ok: true, data: [{ id: 1, type: 'created', description: 'Expediente creado', created_at: '2025-01-01', user_name: 'Admin' }] })
      return Promise.resolve({ ok: true, data: [] })
    })
    await renderPage()
    await waitFor(() => expect(screen.getByText('EXP-001')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Eventos'))
    await waitFor(() => expect(screen.getByText('Expediente creado')).toBeInTheDocument())
  })

  it('muestra error y reintentar', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error al cargar expediente'))
    await renderPage()
    expect(await screen.findByText('Error al cargar expediente')).toBeInTheDocument()
    expect(screen.getByText('Reintentar')).toBeInTheDocument()
  })
})
