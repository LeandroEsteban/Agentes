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

import { getResource } from '../api/resources'

const dashboardData = { total_documents: 150, total_expedients: 30, total_correspondence: 45, total_users: 12 }

describe('DashboardPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { DashboardPage } = await import('../features/dashboard/DashboardPage')
    return render(<MemoryRouter><DashboardPage /></MemoryRouter>)
  }

  it('muestra loading inicial', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    await renderPage()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('muestra metricas del dashboard', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: dashboardData })
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('150')).toBeInTheDocument()
      expect(screen.getByText('30')).toBeInTheDocument()
      expect(screen.getByText('45')).toBeInTheDocument()
      expect(screen.getByText('12')).toBeInTheDocument()
    })
  })

  it('muestra empty sin datos', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: {} })
    await renderPage()
    await waitFor(() => expect(screen.getByText('No hay datos disponibles.')).toBeInTheDocument())
  })

  it('muestra error y reintentar', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error del servidor'))
    await renderPage()
    expect(await screen.findByText('Error del servidor')).toBeInTheDocument()
    expect(screen.getByText('Reintentar')).toBeInTheDocument()
  })
})

describe('ReportsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { ReportsPage } = await import('../features/reports/ReportsPage')
    return render(<MemoryRouter><ReportsPage /></MemoryRouter>)
  }

  it('muestra loading inicial', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    await renderPage()
    expect(screen.getByText('Dashboard de reportes')).toBeInTheDocument()
  })

  it('muestra metricas del reporte', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: dashboardData })
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Total documentos')).toBeInTheDocument()
      expect(screen.getByText('150')).toBeInTheDocument()
    })
  })

  it('muestra tablas de desglose', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: { ...dashboardData, documents_by_status: { draft: 50, approved: 100 }, requests_by_status: { pending: 20, resolved: 10 } },
    })
    await renderPage()
    await waitFor(() => {
      expect(screen.getByText('Documentos por estado')).toBeInTheDocument()
      expect(screen.getByText('Solicitudes por estado')).toBeInTheDocument()
    })
    expect(screen.getByText('draft')).toBeInTheDocument()
    expect(screen.getByText('50')).toBeInTheDocument()
  })

  it('muestra empty sin datos', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: null })
    await renderPage()
    await waitFor(() => expect(screen.getByText('No hay registros para mostrar.')).toBeInTheDocument())
  })

  it('muestra error y reintentar', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de carga de reportes'))
    await renderPage()
    expect(await screen.findByText('Error de carga de reportes')).toBeInTheDocument()
    expect(screen.getByText('Reintentar')).toBeInTheDocument()
  })
})

describe('OirsManagementPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { OirsManagementPage } = await import('../features/oirs/OirsManagementPage')
    return render(<MemoryRouter><OirsManagementPage /></MemoryRouter>)
  }

  it('muestra loading inicial', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    await renderPage()
    expect(screen.getByText('Gesti\u00f3n OIRS')).toBeInTheDocument()
  })

  it('muestra lista de casos OIRS', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: [{ id: 1, category: 'solicitud', subject: 'Caso test', status: 'pending', created_at: '2025-01-01', citizen_name: 'Ciudadano' }],
      pagination: { page: 1, size: 20, total: 1, pages: 1 },
    })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Caso test')).toBeInTheDocument())
    expect(screen.getByText('Gestionar')).toBeInTheDocument()
  })

  it('gestiona un caso OIRS', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: [{ id: 1, category: 'reclamo', subject: 'Reclamo test', status: 'open', created_at: '2025-01-01', citizen_name: 'Ciudadano' }],
      pagination: { page: 1, size: 20, total: 1, pages: 1 },
    })
    const { request } = await import('../api/client')
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: {} })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Gestionar')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Gestionar'))
    await waitFor(() => expect(screen.getByText(/Caso #1/)).toBeInTheDocument())
    expect(screen.getAllByText('Ciudadano').length).toBeGreaterThan(0)
  })

  it('cambia estado de caso OIRS', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true, data: [{ id: 1, category: 'sugerencia', subject: 'Sugerencia test', status: 'open', created_at: '2025-01-01' }],
      pagination: { page: 1, size: 20, total: 1, pages: 1 },
    })
    const { request } = await import('../api/client')
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: {} })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Gestionar')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Gestionar'))
    await waitFor(() => expect(screen.getByText('En progreso')).toBeInTheDocument())
    await user.click(screen.getByText('Resuelto'))
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/api/v1/oirs/1', expect.objectContaining({ method: 'PATCH', body: { status: 'resolved' } }))
    })
  })
})

describe('Public pages', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('HomePage renderiza titulo y enlace', async () => {
    const { HomePage } = await import('../pages/public')
    render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(screen.getByText('Servicios municipales')).toBeInTheDocument()
    expect(screen.getByText('Ver tramites disponibles')).toBeInTheDocument()
  })

  it('ProceduresPage carga y muestra procedimientos', async () => {
    const endpoints = await import('../api/endpoints')
    endpoints.api.procedures = vi.fn().mockResolvedValue({ ok: true, data: [{ id: 1, slug: 'test', title: 'Permiso Municipal', instructions: '', department_name: 'Depto' }] })
    const { ProceduresPage } = await import('../pages/public')
    render(<MemoryRouter><ProceduresPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Permiso Municipal')).toBeInTheDocument())
  })

  it('ProceduresPage muestra error', async () => {
    const endpoints = await import('../api/endpoints')
    endpoints.api.procedures = vi.fn().mockRejectedValue(new Error('Error de carga'))
    const { ProceduresPage } = await import('../pages/public')
    render(<MemoryRouter><ProceduresPage /></MemoryRouter>)
    expect(await screen.findByText('Error de carga')).toBeInTheDocument()
  })

  it('ProcedureDetailPage carga y muestra detalle', async () => {
    vi.mocked(useParams).mockReturnValue({ procedureId: '1' })
    const endpoints = await import('../api/endpoints')
    endpoints.api.procedure = vi.fn().mockResolvedValue({ ok: true, data: { id: 1, slug: 'test', title: 'Detalle Test', instructions: 'Instrucciones...', department_name: 'Depto' } })
    const { ProcedureDetailPage } = await import('../pages/public')
    render(<MemoryRouter initialEntries={['/tramites/1']}><ProcedureDetailPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Detalle Test')).toBeInTheDocument())
    expect(screen.getByText('Instrucciones...')).toBeInTheDocument()
    expect(screen.getByText('Iniciar solicitud')).toBeInTheDocument()
  })
})

describe('API error handling', () => {
  it('maneja error 401 y muestra mensaje', async () => {
    const { DocumentsListPage } = await import('../features/documents/DocumentsListPage')
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue({ status: 401, code: 'UNAUTHORIZED', message: 'No autorizado' })
    render(<MemoryRouter><DocumentsListPage /></MemoryRouter>)
    expect(await screen.findByText('No autorizado')).toBeInTheDocument()
  })

  it('maneja error 403', async () => {
    const { DocumentsListPage } = await import('../features/documents/DocumentsListPage')
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue({ status: 403, code: 'FORBIDDEN', message: 'Acceso denegado' })
    render(<MemoryRouter><DocumentsListPage /></MemoryRouter>)
    expect(await screen.findByText('Acceso denegado')).toBeInTheDocument()
  })

  it('maneja error 404', async () => {
    const { DocumentsListPage } = await import('../features/documents/DocumentsListPage')
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue({ status: 404, code: 'NOT_FOUND', message: 'Recurso no encontrado' })
    render(<MemoryRouter><DocumentsListPage /></MemoryRouter>)
    expect(await screen.findByText('Recurso no encontrado')).toBeInTheDocument()
  })

  it('maneja error 409', async () => {
    const { DocumentsListPage } = await import('../features/documents/DocumentsListPage')
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue({ status: 409, code: 'CONFLICT', message: 'Conflicto de datos' })
    render(<MemoryRouter><DocumentsListPage /></MemoryRouter>)
    expect(await screen.findByText('Conflicto de datos')).toBeInTheDocument()
  })

  it('maneja error 503', async () => {
    const { DocumentsListPage } = await import('../features/documents/DocumentsListPage')
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue({ status: 503, code: 'SERVICE_UNAVAILABLE', message: 'Servicio no disponible' })
    render(<MemoryRouter><DocumentsListPage /></MemoryRouter>)
    expect(await screen.findByText('Servicio no disponible')).toBeInTheDocument()
  })
})
