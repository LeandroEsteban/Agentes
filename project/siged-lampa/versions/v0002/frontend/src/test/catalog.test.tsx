import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ConfirmDialog, EmptyState, ErrorState, LoadingState } from '../components/feedback';
import { Timeline } from '../components/domain';
import { DataTable, Pagination } from '../components/tables';
import { screenCatalog } from '../config/screen-catalog';

describe('catalogo de pantallas y rutas', () => {
  it('mapea las 30 pantallas documentadas sin rutas principales duplicadas', () => {
    expect(screenCatalog).toHaveLength(30);
    expect(new Set(screenCatalog.map((item) => item.route)).size).toBe(30);
    expect(screenCatalog.every((item) => item.allowed_actors.length > 0 && item.component)).toBe(true);
  });
  it('resuelve P-30 con ambas rutas canonicas', () => {
    const notifications = screenCatalog.find((item) => item.screen_code === 'P-30');
    expect(notifications?.route).toBe('/portal/notifications');
    expect(notifications?.additional_routes).toContain('/intranet/notifications');
  });
});
describe('componentes comunes', () => {
  it('muestra estados loading, empty y error accesibles', () => { render(<><LoadingState/><EmptyState/><ErrorState error={new Error('Fallo controlado')}/></>); expect(screen.getByRole('status')).toBeInTheDocument(); expect(screen.getByRole('alert')).toHaveTextContent('Fallo controlado'); });
  it('renderiza tabla, paginacion, timeline y dialogo', () => { render(<><DataTable rows={[{id:1,name:'Registro'}]} columns={[{key:'name',label:'Nombre'}]}/><Pagination page={1} pages={2} onChange={() => undefined}/><Timeline items={['Creado']}/><ConfirmDialog open title="Confirmar" onConfirm={() => undefined} onClose={() => undefined}>Accion</ConfirmDialog></>); expect(screen.getByRole('table')).toHaveTextContent('Registro'); expect(screen.getByRole('dialog')).toBeInTheDocument(); expect(screen.getByText('Creado')).toBeInTheDocument(); });
});
