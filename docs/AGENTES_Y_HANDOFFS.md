# Agentes y Handoffs — WEBFORGE

## 1. Introducción

WEBFORGE implementa una arquitectura basada en agentes especializados para la construcción de SIGED-Lampa. Cada agente tiene una responsabilidad acotada, herramientas permitidas, gates de entrada/salida y destinos de handoff definidos. Los agentes no se comunican directamente: la transferencia de artefactos ocurre mediante handoffs formales con criterios de aceptación y gates requeridos. El `HarnessRunner` gobierna toda ejecución de agente.

## 2. Tabla de Agentes

| Agente | Responsabilidad | Entradas | Salidas | Herramientas | Gate de entrada | Handoff destino |
|--------|----------------|----------|---------|-------------|----------------|----------------|
| `agent.refinement` | Consumir catálogos normalizados, revisar findings, verificar decisiones pendientes, no inventar requisitos, entregar especificación aprobada al arquitecto | Catálogos normalizados JSON, normalization report, findings, work order | Refined spec, findings resolution, specification approval | `tool.read_catalog`, `tool.validate_findings` | `GATE-ARCH-001` | `agent.architecture` |
| `agent.architecture` | Generar arquitectura, crear ADR, generar tareas, generar DAG, validar dependencias, asignar tareas a agentes, definir criterios de finalización | Refined spec, catálogos normalizados, ADR template | `architecture.json`, `decisions.json`, `tasks.json`, `task-dag.json`, `agents.json`, `contracts.json`, `handoff-plan.json` | `tool.generate_adr`, `tool.validate_dag`, `tool.validate_tasks`, `tool.validate_handoffs` | `specification_approved` | `agent.database`, `agent.backend`, `agent.frontend`, `agent.qa_release` |
| `agent.database` | Migraciones SQL, 40 tablas, seeds, restricciones, índices, pruebas DB | `architecture.json`, `tasks-db.json`, ER model catalog | Migraciones SQL, seeds, DB tests | `tool.generate_migration`, `tool.generate_seed`, `tool.validate_schema` | `architecture_approved` | `agent.backend`, `agent.qa_release` |
| `agent.backend` | OpenAPI, endpoints, autorización, reglas, validaciones, pruebas API | `architecture.json`, `tasks-api.json`, endpoints catalog, business rules | OpenAPI spec, backend controllers, API tests | `tool.generate_openapi`, `tool.generate_controller`, `tool.validate_api` | `architecture_approved` | `agent.frontend`, `agent.qa_release` |
| `agent.frontend` | 30 rutas, componentes, guards, conexión API, E2E | `architecture.json`, `tasks-ui.json`, screens catalog, endpoints catalog | React routes, UI components, E2E tests | `tool.generate_component`, `tool.generate_route`, `tool.validate_frontend` | `backend_ready \|\| architecture_approved` | `agent.qa_release` |
| `agent.qa_release` | Build, lint, pruebas, cobertura, promoción a QA, health check, readiness EC2 | `architecture.json`, `tasks-qa.json`, backend + frontend artifacts | QA report, coverage report, deploy readiness, health check | `tool.run_tests`, `tool.check_coverage`, `tool.validate_deploy` | `backend_ready && frontend_ready` | `human_reviewer` |

## 3. Diferenciación Conceptual

### Agente
Entidad responsable de un conjunto de tareas dentro de la fábrica. Cada agente tiene:
- `agent_id` único (ej: `agent.database`)
- Responsabilidad declarada
- Tools permitidas y acciones prohibidas
- Gate de entrada y salida
- Política de fallo (`stop`, `retry`) y máximo de intentos (`max_attempts`)

### Tarea
Unidad atómica de trabajo verificable. Toda tarea tiene:
- ID único (`TASK-XXX-NNN`)
- Agente responsable
- Prioridad (critical, high, medium, low)
- Dependencias (forman un DAG)
- Criterios de aceptación
- Tests requeridos
- Gates requeridos

### Regla
Política o constraint que rige el comportamiento:
- **P01–P12**: principios constitucionales de la fábrica
- **BR-001 a BR-060**: reglas de negocio de SIGED-Lampa
- **Reglas de policy engine**: default-deny, isolation, template obligatorio

### Workflow
Secuencia de fases que ejecuta la fábrica: 16 pasos desde `intake` hasta `close`. Cada fase tiene un agente runtime asignado, gates de entrada/salida y artefactos esperados.

### Handoff
Transferencia formal de artefactos entre agentes. Cada handoff especifica:
- From/to agent
- Artefactos transferidos
- Gates requeridos (deben haber pasado antes de la transferencia)
- Criterios de aceptación (condiciones que el receptor valida)
- Posibles razones de rechazo

### Herramienta
Wrapper determinista para una operación específica. Ejemplos:
- `tool.sandbox.dev_materialize`: materializa bundle en sandbox DEV
- `tool.security.secrets`: escanea secretos en archivos
- `tool.generate_adr`: genera registros de decisión arquitectónica

## 4. Handoffs

| Handoff | Desde | Hacia | Artefactos | Gates requeridos |
|---------|-------|-------|-----------|-----------------|
| **HO-REF-ARCH** | `agent.refinement` | `agent.architecture` | `normalization-report.json`, `normalization-findings.md`, `catalogs/*.json` | `GATE-ARCH-001` |
| **HO-ARCH-DB** | `agent.architecture` | `agent.database` | `architecture.json`, `tasks.json`, `task-dag.json` | `GATE-ARCH-002`, `003`, `004`, `005`, `006` |
| **HO-ARCH-BE** | `agent.architecture` | `agent.backend` | `architecture.json`, `endpoints.json`, `business-rules.json`, `validations.json`, `contracts.json` | `GATE-ARCH-002`, `003`, `004`, `005` |
| **HO-ARCH-FE** | `agent.architecture` | `agent.frontend` | `architecture.json`, `screens.json`, `endpoints.json`, `contracts.json` | `GATE-ARCH-002`, `003` |
| **HO-ARCH-QA** | `agent.architecture` | `agent.qa_release` | `architecture.json`, `tasks.json`, `contracts.json` | `GATE-ARCH-002`, `003`, `004`, `005`, `006` |
| **HO-DB-BE** | `agent.database` | `agent.backend` | `database/migrations/*.sql`, `database/seeds/*.sql`, `database/schema.sql` | `GATE-DB-001` |
| **HO-BE-FE** | `agent.backend` | `agent.frontend` | `openapi.yaml`, `backend/src/controllers/*.js` | `GATE-API-001` |
| **HO-DB-QA** | `agent.database` | `agent.qa_release` | `database/migrations/*.sql`, `database/test-results.xml` | `GATE-DB-001` |
| **HO-BE-QA** | `agent.backend` | `agent.qa_release` | `openapi.yaml`, `backend/test-results.xml` | `GATE-API-001` |
| **HO-FE-QA** | `agent.frontend` | `agent.qa_release` | `frontend/src/routes.js`, `frontend/test-results.xml` | `GATE-UI-001` |

### Criterios de aceptación por handoff

- **HO-REF-ARCH**: Normalización con 0 blocking findings. Todos los catálogos presentes.
- **HO-ARCH-DB**: Arquitectura aprobada. Tareas DB definidas.
- **HO-ARCH-BE**: Arquitectura aprobada. Tareas API definidas.
- **HO-ARCH-FE**: Arquitectura aprobada. Tareas UI definidas.
- **HO-ARCH-QA**: Arquitectura aprobada. Tareas QA definidas.
- **HO-DB-BE**: 40 tablas creadas. FK constraints definidas. Seeds cargan correctamente.
- **HO-BE-FE**: OpenAPI completo. 40+ endpoints implementados.
- **HO-DB-QA**: Migración from zero exitosa. Tests DB pasan.
- **HO-BE-QA**: Tests API pasan. Cobertura sobre umbral.
- **HO-FE-QA**: 30 rutas renderizan. Tests E2E pasan.

## 5. Ledgers

WEBFORGE mantiene tres ledgers en formato JSONL para trazabilidad completa:

### agent-ledger.jsonl
Schema `webforge.agent_ledger.v1`. Cada entrada registra: timestamp, run_id, cycle_id, phase, agent_id, task_id, event (`completed`, `failed`), input_hashes, output_artifacts, gate, result.

### handoff-ledger.jsonl
Schema `webforge.handoff_ledger.v1`. Cada entrada registra: timestamp, run_id, handoff_id, task_id, from_agent, to_agent, artifacts, status (`proposed`, `completed`, `rejected`), reasons.

### planning-ledger.jsonl
Schema `webforge.planning_ledger.v1`. Eventos de planificación: `decisions_created`, `tasks_created`, `dependencies_created`, `dag_validated` y resultados de gates.

## 6. Ejemplo de Flujo Completo

### Paso 1: Refinement (HO-REF-ARCH)

`agent.refinement` recibe los catálogos normalizados. Pasa `GATE-ARCH-001` (0 blocking findings, 10 catálogos presentes). Aprueba la especificación y realiza handoff a `agent.architecture`. Se registra entrada en `agent-ledger.jsonl` con event=completed y resulta `HO-REF-ARCH` en `handoff-ledger.jsonl` con status=completed.

### Paso 2: Architecture

`agent.architecture` recibe la especificación refinada. Genera:
1. `decisions.json` con ADR-001 a ADR-016 (TASK-ARCH-001)
2. `architecture.json` con componentes, flujos y boundaries (TASK-ARCH-002)
3. `agents.json` con los 6 agentes especializados (TASK-ARCH-003)
4. `contracts.json` con schemas de handoff (TASK-ARCH-004)
5. `tasks.json` con descomposición completa (TASK-ARCH-005)
6. `task-dag.json` con dependencias validadas (TASK-ARCH-006)
7. `handoff-plan.json` con plan de transferencias (TASK-ARCH-007)

Ejecuta gates de planificación (TASK-ARCH-008): GATE-ARCH-001 a 007. Si todos pasan, la arquitectura se marca como `architecture_approved` y se producen 4 handoffs simultáneos:

- **HO-ARCH-DB** → `agent.database`
- **HO-ARCH-BE** → `agent.backend`
- **HO-ARCH-FE** → `agent.frontend`
- **HO-ARCH-QA** → `agent.qa_release`

### Paso 3: Database

`agent.database` recibe `architecture.json`, `tasks.json`, `task-dag.json`. Ejecuta migraciones en orden: security (users → roles → departments → manager FK), documents (document_types → documents → document_versions → version_id → previous_version_id → unique numbering), expedients (expedients → expedient_documents), correspondence (correspondence → routes), portal (tramites → citizen_requests), OIRS (oirs_cases con contact fields), reports/audit (notifications, audit_log). Produce **HO-DB-BE** (migrations a backend) y **HO-DB-QA** (resultados a QA).

### Paso 4: Backend

`agent.backend` recibe `architecture.json`, endpoints catalog y migrations. Implementa en orden: login interno (API-001), login ciudadano (API-002, ADR-004), RBAC middleware, audit trail middleware, documentos CRUD (API-015 a 020), expedientes (API-025 a 028), correspondencia (API-029 a 032), portal (API-033 a 036, ADR-005), OIRS (API-037-038, ADR-009), reportes/notificaciones (API-039-040), admin endpoints (ADR-002-003). Produce **HO-BE-FE** (OpenAPI a frontend) y **HO-BE-QA** (resultados a QA).

### Paso 5: Frontend

`agent.frontend` recibe `architecture.json`, screens catalog y OpenAPI. Implementa: login screens (P-01, P-02, P-03), admin screens (P-06 a P-11), documents (P-12 a P-15), expedients (P-19, P-20), correspondence (P-21, P-22), portal (P-23 a P-26), OIRS (P-27, P-28), reports (P-29), notifications (P-30, ADR-001), router canónico (30 rutas). Produce **HO-FE-QA** (rutas y tests a QA).

### Paso 6: QA / Release

`agent.qa_release` recibe artefactos de DB, backend y frontend (gates: `backend_ready && frontend_ready`). Ejecuta: migration tests, API contract tests, frontend render tests, E2E flows, coverage thresholds, acceptance criteria verification. Prepara readiness report para `human_reviewer`. Si todo pasa, el release se marca como `release_approved`.
