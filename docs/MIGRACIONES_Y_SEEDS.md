# Migraciones y Seeds - SIGED-Lampa v0002

## Migraciones

### Orden de ejecución

| # | Archivo | Tablas | Dependencias |
|---|---------|--------|--------------|
| 001 | extensions.sql | schema_migrations | - |
| 002 | organization.sql | departments, external_entities | - |
| 003 | security.sql | users, roles, permissions, user_roles, role_permissions, sessions, two_factor_settings | 002 |
| 004 | document_catalogs.sql | document_types, document_templates, document_statuses | - |
| 005 | documents.sql | documents, document_versions, document_attachments | 003, 004 |
| 006 | document_workflows.sql | document_comments, document_review_requests, document_review_responses, document_approvals, document_signatures, signature_profiles | 005 |
| 007 | expedients.sql | expedients, expedient_documents, expedient_events | 003, 005 |
| 008 | correspondence.sql | correspondence, correspondence_recipients, correspondence_routes | 003, 005 |
| 009 | citizen_portal.sql | citizen_accounts, citizen_profiles, procedure_types, published_procedures, citizen_requests, citizen_request_attachments | 003, 007 |
| 010 | oirs.sql | oirs_cases, oirs_messages | 009 |
| 011 | public_content.sql | news_posts, public_notices, calendar_events | 003 |
| 012 | notifications_audit.sql | notifications, audit_events | 003, 009 |
| 013 | deferred_foreign_keys.sql | (migra FK circulares) | 003, 005 |

### Mecanismo

- Runner Node.js con `pg`
- Checksum SHA-256 de cada archivo de migración
- Previene modificación de migración aplicada
- Ejecución transaccional (BEGIN/COMMIT/ROLLBACK)
- Registro duración + resultado en schema_migrations
- Migración fallida revierte transacción

### Idempotencia

Las migraciones no usan IF NOT EXISTS en cada tabla.
El runner detecta qué migraciones están aplicadas mediante schema_migrations y solo ejecuta pendientes.

## Seeds

| Archivo | Contenido |
|---------|-----------|
| 001_catalogs.sql | Estados documentales, tipos documentales, tipos de trámite |
| 002_roles_permissions.sql | Roles (admin, officer, reviewer, signer, viewer), permisos, relaciones |
| 003_departments.sql | 12 departamentos municipales + 5 entidades externas |
| 004_demo_data.sql | Usuarios demo (admin, funcionario, revisor), cuenta ciudadana, trámites publicados |

### Características

- Reproducibles: usan `ON CONFLICT DO NOTHING`
- Sin secretos productivos: contraseñas demo con prefijo DEMO_
- Contraseñas hasheadas con bcrypt
- Configurables mediante .env.example
