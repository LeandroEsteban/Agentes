# Plan de Implementación — SIGED-Lampa v0002

## 1. Objetivo

Implementar la totalidad de los módulos funcionales de SIGED-Lampa versión v0002, materializando un prototipo web full-stack completamente funcional en el sandbox DEV aislado. La implementación cubre frontend (vanilla JavaScript), backend (Node HTTP con persistencia en memoria), modelo de datos (40 tablas SQL), sistema de autorización (RBAC simulado) y trazabilidad completa.

## 2. Alcance

| Dimensión | Cantidad |
|-----------|----------|
| Módulos funcionales | 10 (M01–M10) |
| Actores del sistema | 9 |
| Casos de uso | 12 (UC-01 a UC-12) |
| Workflows críticos | 5 (FLOW-DOC, FLOW-EXP, FLOW-COR, FLOW-CIU, FLOW-OIRS) |
| Pantallas | 30 (P-01 a P-30) |
| Endpoints API | 40+ (API-001 a API-046) |
| Tablas de base de datos | 40 |
| Reglas de negocio | 60 (BR-001 a BR-060) |
| Validaciones | 100 |

## 3. Exclusiones

Quedan fuera del alcance de v0002 los siguientes ítems, planificados para fases posteriores:

- **PostgreSQL real** (planificado fase 4): la persistencia actual es en memoria (`ADR-014`). Las migraciones SQL se generan como especificación, no se ejecutan contra una base de datos real.
- **React** (planificado fase 6): el frontend actual es vanilla JavaScript (`ADR-013`). React queda definido como target arquitectónico para v0003+.
- **Despliegue EC2** (planificado fase 8): la fábrica no despliega en ningún entorno externo. Toda materialización ocurre en el sandbox DEV local.
- **CI/CD pipeline**: no hay integración continua ni despliegue continuo. La fábrica opera como herramienta de escritorio local.
- **Integraciones externas reales**: Clave Única, FirmaGob, SII, autenticación institucional son simulaciones académicas (`ADR-015`).

## 4. Decisiones Arquitectónicas

Se aceptan las siguientes 16 decisiones arquitectónicas (ADR-001 a ADR-016):

| ID | Título | Fase de implementación |
|----|--------|----------------------|
| ADR-001 | Ruta canónica de notificaciones | Incremento D |
| ADR-002 | Administración de tipos de trámite | Incremento D |
| ADR-003 | Administración de entidades externas | Incremento D |
| ADR-004 | Login ciudadano | Incremento A |
| ADR-005 | Creación de solicitud ciudadana | Incremento D |
| ADR-006 | Anexos asociados a versiones | Incremento B |
| ADR-007 | Referencia a versión anterior | Incremento B |
| ADR-008 | Numeración documental | Incremento B |
| ADR-009 | OIRS anónima | Incremento D |
| ADR-010 | Relación circular usuarios-departamentos | Incremento A |
| ADR-011 | Relación circular documentos-versiones | Incremento B |
| ADR-012 | Cantidad de actores (9) | Base |
| ADR-013 | Frontend objetivo (vanilla JS → React) | Base |
| ADR-014 | Persistencia (memoria → PostgreSQL) | Base |
| ADR-015 | Autenticación e integraciones externas (simulación) | Base |
| ADR-016 | Conteo de endpoints (>40) | Base |

## 5. Orden de Implementación — Incrementos Verticales

### Incremento A: Plataforma y Seguridad

**Prioridad: crítica**

Base de todo el sistema. Sin autenticación, roles y auditoría, ningún otro módulo puede operar.

| Tarea | Descripción | Dependencias |
|-------|-------------|-------------|
| TASK-DB-SECURITY-001 | Migración tabla `users` | TASK-ARCH-008 |
| TASK-DB-SECURITY-002 | Migración `roles`, `permissions`, `role_permissions` | TASK-ARCH-008 |
| TASK-DB-SECURITY-003 | Migración tabla `departments` | TASK-ARCH-008 |
| TASK-DB-SECURITY-004 | FK `manager_user_id` en departments (ADR-010) | TASK-DB-SECURITY-001, 003 |
| TASK-API-AUTH-001 | `POST /api/v1/auth/login` (API-001) | TASK-DB-SECURITY-001, 002 |
| TASK-API-AUTH-002 | `POST /api/v1/auth/citizen-login` (API-002, ADR-004) | TASK-API-AUTH-001 |
| TASK-API-SECURITY-001 | Middleware RBAC (JWT + roles) | TASK-API-AUTH-001 |
| TASK-API-AUDIT-001 | Middleware auditoría (POST/PUT/DELETE log) | TASK-API-SECURITY-001, TASK-DB-AUDIT-001 |
| TASK-UI-AUTH-001 | Pantallas login interno (P-01), ciudadano (P-02), recuperación (P-03) | TASK-ARCH-008 |
| TASK-UI-ADMIN-001 | Pantallas admin (P-06 a P-11) | TASK-UI-AUTH-001 |

### Incremento B: Documentos

**Prioridad: alta**

Núcleo documental del sistema. Versiones, anexos y numeración según ADR-006, 007, 008.

| Tarea | Descripción | Dependencias |
|-------|-------------|-------------|
| TASK-DB-DOCUMENTS-001 | Migración `document_types` | TASK-ARCH-008 |
| TASK-DB-DOCUMENTS-002 | Migración `documents` (FK a document_types) | TASK-DB-DOCUMENTS-001 |
| TASK-DB-DOCUMENTS-003 | Migración `document_versions` (FK a documents) | TASK-DB-DOCUMENTS-002 |
| TASK-DB-DOCUMENTS-004 | Add `document_version_id` a attachments (ADR-006) | TASK-DB-DOCUMENTS-003 |
| TASK-DB-DOCUMENTS-005 | Add `previous_version_id` a versions (ADR-007) | TASK-DB-DOCUMENTS-003 |
| TASK-DB-DOCUMENTS-006 | UNIQUE(document_type_id, number) (ADR-008) | TASK-DB-DOCUMENTS-002 |
| TASK-API-DOCUMENTS-001 | CRUD documentos (API-015 a 020) | TASK-API-AUTH-001 |
| TASK-UI-DOCUMENTS-001 | Pantallas documentos (P-12 a P-15) | TASK-UI-AUTH-001 |

### Incremento C: Expedientes y Correspondencia

**Prioridad: alta**

Gestión de expedientes (M05) y correspondencia (M06).

| Tarea | Descripción | Dependencias |
|-------|-------------|-------------|
| TASK-DB-EXPEDIENT-001 | Migración `expedients` (FK a departments) | TASK-DB-SECURITY-003 |
| TASK-DB-EXPEDIENT-002 | Migración `expedient_documents` (junction) | TASK-DB-EXPEDIENT-001, TASK-DB-DOCUMENTS-002 |
| TASK-DB-CORRESPONDENCE-001 | Migración `correspondence` | TASK-DB-SECURITY-001, TASK-DB-DOCUMENTS-002 |
| TASK-DB-CORRESPONDENCE-002 | Migración `correspondence_routes` | TASK-DB-CORRESPONDENCE-001 |
| TASK-API-EXPEDIENT-001 | CRUD expedientes (API-025 a 028) | TASK-API-AUTH-001 |
| TASK-API-CORRESPONDENCE-001 | CRUD correspondencia (API-029 a 032) | TASK-API-AUTH-001 |
| TASK-UI-EXPEDIENT-001 | Pantallas expedientes (P-19, P-20) | TASK-UI-AUTH-001 |
| TASK-UI-CORRESPONDENCE-001 | Pantallas correspondencia (P-21, P-22) | TASK-UI-AUTH-001 |

### Incremento D: Portal y OIRS

**Prioridad: alta**

Portal ciudadano (M07) y OIRS (M08) con soporte para solicitudes anónimas (ADR-009) y endpoints administrativos adicionales (ADR-002, ADR-003).

| Tarea | Descripción | Dependencias |
|-------|-------------|-------------|
| TASK-DB-PORTAL-001 | Migración `tramites` (FK a departments) | TASK-DB-SECURITY-003 |
| TASK-DB-PORTAL-002 | Migración `citizen_requests` (FK a tramites) | TASK-DB-PORTAL-001 |
| TASK-DB-OIRS-001 | Migración `oirs_cases` con contact fields (ADR-009) | TASK-DB-SECURITY-001 |
| TASK-API-PORTAL-001 | Portal endpoints (API-033 a 036, ADR-005) | TASK-API-AUTH-002 |
| TASK-API-OIRS-001 | OIRS endpoints (API-037, 038, ADR-009) | TASK-API-AUTH-001 |
| TASK-API-ADMIN-001 | `GET/POST/PUT /admin/procedure-types` (ADR-002) | TASK-API-AUTH-001, TASK-DB-PORTAL-001 |
| TASK-API-ADMIN-002 | `GET/POST/PUT /admin/external-entities` (ADR-003) | TASK-API-AUTH-001 |
| TASK-UI-PORTAL-001 | Pantallas portal (P-23 a P-26) | TASK-UI-AUTH-001 |
| TASK-UI-OIRS-001 | Pantallas OIRS (P-27, P-28, ADR-009) | TASK-UI-AUTH-001 |

### Incremento E: Reportes y Notificaciones

**Prioridad: media**

Reportabilidad (M09) y notificaciones (M10) con rutas duales (ADR-001).

| Tarea | Descripción | Dependencias |
|-------|-------------|-------------|
| TASK-DB-REPORT-001 | Migración `notifications` | TASK-DB-SECURITY-001 |
| TASK-DB-AUDIT-001 | Migración `audit_log` | TASK-DB-SECURITY-001 |
| TASK-API-REPORT-001 | Reportes (API-039) y notificaciones (API-040) | TASK-API-AUTH-001 |
| TASK-UI-REPORT-001 | Pantalla reportes (P-29) | TASK-UI-AUTH-001 |
| TASK-UI-NOTIFICATION-001 | Pantalla notificaciones (P-30, ADR-001) | TASK-UI-AUTH-001 |

### Router y QA

| Tarea | Descripción | Dependencias |
|-------|-------------|-------------|
| TASK-UI-ROUTER-001 | Router canónico 30 rutas con guards | Todos los UI tasks |
| TASK-QA-DB-001 | Pruebas de migraciones DB | TASK-ARCH-008 |
| TASK-QA-API-001 | Pruebas de contrato API | TASK-ARCH-008 |
| TASK-QA-FRONTEND-001 | Pruebas de renderizado frontend | TASK-ARCH-008 |
| TASK-QA-E2E-001 | Pruebas end-to-end (5 flujos críticos) | TASK-QA-DB-001, API-001, FRONTEND-001 |
| TASK-QA-COVERAGE-001 | Validación de cobertura (backend 80%, frontend 70%) | TASK-QA-E2E-001 |
| TASK-QA-ACCEPTANCE-001 | Verificación de criterios de aceptación | TASK-QA-E2E-001 |
| TASK-QA-READINESS-001 | Preparación readiness EC2 | TASK-QA-ACCEPTANCE-001, COVERAGE-001 |

## 6. Dependencias entre Incrementos

```
Incremento A (seguridad)
    ├──→ Incremento B (documentos)
    │       └──→ Incremento C (expedientes y correspondencia)
    └──→ Incremento D (portal y OIRS)

Incremento B ──→ Incremento C (expedientes dependen de documentos)

Todos los incrementos (A + B + C + D + E) → QA final
```

**Reglas:**
- A debe completarse antes que cualquier otro incremento (plataforma base)
- B debe completarse antes que C (expedientes dependen de documentos)
- A debe completarse antes que D (portal requiere auth ciudadano)
- Todos los incrementos deben completarse antes del cierre de QA

## 7. Riesgos

### Dependencias circulares (ADR-010, ADR-011)
Las relaciones `departments.manager_user_id → users.id` y `documents.current_version_id → document_versions.id` requieren migraciones en tres pasos: crear tablas sin FK circulares, luego agregar las FK en migraciones posteriores. Esto está resuelto en el diseño con ordenamiento explícito de migraciones.

### Simulación académica (ADR-015)
La autenticación, firma y notificaciones operan en modo simulado. Esto es aceptable para v0002 pero debe migrarse a producción real antes de cualquier despliegue en entorno real. La documentación de cada endpoint simulado incluye la marca correspondiente.

### Persistencia en memoria (ADR-014)
El backend opera con datos en memoria. Al reiniciar el servidor, los datos se pierden. Las migraciones SQL se generan como especificación, no como ejecución contra PostgreSQL. La migración a base de datos real está planificada para fase 4.

## 8. Gates de Calidad

### Gates de Planificación

| Gate | Descripción | Verifica |
|------|-------------|----------|
| GATE-ARCH-001 | Sources Normalized | 0 blocking findings, 10 catálogos |
| GATE-ARCH-002 | Critical Decisions Accepted | 16 ADR aceptados |
| GATE-ARCH-003 | Agents Valid | 6 agentes con tools y responsabilidades |
| GATE-ARCH-004 | Tasks Valid | IDs únicos, dependencias válidas |
| GATE-ARCH-005 | DAG Acyclic | Sin ciclos, sin nodos huérfanos |
| GATE-ARCH-006 | Handoffs Valid | 10 handoffs con artefactos y criterios |
| GATE-ARCH-007 | Baseline Preserved | Hashes de workspace y fuentes intactos |

### Gates de Ejecución

| Gate | Descripción | Fase |
|------|-------------|------|
| GATE-DB-001 | Migraciones correctas, 40 tablas, FK, seeds | Database |
| GATE-API-001 | OpenAPI completo, 40+ endpoints, tests pasan | Backend |
| GATE-UI-001 | 30 rutas renderizan, E2E pasan | Frontend |

Cada gate debe pasar antes de que el handoff correspondiente pueda ejecutarse. Si un gate falla, la tarea asociada se marca como bloqueada y el pipeline se detiene (o reintenta según la política del agente).
