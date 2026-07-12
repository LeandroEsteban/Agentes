-- Demo admin user (password: admin123) - bcrypt hash
INSERT INTO users (department_id, username, email, password_hash, full_name, job_title, status)
SELECT d.id, 'admin', 'admin@lampa.cl',
    '$2b$10$A4qRigL.IFR5LnFjoXVEmeg0vFrxpwrQZ/vRN1lPCHltdzF114fhC',
    'Administrador SIGED', 'Administrador del Sistema', 'active'
FROM departments d WHERE d.code = 'SECRETARIA'
ON CONFLICT (username) DO NOTHING;

-- Dedicated QA workflow actors (password: reviewer123). These are seed data, not production identities.
INSERT INTO users (department_id, username, email, password_hash, full_name, job_title, status)
SELECT d.id, 'aprobador', 'aprobador@lampa.cl',
    '$2b$10$NkXKYnX8hEbMHZgvSYAzae1FAjOESkche1fFQE.NN1K6UXpBT2OOe',
    'Aprobador QA', 'Jefatura QA', 'active'
FROM departments d WHERE d.code = 'JURIDICO'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (department_id, username, email, password_hash, full_name, job_title, status)
SELECT d.id, 'firmante', 'firmante@lampa.cl',
    '$2b$10$NkXKYnX8hEbMHZgvSYAzae1FAjOESkche1fFQE.NN1K6UXpBT2OOe',
    'Firmante QA', 'Director QA', 'active'
FROM departments d WHERE d.code = 'JURIDICO'
ON CONFLICT (username) DO NOTHING;

INSERT INTO users (department_id, username, email, password_hash, full_name, job_title, status)
SELECT d.id, 'sinpermiso', 'sinpermiso@lampa.cl',
    '$2b$10$NkXKYnX8hEbMHZgvSYAzae1FAjOESkche1fFQE.NN1K6UXpBT2OOe',
    'Usuario QA sin permisos', 'Consulta QA', 'active'
FROM departments d WHERE d.code = 'JURIDICO'
ON CONFLICT (username) DO NOTHING;

-- Demo officer user (password: officer123)
INSERT INTO users (department_id, username, email, password_hash, full_name, job_title, status)
SELECT d.id, 'funcionario', 'funcionario@lampa.cl',
    '$2b$10$npNzJxsLf/bYd0bphY9AG.cnKqmD/Ov6lTmXC6D7gsZtgQYCh0452',
    'Funcionario Demo', 'Oficial Administrativo', 'active'
FROM departments d WHERE d.code = 'RENTAS'
ON CONFLICT (username) DO NOTHING;

-- Demo reviewer user (password: reviewer123)
INSERT INTO users (department_id, username, email, password_hash, full_name, job_title, status)
SELECT d.id, 'revisor', 'revisor@lampa.cl',
    '$2b$10$NkXKYnX8hEbMHZgvSYAzae1FAjOESkche1fFQE.NN1K6UXpBT2OOe',
    'Revisor Demo', 'Jefe de Gabinete', 'active'
FROM departments d WHERE d.code = 'JURIDICO'
ON CONFLICT (username) DO NOTHING;

-- Assign admin role to admin user
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'admin' AND r.code = 'admin'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'aprobador' AND r.code = 'reviewer'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'firmante' AND r.code = 'signer'
ON CONFLICT DO NOTHING;

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u, roles r
WHERE u.username = 'sinpermiso' AND r.code = 'viewer'
ON CONFLICT DO NOTHING;

INSERT INTO signature_profiles (user_id, display_name, position_label, provider)
SELECT u.id, 'Firma QA Academica', 'Director QA', 'simulated'
FROM users u WHERE u.username = 'firmante'
  AND NOT EXISTS (SELECT 1 FROM signature_profiles sp WHERE sp.user_id = u.id AND sp.provider = 'simulated');

-- Assign officer role to funcionario
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'funcionario' AND r.code = 'officer'
ON CONFLICT DO NOTHING;

-- Assign reviewer role to revisor
INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id
FROM users u, roles r
WHERE u.username = 'revisor' AND r.code = 'reviewer'
ON CONFLICT DO NOTHING;

-- Demo citizen account (password: ciudadano123)
INSERT INTO citizen_accounts (email, password_hash, status, email_verified_at)
VALUES ('ciudadano@email.com',
    '$2b$10$CHV6iCiezohzcGpt7T5EMOd0gh5HQ7.k5hPFQVcc4EFuLTaEoau/q',
    'active', now())
ON CONFLICT (email) DO NOTHING;

INSERT INTO citizen_profiles (citizen_account_id, national_id, full_name, phone, commune)
SELECT c.id, '12.345.678-9', 'Ciudadano Demo', '+56912345678', 'Lampa'
FROM citizen_accounts c WHERE c.email = 'ciudadano@email.com'
ON CONFLICT (citizen_account_id) DO NOTHING;

-- Published procedures for demo
INSERT INTO published_procedures (procedure_type_id, slug, title, instructions, requirements_html, published_by)
SELECT pt.id, 'certificado-residencia', 'Certificado de Residencia',
    'Solicite su certificado de residencia en línea. Complete el formulario con sus datos personales.',
    '<ul><li>Cédula de identidad vigente</li><li>Comprobante de domicilio</li></ul>',
    (SELECT u.id FROM users u WHERE u.username = 'admin')
FROM procedure_types pt WHERE pt.code = 'CERT_RESIDENCIA'
ON CONFLICT (slug) DO NOTHING;

INSERT INTO published_procedures (procedure_type_id, slug, title, instructions, requirements_html, published_by)
SELECT pt.id, 'licencia-conducir', 'Licencia de Conducir',
    'Trámite para obtener licencia de conducir. Debe rendir exámenes correspondientes.',
    '<ul><li>Cédula de identidad</li><li>Certificado de residencia</li><li>Comprobante de pago</li></ul>',
    (SELECT u.id FROM users u WHERE u.username = 'admin')
FROM procedure_types pt WHERE pt.code = 'LICENCIA_CONDUCIR'
ON CONFLICT (slug) DO NOTHING;
