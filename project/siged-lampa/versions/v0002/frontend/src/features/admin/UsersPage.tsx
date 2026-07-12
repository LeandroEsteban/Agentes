import { useCallback, useEffect, useState } from 'react'
import { getResource } from '../../api/resources'
import { request } from '../../api/client'
import type { ApiEnvelope } from '../../api/types'
import { DataTable, FilterBar, SearchInput, StatusBadge, TableActions, type Column } from '../../components/tables'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback'
import { PageHeader, DetailSection } from '../../components/domain'
import { FormField } from '../../components/forms'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface User {
  id: number
  full_name: string
  username: string
  email: string
  department_id?: number
  department_name?: string
  status: string
  roles?: string[]
}

interface Department {
  id: number
  code: string
  name: string
  description?: string
  status: string
}

interface Role {
  id: number
  name: string
  description?: string
  permission_count?: number
}

const schema = z.object({
  username: z.string().min(3, 'Mínimo 3 caracteres'),
  email: z.string().email('Correo inválido'),
  password: z.string().min(8, 'Mínimo 8 caracteres'),
  full_name: z.string().min(1, 'El nombre es requerido'),
  department_id: z.string().min(1, 'Seleccione un departamento'),
  role_ids: z.array(z.string()).optional()
})

type FormValues = z.infer<typeof schema>

export function UsersPage() {
  const [data, setData] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [showCreate, setShowCreate] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [search, setSearch] = useState('')

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '', full_name: '', department_id: '', role_ids: [] }
  })

  const editForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { username: '', email: '', password: '', full_name: '', department_id: '', role_ids: [] }
  })

  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    getResource<User[]>('API-006')
      .then((res) => setData(res.data))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    getResource<Department[]>('API-011').then((r) => setDepartments(r.data)).catch(() => {})
    getResource<Role[]>('API-009').then((r) => setRoles(r.data)).catch(() => {})
  }, [])

  const submitCreate = form.handleSubmit(async (values) => {
    setError(undefined)
    try {
      await request<ApiEnvelope<User>>('/api/v1/users', {
        method: 'POST',
        body: { ...values, department_id: Number(values.department_id), role_ids: values.role_ids?.map(Number) }
      })
      form.reset()
      setShowCreate(false)
      void load()
    } catch (cause) {
      setError(cause as Error)
    }
  })

  const submitEdit = editForm.handleSubmit(async (values) => {
    if (!editingId) return
    setError(undefined)
    try {
      await request<ApiEnvelope<User>>(`/api/v1/users/${editingId}`, {
        method: 'PUT',
        body: { ...values, department_id: Number(values.department_id), role_ids: values.role_ids?.map(Number) }
      })
      editForm.reset()
      setEditingId(null)
      void load()
    } catch (cause) {
      setError(cause as Error)
    }
  })

  const startEdit = (user: User) => {
    setEditingId(user.id)
    editForm.reset({
      username: user.username,
      email: user.email,
      password: '',
      full_name: user.full_name,
      department_id: String(user.department_id || ''),
      role_ids: []
    })
  }

  const columns: Column<User>[] = [
    { key: 'full_name', label: 'Nombre' },
    { key: 'username', label: 'Usuario' },
    { key: 'email', label: 'Correo' },
    { key: 'department_name', label: 'Departamento' },
    { key: 'status', label: 'Estado', render: (v) => <StatusBadge value={String(v)} /> },
    { key: 'roles', label: 'Roles', render: (_v, row) => <span>{row.roles?.join(', ') || '-'}</span> },
    { key: 'id', label: 'Acciones', render: (_v, row) => (
      <TableActions><button onClick={() => startEdit(row)}>Editar</button></TableActions>
    )}
  ]

  return (
    <>
      <PageHeader title="Usuarios" description="Gestión de cuentas, roles y departamentos del sistema." />
      <div className="page-actions"><span className="page-summary">{data.length} usuario{data.length === 1 ? '' : 's'} registrado{data.length === 1 ? '' : 's'}</span><button onClick={() => setShowCreate(!showCreate)}>
        {showCreate ? 'Cancelar' : 'Nuevo usuario'}
      </button></div><FilterBar><SearchInput value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nombre, usuario o correo" /><button type="button" onClick={() => setSearch('')}>Limpiar filtros</button></FilterBar>

      {showCreate && (
        <DetailSection title="Nuevo usuario">
          <form onSubmit={submitCreate}><div className="form-grid">
            <FormField label="Usuario *" {...form.register('username')} error={form.formState.errors.username?.message} />
            <FormField label="Correo *" type="email" {...form.register('email')} error={form.formState.errors.email?.message} />
            <FormField label="Contraseña *" type="password" {...form.register('password')} error={form.formState.errors.password?.message} />
            <FormField label="Nombre completo *" {...form.register('full_name')} error={form.formState.errors.full_name?.message} />
            <label className="field">Departamento *
              <select {...form.register('department_id')}>
                <option value="">Seleccione</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="field">Roles
              <select multiple {...form.register('role_ids')}>
                {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label></div>
            <button disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creando...' : 'Crear usuario'}
            </button>
          </form>
        </DetailSection>
      )}

      {editingId && (
        <DetailSection title="Editar usuario">
          <form onSubmit={submitEdit}><div className="form-grid">
            <FormField label="Usuario *" {...editForm.register('username')} error={editForm.formState.errors.username?.message} />
            <FormField label="Correo *" type="email" {...editForm.register('email')} error={editForm.formState.errors.email?.message} />
            <FormField label="Contraseña (dejar vacío para no cambiar)" type="password" {...editForm.register('password')} />
            <FormField label="Nombre completo *" {...editForm.register('full_name')} error={editForm.formState.errors.full_name?.message} />
            <label className="field">Departamento *
              <select {...editForm.register('department_id')}>
                <option value="">Seleccione</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label></div>
            <button disabled={editForm.formState.isSubmitting}>
              {editForm.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={() => { setEditingId(null); editForm.reset() }}>Cancelar</button>
          </form>
        </DetailSection>
      )}

      {error && <ErrorState error={error} onRetry={load} />}
      {loading && <LoadingState />}
       {!loading && !error && !data.length && <EmptyState title="No hay usuarios" message="No hay registros para mostrar." />}
       {!loading && !error && data.length > 0 && <DataTable columns={columns} rows={data.filter((user) => `${user.full_name} ${user.username} ${user.email}`.toLowerCase().includes(search.toLowerCase()))} caption="Usuarios del sistema" />}
    </>
  )
}
