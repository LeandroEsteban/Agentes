import { useEffect, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/use-auth';

type NavItem = { to: string; label: string; icon: string };
type NavGroup = { label: string; items: NavItem[] };

const publicLinks: NavItem[] = [
  { to: '/tramites', label: 'Tramites', icon: 'bi-file-earmark-text' }, { to: '/noticias', label: 'Noticias', icon: 'bi-megaphone' }, { to: '/avisos', label: 'Avisos', icon: 'bi-info-circle' }, { to: '/calendario', label: 'Calendario', icon: 'bi-calendar3' }, { to: '/oirs', label: 'OIRS', icon: 'bi-chat-square-text' }
];
const portalGroups: NavGroup[] = [{ label: 'Mi portal', items: [{ to: '/portal', label: 'Inicio', icon: 'bi-grid-1x2' }, { to: '/portal/requests', label: 'Solicitudes', icon: 'bi-file-earmark-text' }, { to: '/portal/oirs', label: 'OIRS', icon: 'bi-chat-square-text' }, { to: '/portal/notifications', label: 'Notificaciones', icon: 'bi-bell' }, { to: '/portal/profile', label: 'Perfil', icon: 'bi-person' }] }];
const intranetGroups: NavGroup[] = [
  { label: 'General', items: [{ to: '/intranet', label: 'Inicio', icon: 'bi-grid-1x2-fill' }, { to: '/intranet/notifications', label: 'Notificaciones', icon: 'bi-bell' }] },
  { label: 'Gestion documental', items: [{ to: '/intranet/documents', label: 'Documentos', icon: 'bi-file-earmark-text' }, { to: '/intranet/expedients', label: 'Expedientes', icon: 'bi-folder2-open' }, { to: '/intranet/correspondence', label: 'Correspondencia', icon: 'bi-envelope-paper' }] },
  { label: 'Gestion municipal', items: [{ to: '/intranet/oirs', label: 'OIRS', icon: 'bi-chat-square-text' }, { to: '/intranet/reports', label: 'Reportes', icon: 'bi-bar-chart' }] }
];
const adminGroups: NavGroup[] = [...intranetGroups, { label: 'Administracion', items: [{ to: '/intranet/admin/users', label: 'Usuarios', icon: 'bi-people' }, { to: '/intranet/admin/roles', label: 'Roles', icon: 'bi-shield-check' }, { to: '/intranet/admin/departments', label: 'Departamentos', icon: 'bi-diagram-3' }, { to: '/intranet/admin/document-types', label: 'Tipos de documentos', icon: 'bi-tags' }, { to: '/intranet/admin/procedure-types', label: 'Tipos de tramites', icon: 'bi-list-check' }, { to: '/intranet/admin/external-entities', label: 'Entidades externas', icon: 'bi-building' }, { to: '/intranet/admin/public-content', label: 'Contenido publico', icon: 'bi-globe2' }] }];

function initials(value?: string) { return (value || 'Usuario').split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase(); }

function Shell({ title, groups }: { title: string; groups: NavGroup[] }) {
  const { session, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem('siged-sidebar') === 'collapsed');
  const [mobileOpen, setMobileOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => localStorage.getItem('siged-theme') === 'dark' ? 'dark' : 'light');
  const location = useLocation();
  const userName = session?.user.full_name || session?.user.email || session?.user.username || 'Usuario';
  useEffect(() => { document.documentElement.dataset.bsTheme = theme; localStorage.setItem('siged-theme', theme); }, [theme]);
  useEffect(() => { localStorage.setItem('siged-sidebar', collapsed ? 'collapsed' : 'expanded'); }, [collapsed]);
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);
  return <div className={`app-shell${mobileOpen ? ' is-menu-open' : ''}`}><div className={`shell${collapsed ? ' is-collapsed' : ''}`}>
    <aside className="app-sidebar" aria-label="Navegacion principal">
      <Link to="/" className="brand-lockup"><span className="brand-mark"><i className="bi bi-hexagon-fill" aria-hidden="true" /></span><span><strong>SIGED Lampa</strong><small>Municipalidad de Lampa</small></span></Link>
      <nav className="sidebar-nav">{groups.map((group) => <section className="nav-group" key={group.label}><div className="nav-group-title">{group.label}</div>{group.items.map((item) => <NavLink key={item.to} to={item.to} end={item.to === '/intranet' || item.to === '/portal'} className="nav-link"><i className={`bi ${item.icon}`} aria-hidden="true" /><span>{item.label}</span></NavLink>)}</section>)}</nav>
      <div className="sidebar-user"><span className="avatar" aria-hidden="true">{initials(userName)}</span><span className="user-meta"><strong data-testid="authenticated-user" data-actor={session?.actorType}>{userName}</strong><small>{session?.actorType === 'internal' ? 'Funcionario municipal' : 'Cuenta ciudadana'}</small></span><button className="icon-button" onClick={() => void signOut()} aria-label="Cerrar sesion" title="Cerrar sesion"><i className="bi bi-box-arrow-right" aria-hidden="true" /></button></div>
    </aside>
    <div className="shell-main"><header className="topbar"><button className="icon-button mobile-toggle" onClick={() => setMobileOpen((open) => !open)} aria-label="Abrir menu"><i className="bi bi-list" aria-hidden="true" /></button><button className="icon-button" onClick={() => setCollapsed((value) => !value)} aria-label="Contraer navegacion"><i className="bi bi-layout-sidebar-inset" aria-hidden="true" /></button><div className="topbar-title"><strong>{title}</strong><small>{location.pathname.split('/').filter(Boolean).join(' / ') || 'Inicio'}</small></div><label className="topbar-search"><span className="sr-only">Buscar</span><input type="search" placeholder="Buscar en SIGED" aria-label="Buscar en SIGED" /></label><div className="topbar-actions"><button className="icon-button" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label="Cambiar tema" title="Cambiar tema"><i className={`bi ${theme === 'light' ? 'bi-moon-stars' : 'bi-sun'}`} aria-hidden="true" /></button><NavLink className="avatar" to={session?.actorType === 'internal' ? '/intranet/profile' : '/portal/profile'} aria-label="Ir a mi perfil">{initials(userName)}</NavLink></div></header><main className="content-area"><Outlet /></main></div>
  </div></div>;
}

export function PublicLayout() { return <div className="public"><header><Link to="/" className="brand-lockup"><span className="brand-mark"><i className="bi bi-hexagon-fill" aria-hidden="true" /></span><span><strong>SIGED Lampa</strong><small>Municipalidad de Lampa</small></span></Link><nav aria-label="Navegacion publica">{publicLinks.map((link) => <NavLink key={link.to} to={link.to}>{link.label}</NavLink>)}<NavLink to="/login">Ingresar</NavLink></nav></header><main><Outlet /></main><footer>Municipalidad de Lampa · Gestion documental y tramites en linea</footer></div>; }
export const CitizenPortalLayout = () => <Shell title="Portal ciudadano" groups={portalGroups} />;
export const IntranetLayout = () => <Shell title="Intranet municipal" groups={intranetGroups} />;
export const AdminLayout = () => <Shell title="Administracion" groups={adminGroups} />;
