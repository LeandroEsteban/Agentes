import { useCallback, useEffect, useState } from 'react'
import { getResource } from '../../api/resources'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback'
import { PageHeader, DetailSection, MetricCard } from '../../components/domain'
import { DataTable } from '../../components/tables'

interface DashboardData {
  documents_by_status?: Record<string, number>
  requests_by_status?: Record<string, number>
  correspondence_volume?: Record<string, number>
  total_documents?: number
  total_expedients?: number
  total_correspondence?: number
  total_users?: number
  [key: string]: unknown
}

export function ReportsPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()

  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    getResource<DashboardData>('API-039')
      .then((res) => setData(res.data))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { void load() }, [load])

  if (loading) return <><PageHeader title="Reportes" description="Dashboard de reportes" /><LoadingState /></>
   if (error) return <><PageHeader title="Reportes" description="Indicadores consolidados con datos operativos actuales." /><ErrorState error={error} onRetry={load} /></>
  if (!data) return <><PageHeader title="Reportes" /><EmptyState title="Sin indicadores disponibles" message="No hay registros para mostrar." /></>

  return (
    <>
       <PageHeader title="Reportes" description="Indicadores consolidados con datos operativos actuales." />

      <section className="metrics-grid">
        {data.total_documents !== undefined && <MetricCard label="Total documentos" value={data.total_documents} />}
        {data.total_expedients !== undefined && <MetricCard label="Total expedientes" value={data.total_expedients} />}
        {data.total_correspondence !== undefined && <MetricCard label="Total correspondencia" value={data.total_correspondence} />}
        {data.total_users !== undefined && <MetricCard label="Total usuarios" value={data.total_users} />}
      </section>

      {data.documents_by_status && Object.keys(data.documents_by_status).length > 0 && (
         <DetailSection title="Documentos por estado">
           <DataTable rows={Object.entries(data.documents_by_status).map(([status, count], id) => ({ id, status, count }))} columns={[{ key: 'status', label: 'Estado' }, { key: 'count', label: 'Cantidad' }]} />
        </DetailSection>
      )}

      {data.requests_by_status && Object.keys(data.requests_by_status).length > 0 && (
         <DetailSection title="Solicitudes por estado">
           <DataTable rows={Object.entries(data.requests_by_status).map(([status, count], id) => ({ id, status, count }))} columns={[{ key: 'status', label: 'Estado' }, { key: 'count', label: 'Cantidad' }]} />
        </DetailSection>
      )}

      {data.correspondence_volume && Object.keys(data.correspondence_volume).length > 0 && (
         <DetailSection title="Volumen de correspondencia">
           <DataTable rows={Object.entries(data.correspondence_volume).map(([period, count], id) => ({ id, period, count }))} columns={[{ key: 'period', label: 'Período' }, { key: 'count', label: 'Cantidad' }]} />
        </DetailSection>
      )}
    </>
  )
}
