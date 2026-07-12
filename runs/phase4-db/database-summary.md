# Database Report - SIGED-Lampa v0002 (Phase 4)

**Status**: PASS

## PostgreSQL
- Database: postgresql (PostgreSQL 16)
- Host: Docker (localhost:5432)
- Persistence Mode: postgres

## Schema
- Functional tables: 40
- Technical tables: 1 (schema_migrations)
- Primary Keys: 41 (40 functional + 1 technical)
- Foreign Keys: 80
- Unique Constraints: 20+
- Check Constraints: 362
- Indexes: 175

## Migrations
- Defined: 13
- Applied: 13
- Pending: 0

## Seeds
- Defined: 4
- Applied: 4

## Tests
- Database tests: 63 passed, 0 failed
- Full regression: 212 passed, 0 failed

## Gates
- GATE-DB-001 (Migrations): PASS
- GATE-DB-002 (Alcance): PASS
- GATE-DB-003 (Integridad): PASS
- GATE-DB-004 (Seeds): PASS
- GATE-DB-005 (Persistencia): PASS
- GATE-DB-006 (Trazabilidad): PASS
- GATE-DB-007 (QA): PASS
- GATE-DB-008 (Baseline): PASS

## Health
Status: healthy
