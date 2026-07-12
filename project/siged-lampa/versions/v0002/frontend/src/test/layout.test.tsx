import { cleanup, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AuthContext } from '../auth/auth-context';
import { AdminLayout, CitizenPortalLayout, IntranetLayout, PublicLayout } from '../components/layout';
import { NotFoundPage } from '../pages/shared';

const auth = { session: { token: 'test', actorType: 'internal' as const, user: { id: 1, full_name: 'QA User', permissions: ['admin.access'] } }, loading: false, signIn: vi.fn(), signOut: vi.fn() };
afterEach(cleanup);
const renderShell = (Layout: typeof IntranetLayout) => render(<AuthContext.Provider value={auth}><MemoryRouter><Routes><Route element={<Layout />}><Route index element={<p>Contenido</p>} /></Route></Routes></MemoryRouter></AuthContext.Provider>);

describe('authenticated layouts', () => {
  it('renders intranet identity and navigation', () => { renderShell(IntranetLayout); expect(screen.getByTestId('authenticated-user')).toHaveTextContent('QA User'); expect(screen.getByText('Documentos')).toBeInTheDocument(); });
  it('renders citizen portal shell', () => { renderShell(CitizenPortalLayout); expect(screen.getByText('Portal ciudadano')).toBeInTheDocument(); });
  it('renders administration navigation', () => { renderShell(AdminLayout); expect(screen.getByText('Usuarios')).toBeInTheDocument(); });
  it('renders public navigation', () => { render(<MemoryRouter><PublicLayout /></MemoryRouter>); expect(screen.getByRole('link', { name: 'Ingresar' })).toBeInTheDocument(); });
  it('renders not-found recovery link', () => { render(<MemoryRouter><NotFoundPage /></MemoryRouter>); expect(screen.getByRole('link', { name: 'Volver al inicio' })).toBeInTheDocument(); });
});
