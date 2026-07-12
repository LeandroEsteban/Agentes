import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, useParams } from 'react-router-dom'

afterEach(cleanup)

vi.mock('../api/resources', () => ({ getResource: vi.fn(), mutateResource: vi.fn(), operationPath: vi.fn() }))
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useParams: vi.fn() }
})

import { getResource, mutateResource } from '../api/resources'
import { DocumentsListPage } from '../features/documents/DocumentsListPage'
import { DocumentCreatePage } from '../features/documents/DocumentCreatePage'
import { DocumentDetailPage } from '../features/documents/DocumentDetailPage'
import { DocumentVersionsPage } from '../features/documents/DocumentVersionsPage'
import { ReviewsPage } from '../features/documents/ReviewsPage'
import { ApprovalsPage } from '../features/documents/ApprovalsPage'
import { SignaturePage } from '../features/documents/SignaturePage'
import { documentFixture } from './fixtures/documents.fixture'
import { reviewFixture } from './fixtures/reviews.fixture'
import { approvalFixture } from './fixtures/approvals.fixture'
import { signatureFixture } from './fixtures/signatures.fixture'

const doc = documentFixture({ description: 'Desc', due_date: '2025-12-31', confidentiality_level: 'internal' })
const docType = { id: 1, name: 'Oficio' }
const dept = { id: 1, name: 'Depto A' }

describe('document contract fixtures', () => {
  it('preserva campos obligatorios y permite overrides tipados', () => {
    expect(documentFixture({ status: 'approved' }).status).toBe('approved')
    expect(reviewFixture({ id: 5 }).id).toBe(5)
    expect(approvalFixture({ status: 'pending' }).status).toBe('pending')
    expect(signatureFixture().integration_mode).toBe('academic_simulation')
  })

  it('mantiene el anexo contractual JSON/base64 sin multipart ni contenido grande', () => {
    const attachment = {
      file_name: 'anexo.txt',
      mime_type: 'text/plain',
      content_base64: 'YW5leG8=',
      checksum_sha256: 'a'.repeat(64),
      description: 'Anexo contractual',
    } satisfies { file_name: string; mime_type: string; content_base64: string; checksum_sha256?: string; document_version_id?: number | null; description?: string }
    expect(attachment.content_base64.length).toBeLessThan(10 * 1024 * 1024)
    expect(Object.hasOwn(attachment, 'multipart')).toBe(false)
  })
})

describe('DocumentsListPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('muestra loading', () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockReturnValue(new Promise(() => {}))
    render(<MemoryRouter><DocumentsListPage /></MemoryRouter>)
    expect(screen.getByText('Bandeja documental')).toBeInTheDocument()
  })

  it('muestra lista', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [doc], pagination: { page: 1, size: 10, total: 1 } })
    render(<MemoryRouter><DocumentsListPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Documento Test')).toBeInTheDocument())
  })

  it('muestra empty', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [], pagination: { page: 1, size: 10, total: 0 } })
    render(<MemoryRouter><DocumentsListPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('No se encontraron documentos.')).toBeInTheDocument())
  })

  it('muestra error', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Error de carga'))
    render(<MemoryRouter><DocumentsListPage /></MemoryRouter>)
    expect(await screen.findByText('Error de carga')).toBeInTheDocument()
  })
})

describe('DocumentCreatePage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('carga opciones y crea', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockImplementation((op: string) => {
      if (op === 'API-013') return Promise.resolve({ ok: true, data: [docType] })
      if (op === 'API-011') return Promise.resolve({ ok: true, data: [dept] })
      return Promise.resolve({ ok: true, data: [] })
    })
    ;(mutateResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { id: 1 } })
    render(<MemoryRouter><DocumentCreatePage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Oficio')).toBeInTheDocument())
    expect(screen.getByText('Depto A')).toBeInTheDocument()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Titulo'), 'Nuevo Doc')
    await user.selectOptions(screen.getByLabelText('Tipo documental'), '1')
    await user.selectOptions(screen.getByLabelText('Departamento'), '1')
    await user.type(screen.getByLabelText('Contenido'), 'Contenido contractual')
    await user.click(screen.getByRole('button', { name: 'Crear documento' }))
    await waitFor(() => expect(mutateResource).toHaveBeenCalledWith('API-016', expect.any(Object)))
  })
})

describe('DocumentDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ documentId: '1' })
  })

  it('muestra detalle', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockImplementation((op: string) => Promise.resolve({ ok: true, data: op === 'API-017' ? { document: doc } : [] }))
    render(<MemoryRouter><DocumentDetailPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('heading', { name: /Documento Test/ })).toBeInTheDocument())
  })

  it('carga 4 recursos', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockImplementation((op: string) => Promise.resolve({ ok: true, data: op === 'API-017' ? { document: doc } : [] }))
    render(<MemoryRouter><DocumentDetailPage /></MemoryRouter>)
    await waitFor(() => {
      expect(getResource).toHaveBeenCalledWith('API-017', { documentId: '1' })
      expect(getResource).toHaveBeenCalledWith('API-SUP-036', { documentId: '1' })
      expect(getResource).toHaveBeenCalledWith('API-SUP-008', { documentId: '1' })
      expect(getResource).toHaveBeenCalledWith('API-SUP-034', { documentId: '1' })
    })
  })
})

describe('DocumentVersionsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ documentId: '1' })
  })

  it('muestra formulario de nueva version', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: [] })
    ;(mutateResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, data: { id: 1 } })
    render(<MemoryRouter><DocumentVersionsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByRole('heading', { name: /Nueva version/ })).toBeInTheDocument())
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Resumen'), 'Version 1')
    await user.type(screen.getByLabelText('Contenido'), 'Contenido...')
    await user.click(screen.getByText('Crear version'))
    await waitFor(() => expect(mutateResource).toHaveBeenCalledWith('API-020', expect.any(Object), { documentId: '1' }))
  })
})

describe('ReviewsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('revisa documento', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockImplementation((op: string) => {
      if (op === 'API-015') return Promise.resolve({ ok: true, data: { items: [doc] } })
      if (op === 'API-SUP-037') return Promise.resolve({ ok: true, data: [reviewFixture()] })
      return Promise.resolve({ ok: true, data: [] })
    })
    ;(mutateResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })
    render(<MemoryRouter><ReviewsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Revisar')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Revisar'))
    await waitFor(() => expect(screen.getByText('Enviar revision')).toBeInTheDocument())
    await user.selectOptions(screen.getByLabelText('Decision'), 'approved')
    await user.click(screen.getByText('Enviar revision'))
    await waitFor(() => expect(mutateResource).toHaveBeenCalledWith('API-022', expect.any(Object), { reviewId: '5' }))
  })
})

describe('ApprovalsPage', () => {
  beforeEach(() => { vi.clearAllMocks() })

  it('aprueba con confirmacion', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockImplementation((op: string) => Promise.resolve({ ok: true, data: op === 'API-015' ? { items: [documentFixture({ status: 'in_approval' })] } : [approvalFixture()] }))
    render(<MemoryRouter><ApprovalsPage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Aprobar / Rechazar')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Aprobar / Rechazar'))
    await waitFor(() => expect(screen.getByText('Confirmar decision')).toBeInTheDocument())
    await user.click(screen.getByLabelText('Aprobar'))
    await user.click(screen.getByRole('button', { name: 'Confirmar decision' }))
    await waitFor(() => expect(screen.getByRole('dialog')).toBeInTheDocument())
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Confirmar' }))
    await waitFor(() => expect(mutateResource).toHaveBeenCalledWith('API-SUP-019', expect.objectContaining({ decision: 'approved' }), { approvalId: '9' }))
  })
})

describe('SignaturePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useParams).mockReturnValue({ documentId: '1' })
  })

  it('firma documento', async () => {
    ;(getResource as ReturnType<typeof vi.fn>).mockImplementation((op: string) => Promise.resolve({ ok: true, data: op === 'API-004' ? { signature_profile_id: 3 } : [signatureFixture()] }))
    ;(mutateResource as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true })
    render(<MemoryRouter><SignaturePage /></MemoryRouter>)
    await waitFor(() => expect(screen.getByText('Firmar documento')).toBeInTheDocument())
    const user = userEvent.setup()
    await user.click(screen.getByText('Firmar documento'))
    await waitFor(() => expect(mutateResource).toHaveBeenCalledWith('API-024', expect.any(Object), { documentId: '1' }))
  })
})
