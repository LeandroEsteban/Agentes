import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(cleanup)
import { EmptyState, ErrorState, LoadingState, ConfirmDialog } from '../components/feedback'
import { PageHeader, DetailSection, MetricCard, Timeline, NotificationList, Breadcrumbs } from '../components/domain'
import { FormField, SelectField } from '../components/forms'
import { DataTable, Pagination, StatusBadge, SearchInput, FilterBar } from '../components/tables'

describe('componentes de feedback', () => {
  it('LoadingState muestra texto accesible', () => {
    render(<LoadingState />)
    expect(screen.getByRole('status')).toHaveTextContent('Cargando')
  })
  it('EmptyState muestra mensaje por defecto', () => {
    render(<EmptyState />)
    expect(screen.getByText('No hay registros para mostrar.')).toBeInTheDocument()
  })
  it('EmptyState muestra mensaje personalizado', () => {
    render(<EmptyState message="Sin datos" />)
    expect(screen.getByText('Sin datos')).toBeInTheDocument()
  })
  it('ErrorState muestra mensaje y boton retry', () => {
    const onRetry = vi.fn()
    render(<ErrorState error={new Error('Error de prueba')} onRetry={onRetry} />)
    expect(screen.getByRole('alert')).toHaveTextContent('Error de prueba')
    screen.getByRole('button', { name: 'Reintentar' }).click()
    expect(onRetry).toHaveBeenCalledOnce()
  })
  it('ConfirmDialog se renderiza solo cuando open es true', () => {
    const { rerender } = render(<ConfirmDialog open={false} title="Test" onConfirm={vi.fn()} onClose={vi.fn()}><p>Contenido</p></ConfirmDialog>)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    rerender(<ConfirmDialog open title="Test" onConfirm={vi.fn()} onClose={vi.fn()}><p>Contenido</p></ConfirmDialog>)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})

describe('componentes de dominio', () => {
  it('PageHeader renderiza titulo y descripcion', () => {
    render(<PageHeader title="Titulo" description="Descripcion" />)
    expect(screen.getByText('Titulo')).toBeInTheDocument()
    expect(screen.getByText('Descripcion')).toBeInTheDocument()
  })
  it('PageHeader renderiza solo titulo', () => {
    render(<PageHeader title="Solo titulo" />)
    expect(screen.getByText('Solo titulo')).toBeInTheDocument()
  })
  it('DetailSection renderiza titulo e hijos', () => {
    const { container } = render(<DetailSection title="Seccion"><p>Contenido</p></DetailSection>)
    expect(container.querySelector('.card h2')).toHaveTextContent('Seccion')
    expect(container.querySelector('.card p')).toHaveTextContent('Contenido')
  })
  it('MetricCard muestra label y value', () => {
    render(<MetricCard label="Documentos" value={42} />)
    expect(screen.getByText('42')).toBeInTheDocument()
    expect(screen.getByText('Documentos')).toBeInTheDocument()
  })
  it('Timeline renderiza items', () => {
    render(<Timeline items={['Paso 1', 'Paso 2']} />)
    expect(screen.getByText('Paso 1')).toBeInTheDocument()
    expect(screen.getByText('Paso 2')).toBeInTheDocument()
  })
  it('NotificationList renderiza items', () => {
    render(<NotificationList items={[{ id: 1, title: 'Notif', message: 'Msg', is_read: false }]} />)
    expect(screen.getByText('Notif')).toBeInTheDocument()
    expect(screen.getByText('Msg')).toBeInTheDocument()
    expect(screen.getByText('Sin leer')).toBeInTheDocument()
  })
  it('Breadcrumbs renderiza items', () => {
    render(<Breadcrumbs items={['Inicio', 'Seccion']} />)
    expect(screen.getByText('Inicio / Seccion')).toBeInTheDocument()
  })
})

describe('componentes de formularios', () => {
  it('FormField renderiza label e input', () => {
    render(<FormField label="Nombre" name="name" />)
    expect(screen.getByLabelText('Nombre')).toBeInTheDocument()
  })
  it('FormField muestra error', () => {
    render(<FormField label="Email" name="email" error="Campo requerido" />)
    expect(screen.getByText('Campo requerido')).toBeInTheDocument()
  })
  it('SelectField renderiza opciones', () => {
    render(<SelectField label="Tipo" name="type"><option value="a">A</option></SelectField>)
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument()
  })
})

describe('componentes de tabla', () => {
  it('DataTable renderiza columnas y filas', () => {
    const { container } = render(<DataTable columns={[{ key: 'name', label: 'Nombre' }]} rows={[{ id: 1, name: 'Item 1' } as { id: number; name: string }]} />)
    expect(container.querySelector('table')).toHaveTextContent('Item 1')
    expect(container.querySelector('th')).toHaveTextContent('Nombre')
  })
  it('DataTable muestra EmptyState cuando no hay filas', () => {
    const { container } = render(<DataTable columns={[{ key: 'name', label: 'Nombre' }]} rows={[]} />)
    expect(container.querySelector('.state')).toHaveTextContent('No hay registros para mostrar')
  })
  it('Pagination muestra estado actual', () => {
    render(<Pagination page={2} pages={5} onChange={vi.fn()} />)
    expect(screen.getByText('2 de 5')).toBeInTheDocument()
  })
  it('StatusBadge renderiza valor', () => {
    render(<StatusBadge value="activo" />)
    expect(screen.getByText('activo')).toBeInTheDocument()
  })
  it('SearchInput renderiza input de busqueda', () => {
    render(<SearchInput />)
    expect(screen.getByRole('searchbox')).toBeInTheDocument()
  })
  it('FilterBar renderiza hijos', () => {
    const { container } = render(<FilterBar><input /></FilterBar>)
    expect(container.querySelector('.filters')).toBeInTheDocument()
  })
})

describe('DataTable key warnings', () => {
  it('no produce console.error por keys duplicadas o faltantes', () => {
    const errors: string[] = []
    const origError = console.error
    console.error = (...args: string[]) => {
      if (args.some(a => typeof a === 'string' && a.includes('key'))) errors.push(args.join(' '))
      origError.apply(console, args)
    }
    try {
      const data = [
        { id: 1, name: 'Uno', status: 'A' },
        { id: 2, name: 'Dos', status: 'B' },
        { id: 3, name: 'Tres', status: 'C' },
      ] as { id: number; name: string; status: string }[]
      const cols = [
        { key: 'name' as const, label: 'Nombre' },
        { key: 'status' as const, label: 'Estado' },
      ]
      const { rerender } = render(<DataTable columns={cols} rows={data} />)
      expect(errors).toHaveLength(0)
      const moreData = [...data, { id: 4, name: 'Cuatro', status: 'D' }]
      rerender(<DataTable columns={cols} rows={moreData} />)
      expect(errors).toHaveLength(0)
      const reordered = [data[2], data[0], data[1]]
      rerender(<DataTable columns={cols} rows={reordered} />)
      expect(errors).toHaveLength(0)
      rerender(<DataTable columns={cols} rows={[data[0]]} />)
      expect(errors).toHaveLength(0)
    } finally {
      console.error = origError
    }
  })
})

describe('auth guards', () => {
  it('RequireAuth y guards se importan correctamente', async () => {
    const authModule = await import('../auth/require-auth')
    expect(authModule.RequireAuth).toBeDefined()
    const actorModule = await import('../auth/require-actor')
    expect(actorModule.RequireActor).toBeDefined()
    const permModule = await import('../auth/require-permission')
    expect(permModule.RequirePermission).toBeDefined()
    const useAuthModule = await import('../auth/use-auth')
    expect(useAuthModule.useAuth).toBeDefined()
  })
})
