import { useCallback, useEffect, useState } from 'react'
import { getResource } from '../../api/resources'
import { request } from '../../api/client'
import type { ApiEnvelope } from '../../api/types'
import { DataTable, StatusBadge, type Column } from '../../components/tables'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback'
import { PageHeader, DetailSection } from '../../components/domain'
import { FormField } from '../../components/forms'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

interface Department {
  id: number
  code: string
  name: string
  description?: string
  status: string
}

const schema = z.object({
  code: z.string().min(1, 'El código es requerido').max(20),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional()
})

type FormValues = z.infer<typeof schema>

export function DepartmentsPage() {
  const [data, setData] = useState<Department[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [showCreate, setShowCreate] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { code: '', name: '', description: '' }
  })

  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    getResource<Department[]>('API-011')
      .then((res) => setData(res.data))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { void load() }, [load])

  const submitCreate = form.handleSubmit(async (values) => {
    setError(undefined)
    try {
      await request<ApiEnvelope<Department>>('/api/v1/departments', {
        method: 'POST',
        body: values
      })
      form.reset()
      setShowCreate(false)
      void load()
    } catch (cause) {
      setError(cause as Error)
    }
  })

  const columns: Column<Department>[] = [
    { key: 'code', label: 'Código' },
    { key: 'name', label: 'Nombre' },
    { key: 'description', label: 'Descripción' },
    { key: 'status', label: 'Estado', render: (v) => <StatusBadge value={String(v)} /> }
  ]

  return (
    <>
      <PageHeader title="Departamentos" description="Catálogo de unidades municipales responsables." />
      <div className="page-actions"><span className="page-summary">{data.length} departamento{data.length === 1 ? '' : 's'} registrado{data.length === 1 ? '' : 's'}</span><button onClick={() => setShowCreate(!showCreate)}>
        {showCreate ? 'Cancelar' : 'Nuevo departamento'}
      </button></div>

      {showCreate && (
        <DetailSection title="Nuevo departamento">
          <form onSubmit={submitCreate}><p className="section-copy">Agregue los antecedentes básicos de la unidad municipal.</p><div className="form-grid">
            <FormField label="Código *" {...form.register('code')} error={form.formState.errors.code?.message} />
            <FormField label="Nombre *" {...form.register('name')} error={form.formState.errors.name?.message} />
            <FormField label="Descripción" {...form.register('description')} /></div>
            <button disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creando...' : 'Crear departamento'}
            </button>
          </form>
        </DetailSection>
      )}

      {error && <ErrorState error={error} onRetry={load} />}
      {loading && <LoadingState />}
       {!loading && !error && !data.length && <EmptyState title="No hay departamentos" message="Aún no se han registrado unidades municipales." />}
       {!loading && !error && data.length > 0 && <DataTable columns={columns} rows={data} caption="Departamentos registrados" />}
    </>
  )
}
