-- Roles
INSERT INTO roles (code, name, description, is_system) VALUES
    ('admin', 'Administrador', 'Acceso completo al sistema', TRUE),
    ('officer', 'Funcionario', 'Gestión documental y trámites', TRUE),
    ('reviewer', 'Revisor', 'Revisión y aprobación de documentos', TRUE),
    ('signer', 'Firmante', 'Firma de documentos', TRUE),
    ('viewer', 'Consultor', 'Consulta de documentos y trámites', TRUE)
ON CONFLICT (code) DO NOTHING;

-- Permissions
INSERT INTO permissions (code, name, module_code, description) VALUES
    ('users.view', 'Ver usuarios', 'M01', 'Ver lista de usuarios'),
    ('users.create', 'Crear usuarios', 'M01', 'Crear nuevos usuarios'),
    ('users.edit', 'Editar usuarios', 'M01', 'Modificar datos de usuarios'),
    ('users.delete', 'Eliminar usuarios', 'M01', 'Eliminar usuarios'),
    ('roles.view', 'Ver roles', 'M01', 'Ver lista de roles'),
    ('roles.create', 'Crear roles', 'M01', 'Crear nuevos roles'),
    ('roles.edit', 'Editar roles', 'M01', 'Modificar roles'),
    ('roles.delete', 'Eliminar roles', 'M01', 'Eliminar roles'),
    ('documents.view', 'Ver documentos', 'M03', 'Ver lista de documentos'),
    ('documents.create', 'Crear documentos', 'M03', 'Crear nuevos documentos'),
    ('documents.edit', 'Editar documentos', 'M03', 'Editar documentos existentes'),
    ('documents.delete', 'Eliminar documentos', 'M03', 'Eliminar documentos'),
    ('documents.review', 'Revisar documentos', 'M04', 'Revisar y aprobar documentos'),
    ('documents.sign', 'Firmar documentos', 'M04', 'Firmar documentos'),
    ('expedients.view', 'Ver expedientes', 'M05', 'Ver lista de expedientes'),
    ('expedients.create', 'Crear expedientes', 'M05', 'Crear nuevos expedientes'),
    ('expedients.edit', 'Editar expedientes', 'M05', 'Modificar expedientes'),
    ('correspondence.view', 'Ver correspondencia', 'M06', 'Ver lista de correspondencia'),
    ('correspondence.create', 'Crear correspondencia', 'M06', 'Crear nueva correspondencia'),
    ('correspondence.edit', 'Editar correspondencia', 'M06', 'Modificar correspondencia'),
    ('tramites.view', 'Ver trámites', 'M07', 'Ver catálogo de trámites'),
    ('tramites.edit', 'Editar trámites', 'M07', 'Modificar trámites publicados'),
    ('oirs.view', 'Ver OIRS', 'M08', 'Ver casos OIRS'),
    ('oirs.respond', 'Responder OIRS', 'M08', 'Responder casos OIRS'),
    ('notifications.view', 'Ver notificaciones', 'M10', 'Ver notificaciones'),
    ('reports.view', 'Ver reportes', 'M09', 'Ver reportes y estadísticas'),
    ('departments.view', 'Ver departamentos', 'M02', 'Ver departamentos'),
    ('departments.edit', 'Editar departamentos', 'M02', 'Modificar departamentos'),
    ('admin.access', 'Acceso admin', 'M02', 'Acceso al panel de administración')
ON CONFLICT (code) DO NOTHING;

-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;

-- Officer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'officer'
  AND p.code IN ('documents.view', 'documents.create', 'documents.edit',
                 'expedients.view', 'expedients.create', 'expedients.edit',
                 'correspondence.view', 'correspondence.create', 'correspondence.edit',
                 'tramites.view', 'oirs.view', 'notifications.view',
                 'departments.view', 'users.view')
ON CONFLICT DO NOTHING;

-- Reviewer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'reviewer'
  AND p.code IN ('documents.view', 'documents.review',
                 'expedients.view',
                 'notifications.view')
ON CONFLICT DO NOTHING;

-- Signer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'signer'
  AND p.code IN ('documents.view', 'documents.sign',
                 'notifications.view')
ON CONFLICT DO NOTHING;

-- Viewer permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE r.code = 'viewer'
  AND p.code IN ('documents.view', 'expedients.view',
                 'tramites.view', 'notifications.view',
                 'departments.view', 'users.view')
ON CONFLICT DO NOTHING;
