import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { mutateResource } from '../../api/resources'
import { request } from '../../api/client'
import type { ApiEnvelope, ExternalEntity } from '../../api/types'
import { ErrorState } from '../../components/feedback'
import { PageHeader, DetailSection } from '../../components/domain'
import { FormField, SelectField } from '../../components/forms'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const schema = z.object({
  subject: z.string().min(1, 'El asunto es requerido'),
  direction: z.enum(['incoming', 'outgoing']),
  sender_name: z.string().min(1, 'El remitente es requerido'),
  recipient_name: z.string().min(1, 'El destinatario es requerido'),
  external_entity_id: z.string().optional(),
  description: z.string().optional(),
  due_date: z.string().optional()
})

type FormValues = z.infer<typeof schema>

export function CorrespondenceCreatePage() {
  const navigate = useNavigate()
  const [error, setError] = useState<Error>()
  const [success, setSuccess] = useState(false)
  const [entities, setEntities] = useState<ExternalEntity[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      subject: '',
      direction: 'incoming',
      sender_name: '',
      recipient_name: '',
      external_entity_id: '',
      description: '',
      due_date: ''
    }
  })

  useEffect(() => {
    request<ApiEnvelope<ExternalEntity[]>>('/api/v1/admin/external-entities')
      .then((res) => setEntities(res.data))
      .catch(() => {})
  }, [])

  const submit = form.handleSubmit(async (values) => {
    setError(undefined)
    setSuccess(false)
    try {
      await mutateResource('API-030', {
        subject: values.subject,
        direction: values.direction,
        sender_name: values.sender_name,
        recipient_name: values.recipient_name,
        external_entity_id: values.external_entity_id ? Number(values.external_entity_id) : undefined,
        description: values.description || undefined,
        due_date: values.due_date || undefined
      })
      setSuccess(true)
      form.reset()
      navigate('/intranet/correspondence')
    } catch (cause) {
      setError(cause as Error)
    }
  })

  return (
    <>
      <PageHeader title="Nueva correspondencia" description="Registro de correspondencia" />
      <DetailSection title="Formulario">
        <form onSubmit={submit}>
          <FormField label="Asunto *" {...form.register('subject')} error={form.formState.errors.subject?.message} />
          <SelectField label="Dirección *" {...form.register('direction')} error={form.formState.errors.direction?.message}>
            <option value="incoming">Entrada</option>
            <option value="outgoing">Salida</option>
          </SelectField>
          <FormField label="Remitente *" {...form.register('sender_name')} error={form.formState.errors.sender_name?.message} />
          <FormField label="Destinatario *" {...form.register('recipient_name')} error={form.formState.errors.recipient_name?.message} />
          <SelectField label="Entidad externa" {...form.register('external_entity_id')}>
            <option value="">Sin entidad</option>
            {entities.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </SelectField>
          <label className="field">
            Descripción
            <textarea {...form.register('description')} />
          </label>
          <FormField label="Fecha de vencimiento" type="date" {...form.register('due_date')} />
          <button disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? 'Guardando...' : 'Guardar correspondencia'}
          </button>
          {error && <ErrorState error={error} />}
          {success && <p role="status">Correspondencia creada correctamente.</p>}
        </form>
      </DetailSection>
    </>
  )
}
