import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getResource } from '../../api/resources'
import { PageHeader } from '../../components/domain'
import { DataTable, DateCell, StatusBadge } from '../../components/tables'
import { ErrorState, LoadingState, EmptyState } from '../../components/feedback'

interface CitizenRequest {
  id: number
  subject: string
  status: string
  created_at: string
}

export function CitizenRequestsPage() {
  const [data, setData] = useState<CitizenRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const load = () => {
    setLoading(true)
    setError(undefined)
    getResource<CitizenRequest[]>('API-035')
      .then((response) => setData(response.data))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])
  if (loading) return <><PageHeader title="Mis solicitudes" description="Revise el estado y avance de sus trámites." /><LoadingState /></>
  if (error) return <><PageHeader title="Mis solicitudes" description="Revise el estado y avance de sus trámites." /><ErrorState error={error} onRetry={load} /></>
  if (!data.length) return <><PageHeader title="Mis solicitudes" description="Revise el estado y avance de sus trámites." /><EmptyState title="Aún no tienes solicitudes" message="No tiene solicitudes registradas." action={<Link className="button" to="/tramites">Ver trámites</Link>} /></>
  return (
    <>
      <PageHeader title="Mis solicitudes" description="Revise el estado y avance de sus trámites." />
      <div className="page-actions"><span className="page-summary">{data.length} solicitud{data.length === 1 ? '' : 'es'} registrada{data.length === 1 ? '' : 's'}</span><Link className="button" to="/tramites">Nuevo trámite</Link></div>
      <DataTable<CitizenRequest>
        columns={[
          { key: 'id', label: 'N°' },
          { key: 'subject', label: 'Asunto', render: (value, row) => <Link to={`/portal/requests/${row.id}`}>{String(value)}</Link> },
          { key: 'status', label: 'Estado', render: (value) => <StatusBadge value={String(value)} /> },
          { key: 'created_at', label: 'Fecha de ingreso', render: (value) => <DateCell value={String(value)} /> }
        ]}
        rows={data} caption="Solicitudes ciudadanas"
      />
    </>
  )
}
