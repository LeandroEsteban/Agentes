INSERT INTO departments (code, name, description, status) VALUES
    ('SECRETARIA', 'Secretaría Municipal', 'Secretaría general de la municipalidad', 'active'),
    ('RENTAS', 'Dirección de Rentas', 'Administración de rentas y patentes', 'active'),
    ('TRANSITO', 'Dirección de Tránsito', 'Licencias de conducir y tránsito', 'active'),
    ('JURIDICO', 'Asesoría Jurídica', 'Asesoría legal municipal', 'active'),
    ('OBRAS', 'Dirección de Obras', 'Permisos de edificación y obras', 'active'),
    ('SALUD', 'Dirección de Salud', 'Servicios de salud municipal', 'active'),
    ('EDUCACION', 'Dirección de Educación', 'Educación municipal', 'active'),
    ('DESARROLLO', 'Dirección de Desarrollo Comunitario', 'Desarrollo social y comunitario', 'active'),
    ('MEDIO_AMBIENTE', 'Dirección de Medio Ambiente', 'Gestión ambiental', 'active'),
    ('DEPORTES', 'Dirección de Deportes', 'Actividades deportivas', 'active'),
    ('CULTURA', 'Dirección de Cultura', 'Actividades culturales', 'active'),
    ('FINANZAS', 'Dirección de Finanzas', 'Gestión financiera municipal', 'active')
ON CONFLICT (code) DO NOTHING;

-- External entities
INSERT INTO external_entities (entity_type, name, tax_id, email, phone, contact_name) VALUES
    ('government', 'Gobierno Regional', '65.555.555-5', 'contacto@gore.gob.cl', '+56225551234', 'Secretaría GORE'),
    ('government', 'Contraloría General', '60.111.111-1', 'contacto@contraloria.cl', '+56225551235', 'Oficina de Partes'),
    ('company', 'Servicios Municipales Ltda.', '76.123.456-7', 'contacto@servicios.cl', '+56225551236', 'Juan Pérez'),
    ('person', 'María González', NULL, 'maria.gonzalez@email.com', '+56987654321', NULL),
    ('government', 'Subsecretaría de Desarrollo Regional', '61.222.222-2', 'contacto@subdere.gov.cl', '+56225551237', 'Mesa de Ayuda')
ON CONFLICT DO NOTHING;
