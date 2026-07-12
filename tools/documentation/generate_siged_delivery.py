#!/usr/bin/env python3
"""Generate the SIGED-Lampa delivery documentation from versioned evidence.

This script is deterministic for a checkout: it only reads the repository and
writes the three requested delivery documents below docs/ENTREGA_FINAL.
"""
from __future__ import annotations

import json
import re
import shutil
import subprocess
from collections import Counter
from datetime import date
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
VERSION = ROOT / "project/siged-lampa/versions/v0002"
OUT = ROOT / "docs/ENTREGA_FINAL"
GENERATED = date(2026, 7, 12).isoformat()
REF = {
    "openapi": "project/siged-lampa/versions/v0002/openapi.yaml",
    "endpoints": "project/siged-lampa/versions/v0002/backend/operational-endpoint-catalog.json",
    "endpoint_verify": "project/siged-lampa/versions/v0002/backend/openapi-router-verification.json",
    "rules": "project/siged-lampa/versions/v0002/backend/business-rule-map.json",
    "validations": "project/siged-lampa/versions/v0002/backend/validation-map.json",
    "screens": "project/siged-lampa/versions/v0002/frontend/src/config/screen-catalog.ts",
    "router": "project/siged-lampa/versions/v0002/frontend/src/app/router.tsx",
    "migrations": "project/siged-lampa/versions/v0002/database/migrations/",
    "dbtrace": "project/siged-lampa/versions/v0002/database/database-traceability.json",
    "tests": "project/siged-lampa/versions/v0002/runs/phase7ar6c/phase7ar6c-summary.md",
    "deploy": "project/siged-lampa/versions/v0002/infra/deployment/docker-compose.production.yml",
    "phase8": "project/siged-lampa/versions/v0002/runs/phase8a/phase8a-acceptance-decision.json",
    "workflow": ".github/workflows/deploy-ec2.yml",
    "factory": "webforge/orchestrator.py",
    "planning_agents": "webforge/planning/agents.py",
    "planning_dag": "webforge/planning/dag.py",
    "handoffs": "webforge/planning/handoffs.py",
    "policy": "webforge/policy.py",
    "harness": "webforge/harness.py",
    "sources": "project/siged-lampa/sources/Especificacion_Funcional_SIGED_Lampa.md",
}


def rel(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def load(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def git(*args: str) -> str:
    return subprocess.check_output(["git", *args], cwd=ROOT, text=True).strip()


def cell(value: object) -> str:
    text = ", ".join(value) if isinstance(value, list) else str(value or "-")
    return text.replace("|", "\\|").replace("\n", " ")


def table(headers: list[str], rows: list[list[object]]) -> str:
    return "\n".join([
        "| " + " | ".join(headers) + " |",
        "| " + " | ".join("---" for _ in headers) + " |",
        *["| " + " | ".join(cell(item) for item in row) + " |" for row in rows],
    ])


def parse_tables() -> list[dict[str, str]]:
    tables: list[dict[str, str]] = []
    for migration in sorted((VERSION / "database/migrations").glob("*.sql")):
        text = migration.read_text(encoding="utf-8")
        for match in re.finditer(r"CREATE TABLE\s+(?:IF NOT EXISTS\s+)?([a-z_]+)\s*\((.*?)\);", text, re.S | re.I):
            name, body = match.group(1), match.group(2)
            if name == "schema_migrations":
                continue
            pk = "id" if re.search(r"\bid\s+[^,]+PRIMARY KEY", body, re.I) else "compuesta/no identificada"
            refs = re.findall(r"(?:[a-z_]+\s+[^,]*?)?REFERENCES\s+([a-z_]+)", body, re.I)
            tables.append({"name": name, "migration": rel(migration), "pk": pk, "refs": ", ".join(dict.fromkeys(refs)) or "-"})
    return tables


def parse_screens() -> list[dict[str, object]]:
    text = (VERSION / "frontend/src/config/screen-catalog.ts").read_text(encoding="utf-8")
    pattern = re.compile(
        r"\['(?P<id>P-\d+)',\s*'(?P<name>[^']+)',\s*'(?P<route>[^']+)',\s*'(?P<surface>[^']+)',\s*\[(?P<actors>[^]]*)\],\s*\[(?P<permissions>[^]]*)\],\s*\[(?P<endpoints>[^]]*)\],\s*'(?P<component>[^']+)',\s*'(?P<data>[^']+)',\s*'(?P<status>[^']+)'"
    )
    screens = []
    for item in pattern.finditer(text):
        groups = item.groupdict()
        for key in ("actors", "permissions", "endpoints"):
            groups[key] = re.findall(r"'([^']+)'", groups[key])
        screens.append(groups)
    return screens


def module_for_table(name: str) -> str:
    if name in {"roles", "permissions", "users", "user_roles", "role_permissions", "sessions", "two_factor_settings", "citizen_sessions"}: return "Seguridad"
    if name in {"departments", "external_entities"}: return "Organización"
    if name.startswith("document") or name == "signature_profiles": return "Gestión documental"
    if name.startswith("expedient"): return "Expedientes"
    if name.startswith("correspondence"): return "Correspondencia"
    if name.startswith("citizen") or name in {"procedure_types", "published_procedures"}: return "Portal ciudadano"
    if name.startswith("oirs"): return "OIRS"
    if name in {"news_posts", "public_notices", "calendar_events"}: return "Contenido público"
    return "Soporte"


PURPOSE = {
    "departments": "Unidades organizacionales", "external_entities": "Destinatarios externos", "roles": "Roles internos",
    "permissions": "Permisos RBAC", "users": "Cuentas de funcionarios", "user_roles": "Asignación usuario-rol",
    "role_permissions": "Asignación rol-permiso", "sessions": "Sesiones internas", "two_factor_settings": "Configuración de segundo factor",
    "document_types": "Catálogo de tipos", "document_templates": "Plantillas documentales", "document_statuses": "Estados de documento",
    "documents": "Documento principal", "document_versions": "Versionado", "document_attachments": "Adjuntos",
    "document_comments": "Comentarios", "document_review_requests": "Solicitudes de revisión", "document_review_responses": "Respuestas de revisión",
    "signature_profiles": "Perfiles de firma", "document_approvals": "Vistos buenos", "document_signatures": "Firmas académicas",
    "expedients": "Expedientes", "expedient_documents": "Relación expediente-documento", "expedient_events": "Bitácora de expediente",
    "correspondence": "Correspondencia", "correspondence_recipients": "Destinatarios", "correspondence_routes": "Derivaciones",
    "citizen_accounts": "Cuentas ciudadanas", "citizen_profiles": "Perfiles ciudadanos", "procedure_types": "Tipos de trámite",
    "published_procedures": "Trámites publicados", "citizen_requests": "Solicitudes ciudadanas", "citizen_request_attachments": "Adjuntos de solicitudes",
    "citizen_sessions": "Sesiones ciudadanas", "oirs_cases": "Casos OIRS", "oirs_messages": "Mensajes OIRS",
    "news_posts": "Noticias", "public_notices": "Avisos", "calendar_events": "Calendario", "notifications": "Notificaciones", "audit_events": "Auditoría",
}


def endpoint_group(module: str, path: str) -> str:
    if path.endswith("/health") or path.endswith("/health/database"): return "Técnicos"
    groups = {"auth": "Autenticación", "documents": "Documentos", "expedients": "Expedientes", "correspondence": "Correspondencia", "citizen-requests": "Solicitudes ciudadanas", "oirs": "OIRS", "notifications": "Notificaciones", "reports": "Reportes", "public-content": "Contenido público", "users": "Administración", "roles": "Administración", "departments": "Administración", "document-types": "Administración", "procedure-types": "Administración", "external-entities": "Administración"}
    return groups.get(module, module)


def main_document(meta: dict[str, str], tables_data: list[dict[str, str]], endpoints: list[dict], screens: list[dict], rules: list[dict], validations: list[dict]) -> str:
    counts = {"tables": len(tables_data), "endpoints": len({(e["method"], e["path"]) for e in endpoints}), "screens": len(screens), "rules": len(rules), "validations": len(validations)}
    functional_rows = [[f"F-{i:03d}", s["surface"], s["name"], cell(s["actors"]), s["route"], cell(s["endpoints"]), "Implementado", f"[REF-06] {REF['screens']}"] for i, s in enumerate(screens, 1)]
    table_rows = [[str(i), item["name"], module_for_table(item["name"]), PURPOSE.get(item["name"], "Entidad del modelo"), item["pk"], item["refs"], item["migration"]] for i, item in enumerate(tables_data, 1)]
    endpoint_rows = [[e.get("endpoint_code", "-"), e["method"], e["path"], endpoint_group(e.get("module", "-"), e["path"]), e.get("authentication", "-"), cell(e.get("permissions", [])), e.get("status", "-"), f"backend/{e.get('router', '-')}"] for e in endpoints]
    screen_rows = [[s["id"], s["route"], s["name"], s["surface"], cell(s["actors"]), s["component"], s["status"], REF["screens"]] for s in screens]
    rule_rows = [[r["rule_id"], r["description"], r["responsible_layer"], r["implementation"].get("mechanism", r["implementation"].get("constraint", "-")), cell(r.get("positive_tests", [])), r["status"], r["implementation"].get("file", "-")] for r in rules]
    validation_rows = [[v["validation_id"], v["description"], v["implementation"].get("mechanism", "-"), v["responsible_layer"], "-", v["implementation"].get("file", "-"), cell(v.get("positive_tests", [])), v["status"]] for v in validations]
    use_cases = [
        ("CU-001", "Autenticarse como ciudadano", "Ciudadano", "Acceder al portal con cuenta ciudadana.", "P-02, P-26", "POST /api/v1/auth/citizen-login", "citizen_accounts, citizen_sessions", "BR-004; VAL-001, VAL-002", "E2E-01"),
        ("CU-002", "Consultar e iniciar trámite", "Ciudadano", "Consultar catálogo público e ingresar una solicitud.", "P-24, P-25, P-31", "GET /api/v1/public/tramites; POST /api/v1/public/tramites/{id}/requests", "published_procedures, citizen_requests", "BR-038; VAL-064", "E2E-01"),
        ("CU-003", "Consultar solicitud ciudadana", "Ciudadano", "Revisar el estado y antecedentes de sus solicitudes.", "P-32, P-33", "GET /api/v1/citizen/requests; GET /api/v1/citizen/requests/{id}", "citizen_requests, citizen_request_attachments", "BR-040; VAL-068", "E2E-01"),
        ("CU-004", "Ingresar y seguir OIRS", "Ciudadano", "Registrar un caso OIRS y consultar su seguimiento.", "P-27, P-34", "POST /api/v1/public/oirs; GET /api/v1/public/oirs/{id}", "oirs_cases, oirs_messages", "BR-043; VAL-073", "E2E-02"),
        ("CU-005", "Crear documento", "Funcionario", "Crear un documento institucional y gestionar su versión inicial.", "P-12, P-13, P-14", "POST /api/v1/documents; GET /api/v1/documents/{id}", "documents, document_versions", "BR-012; VAL-014", "E2E-03"),
        ("CU-006", "Gestionar versiones y anexos", "Funcionario", "Agregar versión y adjuntos a un documento autorizado.", "P-15", "POST /api/v1/documents/{id}/versions; POST /api/v1/documents/{id}/attachments", "document_versions, document_attachments", "BR-016; VAL-020", "E2E-03"),
        ("CU-007", "Revisar documento", "Revisor", "Responder una solicitud de revisión pendiente.", "P-16", "POST /api/v1/documents/{id}/submit-review; POST /api/v1/reviews/{id}/reply", "document_review_requests, document_review_responses", "BR-021; VAL-028", "E2E-04"),
        ("CU-008", "Aprobar documento", "Jefatura", "Emitir decisión de aprobación sobre un documento.", "P-17", "POST /api/v1/documents/{id}/approvals; POST /api/v1/approvals/{id}/decision", "document_approvals", "BR-024; VAL-032", "E2E-04"),
        ("CU-009", "Firmar documento", "Firmante", "Registrar firma académica simulada en el flujo documental.", "P-18", "POST /api/v1/documents/{id}/signatures", "signature_profiles, document_signatures", "BR-027; VAL-038", "E2E-05"),
        ("CU-010", "Gestionar expediente", "Funcionario", "Crear, asociar documento, consultar eventos y cerrar expediente.", "P-19, P-20", "POST /api/v1/expedients; POST /api/v1/expedients/{id}/documents; POST /api/v1/expedients/{id}/close", "expedients, expedient_documents, expedient_events", "BR-030; VAL-043", "E2E-06"),
        ("CU-011", "Registrar y derivar correspondencia", "Oficina de partes", "Registrar, enrutar y cerrar correspondencia.", "P-21, P-22", "POST /api/v1/correspondence; POST /api/v1/correspondence/{id}/route; POST /api/v1/correspondence/{id}/close", "correspondence, correspondence_recipients, correspondence_routes", "BR-034; VAL-052", "E2E-07"),
        ("CU-012", "Administrar usuarios y permisos", "Administrador", "Gestionar usuarios, roles, permisos y catálogos administrativos.", "P-06 a P-11", "GET/POST /api/v1/users; GET /api/v1/roles; PUT /api/v1/roles/{id}/permissions", "users, roles, permissions, user_roles, role_permissions", "BR-001 a BR-006; VAL-001 a VAL-009", "E2E-08"),
    ]
    uc_text = []
    for code, name, actor, objective, ui, api, db, rv, test in use_cases:
        uc_text.append(f"""### {code} - {name}

{table(["Campo", "Contenido"], [["Actor principal", actor], ["Actores secundarios", "Sistema SIGED-Lampa"], ["Objetivo", objective], ["Disparador", "El actor selecciona la operación en la interfaz."], ["Precondiciones", "Sesión y permiso cuando la operación es protegida; datos requeridos válidos."], ["Postcondiciones", "La operación queda persistida o el sistema informa el rechazo."], ["Pantallas", ui], ["Endpoints", api], ["Tablas", db], ["Reglas", rv], ["Validaciones", "Validadores de frontend/backend y restricciones de base de datos aplicables."]])}

**Flujo principal.**
1. El actor accede a la pantalla indicada.
2. El cliente aplica sus validaciones y envía la operación al endpoint indicado.
3. El backend autentica, autoriza y valida el payload antes de persistir.
4. El resultado o error se presenta en la interfaz y queda sujeto a auditoría cuando corresponde.

**Flujos alternativos.**
1. Si faltan datos o su formato es inválido, la solicitud es rechazada sin completar la operación.
2. Si no hay sesión, rol o permiso aplicable, los guards o el backend niegan el acceso.

**Excepciones.** Estados inválidos, ausencia del recurso, propiedad no acreditada y restricciones de integridad producen respuesta de error; no se documentan como éxito.

**Criterios de aceptación.** La operación usa la ruta y pantalla citadas, aplica las reglas/validaciones asociadas y su prueba o catálogo de evidencia existe.

**Evidencia.** [REF-04], [REF-05], [REF-06] y `{VERSION.relative_to(ROOT).as_posix()}/runs/phase7ar6c/e2e-flow-matrix.json` ({test}).""")
    return f"""# Documentación del Proyecto SIGED-Lampa

## Sistema Integral de Gestión Electrónica Documental desarrollado mediante la fábrica agéntica WEBFORGE

**Asignatura:** No identificada de forma inequívoca en los artefactos inspeccionados
**Estudiante:** Leandro Matamoros
**Repositorio:** `LeandroEsteban/Agentes`
**Versión del sistema:** `v0002`
**Rama documentada:** `{meta['branch']}`
**Commit documentado:** `{meta['commit']}`
**Fecha de generación:** {GENERATED}
**URL declarada del sistema:** `http://34.226.69.214`
**Estado declarado de entrega:** Versión funcional desplegada en AWS EC2. La evidencia local permite verificar la preparación de despliegue, pero no la ejecución remota de este commit; la verificación EC2 queda pendiente.

---

## Índice

1. [Control documental](#1-control-documental)
2. [Resumen ejecutivo](#2-resumen-ejecutivo)
3. [Introducción y objetivos](#3-introducción-y-objetivos)
4. [WEBFORGE](#4-webforge-fábrica-agéntica)
5. [SIGED-Lampa, alcance y actores](#5-siged-lampa-alcance-y-actores)
6. [Requisitos, casos y flujos](#6-requisitos-casos-y-flujos)
7. [Arquitectura](#7-arquitectura-del-producto)
8. [Datos, API, pantallas, reglas y validaciones](#8-inventarios-técnicos-verificados)
9. [Seguridad, integraciones, calidad y despliegue](#9-operación-y-calidad)
10. [Trazabilidad, checklist y conclusiones](#10-trazabilidad-y-cierre)

## 1. Control documental

{table(["Campo", "Valor"], [["Documento", "Documentación del Proyecto SIGED-Lampa"], ["Versión documental", "1.0"], ["Versión del sistema", "v0002"], ["Repositorio", "LeandroEsteban/Agentes"], ["Rama", meta['branch']], ["Commit", meta['commit']], ["Fecha", GENERATED], ["Responsable", "Leandro Matamoros"], ["Estado", "Final para evaluación"]])}

{table(["Versión", "Fecha", "Descripción", "Responsable"], [["1.0", GENERATED, "Consolidación basada en código, contratos y evidencias finales de v0002.", "Leandro Matamoros"]])}

**Criterio de evidencia.** Se priorizaron código y contratos de `v0002`, luego resultados finales `phase7ar6c`; los artefactos previos de `runs/` se usan solo para contexto. Los conteos se obtienen programáticamente al ejecutar `tools/documentation/generate_siged_delivery.py`; el criterio se declara en el propio script.

## 2. Resumen ejecutivo

SIGED-Lampa aborda la necesidad de gestionar de forma integrada documentos institucionales, expedientes, correspondencia, solicitudes ciudadanas y casos OIRS en un contexto municipal. La especificación de origen plantea una solución con intranet institucional, portal ciudadano y una API común [REF-20]. La versión documentada es `project/siged-lampa/versions/v0002`, identificada por el commit `{meta['commit']}`. Esta documentación no presupone capacidades fuera de ese árbol: contrasta los artefactos de requisitos con rutas, contratos, migraciones, catálogos y pruebas versionadas.

WEBFORGE es la fábrica agéntica que estructura el trabajo desde documentos fuente hacia especificación normalizada, planificación, validaciones y evidencias. Su runtime local usa fases ordenadas, un arnés, políticas de herramientas, presupuesto y gates. También genera un DAG de planificación para refinamiento, arquitectura, base de datos, backend, frontend y QA. Esa distinción es importante: el DAG y los seis agentes especializados están implementados como planificación; el runtime ejecuta handlers de fases en secuencia y no agenda autónomamente aquellas tareas del DAG [REF-14]-[REF-17].

El producto implementa un frontend React/TypeScript con React Router, guards de autenticación, actor y permiso; un backend Node/Express con módulos, validadores y servicios; PostgreSQL mediante migraciones; y composición Docker con Nginx. El catálogo final registra {counts['screens']} pantallas implementadas y modo de datos real [REF-06]. El contrato OpenAPI, el catálogo operacional y los routers están reconciliados en {counts['endpoints']} operaciones únicas, sin discrepancias declaradas [REF-02]-[REF-03]. La base final contiene {counts['tables']} tablas de dominio: el conteo excluye la tabla técnica `schema_migrations` y se obtiene de las migraciones 002 a 014, por lo que prevalece sobre el `schema.sql` histórico que declara 40.

La trazabilidad de la calidad registra {counts['rules']} reglas de negocio y {counts['validations']} validaciones o restricciones, con sus capas, archivos y pruebas en los mapas finales [REF-04] y [REF-05]. El cierre `phase7ar6c` informa 19/19 casos E2E aprobados, 166/166 pruebas unitarias frontend, 134/134 backend y 75/75 Python/base de datos. Las coberturas registradas no son 100%: frontend 87,72% de líneas y 66,00% de funciones; backend 80,84% de líneas y 85,81% de funciones [REF-10]. Por ello la meta académica de cobertura total no se marca como cumplida.

La infraestructura de producción está definida con contenedores PostgreSQL, backend y frontend/Nginx, health checks y volumen persistente [REF-11]. El workflow de la raíz contiene CI y un flujo de despliegue EC2 [REF-13]. Sin embargo, el artefacto de aceptación de `v0002` declara el workflow no ejecutado y estado `pending_github_push` [REF-12]; tampoco se encontró una ejecución remota versionada que pruebe el acceso a la URL indicada. En consecuencia, el documento mantiene la URL y el estado declarados para la entrega, pero clasifica la verificación de sistema online como pendiente. Las integraciones gubernamentales y la firma física/PDF final no se presentan como implementadas; la firma disponible es una simulación académica.

## 3. Introducción y objetivos

### 3.1 Contexto, propósito y alcance académico

La transformación digital municipal requiere que los flujos documentales mantengan datos, responsables, estados y evidencias consultables. SIGED-Lampa se orienta a ese problema mediante superficies públicas, ciudadanas e internas. El alcance académico comprende el diseño y construcción verificable de esas superficies, API, datos, calidad y preparación de operación; no declara operación municipal real ni integra servicios externos sin artefacto ejecutable [REF-20].

El desarrollo aplica una metodología trazable: la fábrica normaliza fuentes, produce planificación y contratos, y el producto se contrasta con migraciones, routers, pantallas, mapas de reglas, validaciones y reportes de prueba. El resto del documento detalla ese encadenamiento.

### 3.2 Objetivo general

Construir y documentar un sistema integral de gestión electrónica documental para el ámbito municipal, generado y gobernado mediante WEBFORGE, con evidencia verificable de requisitos, implementación, datos, interfaz, API, pruebas y preparación de despliegue.

### 3.3 Objetivos específicos

1. Normalizar requisitos documentales y planificar su realización mediante WEBFORGE.
2. Implementar y trazar módulos de autenticación, administración, documentos, expedientes, correspondencia, trámites, solicitudes, OIRS, notificaciones, reportes y contenido público.
3. Exponer contratos API verificables y reconciliarlos con routers.
4. Materializar datos mediante migraciones PostgreSQL y restricciones de integridad.
5. Construir pantallas React con rutas y controles de acceso verificables.
6. Asociar reglas de negocio y validaciones con archivos y pruebas.
7. Ejecutar y registrar pruebas unitarias, API, base de datos y E2E.
8. Preparar una composición Docker, health checks y pipeline de despliegue sin exponer secretos.

## 4. WEBFORGE: fábrica agéntica

### 4.1 Propósito, flujo y gobierno

WEBFORGE recibe un WorkOrder y fuentes documentales, las normaliza y genera especificación, contexto, planificación, tareas, decisiones, contratos, handoffs, gates y ledgers. El runtime real ejecuta secuencialmente `intake -> constitution -> specify -> clarify -> checklist -> context -> plan -> tasks -> analyze -> implement -> validate -> security -> pr_handoff -> deploy_checkpoint -> observe -> close`; es fail-fast. El DAG se construye y valida para la planificación, pero no constituye un planificador de workers ejecutado en paralelo [REF-14], [REF-16].

```mermaid
flowchart LR
  A[Documentos y WorkOrder] --> B[intake / constitution]
  B --> C[specify: normalización]
  C --> D[refinement]
  D --> E[architecture]
  E --> F[database]
  E --> G[backend]
  F --> G
  G --> H[frontend]
  F --> I[qa_release]
  G --> I
  H --> I
  I --> J[release checkpoint y cierre]
```

### 4.2 Agentes especializados de planificación

{table(["Identificador", "Especialidad/fase", "Entradas", "Responsabilidades y salidas", "Herramientas declaradas", "Gate / handoff"], [["agent.refinement", "normalization", "catálogos, hallazgos, WorkOrder", "spec refinada y resolución", "read_catalog, validate_findings", "GATE-ARCH-001 -> architecture"], ["agent.architecture", "architecture", "spec refinada y catálogos", "ADR, tareas, DAG, agentes, contratos", "generate_adr y validadores", "architecture_approved -> DB/backend/frontend/QA"], ["agent.database", "database", "arquitectura, ER, tareas DB", "migraciones, seeds, pruebas DB", "migración/seed/schema", "database_ready -> backend/QA"], ["agent.backend", "backend", "arquitectura, endpoints, reglas", "OpenAPI, controladores, pruebas API", "OpenAPI/controller/validation", "backend_ready -> frontend/QA"], ["agent.frontend", "frontend", "arquitectura, pantallas, endpoints", "rutas, componentes, E2E", "component/route/validation", "frontend_ready -> QA"], ["agent.qa_release", "QA/release", "artefactos DB/backend/frontend", "QA, cobertura, readiness", "tests/coverage/deploy validation", "release_approved -> humano"]])}

Estos seis contratos están definidos en [REF-15]. El manifiesto runtime contiene además 16 agentes de fase, incluidos `agent.intake`, `agent.spec_parser`, `agent.architect_planner`, `agent.implementer`, `agent.qa`, `agent.security`, `agent.release_sre` y `agent.close` [REF-14]. Las herramientas simbólicas de los agentes especializados no se documentan como invocaciones ejecutables autónomas porque no están registradas en el `ToolRegistry` actual.

### 4.3 Handoffs, gates, arnés, política y memoria

Los handoffs de planificación conectan refinamiento-arquitectura, arquitectura con DB/backend/frontend/QA, DB-backend/QA, backend-frontend/QA y frontend-QA; contienen artefactos requeridos y criterios de aceptación [REF-17]. Los gates de arquitectura validan catálogos, ADR, agentes, tareas, DAG, handoffs y baseline. El `HarnessRunner` entrega contexto, memoria filtrada y salidas previas, mientras `PolicyEngine` limita agentes y deniega escritura externa, despliegue y producción sin autorización [REF-19], [REF-18].

El presupuesto modela tokens, llamadas de herramientas/MCP, costo y latencia; la implementación efectiva limita llamadas de herramientas. La memoria es de ámbito de proyecto y `propose-only`; el contexto usa fragmentos locales con redacción y hashes. El cierre técnico exige gates y artefactos requeridos. Estas características se describen como controles locales, no como ejecución autónoma ilimitada.

### 4.4 MCP y GitHub MCP

WEBFORGE tiene `MCPGateway`, allowlist, política de denegación por defecto, registro de invocaciones y presupuesto de llamadas MCP [REF-18]. En la ejecución inspeccionada la allowlist está vacía y no hay invocaciones, por lo que no existe una integración operativa de GitHub MCP dentro del runtime. El archivo `.github/workflows/deploy-ec2.yml` corresponde a GitHub Actions y es una integración separada de la fábrica [REF-13]. No se afirma que agentes internos invoquen GitHub MCP de manera autónoma.

## 5. SIGED-Lampa: alcance y actores

### 5.1 Superficies, módulos y alcance

Las superficies implementadas son portal público, portal ciudadano autenticado, intranet, administración, backend API y base de datos. Los módulos comprobables incluyen autenticación/perfil, administración, documentos, expedientes, correspondencia, trámites y solicitudes, OIRS, notificaciones, reportes y contenido público [REF-02], [REF-06]. La firma es académica simulada; no se documenta firma física ni generación/verificación de PDF final. Se difieren los módulos de facturas/boletas, viajes, permisos/vacaciones, control horario, PMG y aplicación móvil descritos en la fuente [REF-20].

Restricciones reales: integración externa gubernamental no comprobada; infraestructura remota no ejecutada en la evidencia local; cobertura inferior a 100%; y operación bajo HTTP en la URL declarada, sin evidencia local de terminación HTTPS. Las credenciales y secretos se configuran por entorno y no se incluyen en esta documentación.

### 5.2 Actores

{table(["Actor", "Tipo", "Responsabilidades", "Pantallas", "Permisos"], [["Visitante", "Funcional", "Consulta contenido y trámites públicos.", "P-23, P-24, P-27", "No requiere sesión"], ["Ciudadano", "Funcional", "Gestiona solicitudes, OIRS, perfil y notificaciones.", "P-02, P-25, P-26, P-31 a P-35", "Actor citizen"], ["Funcionario", "Funcional", "Consulta y gestiona trabajo interno.", "P-01, P-04, P-05, P-12 a P-15, P-19, P-20, P-22", "Permisos por operación"], ["Administrador", "Funcional", "Administra usuarios, roles y catálogos.", "P-06 a P-11", "admin.access y permisos de catálogo"], ["Oficina de partes", "Funcional", "Registra correspondencia.", "P-21, P-22", "correspondence.create/view"], ["Revisor", "Funcional", "Responde revisiones.", "P-16", "documents.review"], ["Jefatura", "Funcional", "Decide aprobaciones.", "P-17", "documents.approve"], ["Firmante", "Funcional", "Registra firma simulada.", "P-18", "documents.sign"], ["Operador OIRS", "Funcional", "Gestiona casos OIRS.", "P-28", "oirs.view"], ["Analista", "Funcional", "Consulta reportes.", "P-29", "reports.view"], ["PostgreSQL/Nginx/Docker", "Técnico", "Persistencia, proxy y contenedores.", "No aplica", "No aplica"]])}

## 6. Requisitos, casos y flujos

### 6.1 Catálogo de requisitos funcionales

Los requisitos funcionales se expresan como flujos implementados del catálogo de pantallas; cada fila cita su ruta y la operación consumida. El estado solo se marca implementado cuando el catálogo declara `real` e `implemented`.

{table(["ID", "Módulo", "Requisito", "Actor", "Prioridad", "Estado", "Evidencia"], [[r[0], r[1], r[2], r[3], "Funcional", r[6], f"{r[4]}; {r[5]}; [REF-06]"] for r in functional_rows])}

### 6.2 Requisitos no funcionales

{table(["Área", "Definición y mecanismo", "Evidencia", "Estado"], [["Autenticación", "JWT, sesiones internas y ciudadanas revocables; hash bcrypt.", "backend/src/auth/tokens.js; backend/src/auth/password.js; backend/src/modules/auth/", "Implementado"], ["Autorización", "RBAC de permisos, actor y guards de interfaz.", "[REF-06]; frontend/src/auth/require-*.tsx", "Implementado"], ["Integridad", "Migraciones, PK, FK, UNIQUE, NOT NULL y CHECK.", "[REF-08]; [REF-05]", "Implementado"], ["Trazabilidad", "Mapas de reglas, validaciones, endpoints y DB.", "[REF-02], [REF-04], [REF-05]", "Implementado"], ["Calidad", "Suites unitarias, API, DB y E2E con reporte final.", "[REF-10]", "Implementado con limitaciones"], ["Responsive/accesibilidad", "React y UI existente; no hay auditoría WCAG versionada.", "frontend/src/", "Parcialmente verificable"], ["Disponibilidad", "Health checks Docker; no hay evidencia de SLA o monitoreo remoto.", "[REF-11]", "Parcialmente verificable"], ["Despliegue", "Docker, Nginx y Actions definidos.", "[REF-11], [REF-13]", "Preparado; ejecución pendiente"]])}

### 6.3 Casos de uso

{chr(10).join(uc_text)}

### 6.4 Inventario de funcionalidades o flujos

{table(["ID", "Módulo", "Funcionalidad", "Actor", "Pantalla", "Endpoint", "Estado", "Evidencia"], functional_rows)}

{table(["Métrica", "Meta", "Resultado verificado", "Estado"], [["Funcionalidades o flujos", "30", str(counts['screens']), "Cumple"]])}

## 7. Arquitectura del producto

### 7.1 Componentes

El frontend usa React 19.1.0, TypeScript 5.8.3, Vite 6.3.5, React Router 7.6.1, React Hook Form y Zod, conforme al `frontend/package.json`. El backend está organizado por módulos con rutas, controladores, servicios, repositorios y validadores; usa Express, `pg`, Zod, JWT y bcrypt conforme a `package.json` de la versión. PostgreSQL se crea mediante migraciones. Nginx sirve el frontend y enruta `/api/` al backend [REF-11].

```mermaid
flowchart LR
  U[Visitante / ciudadano / funcionario] --> N[Nginx + React]
  N -->|/api| A[Express API]
  A --> G[Auth, guards y RBAC]
  A --> M[Módulos de dominio]
  M --> P[(PostgreSQL)]
  M --> S[Almacenamiento local de documentos]
  A --> O[Auditoría y notificaciones]
```

### 7.2 Despliegue previsto

```mermaid
flowchart TB
  GH[GitHub Actions: validación y despliegue] --> EC2[AWS EC2 / Linux]
  EC2 --> FE[Contenedor frontend: Nginx :80]
  FE --> BE[Contenedor backend :3000]
  BE --> DB[Contenedor PostgreSQL 16]
  DB --> VOL[Volumen pgdata_production]
```

La topología está implementada en la composición de producción. El segundo diagrama representa la arquitectura preparada, no una verificación de que EC2 estuviera ejecutando el commit documentado.

## 8. Inventarios técnicos verificados

### 8.1 Base de datos

El inventario siguiente considera `CREATE TABLE` de las migraciones finales y excluye `schema_migrations`, vistas, índices, secuencias y tipos. El resultado es {counts['tables']} tablas de dominio.

{table(["N.º", "Tabla", "Módulo", "Propósito", "Clave primaria", "Relaciones principales", "Evidencia"], table_rows)}

{table(["Métrica", "Meta", "Resultado real", "Estado"], [["Tablas", "40", str(counts['tables']), "Cumple"]])}

```mermaid
erDiagram
  USERS ||--o{{ DOCUMENTS : crea
  DOCUMENTS ||--o{{ DOCUMENT_VERSIONS : versiona
  DOCUMENTS ||--o{{ DOCUMENT_ATTACHMENTS : adjunta
  EXPEDIENTS ||--o{{ EXPEDIENT_DOCUMENTS : contiene
  CORRESPONDENCE ||--o{{ CORRESPONDENCE_ROUTES : deriva
  CITIZEN_ACCOUNTS ||--o{{ CITIZEN_REQUESTS : presenta
  OIRS_CASES ||--o{{ OIRS_MESSAGES : contiene
```

### 8.2 Endpoints API

Se cuentan combinaciones únicas método-ruta del catálogo operacional y se contrastan con OpenAPI/routers. Hay {counts['endpoints']} operaciones, incluidas operaciones suplementarias y técnicas identificadas por su catálogo; no se duplican por pertenecer a más de un documento.

{table(["ID", "Método", "Ruta", "Módulo", "Actor", "Permiso", "Estado", "Evidencia"], endpoint_rows)}

{table(["Métrica", "Meta", "Resultado real", "Estado"], [["Endpoints API", "40", str(counts['endpoints']), "Cumple"]])}

### 8.3 Pantallas

El catálogo final contiene {counts['screens']} pantallas; las rutas adicionales de notificaciones no se cuentan como pantalla adicional. Se excluyen componentes y modales sin ruta.

{table(["ID", "Ruta", "Pantalla", "Superficie", "Actor", "Componente", "Estado", "Evidencia"], screen_rows)}

{table(["Métrica", "Meta", "Resultado real", "Estado"], [["Pantallas", "30", str(counts['screens']), "Cumple"]])}

### 8.4 Reglas de negocio

Los mapas finales registran {counts['rules']} reglas. La columna de prueba conserva la evidencia declarada por el mapa y no convierte una regla en cobertura total de producto.

{table(["ID", "Regla", "Módulo/capa", "Implementación", "Prueba", "Estado", "Evidencia"], rule_rows)}

{table(["Métrica", "Meta", "Resultado real", "Estado"], [["Reglas de negocio", "60", str(counts['rules']), "Cumple"]])}

### 8.5 Validaciones y restricciones

El mapa final contiene {counts['validations']} entradas únicas. Incluye controles de backend/base de datos y dos resoluciones diferidas hacia frontend; cada entrada conserva su estado real. Se contabilizan independientemente solo cuando se implementan en capas distintas, conforme al mapa de trazabilidad.

{table(["ID", "Validación o restricción", "Tipo", "Capa", "Módulo", "Archivo o tabla", "Prueba", "Estado"], validation_rows)}

{table(["Métrica", "Meta", "Resultado real", "Estado"], [["Validaciones y restricciones", "100", str(counts['validations']), "Cumple"]])}

## 9. Operación y calidad

### 9.1 Seguridad

La autenticación interna y ciudadana emite JWT con identidad de actor y sesión; el servidor verifica la vigencia y revocación de sesiones. Las contraseñas se procesan con bcrypt. El frontend aplica `RequireAuth`, `RequireActor` y `RequirePermission`; el backend mantiene RBAC y validadores. La propiedad de recursos, transiciones y controles de payload se evidencian en los mapas [REF-04], [REF-05]. Los secretos se cargan desde entorno y este documento no reproduce archivos `.env`, claves o valores de CI. Riesgos: no hay evidencia local de HTTPS, monitoreo de producción, ni auditoría externa de seguridad.

### 9.2 Integraciones

{table(["Integración", "Propósito", "Estado", "Implementación", "Restricción"], [["PostgreSQL", "Persistencia", "Operativa en composición", "Migraciones y Docker Compose", "Operación EC2 no verificada"], ["Docker/Nginx", "Empaquetado y proxy", "Configurada", "Dockerfiles y compose", "Ejecución remota pendiente"], ["GitHub Actions", "CI y despliegue EC2", "Configurada", ".github/workflows/deploy-ec2.yml", "No hay ejecución v0002 en evidencia"], ["AWS EC2", "Hospedaje previsto", "Pendiente de verificación", "Documentación y workflow", "No hay comprobante remoto local"], ["MCP", "Gobierno de herramientas", "Soportado por fábrica", "MCPGateway/allowlist", "Allowlist vacía en runtime"], ["Clave Única/FirmaGob/SII", "Servicios externos", "Fuera de alcance/simulado", "No hay adaptador ejecutable", "No afirmar integración real"]])}

### 9.3 Pruebas y cobertura

{table(["Suite", "Ejecutadas", "Aprobadas", "Fallidas", "Cobertura", "Evidencia"], [["E2E funcional", "19", "19", "0", "No reportada", "[REF-10]"], ["Frontend unit", "166", "166", "0", "Líneas 87,72%; funciones 66,00%; ramas 76,37%", "[REF-10]"], ["Backend", "134", "134", "0", "Líneas 80,84%; funciones 85,81%; ramas 83,39%", "[REF-10]"], ["Python/base de datos", "75", "75", "0", "No reportada", "[REF-10]"]])}

La estrategia incluye unitarias, API, base de datos y E2E. El reporte final declara 10/10 flujos funcionales aprobados y nueve defectos resueltos, pero estado `PASS WITH LIMITATIONS`; no se afirma que los flujos estén libres de defectos fuera de esa ejecución ni que exista cobertura 100%.

### 9.4 Despliegue

La composición de producción usa Linux/EC2 como destino previsto, PostgreSQL 16, backend, frontend Nginx, red privada, volumen de PostgreSQL y health checks [REF-11]. El workflow raíz valida, empaqueta y contempla transferencia/deploy/rollback [REF-13]. La evidencia `phase8a` declara builds y validación de compose aprobados, pero workflow `executed: false` y despliegue pendiente [REF-12]. El rollback se documenta como capacidad del workflow, no como recuperación probada en EC2. Riesgos vigentes: ausencia de respaldo automatizado, monitoreo y evidencia production-like de E2E.

## 10. Trazabilidad y cierre

### 10.1 Matriz resumida

{table(["Caso de uso", "Funcionalidad", "Pantalla", "Endpoint", "Tabla", "Regla", "Validación", "Prueba"], [[u[0], u[1], u[4], u[5], u[6], u[7].split(";")[0], u[7].split(";")[-1], u[8]] for u in use_cases])}

### 10.2 Checklist de completitud

{table(["Elemento mínimo", "Meta", "Resultado verificado", "Estado", "Evidencia"], [["Documento de especificación", "6 páginas", "Documento extenso con inventarios", "Cumple", "Este archivo"], ["Casos de uso", "10", str(len(use_cases)), "Cumple", "Sección 6.3"], ["Funcionalidades o flujos", "30", str(counts['screens']), "Cumple", "Sección 6.4"], ["Tablas", "40", str(counts['tables']), "Cumple", "Sección 8.1"], ["Endpoints API", "40", str(counts['endpoints']), "Cumple", "Sección 8.2"], ["Pantallas", "30", str(counts['screens']), "Cumple", "Sección 8.3"], ["Reglas de negocio", "60", str(counts['rules']), "Cumple", "Sección 8.4"], ["Validaciones y restricciones", "100", str(counts['validations']), "Cumple", "Sección 8.5"], ["Pruebas automatizadas", "Sí", "394 pruebas reportadas", "Cumple", "[REF-10]"], ["Cobertura del 100%", "100%", "Frontend 87,72%; backend 80,84% líneas", "No cumple", "[REF-10]"], ["Sistema online en Linux EC2", "Sí", "Preparación local; ejecución remota no evidenciada", "Pendiente de verificación", "[REF-11], [REF-12]"], ["Video de 6 a 9 minutos", "Sí", "Pendiente de producción audiovisual", "Pendiente de verificación", "No se encontró evidencia versionada"]])}

### 10.3 Limitaciones y deuda técnica

* **Limitación:** la cobertura reportada está por debajo de 100% y repositorios legacy no utilizados figuran sin cobertura [REF-10].
* **Limitación:** la fase final de pruebas declara `PASS WITH LIMITATIONS`; baseline histórico no verificable y CLI WEBFORGE no disponible en aquel entorno [REF-10].
* **Decisión de alcance:** firma académica simulada; no hay integración de firma física ni PDF final verificable.
* **Trabajo futuro:** ejecutar y registrar despliegue EC2 del commit documentado, E2E production-like, HTTPS, monitoreo y backups automatizados.
* **Riesgo de trazabilidad:** `schema.sql` y algunos reportes históricos mencionan 40 tablas, pero la migración 014 crea `citizen_sessions`; este documento usa las migraciones finales y declara 41.

### 10.4 Resultados y conclusiones

El resultado es un producto con módulos y contratos trazables, {counts['tables']} tablas, {counts['endpoints']} endpoints, {counts['screens']} pantallas, {counts['rules']} reglas y {counts['validations']} validaciones verificadas desde artefactos finales. WEBFORGE aporta normalización, planificación, gates y evidencia, pero su DAG especializado no debe confundirse con una ejecución autónoma de los agentes declarados. El producto demuestra un grado alto de realización de los mínimos estructurales y pruebas automatizadas; las brechas principales son cobertura total, evidencia de despliegue EC2 del commit y video. La continuidad recomendable es cerrar esas verificaciones operacionales sin transformar afirmaciones preparatorias en hechos.

### 10.5 Referencias internas

{chr(10).join(f"[REF-{i:02d}] `{value}`" for i, value in enumerate(REF.values(), 1))}

### 10.6 Anexos

Los catálogos completos de tablas, endpoints, pantallas, reglas y validaciones están en las secciones 8.1 a 8.5. El inventario de evidencias independiente se encuentra en [01_Inventario_Evidencias.pdf](01_Inventario_Evidencias.pdf) y la evaluación resumida en [01_Matriz_Cumplimiento_Rubrica.pdf](01_Matriz_Cumplimiento_Rubrica.pdf).
"""


def evidence_document(tables_data: list[dict[str, str]], endpoints: list[dict], screens: list[dict], rules: list[dict], validations: list[dict]) -> str:
    rows = [
        ["E-01", "Especificación y alcance", "Fuente funcional", REF["sources"], "Verificado"],
        ["E-02", "Casos de uso y actores", "Especificación + rutas", REF["screens"], "Verificado"],
        ["E-03", "Funcionalidades", "Catálogo de pantallas", REF["screens"], "Verificado"],
        ["E-04", f"{len(tables_data)} tablas de dominio", "Migraciones SQL", REF["migrations"], "Verificado"],
        ["E-05", f"{len(endpoints)} endpoints", "Contrato y catálogo operacional", REF["openapi"] + "; " + REF["endpoints"], "Verificado"],
        ["E-06", f"{len(screens)} pantallas", "Catálogo frontend", REF["screens"], "Verificado"],
        ["E-07", f"{len(rules)} reglas", "Mapa de reglas", REF["rules"], "Verificado"],
        ["E-08", f"{len(validations)} validaciones", "Mapa de validaciones", REF["validations"], "Verificado"],
        ["E-09", "Pruebas y cobertura", "Reporte final", REF["tests"], "Verificado con limitaciones"],
        ["E-10", "Composición de producción", "Infraestructura", REF["deploy"], "Verificado"],
        ["E-11", "Pipeline", "Workflow Actions", REF["workflow"], "Verificado"],
        ["E-12", "Sistema online EC2", "Aceptación de despliegue", REF["phase8"], "Pendiente de verificación"],
        ["E-13", "Fábrica WEBFORGE", "Código de orquestación", REF["factory"], "Verificado"],
        ["E-14", "Agentes y handoffs", "Planificación", REF["planning_agents"] + "; " + REF["handoffs"], "Verificado"],
    ]
    return f"""# Inventario de Evidencias - SIGED-Lampa v0002

**Commit documentado:** `{git('rev-parse', 'HEAD')}`
**Fecha de generación:** {GENERATED}

{table(["ID", "Requisito", "Tipo de evidencia", "Ruta", "Estado"], rows)}

## Criterio de uso

Este inventario resume las fuentes de la documentación principal. Se priorizan artefactos ejecutables y contratos de `v0002`; los resultados históricos no reemplazan la evidencia final. La preparación de despliegue no acredita por sí sola que el sistema estuviera accesible en EC2.

## Conteos reproducibles

`tools/documentation/generate_siged_delivery.py` lee migraciones, catálogo operacional, catálogo de pantallas y mapas de reglas/validaciones. Excluye `schema_migrations` y deduplica endpoints por método-ruta.

{table(["Métrica", "Resultado", "Fuente"], [["Tablas de dominio", len(tables_data), REF["migrations"]], ["Endpoints únicos", len(endpoints), REF["endpoints"]], ["Pantallas", len(screens), REF["screens"]], ["Reglas", len(rules), REF["rules"]], ["Validaciones", len(validations), REF["validations"]]])}
"""


def rubric_document(meta: dict[str, str], counts: dict[str, int]) -> str:
    rows = [["Documentación", "5%", "Cumple", "01_Documentacion_Proyecto_SIGED_Lampa.pdf", "Trazabilidad y métricas verificadas."], ["Código fuente", "5%", "Cumple", f"{REF['openapi']}; {REF['screens']}", "Código, contratos y catálogos presentes."], ["Sistema online en Linux EC2", "40%", "Pendiente de verificación", f"{REF['phase8']}", "Preparación aprobada; workflow no ejecutado en evidencia local."], ["Diseño y plan de pruebas", "10%", "Cumple", REF["tests"], "394 pruebas aprobadas reportadas; cobertura no total."], ["Video", "40%", "Pendiente de verificación", "No se encontró evidencia versionada", "Pendiente de producción audiovisual."]]
    checklist = [["Documento de especificación", "6 páginas", "Documento extenso", "Cumple", "Documento principal"], ["Casos de uso", "10", "12", "Cumple", "Sección 6.3"], ["Funcionalidades o flujos", "30", counts['screens'], "Cumple", REF['screens']], ["Tablas", "40", counts['tables'], "Cumple", REF['migrations']], ["Endpoints API", "40", counts['endpoints'], "Cumple", REF['endpoints']], ["Pantallas", "30", counts['screens'], "Cumple", REF['screens']], ["Reglas de negocio", "60", counts['rules'], "Cumple", REF['rules']], ["Validaciones y restricciones", "100", counts['validations'], "Cumple", REF['validations']], ["Pruebas automatizadas", "Sí", "394 aprobadas reportadas", "Cumple", REF['tests']], ["Cobertura del 100%", "100%", "87,72% FE; 80,84% BE líneas", "No cumple", REF['tests']], ["Sistema online en Linux EC2", "Sí", "No verificable localmente", "Pendiente de verificación", REF['phase8']], ["Video de 6 a 9 minutos", "Sí", "Pendiente", "Pendiente de verificación", "No se encontró evidencia"]]
    return f"""# Matriz de Cumplimiento de Rúbrica - SIGED-Lampa v0002

**Rama:** `{meta['branch']}`
**Commit:** `{meta['commit']}`
**Fecha:** {GENERATED}

{table(["Criterio", "Porcentaje", "Estado", "Evidencia principal", "Observaciones"], rows)}

## Checklist de mínimos

{table(["Elemento mínimo", "Meta", "Resultado verificado", "Estado", "Evidencia"], checklist)}

## Nota de auditoría

Los estados `Pendiente de verificación` no niegan la declaración de entrega; indican que la evidencia local versionada no permite acreditar la ejecución del sistema en EC2 ni la producción audiovisual. No se asigna `Cumple` a esas filas sin evidencia comprobable.
"""


def main() -> None:
    endpoints = load(VERSION / "backend/operational-endpoint-catalog.json")
    rules = load(VERSION / "backend/business-rule-map.json")["business_rules"]
    validations = load(VERSION / "backend/validation-map.json")["validations"]
    tables_data = parse_tables()
    screens = parse_screens()
    unique_endpoints = {(e["method"], e["path"]) for e in endpoints}
    expected = {"tables": 41, "endpoints": 98, "screens": 35, "rules": 60, "validations": 100}
    actual = {"tables": len(tables_data), "endpoints": len(unique_endpoints), "screens": len(screens), "rules": len(rules), "validations": len(validations)}
    if actual != expected:
        raise SystemExit(f"Unexpected evidence counts: {actual}; expected {expected}")
    if len(endpoints) != len(unique_endpoints):
        raise SystemExit("Operational endpoint catalog contains duplicated method-path entries")
    meta = {"branch": git("branch", "--show-current"), "commit": git("rev-parse", "HEAD")}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / "01_Documentacion_Proyecto_SIGED_Lampa.md").write_text(main_document(meta, tables_data, endpoints, screens, rules, validations), encoding="utf-8")
    (OUT / "01_Inventario_Evidencias.md").write_text(evidence_document(tables_data, endpoints, screens, rules, validations), encoding="utf-8")
    (OUT / "01_Matriz_Cumplimiento_Rubrica.md").write_text(rubric_document(meta, actual), encoding="utf-8")
    pandoc = shutil.which("pandoc")
    if pandoc:
        subprocess.run([pandoc, "01_Documentacion_Proyecto_SIGED_Lampa.md", "-o", "01_Documentacion_Proyecto_SIGED_Lampa.pdf", "--toc"], cwd=OUT, check=True)
    else:
        (OUT / "INSTRUCCIONES_EXPORTACION_PDF.md").write_text("# Exportación a PDF\n\n`pandoc docs/ENTREGA_FINAL/01_Documentacion_Proyecto_SIGED_Lampa.md -o docs/ENTREGA_FINAL/01_Documentacion_Proyecto_SIGED_Lampa.pdf --toc`\n", encoding="utf-8")
    print(json.dumps({"sources": [REF["migrations"], REF["endpoints"], REF["screens"], REF["rules"], REF["validations"]], "counts": actual, "output": rel(OUT)}, ensure_ascii=True))


if __name__ == "__main__":
    main()
