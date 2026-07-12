import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { getResource, mutateResource } from '../../api/resources'
import { PageHeader } from '../../components/domain'
import { FormField } from '../../components/forms'
import { ErrorState, LoadingState, EmptyState } from '../../components/feedback'

const profileSchema = z.object({
  full_name: z.string().min(1, 'El nombre es requerido'),
  email: z.string().email('Ingrese un correo valido')
})

type ProfileForm = z.infer<typeof profileSchema>

export function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [saved, setSaved] = useState(false)
  const form = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: { full_name: '', email: '' }
  })
  const load = () => {
    setLoading(true)
    setError(undefined)
    getResource<ProfileForm>('API-004')
      .then((response) => {
        if (!response.data) return
        form.reset(response.data)
      })
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [])
  const submit = form.handleSubmit(async (values) => {
    setError(undefined)
    setSaved(false)
    try {
      await mutateResource('API-005', values)
      setSaved(true)
    } catch (cause) {
      setError(cause as Error)
    }
  })
  if (loading) return <LoadingState />
  if (error && !form.formState.isDirty) return <ErrorState error={error} onRetry={load} />
  if (!form.getValues().full_name && !form.getValues().email && !error) return <><PageHeader title="Mi perfil" /><EmptyState message="No hay informacion de perfil disponible." /></>
  return (
    <>
      <PageHeader title="Mi perfil" />
      <form onSubmit={submit}>
        <FormField
          label="Nombre completo"
          {...form.register('full_name')}
          error={form.formState.errors.full_name?.message}
        />
        <FormField
          label="Correo electronico"
          type="email"
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
        {error && <ErrorState error={error} />}
        {saved && <p role="status">Perfil actualizado correctamente</p>}
        <button disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>
    </>
  )
}
