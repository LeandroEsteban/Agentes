-- Procedure types must be seeded after departments (003) and demo users (004).
INSERT INTO procedure_types (code, name, description, owner_department_id, requires_login, estimated_days)
SELECT 'LICENCIA_CONDUCIR', 'Licencia de Conducir', 'Trámite de licencia de conducir', d.id, TRUE, 15
FROM departments d WHERE d.code = 'TRANSITO'
ON CONFLICT (code) DO NOTHING;

INSERT INTO procedure_types (code, name, description, owner_department_id, requires_login, estimated_days)
SELECT 'PATENTE_COMERCIAL', 'Patente Comercial', 'Otorgamiento de patente comercial', d.id, TRUE, 20
FROM departments d WHERE d.code = 'RENTAS'
ON CONFLICT (code) DO NOTHING;

INSERT INTO procedure_types (code, name, description, owner_department_id, requires_login, estimated_days)
SELECT 'CERT_RESIDENCIA', 'Certificado de Residencia', 'Certificado de residencia municipal', d.id, FALSE, 5
FROM departments d WHERE d.code = 'SECRETARIA'
ON CONFLICT (code) DO NOTHING;

INSERT INTO procedure_types (code, name, description, owner_department_id, requires_login, estimated_days)
SELECT 'SOLICITUD_ANTECEDENTES', 'Solicitud de Antecedentes', 'Solicitud de antecedentes municipales', d.id, TRUE, 10
FROM departments d WHERE d.code = 'JURIDICO'
ON CONFLICT (code) DO NOTHING;

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
