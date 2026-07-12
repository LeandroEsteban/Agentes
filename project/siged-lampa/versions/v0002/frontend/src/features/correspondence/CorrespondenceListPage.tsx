import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getResource } from '../../api/resources'
import { DataTable, StatusBadge, Pagination, SearchInput, FilterBar, DateCell, type Column } from '../../components/tables'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback'
import { PageHeader } from '../../components/domain'

interface Correspondence {
  id: number
  tracking_number: string
  subject: string
  sender_name: string
  recipient_name: string
  direction: string
  status: string
  created_at: string
}

export function CorrespondenceListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Correspondence[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')

  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    getResource<Correspondence[]>('API-029', { page: String(page), size: '20', ...(search ? { search } : {}) })
      .then((res) => {
        setData(res.data)
        if (res.pagination) setPages(res.pagination.pages)
      })
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { void load() }, [load])

  const columns: Column<Correspondence>[] = [
    { key: 'tracking_number', label: 'N° seguimiento' },
    { key: 'subject', label: 'Asunto' },
    { key: 'sender_name', label: 'Remitente' },
    { key: 'recipient_name', label: 'Destinatario' },
    { key: 'direction', label: 'Dirección', render: (value) => <StatusBadge value={value === 'incoming' ? 'Entrada' : 'Salida'} /> },
    { key: 'status', label: 'Estado', render: (value) => <StatusBadge value={String(value)} /> },
    { key: 'created_at', label: 'Creado', render: (value) => <DateCell value={String(value)} /> }
  ]

  return (
    <>
      <PageHeader title="Correspondencia" description="Registro y seguimiento de correspondencia entrante y saliente." />
      <div className="page-actions"><span className="page-summary">{data.length} registro{data.length === 1 ? '' : 's'} en esta pagina</span><button onClick={() => navigate('/intranet/correspondence/new')}>Nueva correspondencia</button></div>
      <FilterBar>
        <SearchInput value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <button type="button" onClick={() => { setSearch(''); setPage(1) }}>Limpiar filtros</button>
      </FilterBar>

      {error && <ErrorState error={error} onRetry={load} />}
      {loading && <LoadingState />}
      {!loading && !error && !data.length && <EmptyState title="Sin correspondencia" message="No hay registros para mostrar." />}
      {!loading && !error && data.length > 0 && (
        <>
          <DataTable columns={columns} rows={data} />
          <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}
    </>
  )
}
