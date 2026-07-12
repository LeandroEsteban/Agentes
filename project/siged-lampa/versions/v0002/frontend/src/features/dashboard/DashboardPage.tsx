import { useEffect, useState } from 'react'
import { getResource } from '../../api/resources'
import { PageHeader, MetricCard } from '../../components/domain'
import { ErrorState, LoadingState, EmptyState } from '../../components/feedback'

interface DashboardMetric {
  label: string
  value: string | number
}

export function DashboardPage() {
  const [data, setData] = useState<Record<string, string | number>>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const load = () => {
    setLoading(true)
    setError(undefined)
    getResource<Record<string, string | number>>('API-039')
      .then((response) => setData(response.data))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])
  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={load} />
  if (!data || !Object.keys(data).length) return <><PageHeader title="Dashboard" /><EmptyState message="No hay datos disponibles." /></>
  const metrics: DashboardMetric[] = Object.entries(data).filter(([, v]) => typeof v === 'number' || typeof v === 'string').map(([key, value]) => ({
    label: key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
    value
  }))
  return (
    <>
      <PageHeader title="Dashboard" description="Resumen de actividad" />
      <div className="metrics-grid">
        {metrics.map((metric, i) => (
          <MetricCard key={i} label={metric.label} value={metric.value} />
        ))}
      </div>
    </>
  )
}
