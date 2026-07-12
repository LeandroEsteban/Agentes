export type DataMode = 'real' | 'mock' | 'hybrid';
export type Surface = 'public' | 'portal' | 'intranet' | 'admin' | 'shared';
export type Screen = { screen_code: string; name: string; route: string; additional_routes?: string[]; surface: Surface; allowed_actors: string[]; required_permissions: string[]; related_endpoints: string[]; component: string; data_mode: DataMode; implementation_status: 'implemented' | 'partial' | 'planned' };

export const screenCatalog: Screen[] = [
  ['P-01','Login intranet','/intranet/login','shared',['funcionario'],[],['POST /api/v1/auth/internal-login'],'LoginPage','real','implemented'],
  ['P-02','Login ciudadano','/login','public',['ciudadano'],[],['POST /api/v1/auth/citizen-login'],'LoginPage','real','implemented'],
  ['P-03','Recuperacion de acceso','/recover','shared',['usuario'],[],['POST /api/v1/auth/recover'],'RecoverPage','real','implemented'],
  ['P-04','Perfil de usuario','/intranet/profile','intranet',['funcionario'],[],['GET /api/v1/profile/me'],'ProfilePage','real','implemented'],
  ['P-05','Dashboard intranet','/intranet','intranet',['funcionario'],[],['GET /api/v1/reports/dashboard'],'DashboardPage','real','implemented'],
  ['P-06','Gestion de usuarios','/intranet/admin/users','admin',['administrador'],['admin.access'],['GET /api/v1/users'],'UsersPage','real','implemented'],
  ['P-07','Gestion de roles y permisos','/intranet/admin/roles','admin',['administrador'],['admin.access'],['GET /api/v1/roles'],'RolesPage','real','implemented'],
  ['P-08','Gestion de departamentos','/intranet/admin/departments','admin',['administrador'],['departments.view'],['GET /api/v1/departments'],'DepartmentsPage','real','implemented'],
  ['P-09','Tipos documentales','/intranet/admin/document-types','admin',['administrador'],['admin.access'],['GET /api/v1/document-types'],'DocumentTypesPage','real','implemented'],
  ['P-10','Tipos de tramites','/intranet/admin/procedure-types','admin',['administrador'],['tramites.edit'],['GET /api/v1/admin/procedure-types'],'ProcedureTypesPage','real','implemented'],
  ['P-11','Entidades externas','/intranet/admin/external-entities','admin',['administrador'],['admin.access'],['GET /api/v1/admin/external-entities'],'ExternalEntitiesPage','real','implemented'],
  ['P-12','Bandeja documental','/intranet/documents','intranet',['funcionario'],['documents.view'],['GET /api/v1/documents'],'DocumentsListPage','real','implemented'],
  ['P-13','Crear documento','/intranet/documents/new','intranet',['funcionario'],['documents.create'],['POST /api/v1/documents'],'DocumentCreatePage','real','implemented'],
  ['P-14','Detalle de documento','/intranet/documents/:documentId','intranet',['funcionario'],['documents.view'],['GET /api/v1/documents/:id'],'DocumentDetailPage','real','implemented'],
  ['P-15','Versiones y anexos','/intranet/documents/:documentId/versions','intranet',['funcionario'],['documents.view'],['GET /api/v1/documents/:id/versions'],'DocumentVersionsPage','real','implemented'],
  ['P-16','Revision pendiente','/intranet/reviews','intranet',['revisor'],['documents.review'],['GET /api/v1/reviews'],'ReviewsPage','real','implemented'],
  ['P-17','Flujo de aprobacion','/intranet/approvals','intranet',['jefatura'],['documents.approve'],['GET /api/v1/approvals'],'ApprovalsPage','real','implemented'],
  ['P-18','Firma academica simulada','/intranet/documents/:documentId/signature','intranet',['firmante'],['documents.sign'],['POST /api/v1/documents/:id/signature'],'SignaturePage','real','implemented'],
  ['P-19','Bandeja de expedientes','/intranet/expedients','intranet',['funcionario'],['expedients.view'],['GET /api/v1/expedients'],'ExpedientsListPage','real','implemented'],
  ['P-20','Detalle de expediente','/intranet/expedients/:expedientId','intranet',['funcionario'],['expedients.view'],['GET /api/v1/expedients/:id'],'ExpedientDetailPage','real','implemented'],
  ['P-21','Registro de correspondencia','/intranet/correspondence/new','intranet',['oficina de partes'],['correspondence.create'],['POST /api/v1/correspondence'],'CorrespondenceCreatePage','real','implemented'],
  ['P-22','Seguimiento de correspondencia','/intranet/correspondence','intranet',['funcionario'],['correspondence.view'],['GET /api/v1/correspondence'],'CorrespondenceListPage','real','implemented'],
  ['P-23','Portada publica','/','public',['ciudadano'],[],['GET /api/v1/public/tramites'],'HomePage','real','implemented'],
  ['P-24','Catalogo de tramites','/tramites','public',['ciudadano'],[],['GET /api/v1/public/tramites'],'ProceduresPage','real','implemented'],
  ['P-25','Formulario de tramite','/portal/requests/new/:procedureId','portal',['ciudadano'],[],['POST /api/v1/public/tramites/:id/requests'],'RequestFormPage','real','implemented'],
  ['P-26','Mis solicitudes','/portal/requests','portal',['ciudadano'],[],['GET /api/v1/citizen/requests'],'CitizenRequestsPage','real','implemented'],
  ['P-27','Ingreso OIRS','/oirs','public',['ciudadano'],[],['POST /api/v1/public/oirs'],'OirsPage','real','implemented'],
  ['P-28','Gestion de OIRS','/intranet/oirs','intranet',['operador OIRS'],['oirs.view'],['GET /api/v1/oirs'],'OirsManagementPage','real','implemented'],
  ['P-29','Dashboard de reportes','/intranet/reports','intranet',['analista'],['reports.view'],['GET /api/v1/reports/dashboard'],'ReportsPage','real','implemented'],
  ['P-30','Bandeja de notificaciones','/portal/notifications','portal',['usuario'],[],['GET /api/v1/notifications'],'NotificationsPage','real','implemented',['/intranet/notifications']]
].map(([screen_code,name,route,surface,allowed_actors,required_permissions,related_endpoints,component,data_mode,implementation_status,additional_routes]) => ({ screen_code, name, route, surface, allowed_actors, required_permissions, related_endpoints, component, data_mode, implementation_status, ...(additional_routes ? { additional_routes } : {}) } as Screen));

export const catalogByRoute = new Map(screenCatalog.flatMap((screen) => [[screen.route, screen] as const, ...(screen.additional_routes || []).map((route) => [route, { ...screen, route }] as const)]));
