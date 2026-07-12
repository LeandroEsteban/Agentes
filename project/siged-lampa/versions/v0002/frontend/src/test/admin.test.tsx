import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

afterEach(cleanup)

vi.mock('../api/client', () => ({ request: vi.fn(), setApiToken: vi.fn() }))
vi.mock('../api/resources', () => ({ getResource: vi.fn(), mutateResource: vi.fn(), operationPath: vi.fn() }))

import { getResource } from '../api/resources'
import { request } from '../api/client'

const userObj = { id: 1, full_name: 'User Test', username: 'user', email: 'user@test.cl', department_name: 'Depto A', department_id: 1, status: 'active', roles: ['admin'] }
const dept = { id: 1, code: 'DEPT-01', name: 'Depto A', status: 'active' }
const role = { id: 1, name: 'Admin', description: 'Admin role', permission_count: 5, permissions: { admin: ['admin.access', 'admin.view'], documents: ['documents.view'] } }
const docType = { id: 1, name: 'Oficio', code: 'OF', status: 'active' }
const procType = { id: 1, name: 'Permiso', code: 'PERM', department_name: 'Depto A', department_id: 1, status: 'active' }

function mockApiCalls(cfg: Record<string, unknown>) {
  ;(getResource as ReturnType<typeof vi.fn>).mockImplementation((op: string) => {
    if (op in cfg) return Promise.resolve({ ok: true, data: cfg[op] })
    return Promise.resolve({ ok: true, data: [] })
  })
}

describe('UsersPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { UsersPage } = await import('../features/admin/UsersPage')
    return render(<MemoryRouter><UsersPage /></MemoryRouter>)
  }

  it('muestra loading inicial', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    await renderPage()
    expect(screen.getByText('Usuarios')).toBeInTheDocument()
  })

  it('muestra lista de usuarios', async () => {
    mockApiCalls({ 'API-006': [userObj] })
    await renderPage()
    await waitFor(() => expect(screen.getByText('User Test')).toBeInTheDocument())
    expect(screen.getByText('user')).toBeInTheDocument()
  })

  it('muestra empty sin datos', async () => {
    mockApiCalls({})
    await renderPage()
    await waitFor(() => expect(screen.getByText('No hay registros para mostrar.')).toBeInTheDocument())
  })

  it('muestra error', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de red'))
    await renderPage()
    expect(await screen.findByText('Error de red')).toBeInTheDocument()
  })

  it('crea usuario via POST /api/v1/users', async () => {
    mockApiCalls({ 'API-011': [dept], 'API-009': [role] })
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: userObj })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Nuevo usuario')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Nuevo usuario'))
    await user.type(screen.getByLabelText('Usuario *'), 'nuevo')
    await user.type(screen.getByLabelText('Correo *'), 'nuevo@test.cl')
    await user.type(screen.getByLabelText('Contrase\u00f1a *'), 'password123')
    await user.type(screen.getByLabelText('Nombre completo *'), 'Nuevo User')
    await user.selectOptions(screen.getByLabelText('Departamento *'), '1')
    await user.click(screen.getByText('Crear usuario'))
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/api/v1/users', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('edita usuario existente', async () => {
    mockApiCalls({ 'API-006': [userObj], 'API-011': [dept], 'API-009': [role] })
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: userObj })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Editar')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Editar'))
    await waitFor(() => expect(screen.getByText('Editar usuario')).toBeInTheDocument())
  })
})

describe('RolesPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { RolesPage } = await import('../features/admin/RolesPage')
    return render(<MemoryRouter><RolesPage /></MemoryRouter>)
  }

  it('muestra lista de roles', async () => {
    mockApiCalls({ 'API-009': [role] })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Admin')).toBeInTheDocument())
  })

  it('edita permisos de rol', async () => {
    mockApiCalls({ 'API-009': [role] })
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: {} })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Editar permisos')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Editar permisos'))
    await waitFor(() => expect(screen.getByText(/Permisos: Admin/)).toBeInTheDocument())
    expect(screen.getByText('admin.access')).toBeInTheDocument()
  })

  it('guarda permisos via PUT /api/v1/roles/:id/permissions', async () => {
    mockApiCalls({ 'API-009': [role] })
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: {} })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Editar permisos')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Editar permisos'))
    await waitFor(() => expect(screen.getByText('Guardar permisos')).toBeInTheDocument())
    await user.click(screen.getByText('Guardar permisos'))
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/api/v1/roles/1/permissions', expect.objectContaining({ method: 'PUT' }))
    })
  })
})

describe('DepartmentsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { DepartmentsPage } = await import('../features/admin/DepartmentsPage')
    return render(<MemoryRouter><DepartmentsPage /></MemoryRouter>)
  }

  it('muestra lista de departamentos', async () => {
    mockApiCalls({ 'API-011': [dept] })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Depto A')).toBeInTheDocument())
  })

  it('crea departamento via POST', async () => {
    mockApiCalls({})
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: dept })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Nuevo departamento')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Nuevo departamento'))
    await user.type(screen.getByLabelText('C\u00f3digo *'), 'NEW')
    await user.type(screen.getByLabelText('Nombre *'), 'Nuevo Dept')
    await user.click(screen.getByText('Crear departamento'))
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/api/v1/departments', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('valida codigo requerido', async () => {
    mockApiCalls({})
    await renderPage()
    await waitFor(() => expect(screen.getByText('Nuevo departamento')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Nuevo departamento'))
    await user.click(screen.getByText('Crear departamento'))
    expect(await screen.findByText('El c\u00f3digo es requerido')).toBeInTheDocument()
  })
})

describe('DocumentTypesPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { DocumentTypesPage } = await import('../features/admin/DocumentTypesPage')
    return render(<MemoryRouter><DocumentTypesPage /></MemoryRouter>)
  }

  it('muestra lista de tipos documentales', async () => {
    mockApiCalls({ 'API-013': [docType] })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Oficio')).toBeInTheDocument())
  })

  it('crea tipo documental via POST', async () => {
    mockApiCalls({})
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: docType })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Nuevo tipo documental')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Nuevo tipo documental'))
    await user.type(screen.getByLabelText('Nombre *'), 'Informe')
    await user.type(screen.getByLabelText('C\u00f3digo *'), 'INF')
    await user.click(screen.getByText('Crear tipo documental'))
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/api/v1/document-types', expect.objectContaining({ method: 'POST' }))
    })
  })
})

describe('ProcedureTypesPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { ProcedureTypesPage } = await import('../features/admin/ProcedureTypesPage')
    return render(<MemoryRouter><ProcedureTypesPage /></MemoryRouter>)
  }

  it('muestra lista de tipos de tramite', async () => {
    mockApiCalls({ 'API-SUP-001': [procType] })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Permiso')).toBeInTheDocument())
  })

  it('crea tipo de tramite via POST', async () => {
    mockApiCalls({ 'API-011': [dept] })
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: procType })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Nuevo tipo de tr\u00e1mite')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Nuevo tipo de tr\u00e1mite'))
    await user.type(screen.getByLabelText('Nombre *'), 'Nuevo Tramite')
    await user.type(screen.getByLabelText('C\u00f3digo *'), 'NT')
    await user.selectOptions(screen.getByLabelText('Departamento *'), '1')
    await user.click(screen.getByText('Crear tipo de tr\u00e1mite'))
    await waitFor(() => {
      expect(request).toHaveBeenCalledWith('/api/v1/admin/procedure-types', expect.objectContaining({ method: 'POST' }))
    })
  })

  it('edita tipo de tramite via PUT', async () => {
    mockApiCalls({ 'API-SUP-001': [procType], 'API-011': [dept] })
    ;(request as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: procType })
    await renderPage()
    await waitFor(() => expect(screen.getByText('Editar')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Editar'))
    await waitFor(() => expect(screen.getByText(/Editar: Permiso/)).toBeInTheDocument())
  })

  it('previene duplicados mostrando error', async () => {
    mockApiCalls({ 'API-011': [dept] })
    ;(request as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('El codigo ya existe'))
    await renderPage()
    await waitFor(() => expect(screen.getByText('Nuevo tipo de tr\u00e1mite')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Nuevo tipo de tr\u00e1mite'))
    await user.type(screen.getByLabelText('Nombre *'), 'Duplicado')
    await user.type(screen.getByLabelText('C\u00f3digo *'), 'DUP')
    await user.selectOptions(screen.getByLabelText('Departamento *'), '1')
    await user.click(screen.getByText('Crear tipo de tr\u00e1mite'))
    expect(await screen.findByText('El codigo ya existe')).toBeInTheDocument()
  })
})

describe('ExternalEntitiesPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  async function renderPage() {
    const { ExternalEntitiesPage } = await import('../pages/intranet')
    return render(<MemoryRouter><ExternalEntitiesPage /></MemoryRouter>)
  }

  it('muestra formulario y tabla', async () => {
    await renderPage()
    expect(screen.getByText('Entidades externas')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument()
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
  })
})
