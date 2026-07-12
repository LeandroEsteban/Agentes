import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { api } from '../api/endpoints'
import { getResource, mutateResource } from '../api/resources'
import type { Procedure } from '../api/types'
import { EmptyState, ErrorState, LoadingState } from '../components/feedback'
import { FormField } from '../components/forms'
import { DetailSection, NotificationList, PageHeader } from '../components/domain'
export { PublicOirsPage as OirsPage } from '../features/oirs-public/PublicOirsPage'

export { LoginPage } from '../features/auth/LoginPage'
export { RecoverPage } from '../features/auth/RecoverPage'
export { CitizenRequestsPage } from '../features/citizen-requests/CitizenRequestsPage'

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
