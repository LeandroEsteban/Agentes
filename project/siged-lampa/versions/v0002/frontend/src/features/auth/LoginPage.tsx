import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { PageHeader } from '../../components/domain'
import { FormField } from '../../components/forms'
import { ErrorState } from '../../components/feedback'
import { useAuth } from '../../auth/use-auth'

export function LoginPage({ actor }: { actor: 'citizen' | 'internal' }) {
  const auth = useAuth()
  const [error, setError] = useState<Error>()
  const form = useForm<{ identifier: string; password: string }>({
    defaultValues: { identifier: '', password: '' }
  })
  const submit = form.handleSubmit(async (values) => {
    setError(undefined)
    try {
      await auth.signIn(actor, values.identifier, values.password)
      window.location.assign(actor === 'citizen' ? '/portal' : '/intranet')
    } catch (cause) {
      setError(cause as Error)
    }
  })
  return (
    <main className="login">
      <PageHeader title={actor === 'citizen' ? 'Acceso ciudadano' : 'Acceso intranet'} description={actor === 'citizen' ? 'Ingrese para revisar sus solicitudes y tramites.' : 'Acceso exclusivo para funcionarios municipales.'} />
      <form onSubmit={submit}>
        <FormField
          label={actor === 'citizen' ? 'Correo electronico' : 'Usuario'}
          {...form.register('identifier', { required: 'Ingrese su identificador' })}
          error={form.formState.errors.identifier?.message}
        />
        <FormField
          label="Contrasena"
          type="password"
          {...form.register('password', { required: 'Ingrese su contrasena', minLength: { value: 8, message: 'Minimo 8 caracteres' } })}
          error={form.formState.errors.password?.message}
        />
        {error && <ErrorState error={error} />}
        <button disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Ingresando...' : 'Ingresar'}
        </button>
        <p className="text-muted">{actor === 'citizen' ? <><Link to="/intranet/login">Soy funcionario municipal</Link> · <Link to="/recover">Recuperar acceso</Link></> : <><Link to="/login">Acceso ciudadano</Link> · <Link to="/recover">Recuperar acceso</Link></>}</p>
      </form>
    </main>
  )
}
