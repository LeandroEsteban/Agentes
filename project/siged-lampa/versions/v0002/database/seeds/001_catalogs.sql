-- Document Statuses
INSERT INTO document_statuses (code, name, sort_order, is_terminal) VALUES
    ('draft', 'Borrador', 10, FALSE),
    ('in_revision', 'En Revisión', 20, FALSE),
    ('in_approval', 'En Aprobación', 30, FALSE),
    ('approved', 'Aprobado', 40, FALSE),
    ('signed', 'Firmado', 50, FALSE),
    ('published', 'Publicado', 60, TRUE),
    ('archived', 'Archivado', 70, TRUE),
    ('cancelled', 'Anulado', 80, TRUE)
ON CONFLICT (code) DO NOTHING;

-- Document Types
INSERT INTO document_types (code, name, description, retention_days, requires_signature) VALUES
    ('MEMO', 'Memorándum', 'Comunicación interna oficial', 365, TRUE),
    ('DECREE', 'Decreto', 'Normativa municipal', 1460, TRUE),
    ('RESOLUTION', 'Resolución', 'Acto administrativo', 1460, TRUE),
    ('REPORT', 'Informe', 'Reporte técnico o administrativo', 730, FALSE),
    ('CERTIFICATE', 'Certificado', 'Certificación oficial', 1095, TRUE),
    ('LETTER', 'Oficio', 'Comunicación externa oficial', 365, TRUE),
    ('MINUTES', 'Acta', 'Registro de reunión', 730, FALSE),
    ('FORM', 'Formulario', 'Formulario interno', 180, FALSE)
ON CONFLICT (code) DO NOTHING;

-- Procedure Types
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

-- OIRS Categories (seeded as lookup data within context)
-- We use a simple category approach: categories are seeded as data references
