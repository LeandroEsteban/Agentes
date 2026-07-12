# SIGED-Lampa Database Layer (v0002)

## Overview

PostgreSQL 16 implementation with 40 functional tables across 9 domains.

## Domains

| Domain | Tables | Description |
|--------|--------|-------------|
| Organization | 2 | departments, external_entities |
| Security | 7 | users, roles, permissions, user_roles, role_permissions, sessions, two_factor_settings |
| Document Catalogs | 3 | document_types, document_templates, document_statuses |
| Document Management | 9 | documents, document_versions, document_attachments, document_comments, document_review_requests, document_review_responses, document_approvals, document_signatures, signature_profiles |
| Expedients | 3 | expedients, expedient_documents, expedient_events |
| Correspondence | 3 | correspondence, correspondence_recipients, correspondence_routes |
| Citizen Portal | 6 | citizen_accounts, citizen_profiles, procedure_types, published_procedures, citizen_requests, citizen_request_attachments |
| OIRS | 2 | oirs_cases, oirs_messages |
| Public Content | 3 | news_posts, public_notices, calendar_events |
| Notifications & Audit | 2 | notifications, audit_events |

**Total: 40 functional tables + 1 technical table (schema_migrations)**

## Dependencies

- Node.js 20+
- PostgreSQL 16+
- `npm install pg`

## Quick Start (DEV)

```bash
docker compose -f docker-compose.dev.yml up -d
node database/scripts/migrate.js
node database/scripts/seed.js
```

## Quick Start (QA)

```bash
docker compose -f docker-compose.qa.yml up -d
# Migrations and seeds run automatically via migrator service
```

## Migration Order

1. 001_extensions.sql (pgcrypto, schema_migrations table)
2. 002_organization.sql (departments, external_entities)
3. 003_security.sql (users, roles, permissions, etc.)
4. 004_document_catalogs.sql (document_types, document_templates, document_statuses)
5. 005_documents.sql (documents, document_versions, document_attachments)
6. 006_document_workflows.sql (comments, reviews, approvals, signatures)
7. 007_expedients.sql (expedients, expedient_documents, expedient_events)
8. 008_correspondence.sql (correspondence, recipients, routes)
9. 009_citizen_portal.sql (citizen accounts, profiles, procedures, requests)
10. 010_oirs.sql (OIRS cases and messages)
11. 011_public_content.sql (news, notices, calendar)
12. 012_notifications_audit.sql (notifications, audit)
13. 013_deferred_foreign_keys.sql (circular FK resolution)

## Circular Dependency Resolution

ADR-010 (departments-users) and ADR-011 (documents-versions) resolved by deferred FK creation:

1. Create departments without manager_user_id FK
2. Create users with department_id FK
3. Create documents without current_version_id FK
4. Create document_versions with document_id FK
5. Migration 013 adds: manager_user_id FK, current_version_id FK, previous_version_id FK
