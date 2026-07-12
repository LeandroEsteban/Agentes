import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getResource, mutateResource } from '../../api/resources'
import { DataTable, StatusBadge, Pagination, SearchInput, FilterBar, type Column } from '../../components/tables'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback'
import { PageHeader, DetailSection } from '../../components/domain'
import { FormField } from '../../components/forms'
import { useForm } from 'react-hook-form'

interface Expedient {
  id: number
  code: string
  subject: string
  status: string
  department_name?: string
  created_at: string
  description?: string
  department_id?: number
}

interface Department {
  id: number
  code: string
  name: string
  description?: string
  status: string
}

export function ExpedientsListPage() {
  const navigate = useNavigate()
  const [data, setData] = useState<Expedient[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [departments, setDepartments] = useState<Department[]>([])

  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    getResource<Expedient[]>('API-025', { page: String(page), size: '20', ...(search ? { search } : {}) })
      .then((res) => {
        setData(res.data)
        if (res.pagination) setPages(res.pagination.pages)
      })
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }, [page, search])

  useEffect(() => { void load() }, [load])

  useEffect(() => {
    getResource<Department[]>('API-011')
      .then((res) => setDepartments(res.data))
      .catch(() => {})
  }, [])

  const form = useForm<{ subject: string; department_id: string; description: string }>({
    defaultValues: { subject: '', department_id: '', description: '' }
  })

  const submitCreate = form.handleSubmit(async (values) => {
    setError(undefined)
    try {
      await mutateResource('API-026', {
        subject: values.subject,
        department_id: Number(values.department_id),
        description: values.description || undefined
      })
      form.reset()
      setShowCreate(false)
      void load()
    } catch (cause) {
      setError(cause as Error)
    }
  })

  const columns: Column<Expedient>[] = [
    { key: 'code', label: 'Código' },
    { key: 'subject', label: 'Asunto' },
    { key: 'status', label: 'Estado', render: (value) => <StatusBadge value={String(value)} /> },
    { key: 'department_name', label: 'Departamento' },
    { key: 'created_at', label: 'Creado' },
    { key: 'id', label: 'Acciones', render: (_v, row) => (
      <button onClick={(e) => { e.stopPropagation(); navigate(`/intranet/expedients/${row.id}`) }}>Ver</button>
    )}
  ]

  return (
    <>
      <PageHeader title="Expedientes" description="Bandeja de expedientes" />
      <FilterBar>
        <SearchInput value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
        <button onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? 'Cancelar' : 'Nuevo expediente'}
        </button>
      </FilterBar>

      {showCreate && (
        <DetailSection title="Nuevo expediente">
          <form onSubmit={submitCreate}>
            <FormField label="Asunto *" {...form.register('subject', { required: 'El asunto es requerido' })}
              error={form.formState.errors.subject?.message} />
            <label className="field">Departamento *
              <select {...form.register('department_id', { required: true })}>
                <option value="">Seleccione</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </label>
            <label className="field">
              Descripción
              <textarea {...form.register('description')} />
            </label>
            <button disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Creando...' : 'Crear expediente'}
            </button>
          </form>
        </DetailSection>
      )}

      {error && <ErrorState error={error} onRetry={load} />}
      {loading && <LoadingState />}
      {!loading && !error && !data.length && <EmptyState />}
      {!loading && !error && data.length > 0 && (
        <>
          <DataTable columns={columns} rows={data} />
          <Pagination page={page} pages={pages} onChange={setPage} />
        </>
      )}
    </>
  )
}
