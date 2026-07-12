import { useCallback, useEffect, useState } from 'react'
import { getResource } from '../../api/resources'
import { request } from '../../api/client'
import type { ApiEnvelope } from '../../api/types'
import { DataTable, type Column } from '../../components/tables'
import { LoadingState, EmptyState, ErrorState } from '../../components/feedback'
import { PageHeader, DetailSection } from '../../components/domain'

interface Role {
  id: number
  name: string
  description?: string
  permission_count?: number
  permissions?: Record<string, string[]>
}

const moduleLabels: Record<string, string> = {
  documents: 'Documentos',
  expedients: 'Expedientes',
  correspondence: 'Correspondencia',
  oirs: 'OIRS',
  admin: 'Administración',
  reports: 'Reportes',
  users: 'Usuarios',
  roles: 'Roles',
  departments: 'Departamentos'
}

export function RolesPage() {
  const [data, setData] = useState<Role[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error>()
  const [editingRole, setEditingRole] = useState<Role | null>(null)
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([])
  const [saving, setSaving] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(undefined)
    getResource<Role[]>('API-009')
      .then((res) => setData(res.data))
      .catch((cause) => setError(cause as Error))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { void load() }, [load])

  const startEdit = (role: Role) => {
    setEditingRole(role)
    const perms: string[] = []
    if (role.permissions) {
      for (const modulePerms of Object.values(role.permissions)) {
        perms.push(...modulePerms)
      }
    }
    setSelectedPermissions(perms)
  }

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) =>
      prev.includes(perm) ? prev.filter((p) => p !== perm) : [...prev, perm]
    )
  }

  const savePermissions = async () => {
    if (!editingRole) return
    setSaving(true)
    setError(undefined)
    try {
      await request<ApiEnvelope<void>>(`/api/v1/roles/${editingRole.id}/permissions`, {
        method: 'PUT',
        body: { permissions: selectedPermissions }
      })
      setEditingRole(null)
      void load()
    } catch (cause) {
      setError(cause as Error)
    } finally {
      setSaving(false)
    }
  }

  const allPermissions = editingRole?.permissions || {}
  const moduleNames = Object.keys(allPermissions)

  const columns: Column<Role>[] = [
    { key: 'name', label: 'Nombre' },
    { key: 'description', label: 'Descripción' },
    { key: 'permission_count', label: 'Permisos' },
    { key: 'id', label: 'Acciones', render: (_v, row) => (
      <button onClick={() => startEdit(row)}>Editar permisos</button>
    )}
  ]

  return (
    <>
      <PageHeader title="Roles y permisos" description="Gestión de roles del sistema" />

      {editingRole && (
        <DetailSection title={`Permisos: ${editingRole.name}`}>
          {moduleNames.map((mod) => (
            <fieldset key={mod}>
              <legend>{moduleLabels[mod] || mod}</legend>
              {allPermissions[mod].map((perm) => (
                <label key={perm} className="checkbox">
                  <input
                    type="checkbox"
                    checked={selectedPermissions.includes(perm)}
                    onChange={() => togglePermission(perm)}
                  />
                  {perm}
                </label>
              ))}
            </fieldset>
          ))}
          <button disabled={saving} onClick={() => { void savePermissions() }}>
            {saving ? 'Guardando...' : 'Guardar permisos'}
          </button>
          <button onClick={() => setEditingRole(null)}>Cancelar</button>
        </DetailSection>
      )}

      {error && <ErrorState error={error} onRetry={load} />}
      {loading && <LoadingState />}
      {!loading && !error && !data.length && <EmptyState />}
      {!loading && !error && data.length > 0 && <DataTable columns={columns} rows={data} />}
    </>
  )
}
