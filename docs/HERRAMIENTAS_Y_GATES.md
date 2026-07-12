# Herramientas y Gates de la Fábrica WebForge

## Tool Registry

El registro de herramientas (`ToolRegistry`) define las herramientas disponibles,
sus políticas de timeouts, permisos y gate de validación.

### Tools de Filesystem

| Tool ID | Propósito | Writes | Timeout |
|---------|-----------|--------|---------|
| `tool.fs.read` | Leer contenido de archivo | No | 30s |
| `tool.fs.list` | Listar contenido de directorio | No | 30s |
| `tool.fs.search` | Buscar archivos por glob | No | 30s |
| `tool.fs.create` | Crear archivo nuevo | Sí | 30s |
| `tool.fs.replace` | Reemplazar contenido | Sí | 30s |
| `tool.fs.patch` | Parchear archivo (coincidencia única) | Sí | 30s |
| `tool.fs.delete` | Eliminar archivo | Sí | 30s |
| `tool.fs.move` | Mover/renombrar archivo | Sí | 30s |

### Tools de Procesos

| Tool ID | Propósito | Timeout |
|---------|-----------|---------|
| `tool.process.run` | Ejecutar proceso seguro (allowlist) | 60s |
| `tool.build.run` | Ejecutar comando de build | 120s |
| `tool.lint.run` | Ejecutar linter | 60s |
| `tool.test.unit` | Pruebas unitarias | 120s |
| `tool.test.api` | Pruebas de API | 120s |
| `tool.test.integration` | Pruebas de integración | 180s |
| `tool.test.e2e` | Pruebas end-to-end | 300s |
| `tool.test.coverage` | Cobertura de pruebas | 120s |

### Tools de Base de Datos (wrappers genéricos)

| Tool ID | Propósito | Writes |
|---------|-----------|--------|
| `tool.db.start` | Iniciar base de datos | No |
| `tool.db.stop` | Detener base de datos | No |
| `tool.db.migrate` | Ejecutar migraciones | Sí |
| `tool.db.seed` | Sembrar datos | Sí |
| `tool.db.verify_schema` | Verificar esquema | No |

### Tools de Workspace

| Tool ID | Propósito | Writes |
|---------|-----------|--------|
| `tool.workspace.snapshot` | Crear snapshot del workspace | No |
| `tool.workspace.rollback` | Revertir workspace desde snapshot | Sí |
| `tool.workspace.promote_to_qa` | Promover DEV fixture a QA | Sí |

### Otras Tools

| Tool ID | Propósito | Gate |
|---------|-----------|------|
| `tool.sandbox.dev_materialize` | Materializar bundle en DEV | sandbox |
| `tool.security.secrets` | Escaneo de secretos | secrets |
| `tool.security.deps` | Escaneo de dependencias | dependency |
| `tool.sbom.generate` | Generación de SBOM | sbom |
| `tool.policy.static` | Escaneo de políticas estáticas | policy |
| `tool.validation.artifacts` | Validación de artefactos | final_format |
| `tool.http.healthcheck` | Healthcheck HTTP | http |

## Gates de Fase 3

| Gate | Descripción | Comprobación |
|------|-------------|-------------|
| GATE-TOOLS-001 | Registro válido | IDs únicos, agents asignados, timeouts>0 |
| GATE-TOOLS-002 | Permisos efectivos | Agente autorizado para todas las tools |
| GATE-TOOLS-003 | Filesystem seguro | Traversal, rutas externas y secretos bloqueados |
| GATE-TOOLS-004 | Ejecución segura | shell=False, allowlist, operadores bloqueados |
| GATE-WORKSPACE-001 | Cambios trazables | Changes registrados, hashes, change sets |
| GATE-WORKSPACE-002 | Snapshot y rollback | Snapshot verificado, rollback restaura hashes |
| GATE-WORKSPACE-003 | Promoción controlada | Clone superado, promoción DEV→QA superada |
| GATE-REPAIR-001 | Reparación limitada | Max cycles enforced, same error stop |
| GATE-BASELINE-001 | Baseline preservado | Hashes de documentos fuente sin cambios |

## Políticas de Herramientas

Cada herramienta declara en su `CommandPolicy`:

```json
{
  "tool_id": "tool.fs.read",
  "allowed_agents": ["agent.backend", "agent.frontend"],
  "timeout_seconds": 30,
  "max_stdout_bytes": 1048576,
  "max_stderr_bytes": 1048576,
  "network_policy": "deny",
  "writes_workspace": false,
  "requires_snapshot": false,
  "requires_approval": false
}
```
