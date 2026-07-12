import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { citizenRequestsApi, type CitizenRequestList } from '../../api/citizen-requests.api'
import { PageHeader } from '../../components/domain'
import { DataTable, DateCell, Pagination, StatusBadge } from '../../components/tables'
import { ErrorState, LoadingState, EmptyState } from '../../components/feedback'

export function CitizenRequestsPage() {
  const [data, setData] = useState<CitizenRequestList>({ items: [], page: 1, size: 20, total: 0 }); const [status, setStatus] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState<Error>()
  const load = (page = data.page) => { setLoading(true); setError(undefined); citizenRequestsApi.list({ page, size: data.size, status: status || undefined }).then(({ data: response }) => setData(response)).catch((cause) => setError(cause as Error)).finally(() => setLoading(false)) }
  useEffect(() => { void load(1) }, [status])
  const header = <PageHeader title="Mis solicitudes" description="Revise el estado y avance de sus trámites." />
  if (loading) return <>{header}<LoadingState /></>
  if (error) return <>{header}<ErrorState error={error} onRetry={() => load()} /></>
  if (!data.items.length) return <>{header}<EmptyState title="Aún no tienes solicitudes" message="Puedes revisar los trámites disponibles e iniciar una nueva solicitud." action={<Link className="button" to="/portal/procedures">Ver trámites</Link>} /></>
  return <>{header}<div className="filters"><label className="field">Estado<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">Todos los estados</option><option value="submitted">Ingresadas</option><option value="in_review">En revisión</option><option value="in_process">En proceso</option><option value="completed">Finalizadas</option><option value="rejected">Rechazadas</option><option value="cancelled">Canceladas</option></select></label>{status && <button type="button" onClick={() => setStatus('')}>Limpiar filtro</button>}</div><div className="page-actions"><span className="page-summary">{data.total} solicitud{data.total === 1 ? '' : 'es'} registrada{data.total === 1 ? '' : 's'}</span><Link className="button" to="/portal/procedures">Nuevo trámite</Link></div><DataTable columns={[{ key: 'tracking_code', label: 'Código', render: (value, row) => <Link to={`/portal/requests/${row.id}`}>{String(value)}</Link> }, { key: 'status', label: 'Estado', render: (value) => <StatusBadge value={String(value)} /> }, { key: 'submitted_at', label: 'Fecha de ingreso', render: (value) => <DateCell value={String(value)} /> }, { key: 'resolved_at', label: 'Resolución', render: (value) => <DateCell value={value ? String(value) : null} /> }, { key: 'id', label: 'Acción', render: (_, row) => <Link to={`/portal/requests/${row.id}`}>Ver detalle</Link> }]} rows={data.items} caption="Solicitudes ciudadanas" /><Pagination page={data.page} pages={Math.max(1, Math.ceil(data.total / data.size))} onChange={load} /></>
}
