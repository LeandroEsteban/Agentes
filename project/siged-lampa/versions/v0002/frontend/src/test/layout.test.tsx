import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import { AdminLayout, CitizenPortalLayout, IntranetLayout, PublicLayout } from '../components/layout';
import { NotFoundPage } from '../pages/shared';

const auth = { session: { token: 'test', actorType: 'internal' as const, user: { id: 1, full_name: 'QA User', permissions: ['admin.access'] } }, loading: false, signIn: vi.fn(), signOut: vi.fn() };
afterEach(cleanup);
const renderShell = (Layout: typeof IntranetLayout) => render(<AuthContext.Provider value={auth}><MemoryRouter><Routes><Route element={<Layout />}><Route index element={<p>Contenido</p>} /></Route></Routes></MemoryRouter></AuthContext.Provider>);

describe('authenticated layouts', () => {
  it('renders intranet identity and navigation', () => { renderShell(IntranetLayout); expect(screen.getByTestId('authenticated-user')).toHaveTextContent('QA User'); expect(screen.getByText('Documentos')).toBeInTheDocument(); expect(screen.queryByRole('link', { name: /SIGED Lampa/i })).not.toBeInTheDocument(); });
  it('renders citizen portal shell', () => { renderShell(CitizenPortalLayout); expect(screen.getByText('Portal ciudadano')).toBeInTheDocument(); });
  it('renders administration navigation', () => { renderShell(AdminLayout); expect(screen.getByText('Usuarios')).toBeInTheDocument(); });
  it('renders public navigation and linked brand', () => { render(<MemoryRouter><PublicLayout /></MemoryRouter>); expect(screen.getByRole('link', { name: 'Ingresar' })).toBeInTheDocument(); expect(screen.getByRole('link', { name: /SIGED Lampa/i })).toHaveAttribute('href', '/'); });
  it('confirma antes de cerrar sesión', async () => { renderShell(IntranetLayout); const user = userEvent.setup(); await user.click(screen.getByRole('button', { name: 'Cerrar sesión' })); expect(auth.signOut).not.toHaveBeenCalled(); await user.click(screen.getByRole('button', { name: 'Cancelar' })); expect(auth.signOut).not.toHaveBeenCalled(); await user.click(screen.getByRole('button', { name: 'Cerrar sesión' })); await user.click(screen.getAllByRole('button', { name: 'Cerrar sesión' })[1]); expect(auth.signOut).toHaveBeenCalledTimes(1); });
  it('renders not-found recovery link', () => { render(<MemoryRouter><NotFoundPage /></MemoryRouter>); expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeInTheDocument(); });
});
