import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { mutateResource } from '../../api/resources'
import { PageHeader } from '../../components/domain'
import { FormField } from '../../components/forms'
import { ErrorState } from '../../components/feedback'

const recoverSchema = z.object({
  email: z.string().email('Ingrese un correo electronico valido')
})

type RecoverForm = z.infer<typeof recoverSchema>

export function RecoverPage() {
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<Error>()
  const form = useForm<RecoverForm>({
    resolver: zodResolver(recoverSchema),
    defaultValues: { email: '' }
  })
  const submit = form.handleSubmit(async (values) => {
    setError(undefined)
    setSuccess(false)
    try {
      await mutateResource('API-003', values)
      setSuccess(true)
    } catch (cause) {
      setError(cause as Error)
    }
  })
  return (
    <>
      <PageHeader title="Recuperacion de acceso" description="Ingrese su correo electronico para restablecer su contrasena" />
      <form onSubmit={submit}>
        <FormField
          label="Correo electronico"
          type="email"
          {...form.register('email')}
          error={form.formState.errors.email?.message}
        />
        {error && <ErrorState error={error} />}
        {success && <p role="status">Si el correo esta registrado, recibira instrucciones</p>}
        <button disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Enviando...' : 'Enviar instrucciones'}
        </button>
      </form>
    </>
  )
}
