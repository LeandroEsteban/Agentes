import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getResource } from '../../api/resources'
import { request } from '../../api/client'
import type { ApiEnvelope } from '../../api/types'
import { DataTable, StatusBadge } from '../../components/tables'
import { LoadingState, EmptyState, ErrorState, ConfirmDialog } from '../../components/feedback'
import { PageHeader, DetailSection, Timeline } from '../../components/domain'
import { FormField } from '../../components/forms'
import { useForm } from 'react-hook-form'
import { formatDate } from '../../utils/presentation'

interface Expedient {
  id: number
  code: string
  subject: string
  status: string
  department_name?: string
  created_at: string
  description?: string
  department_id?: number
  updated_at?: string
  closed_at?: string
}

interface EventItem {
  id: number
  type: string
  description: string
  created_at: string
  user_name?: string
}

interface DocumentRef {
  id: number
  title: string
  code?: string
  document_type_name?: string
  created_at: string
}

export function ExpedientDetailPage() {
  const { expedientId } = useParams<{ expedientId: string }>()
  const navigate = useNavigate()
  const [data, setData] = useState<Expedient | null>(null)
  const [documents] = useState<DocumentRef[]>([])
  const [events, setEvents] = useState<EventItem[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [showClose, setShowClose] = useState(false)
  const [activeTab, setActiveTab] = useState<'detail' | 'documents' | 'events' | 'history'>('detail')

  const load = useCallback(() => {
    if (!expedientId) return
    setLoading(true)
    setError(undefined)
    Promise.all([
      getResource<Expedient>('API-027', { expedientId }).then((r) => setData(r.data)),
      request<ApiEnvelope<EventItem[]>>(`/api/v1/expedients/${expedientId}/events`).then((r) => setEvents(r.data)).catch(() => {}),
      request<ApiEnvelope<string[]>>(`/api/v1/expedients/${expedientId}/history`).then((r) => setHistory(r.data)).catch(() => {})
    ]).catch((cause) => setError(cause as Error)).finally(() => setLoading(false))
  }, [expedientId])

  useEffect(() => { void load() }, [load])

  const form = useForm<{ subject: string; description: string }>({
    defaultValues: { subject: '', description: '' }
  })

  useEffect(() => {
    if (data) {
      form.reset({ subject: data.subject, description: data.description || '' })
    }
  }, [data, form])

  const submitEdit = form.handleSubmit(async (values) => {
    setError(undefined)
    try {
      await request<ApiEnvelope<Expedient>>(`/api/v1/expedients/${expedientId}`, {
        method: 'PATCH',
        body: { subject: values.subject, description: values.description || undefined }
      })
      void load()
    } catch (cause) {
      setError(cause as Error)
    }
  })

  const handleClose = async () => {
    setError(undefined)
    try {
      await request<ApiEnvelope<void>>(`/api/v1/expedients/${expedientId}/close`, { method: 'POST' })
      setShowClose(false)
      void load()
    } catch (cause) {
      setError(cause as Error)
    }
  }

  if (loading) return <><PageHeader title="Expediente" /><LoadingState /></>
  if (error) return <><PageHeader title="Expediente" /><ErrorState error={error} onRetry={load} /></>
  if (!data) return <><PageHeader title="Expediente" /><EmptyState /></>

  const docColumns = [
    { key: 'code' as const, label: 'Código' },
    { key: 'title' as const, label: 'Título' },
    { key: 'document_type_name' as const, label: 'Tipo' },
    { key: 'created_at' as const, label: 'Creado' }
  ]

  return (
    <>
       <PageHeader title={`Expediente ${data.code}`} description={data.subject} />
       <div className="page-actions"><button onClick={() => navigate('/intranet/expedients')}>Volver a expedientes</button></div>

      <div className="tabs">
        <button onClick={() => setActiveTab('detail')} className={activeTab === 'detail' ? 'active' : ''}>Detalle</button>
        <button onClick={() => setActiveTab('documents')} className={activeTab === 'documents' ? 'active' : ''}>Documentos</button>
        <button onClick={() => setActiveTab('events')} className={activeTab === 'events' ? 'active' : ''}>Eventos</button>
        <button onClick={() => setActiveTab('history')} className={activeTab === 'history' ? 'active' : ''}>Historial</button>
      </div>

      {activeTab === 'detail' && (
        <DetailSection title="Información del expediente">
          <dl className="metadata-grid"><div><dt>Código</dt><dd>{data.code}</dd></div><div><dt>Estado</dt><dd><StatusBadge value={data.status} /><span className="sr-only">{data.status}</span></dd></div><div><dt>Departamento</dt><dd>{data.department_name || '-'}</dd></div><div><dt>Creado</dt><dd>{formatDate(data.created_at)}</dd></div><div><dt>Actualizado</dt><dd>{formatDate(data.updated_at)}</dd></div>{data.closed_at && <div><dt>Cerrado</dt><dd>{formatDate(data.closed_at)}</dd></div>}<div><dt>Descripción</dt><dd>{data.description || '-'}</dd></div></dl>

          <form onSubmit={submitEdit}>
            <FormField label="Asunto *" {...form.register('subject', { required: true })}
              error={form.formState.errors.subject?.message} />
            <label className="field">
              Descripción
              <textarea {...form.register('description')} />
            </label>
            <button disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </form>

          {data.status !== 'closed' && (
            <button onClick={() => setShowClose(true)}>Cerrar expediente</button>
          )}
        </DetailSection>
      )}

      {activeTab === 'documents' && (
        <DetailSection title="Documentos">
          {documents.length === 0 ? <EmptyState message="Sin documentos asociados" /> : <DataTable columns={docColumns} rows={documents} />}
        </DetailSection>
      )}

      {activeTab === 'events' && (
        <DetailSection title="Eventos">
          {events.length === 0 ? <EmptyState message="Sin eventos registrados" /> : (
            <table><thead><tr><th>Tipo</th><th>Descripción</th><th>Usuario</th><th>Fecha</th></tr></thead><tbody>
              {events.map((e) => (
                <tr key={e.id}><td>{e.type}</td><td>{e.description}</td><td>{e.user_name || '-'}</td><td>{e.created_at}</td></tr>
              ))}
            </tbody></table>
          )}
        </DetailSection>
      )}

      {activeTab === 'history' && (
        <DetailSection title="Historial">
          {history.length === 0 ? <EmptyState /> : <Timeline items={history} />}
        </DetailSection>
      )}

      <ConfirmDialog
        open={showClose}
        title="Cerrar expediente"
        onConfirm={() => { void handleClose() }}
        onClose={() => setShowClose(false)}
      >
        <p>¿Está seguro de cerrar el expediente {data.code}?</p>
      </ConfirmDialog>
    </>
  )
}
