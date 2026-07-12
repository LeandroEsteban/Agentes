import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getResource } from '../../api/resources'
import { PageHeader } from '../../components/domain'
import { DataTable, StatusBadge } from '../../components/tables'
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
  if (loading) return <><PageHeader title="Mis solicitudes" /><LoadingState /></>
  if (error) return <><PageHeader title="Mis solicitudes" /><ErrorState error={error} onRetry={load} /></>
  if (!data.length) return <><PageHeader title="Mis solicitudes" /><EmptyState message="No tiene solicitudes registradas." /></>
  return (
    <>
      <PageHeader title="Mis solicitudes" />
      <DataTable<CitizenRequest>
        columns={[
          { key: 'id', label: 'N°' },
          { key: 'subject', label: 'Asunto', render: (value, row) => <Link to={`/portal/requests/${row.id}`}>{String(value)}</Link> },
          { key: 'status', label: 'Estado', render: (value) => <StatusBadge value={String(value)} /> },
          { key: 'created_at', label: 'Fecha' }
        ]}
        rows={data}
      />
    </>
  )
}
