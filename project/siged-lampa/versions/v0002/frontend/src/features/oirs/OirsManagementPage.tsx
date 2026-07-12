import { useCallback, useEffect, useState } from 'react'
import { getResource } from '../../api/resources'
import { request } from '../../api/client'
import type { ApiEnvelope } from '../../api/types'
import { DataTable, StatusBadge, Pagination, SearchInput, FilterBar, DateCell, TableActions, type Column } from '../../components/tables'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback'
import { PageHeader, DetailSection } from '../../components/domain'

interface OirsCase {
  id: number
  category: string
  subject: string
  status: string
  created_at: string
  citizen_name?: string
  description?: string
}

export function OirsManagementPage() {
  const [data, setData] = useState<OirsCase[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [selectedCase, setSelectedCase] = useState<OirsCase | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [replying, setReplying] = useState(false)
  const [replyError, setReplyError] = useState<Error>()
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    getResource<OirsCase[]>('API-SUP-046', { page: String(page), size: '20' })
      .then((res) => {
        setData(res.data)
        if (res.pagination) setPages(res.pagination.pages)
      })
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }, [page])

  useEffect(() => { void load() }, [load])

  const selectCase = (item: OirsCase) => {
    setSelectedCase(item)
    setReplyBody('')
    setReplyError(undefined)
  }

  const sendReply = async () => {
    if (!selectedCase || !replyBody.trim()) return
    setReplying(true)
    setReplyError(undefined)
    try {
      await request<ApiEnvelope<void>>(`/api/v1/oirs/${selectedCase.id}/reply`, {
        method: 'POST',
        body: { body: replyBody }
      })
      setReplyBody('')
      void load()
    } catch (cause) {
      setReplyError(cause as Error)
    } finally {
      setReplying(false)
    }
  }

  const updateStatus = async (status: string) => {
    if (!selectedCase) return
    setReplyError(undefined)
    try {
      await request<ApiEnvelope<void>>(`/api/v1/oirs/${selectedCase.id}`, {
        method: 'PATCH',
        body: { status }
      })
      setSelectedCase({ ...selectedCase, status })
      void load()
    } catch (cause) {
      setReplyError(cause as Error)
    }
  }

  const columns: Column<OirsCase>[] = [
    { key: 'id', label: 'ID' },
    { key: 'category', label: 'Categoría' },
    { key: 'subject', label: 'Asunto' },
    { key: 'status', label: 'Estado', render: (v) => <StatusBadge value={String(v)} /> },
    { key: 'created_at', label: 'Creado', render: (value) => <DateCell value={String(value)} /> },
    { key: 'citizen_name', label: 'Ciudadano' },
    { key: 'id', label: 'Acciones', render: (_v, row) => (
      <TableActions><button onClick={(e) => { e.stopPropagation(); selectCase(row) }}>Gestionar</button></TableActions>
    )}
  ]

  return (
    <>
       <PageHeader title="Gestión OIRS" description="Oficina de Informaciones, Reclamos y Sugerencias." />
       <div className="page-actions"><span className="page-summary">{data.length} caso{data.length === 1 ? '' : 's'} en esta pagina</span></div>

      <FilterBar>
        <SearchInput placeholder="Buscar casos..." value={search} onChange={(event) => setSearch(event.target.value)} />
        <button type="button" onClick={() => setSearch('')}>Limpiar filtros</button>
      </FilterBar>

      {selectedCase && (
         <DetailSection title={`Caso #${selectedCase.id}: ${selectedCase.subject}`}>
           <dl className="metadata-grid"><div><dt>Categoría</dt><dd>{selectedCase.category}</dd></div><div><dt>Estado</dt><dd><StatusBadge value={selectedCase.status} /></dd></div><div><dt>Ciudadano</dt><dd>{selectedCase.citizen_name || 'Anónimo'}</dd></div><div><dt>Fecha</dt><dd><DateCell value={selectedCase.created_at} /></dd></div><div><dt>Descripción</dt><dd>{selectedCase.description || selectedCase.subject}</dd></div></dl>

          <div>
            <strong>Cambiar estado:</strong>
            <button onClick={() => { void updateStatus('in_progress') }}>En progreso</button>
            <button onClick={() => { void updateStatus('resolved') }}>Resuelto</button>
            <button onClick={() => { void updateStatus('closed') }}>Cerrado</button>
          </div>

          <label className="field">
            Responder
            <textarea value={replyBody} onChange={(e) => setReplyBody(e.target.value)} rows={4} />
          </label>
          <button disabled={replying || !replyBody.trim()} onClick={() => { void sendReply() }}>
            {replying ? 'Enviando...' : 'Enviar respuesta'}
          </button>
          {replyError && <ErrorState error={replyError} />}
          <button onClick={() => setSelectedCase(null)}>Cerrar detalle</button>
        </DetailSection>
      )}

      {error && <ErrorState error={error} onRetry={load} />}
      {loading && <LoadingState />}
       {!loading && !error && !data.length && <EmptyState title="No hay casos OIRS" message="No existen casos que coincidan con los filtros." />}
      {!loading && !error && data.length > 0 && (
        <>
           <DataTable columns={columns} rows={data.filter((item) => !search || `${item.subject} ${item.category} ${item.citizen_name || ''}`.toLowerCase().includes(search.toLowerCase()))} caption="Casos OIRS" />
          <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}
    </>
  )
}
