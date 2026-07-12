import { useCallback, useEffect, useState } from 'react'
import { getResource } from '../../api/resources'
import { request } from '../../api/client'
import type { ApiEnvelope } from '../../api/types'
import { DataTable, StatusBadge, TableActions, type Column } from '../../components/tables'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback'
import { PageHeader, DetailSection } from '../../components/domain'
import { FormField } from '../../components/forms'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface ProcedureType {
  id: number
  name: string
  code: string
  department_name?: string
  department_id?: number
  status: string
  requirements_html?: string
}

interface Department {
  id: number
  code: string
  name: string
  description?: string
  status: string
}

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido').max(20),
  department_id: z.string().min(1, 'Seleccione un departamento'),
  requirements_html: z.string().optional()
})

type FormValues = z.infer<typeof schema>

export function ProcedureTypesPage() {
  const [data, setData] = useState<ProcedureType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [departments, setDepartments] = useState<Department[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [editing, setEditing] = useState<ProcedureType | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', department_id: '', requirements_html: '' }
  })

  const editForm = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', department_id: '', requirements_html: '' }
  })

  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    getResource<ProcedureType[]>('API-SUP-001')
      .then((res) => setData(res.data))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    getResource<Department[]>('API-011').then((r) => setDepartments(r.data)).catch(() => {})
  }, [])

  const submitCreate = form.handleSubmit(async (values) => {
    setError(undefined)
    try {
      await request<ApiEnvelope<ProcedureType>>('/api/v1/admin/procedure-types', {
        method: 'POST',
        body: { ...values, department_id: Number(values.department_id) }
      })
      form.reset()
      setShowCreate(false)
      void load()
    } catch (cause) {
      setError(cause as Error)
    }
  })

  const startEdit = (item: ProcedureType) => {
    setEditing(item)
    editForm.reset({
      name: item.name,
      code: item.code,
      department_id: String(item.department_id || ''),
      requirements_html: item.requirements_html || ''
    })
  }

  const submitEdit = editForm.handleSubmit(async (values) => {
    if (!editing) return
    setError(undefined)
    try {
      await request<ApiEnvelope<ProcedureType>>(`/api/v1/admin/procedure-types/${editing.id}`, {
        method: 'PUT',
        body: { ...values, department_id: Number(values.department_id) }
      })
      editForm.reset()
      setEditing(null)
      void load()
    } catch (cause) {
      setError(cause as Error)
    }
  })

  const columns: Column<ProcedureType>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'code', label: 'Código' },
    { key: 'department_name', label: 'Departamento' },
    { key: 'status', label: 'Estado', render: (v) => <StatusBadge value={String(v)} /> },
    { key: 'id', label: 'Acciones', render: (_v, row) => (
      <TableActions><button onClick={() => startEdit(row)}>Editar</button></TableActions>
    )}
  ]

  return (
    <>
      <PageHeader title="Tipos de trámites" description="Catálogo de trámites y departamentos responsables." />
      <div className="page-actions"><span className="page-summary">{data.length} tipo{data.length === 1 ? '' : 's'} de trámite</span><button onClick={() => setShowCreate(!showCreate)}>
        {showCreate ? 'Cancelar' : 'Nuevo tipo de trámite'}
      </button></div>

      {showCreate && (
        <DetailSection title="Nuevo tipo de trámite">
          <form onSubmit={submitCreate}><div className="form-grid">
            <FormField label="Nombre *" {...form.register('name')} error={form.formState.errors.name?.message} />
            <FormField label="Código *" {...form.register('code')} error={form.formState.errors.code?.message} />
            <label className="field">Departamento *
              <select {...form.register('department_id')}>
                <option value="">Seleccione</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="field field-wide">
              Requisitos (HTML)
              <textarea {...form.register('requirements_html')} rows={4} />
            </label></div>
            <button disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creando...' : 'Crear tipo de trámite'}
            </button>
          </form>
        </DetailSection>
      )}

      {editing && (
        <DetailSection title={`Editar: ${editing.name}`}>
          <form onSubmit={submitEdit}><div className="form-grid">
            <FormField label="Nombre *" {...editForm.register('name')} error={editForm.formState.errors.name?.message} />
            <FormField label="Código *" {...editForm.register('code')} error={editForm.formState.errors.code?.message} />
            <label className="field">Departamento *
              <select {...editForm.register('department_id')}>
                <option value="">Seleccione</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="field field-wide">
              Requisitos (HTML)
              <textarea {...editForm.register('requirements_html')} rows={4} />
            </label></div>
            <button disabled={editForm.formState.isSubmitting}>
              {editForm.formState.isSubmitting ? 'Guardando...' : 'Guardar cambios'}
            </button>
            <button type="button" onClick={() => { setEditing(null); editForm.reset() }}>Cancelar</button>
          </form>
        </DetailSection>
      )}

      {error && <ErrorState error={error} onRetry={load} />}
      {loading && <LoadingState />}
       {!loading && !error && !data.length && <EmptyState title="No hay tipos de trámites" message="Cree un tipo para habilitar su gestión en línea." />}
       {!loading && !error && data.length > 0 && <DataTable columns={columns} rows={data} caption="Tipos de trámites" />}
    </>
  )
}
