import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '../api/endpoints'
import { getResource, mutateResource } from '../api/resources'
import type { Procedure } from '../api/types'
import { EmptyState, ErrorState, LoadingState } from '../components/feedback'
import { FormField, SelectField } from '../components/forms'
import { DetailSection, NotificationList, PageHeader } from '../components/domain'
import { oirsApi, type OirsCase, type OirsMessage } from '../api/oirs.api'

export { LoginPage } from '../features/auth/LoginPage'
export { RecoverPage } from '../features/auth/RecoverPage'
export { CitizenRequestsPage } from '../features/citizen-requests/CitizenRequestsPage'

const oirsSchema = z.object({ category: z.string().min(1,'Seleccione un tipo'), subject: z.string().min(3,'Indique un asunto').max(300), body: z.string().min(20,'Describa su solicitud con al menos 20 caracteres').max(5000), name: z.string().min(1,'Indique su nombre'), email: z.string().email('Indique un correo valido'), consent: z.boolean().refine(Boolean, 'Debe aceptar el consentimiento') })
export function OirsPage() {
  const [created,setCreated] = useState<{ uuid: string; tracking_token: string; tracking_code: string }>()
  const [mode,setMode] = useState<'create'|'track'>('create')
  const [tracked,setTracked] = useState<OirsCase>()
  const [messages,setMessages] = useState<OirsMessage[]>([])
  const [tracking,setTracking] = useState('')
  const [caseId,setCaseId] = useState('')
  const [message,setMessage] = useState('')
  const [trackingLoading,setTrackingLoading] = useState(false)
  const [error,setError] = useState<Error>()
  const form = useForm<z.infer<typeof oirsSchema>>({resolver:zodResolver(oirsSchema),defaultValues:{category:'',subject:'',body:'',name:'',email:'',consent:false}})
  const submit = form.handleSubmit(async (data) => {
    setError(undefined)
    try {
      const result = await oirsApi.create(data)
      setCreated(result.data)
      form.reset()
    } catch (cause) {
      setError(cause as Error)
    }
  })
  const track = async (token = tracking) => {
    if (!token) { setError(new Error('Ingrese su codigo de seguimiento')); return }
    setTrackingLoading(true); setError(undefined)
    try {
      const id = created?.uuid || caseId
      if (!id) throw new Error('Ingrese el identificador publico del caso')
      const [detail, history] = await Promise.all([oirsApi.detail(id, token), oirsApi.history(id, token)])
      setTracked(detail.data); setMessages(history.data)
    } catch (cause) { setTracked(undefined); setMessages([]); setError(cause as Error) } finally { setTrackingLoading(false) }
  }
  const postMessage = async () => {
    if (!created || !message.trim()) { setError(new Error('Ingrese un mensaje')); return }
    try { const result = await oirsApi.postMessage(created.uuid, tracking, message); setMessages((items) => [...items, result.data]); setMessage('') } catch (cause) { setError(cause as Error) }
  }
  if (created) return <><PageHeader title="OIRS" /><p role="status">Tu solicitud OIRS fue registrada. Guarda este codigo de seguimiento para consultar su estado.</p><output data-testid="oirs-tracking-token">{created.tracking_token}</output><button onClick={() => navigator.clipboard?.writeText(created.tracking_token)}>Copiar codigo</button><button onClick={() => { setTracking(created.tracking_token); setCaseId(created.uuid); setMode('track'); track(created.tracking_token) }}>Consultar seguimiento</button>{mode === 'track' && <section aria-label="Seguimiento OIRS"><label>Identificador del caso<input aria-label="Identificador del caso" value={caseId} onChange={(event) => setCaseId(event.target.value)} /></label><label>Codigo de seguimiento<input aria-label="Codigo de seguimiento" value={tracking} onChange={(event) => setTracking(event.target.value)} /></label><button onClick={() => track()} disabled={trackingLoading}>{trackingLoading ? 'Consultando...' : 'Consultar'}</button>{tracked && <><p data-testid="oirs-status">Estado: {tracked.status}</p><p>{tracked.subject}</p><ul data-testid="oirs-messages">{messages.map((item) => <li key={item.id}>{item.body}</li>)}</ul><label>Nuevo mensaje<textarea aria-label="Nuevo mensaje" value={message} onChange={(event) => setMessage(event.target.value)} /></label><button onClick={postMessage} disabled={tracked.status === 'closed' || tracked.status === 'cancelled'}>Enviar mensaje</button></>}{error && <ErrorState error={error} />}</section>}</>
  return (
    <>
      <PageHeader title="Oficina de Informaciones, Reclamos y Sugerencias" />
      <form onSubmit={submit}>
        <SelectField label="Tipo de caso" {...form.register('category')} error={form.formState.errors.category?.message}>
          <option value="">Seleccione</option>
          <option value="consulta">Consulta</option>
          <option value="reclamo">Reclamo</option>
          <option value="sugerencia">Sugerencia</option>
          <option value="felicitacion">Felicitacion</option>
          <option value="solicitud">Solicitud</option>
        </SelectField>
        <FormField label="Asunto" {...form.register('subject')} error={form.formState.errors.subject?.message} />
        <label className="field">
          Descripcion
          <textarea {...form.register('body')} aria-invalid={Boolean(form.formState.errors.body)} />
          {form.formState.errors.body && <span role="alert">{form.formState.errors.body.message}</span>}
        </label>
        <FormField label="Nombre" {...form.register('name')} error={form.formState.errors.name?.message} />
        <FormField label="Correo electronico" type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
        <label><input type="checkbox" {...form.register('consent')} /> Acepto el tratamiento de mis datos para responder esta OIRS</label>
        <button disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enviando caso...' : 'Enviar caso'}
        </button>
        {error && <ErrorState error={error} />}
      </form>
    </>
  )
}
export function NotificationsPage() { const [data,setData] = useState<Array<{id:number;title:string;message:string;is_read:boolean}>>([]); const [error,setError] = useState<Error>(); const [loading,setLoading] = useState(true); const load = () => { setLoading(true); setError(undefined); api.notifications().then(({data: items}) => setData(items)).catch(setError).finally(() => setLoading(false)); }; useEffect(() => { void load(); }, []); if(error) return <><PageHeader title="Notificaciones" description="Avisos y actualizaciones de sus gestiones."/><ErrorState error={error} onRetry={load}/></>; if(loading) return <><PageHeader title="Notificaciones" description="Avisos y actualizaciones de sus gestiones."/><LoadingState/></>; return <><PageHeader title="Notificaciones" description="Avisos y actualizaciones de sus gestiones."/>{!data.length ? <EmptyState title="No tienes notificaciones nuevas" message="Cuando exista una novedad en sus tramites aparecera aqui."/> : <NotificationList items={data}/>}</>; }
const requestSchema = z.object({ subject: z.string().min(5,'El asunto debe tener al menos 5 caracteres').max(200), description: z.string().min(10,'Describa su solicitud con al menos 10 caracteres').max(2000) })
type RequestForm = z.infer<typeof requestSchema>
export function RequestFormPage() {
  const { procedureId = '' } = useParams()
  const navigate = useNavigate()
  const [procedure, setProcedure] = useState<Procedure>()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [sent, setSent] = useState(false)
  const form = useForm<RequestForm>({ resolver: zodResolver(requestSchema), defaultValues: { subject: '', description: '' } })
  const load = () => {
    setLoading(true)
    setError(undefined)
    getResource<Procedure>('API-SUP-055', { procedureId })
      .then((response) => setProcedure(response.data))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [procedureId])
  const submit = form.handleSubmit(async (values) => {
    setError(undefined)
    try {
      await mutateResource('API-034', { form_data: values, attachments: [] }, { procedureId })
      setSent(true)
      navigate('/portal/requests', { replace: true })
    } catch (cause) {
      setError(cause as Error)
    }
  })
  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={load} />
  if (!procedure) return <ErrorState error={new Error('Tramite no encontrado')} />
  return (
    <>
      <PageHeader title={procedure.title} description={procedure.department_name} />
      <DetailSection title="Instrucciones"><p>{procedure.instructions}</p></DetailSection>
      {procedure.requirements_html && <DetailSection title="Requisitos"><div dangerouslySetInnerHTML={{ __html: procedure.requirements_html }} /></DetailSection>}
      <form onSubmit={submit}><p className="section-copy">Complete los antecedentes requeridos. Podrá revisar el estado de su solicitud desde el portal ciudadano.</p>
        <FormField label="Asunto" {...form.register('subject')} error={form.formState.errors.subject?.message} />
        <label className="field">
          Descripcion
          <textarea {...form.register('description')} aria-invalid={Boolean(form.formState.errors.description)} />
          {form.formState.errors.description && <span role="alert">{form.formState.errors.description.message}</span>}
        </label>
        {error && <ErrorState error={error} />}
        {sent && <p role="status">Solicitud enviada correctamente</p>}
        <button disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enviando...' : 'Enviar solicitud'}
        </button>
      </form>
    </>
  )
}
