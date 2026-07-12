# ARQUITECTURA WEBFORGE — Fábrica de Software SDD

## 1. Introducción

**WEBFORGE** es una fábrica de software determinista, local y orientada a agentes, especializada en la producción de la aplicación web SIGED-Lampa para la Municipalidad de Lampa. Opera bajo el modelo SDD (_Specification-Driven Development_): a partir de documentos fuente autorizados, la fábrica normaliza, planifica, implementa y valida un prototipo web full-stack en un sandbox DEV aislado, sin efectos secundarios externos, sin despliegue y sin datos productivos.

La fábrica se ejecuta completamente en local, no requiere conexión a Internet ni servicios cloud, y produce un conjunto completo de artefactos de evidencia, trazabilidad y reportes en cada corrida.

## 2. Fábrica

### 2.1 CLI Entrypoint

El punto de entrada es `webforge run` (CLI implementada en `webforge/cli.py`). Acepta un WorkOrder en JSON con objetivo, project_id, versión, fuentes autorizadas, presupuesto y criterios de aceptación. Comandos adicionales: `normalize` (normaliza documentos SIGED), `plan` (planificación arquitectónica), `principles` (muestra P01-P12), `tools` (registro de herramientas), `doctor` (validación del paquete skill).

### 2.2 WorkOrder

Estructura JSON que define qué producir. Contiene: `objective`, `source_documents` (lista de archivos fuente relativos), `minimum_scope` (mínimos esperados: módulos, endpoints, pantallas, tablas), `stack`, `budget`, `acceptance_criteria`, `side_effects` y `authorized_sources`. Es validado al inicio del ciclo para asegurar que no contenga rutas absolutas, path traversal, ni campos vacíos.

### 2.3 Fases Deterministas

El flujo de 16 fases es fijo e inmutable:

```
intake → constitution → specify → clarify → checklist → context → plan → tasks → analyze → implement → validate → security → pr_handoff → deploy_checkpoint → observe → close
```

Cada fase tiene un agente asignado, un handler específico, gates de entrada/salida y artefactos de salida esperados.

### 2.4 Harness

`HarnessRunner` (`webforge/harness.py`) envuelve cada ejecución de agente con controles transversales de policy engine, budget manager, context manager, memory gate y MCP gateway. Es la única puerta de entrada — principio P05 — y garantiza que ningún agente opere fuera del perímetro de gobierno.

### 2.5 Policy Engine

`PolicyEngine` (`webforge/policy.py`) implementa un modelo de permisos default-deny. Cada agente debe estar en la allowlist. Acciones como `external_write`, `deploy` y `production_data` están denegadas por defecto y requieren aprobación explícita.

### 2.6 Budget

`BudgetManager` controla el consumo de recursos: tool_calls, mcp_calls, costo USD y latencia. Si el presupuesto se agota, el pipeline se detiene. Cada tool_call se registra en `billing-ledger.json`.

### 2.7 MCP Gateway

`MCPGateway` (principio P11) opera bajo default-deny. Ningún servidor MCP está en la allowlist por defecto. Toda invocación se loguea en `mcp-invocations.jsonl`.

### 2.8 Tool Registry

`ToolRegistry` (`webforge/tools.py`) es un catálogo de herramientas deterministas allowlisted con schemas, timeouts (30s) y logs. Tools registradas: `tool.sandbox.dev_materialize`, `tool.security.secrets`, `tool.security.deps`, `tool.sbom.generate`, `tool.policy.static`, `tool.validation.artifacts`.

### 2.9 Evidence Registry

`EvidenceRegistry` (`webforge/context.py`) registra cada fuente autorizada con su hash SHA-256, ruta y resumen. Produce `evidence-register.md`. Toda interacción de la fábrica queda vinculada a evidencia concreta.

## 3. Producto — SIGED-Lampa

### 3.1 Stack Tecnológico

| Capa | Tecnología actual | Target futuro |
|------|------------------|---------------|
| Frontend | Vanilla JavaScript (SPA) | React |
| Backend | Node HTTP (in-memory) | PostgreSQL |
| Base de datos | SQL simulada / seed JSON | PostgreSQL |

### 3.2 Módulos (M01–M10)

| Código | Módulo |
|--------|--------|
| M01 | Autenticación, perfiles y autorización |
| M02 | Administración organizacional |
| M03 | Gestión documental |
| M04 | Revisión, visto bueno y firma |
| M05 | Expedientes y trazabilidad |
| M06 | Correspondencia |
| M07 | Portal ciudadano |
| M08 | OIRS digital |
| M09 | Reportabilidad |
| M10 | Notificaciones |

### 3.3 Dimensiones

- **40+ endpoints** originales (API-001 a API-040), más 6 adicionales por ADR-002 y ADR-003
- **30 pantallas** (P-01 a P-30) con rutas canónicas, zonas (intranet/portal) y actores
- **40 tablas** derivadas del modelo ER detallado
- **9 actores**: ACT-ADM, ACT-FUN, ACT-OPA, ACT-REV, ACT-OIR, ACT-REP, ACT-CIU, ACT-VIS, ACT-EXT
- **12 casos de uso** (UC-01 a UC-12)
- **60 reglas de negocio** (BR-001 a BR-060)
- **100 validaciones**

## 4. Agentes

WEBFORGE declara 6 agentes especializados para la planificación y construcción de SIGED-Lampa (definidos en `webforge/planning/agents.py`):

| Agente | Rol |
|--------|-----|
| `agent.refinement` | Consume catálogos normalizados, revisa hallazgos, resuelve blocking findings |
| `agent.architecture` | Genera ADR, arquitectura, tareas, DAG, handoffs y contratos |
| `agent.database` | Migraciones SQL, tablas, seeds, índices |
| `agent.backend` | OpenAPI, endpoints, autorización, reglas, middlewares |
| `agent.frontend` | Rutas, componentes, guards, conexión API |
| `agent.qa_release` | Build, tests, cobertura, readiness, promoción |

Además, la fábrica runtime tiene agentes transversales (intake, constitution, spec_parser, clarifier, requirements_qa, context_rag, architect_planner, task_planner, consistency_reviewer, implementer, qa, security, integrator_pr, release_sre, observability_cost, close) definidos en `PHASE_AGENTS` en el orquestador.

## 5. Arnes — HarnessRunner

El `HarnessRunner` es el corazón del gobierno de ejecución. Cada `run_agent()`:

1. **Policy check**: verifica que el agente esté en la allowlist (P05).
2. **Context pack**: construye un contexto mínimo con snippets de fuentes autorizadas y hashes.
3. **Memory gate**: inyecta solo memoria del proyecto, nunca de la fábrica (P03).
4. **Budget check**: verifica disponibilidad de tool_calls antes de cada operación.
5. **MCP pre-gate**: verifica que el servidor MCP esté en la allowlist (P11).
6. **Tool execution**: ejecuta el handler de fase.
7. **Post-gate**: registra el resultado, los gates y la evidencia.

No hay forma de eludir el harness: es la única puerta de entrada a la ejecución de un agente.

## 6. Workflow (16 fases)

| Fase | Agente asignado | Propósito |
|------|----------------|-----------|
| intake | agent.intake | Validar WorkOrder, aislar proyecto, verificar skills y template |
| constitution | agent.constitution | Instanciar P01-P12 |
| specify | agent.spec_parser | Normalizar fuentes SIGED, generar spec.md |
| clarify | agent.clarifier | Cerrar decisiones operacionales críticas |
| checklist | agent.requirements_qa | Verificar controles críticos (SIGED, proyecto, template, sandboxes) |
| context | agent.context_rag | Construir context-pack con snippets autorizados |
| plan | agent.architect_planner | Generar plan, billing policy, SLOs, sandbox policy |
| tasks | agent.task_planner | Mapear principios a tareas atómicas |
| analyze | agent.consistency_reviewer | Detectar drift entre spec, plan y tasks |
| implement | agent.implementer | Materializar bundle en DEV sandbox |
| validate | agent.qa | Ejecutar validaciones estáticas y de artefactos |
| security | agent.security | Escanear secretos, dependencias, generar SBOM |
| pr_handoff | agent.integrator_pr | Preparar bundle de PR (sin escritura externa) |
| deploy_checkpoint | agent.release_sre | Verificar checkpoint de despliegue (bloqueado por defecto) |
| observe | agent.observability_cost | Escribir billing, métricas, completitud de logs |
| close | agent.close | Generar reporte final, state.json, artefactos de cierre |

La planificación (arquitectura) se integra después de la normalización: en la fase `specify`, cuando el WorkOrder es v2 y contiene `source_documents`, se ejecuta `normalize_siged()` y luego `run_planning()` para generar decisiones, agentes, tareas, DAG, handoffs y gates de planificación.

## 7. Gates

### 7.1 Principios P01–P12

| ID | Nombre | Control |
|----|--------|---------|
| P01 | Máxima reproducibilidad práctica | Workflow fijo, hashes, rutas cerradas de retry |
| P02 | No invención | Todo claim requiere evidence_id |
| P03 | Memoria/contexto limpio | Taint tracking, contexto mínimo, propose-only |
| P04 | RAG/index/cache | Context-pack con hashes y snippets |
| P05 | ARNES/orquestador/agentes/skills | Única puerta harness.run_agent |
| P06 | Tools deterministas | ToolRegistry allowlisted con schemas |
| P07 | Aprendizaje gobernado | MemoryProposal pendiente, nunca activación automática |
| P08 | Gates por fase | Cada fase declara gates críticos |
| P09 | Logs/trazas | State, JSONL, billing ledger, matriz req-task-test-evidence |
| P10 | Workflows SDD | Secuencia fija de 16 fases |
| P11 | MCP gobernado | Default-deny, allowlist explícita |
| P12 | Seguridad/escalabilidad | Sandbox, dry-run, secret/dependency scans, SBOM |

### 7.2 Gates de Planificación (GATE-ARCH-001 a 007)

| Gate | Nombre | Función validadora |
|------|--------|-------------------|
| GATE-ARCH-001 | Sources Normalized | 0 blocking findings, 10 catálogos presentes |
| GATE-ARCH-002 | Critical Decisions Accepted | ADR-001 a ADR-016 presentes y aceptados |
| GATE-ARCH-003 | Agents Valid | 6 agentes requeridos, sin duplicados, con tools |
| GATE-ARCH-004 | Tasks Valid | IDs únicos, agentes válidos, acceptance criteria |
| GATE-ARCH-005 | DAG Acyclic | Sin ciclos, sin nodos huérfanos |
| GATE-ARCH-006 | Handoffs Valid | 10 handoffs, artefactos y criterios no vacíos |
| GATE-ARCH-007 | Baseline Preserved | Hashes de workspace, versiones y fuentes intactos |

## 8. Estado

WEBFORGE mantiene estado separado por dominio:

- **factory_status**: estado global de la fábrica en `state.json` (`CycleState`), incluye run_id, phase, agent_id, hashes, permisos, budget.
- **planning_status**: resultados de planificación en `planning-report.json` (decisions, agents, tasks, DAG, handoffs, gates).
- **product_status**: perfil del producto en `architecture.json` (componentes implementados vs documentados, endpoints, pantallas, tablas).
- **documentation_status**: artefactos de documentación generados (spec, constitution, clarifications, checklist).
- **deployment_status**: checkpoint de despliegue en `deploy-plan.md` (por defecto: local_scope_complete_no_deploy).

## 9. Evidencia

El `EvidenceRegistry` asigna un `evidence_id` (formato `EV-SRC-NNN`) a cada fuente autorizada, calcula su hash SHA-256 y lo registra en `evidence-register.md`. Cada claim en el pipeline reference su evidence_id. Los hashes se usan para:

- Verificar integridad de fuentes (GATE-ARCH-007)
- Construir context-pack con snippets identificados
- Generar `source-mirror-manifest.json` con hashes de cada copia
- Producir `claim-map.md` vinculando claims a evidencia
- Calcular `profile_hash` del perfil SIGED

## 10. Separación DEV/QA

Cada proyecto tiene sandboxes **DEV** y **QA** autónomos e independientes:

- Son clones locales de `project/<id>/versions/<version>`
- Tienen memoria y aprendizaje aislados (no comparten con fábrica ni entre sí)
- Usan obligatoriamente `PLANTILLA_FRONTEND` como template frontend
- La materialización solo ocurre en DEV a través de `DevSandboxMaterializer` (API de aislamiento P12/INV)
- QA permanece como sandbox de promoción futuro

El flujo de promoción esperado (no implementado en v0002):
```
DEV (materialización) → validación interna → promoción a QA → pruebas → readiness → EC2
```

## 11. Decisiones — ADR

WEBFORGE documenta 16 decisiones arquitectónicas (ADR-001 a ADR-016) como registro formal de diseño. Cada ADR contiene: context, decision, alternatives, consequences, affected_codes, source_findings, implementation_phase y status. Las decisiones son validadas por GATE-ARCH-002.

Las decisiones cubren: rutas de notificaciones (ADR-001), endpoints administrativos (ADR-002-003), login ciudadano (ADR-004), solicitudes ciudadanas (ADR-005), relaciones circulares (ADR-010-011), persistencia (ADR-014), autenticación simulada (ADR-015) y conteo de endpoints (ADR-016).

Todas están aceptadas; solo ADR-015 requiere aprobación humana por su naturaleza de simulación académica de integraciones externas.
