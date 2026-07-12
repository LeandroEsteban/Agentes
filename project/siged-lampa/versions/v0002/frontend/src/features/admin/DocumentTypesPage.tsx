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

interface DocumentType {
  id: number
  name: string
  code: string
  description?: string
  status: string
}

const schema = z.object({
  name: z.string().min(1, 'El nombre es requerido'),
  code: z.string().min(1, 'El código es requerido').max(20),
  description: z.string().optional()
})

type FormValues = z.infer<typeof schema>

export function DocumentTypesPage() {
  const [data, setData] = useState<DocumentType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [showCreate, setShowCreate] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', code: '', description: '' }
  })

  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    getResource<DocumentType[]>('API-013')
      .then((res) => setData(res.data))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { void load() }, [load])

  const submitCreate = form.handleSubmit(async (values) => {
    setError(undefined)
    try {
      await request<ApiEnvelope<DocumentType>>('/api/v1/document-types', {
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

  const columns: Column<DocumentType>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'code', label: 'Código' },
    { key: 'description', label: 'Descripción' },
    { key: 'status', label: 'Estado', render: (v) => <StatusBadge value={String(v)} /> }
  ]

  return (
    <>
      <PageHeader title="Tipos documentales" description="Catálogo de tipos de documentos" />
      <button onClick={() => setShowCreate(!showCreate)}>
        {showCreate ? 'Cancelar' : 'Nuevo tipo documental'}
      </button>

      {showCreate && (
        <DetailSection title="Nuevo tipo documental">
          <form onSubmit={submitCreate}>
            <FormField label="Nombre *" {...form.register('name')} error={form.formState.errors.name?.message} />
            <FormField label="Código *" {...form.register('code')} error={form.formState.errors.code?.message} />
            <FormField label="Descripción" {...form.register('description')} />
            <button disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creando...' : 'Crear tipo documental'}
            </button>
          </form>
        </DetailSection>
      )}

      {error && <ErrorState error={error} onRetry={load} />}
      {loading && <LoadingState />}
      {!loading && !error && !data.length && <EmptyState />}
      {!loading && !error && data.length > 0 && <DataTable columns={columns} rows={data} />}
    </>
  )
}
