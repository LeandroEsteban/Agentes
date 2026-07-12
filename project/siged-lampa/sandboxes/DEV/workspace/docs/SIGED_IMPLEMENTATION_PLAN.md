# SIGED-Lampa implementation plan

- Backend Node HTTP modular en `backend/src/server.js` con `POST /api/v1/auth/login`.
- Frontend SPA en `frontend/` con login como primera pantalla y consumo real de API.
- Migracion y seed en `db/migrations/001_initial.sql` y `db/seeds/001_demo.sql`.
- Preparacion EC2 mediante `Dockerfile`, `docker-compose.yml` y `.env.example`.
- Backlog, fuentes y trazabilidad quedan en `tasks/`, `sources/` y `data/`.

## Pendiente antes de produccion

1. Hashing real de passwords, JWT firmado y RBAC por endpoint.
2. Persistencia PostgreSQL usando `DATABASE_URL`.
3. Pruebas E2E por flujo critico antes de pasar DEV a QA.

## Cobertura derivada

- source_docs: 4
- modules: 10
- use_cases: 12
- endpoints: 40
- screens: 30
- er_tables: 40
