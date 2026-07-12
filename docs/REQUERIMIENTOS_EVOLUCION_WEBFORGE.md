Actúa como arquitecto de software senior y desarrollador principal del repositorio actual. Debes evolucionar WEBFORGE desde un runtime determinista que materializa una aplicación SIGED predefinida hacia una mini fábrica agéntica especializada, reproducible y verificable, capaz de conducir los documentos de especificación de SIGED-Lampa hasta una aplicación web funcional, probada y desplegable.

Trabaja directamente sobre el repositorio local actual.

## 1. Objetivo académico

La solución debe cumplir con la evaluación de una “Mini fábrica agéntica de procesos”.

La fábrica debe demostrar explícitamente:

1. entrada clara;
2. refinamiento;
3. planificación;
4. especialización por agentes;
5. reglas y workflows;
6. arnés;
7. handoffs;
8. ejecución reproducible;
9. validación;
10. evidencia;
11. cierre técnico;
12. generación o actualización de una aplicación web funcional.

El caso de trabajo es SIGED-Lampa, un sistema web de gestión documental municipal.

No intentes construir una fábrica universal para cualquier tipo de software. Implementa una fábrica especializada en sistemas web administrativos y, para esta entrega, enfocada en SIGED-Lampa.

La solución completa debe ser defendible académicamente y ejecutable dentro de un alcance equivalente a 20 horas de trabajo.

## 2. Documentos fuente

Localiza dentro del repositorio estos documentos, usando búsqueda por nombre si no están en una carpeta conocida:

* `Especificacion_Funcional_SIGED_Lampa.md`
* `Inventario_Endpoints_SIGED_Lampa.md`
* `Mapa_Pantallas_Navegacion_SIGED_Lampa.md`
* `Modelo_ER_Detallado_SIGED_Lampa.md`

Estos documentos son las fuentes funcionales del proyecto.

No copies solamente sus conteos. Debes utilizarlos para producir artefactos estructurados, trazabilidad, validaciones y código.

Los documentos definen aproximadamente:

* 12 casos de uso;
* 30 funcionalidades o workflows;
* 40 tablas;
* 40 endpoints;
* 30 pantallas;
* 60 reglas de negocio;
* 100 validaciones y restricciones.

## 3. Restricciones de implementación

Respeta estas restricciones:

* Mantén funcionando la aplicación SIGED existente durante la migración.
* No elimines el workflow, los principios, los gates, el arnés, los sandboxes ni el sistema de evidencias actual.
* Reutiliza la arquitectura actual cuando sea razonable.
* Evita una reescritura total del repositorio.
* No introduzcas abstracciones innecesarias.
* No agregues soporte para múltiples stacks en esta versión.
* No incorpores Kubernetes.
* No implementes integraciones reales con Clave Única, FirmaGob o SII.
* Las integraciones externas pueden permanecer simuladas, pero deben estar claramente identificadas como simulaciones académicas.
* Toda operación peligrosa, publicación o despliegue debe seguir requiriendo aprobación explícita.
* No expongas secretos ni los escribas en archivos del repositorio.
* Mantén compatibilidad con Linux y despliegue en EC2.
* Usa rutas relativas, nunca rutas absolutas de Windows.
* Antes de modificar un archivo, revisa su implementación y sus pruebas asociadas.

## 4. Trabajo inicial obligatorio

Antes de implementar:

1. inspecciona la estructura completa del repositorio;
2. identifica el flujo actual de `WebForgeFactory`;
3. identifica los agentes, fases, handlers, gates y herramientas;
4. identifica cómo se genera actualmente SIGED-Lampa;
5. identifica cómo se ejecutan las pruebas;
6. identifica el mecanismo de despliegue EC2;
7. ejecuta las pruebas existentes;
8. registra cualquier prueba que ya falle antes de tus cambios.

Luego genera un archivo:

`docs/PLAN_EVOLUCION_FABRICA.md`

Debe contener:

* diagnóstico del estado actual;
* componentes reutilizables;
* componentes que requieren cambios;
* riesgos;
* fases de implementación;
* archivos que serán modificados;
* criterios de aceptación.

Después del plan, continúa con la implementación sin solicitar confirmación, salvo que una acción requiera credenciales, secretos, publicación externa o despliegue real.

## 5. Arquitectura objetivo

Implementa este flujo:

```text
WorkOrder
    ↓
Carga de documentos fuente
    ↓
Agente de refinamiento
    ↓
Especificación normalizada
    ↓
Agente arquitecto y planificador
    ↓
DAG de tareas
    ↓
Agentes Database, Backend y Frontend
    ↓
Agente QA
    ↓
Build → Test → Diagnose → Repair
    ↓
Validación en QA
    ↓
Paquete desplegable
    ↓
Cierre técnico y evidencias
```

No es obligatorio que todos los agentes utilicen un LLM externo. Pueden combinarse:

* razonamiento o refinamiento asistido por modelo cuando exista proveedor configurado;
* generación determinista para SQL, configuración, trazabilidad y scaffolding;
* handlers locales como fallback reproducible.

La fábrica debe poder funcionar en modo local determinista aunque no exista una API key.

## 6. Normalización de los documentos

Agrega una fase explícita de normalización.

La fábrica debe transformar los `.md` en estos artefactos:

```text
project/<project_id>/spec/
├── product.json
├── modules.json
├── actors.json
├── use-cases.json
├── workflows.json
├── screens.json
├── endpoints.json
├── entities.json
├── business-rules.json
├── validations.json
└── traceability.json
```

Usa modelos tipados o esquemas validados.

Cada objeto debe conservar su código original, por ejemplo:

* `UC-01`
* `FF-01`
* `P-01`
* `API-001`
* `BR-001`
* `VAL-001`

Implementa validaciones de consistencia:

* códigos duplicados;
* pantalla sin módulo;
* pantalla sin ruta;
* endpoint sin módulo;
* endpoint sin método;
* regla sin módulo;
* validación sin descripción;
* caso de uso sin actor;
* referencias hacia códigos inexistentes;
* rutas ambiguas;
* tablas duplicadas;
* falta de conteos mínimos;
* pantallas declaradas sin endpoints asociados;
* endpoints declarados sin pantalla o workflow relacionado, cuando corresponda.

Genera:

* `normalization-report.json`
* `normalization-findings.md`

Los errores bloqueantes deben detener el avance. Las advertencias deben quedar registradas.

## 7. Ampliación del WorkOrder

Revisa `webforge/models.py` o su equivalente.

Amplía `WorkOrder` sin romper compatibilidad con los WorkOrders actuales.

Debe soportar al menos:

```json
{
  "project_id": "siged-lampa",
  "project_version": "v0002",
  "objective": "Construir y validar SIGED-Lampa",
  "product_type": "administrative_fullstack_web_app",
  "source_documents": [],
  "stack": {
    "frontend": "existing",
    "backend": "node",
    "database": "postgresql",
    "deployment": "ec2"
  },
  "minimum_scope": {
    "use_cases": 10,
    "workflows": 30,
    "tables": 40,
    "endpoints": 40,
    "screens": 30,
    "business_rules": 60,
    "validations": 100
  },
  "quality": {
    "coverage_threshold": 100,
    "require_database_validation": true,
    "require_e2e": true
  }
}
```

Los nuevos campos deben tener valores predeterminados seguros.

## 8. Agentes especializados

Implementa o formaliza estos seis agentes:

### 8.1 Agente de refinamiento

Responsabilidades:

* leer fuentes;
* normalizar contenido;
* detectar contradicciones;
* producir hallazgos;
* completar relaciones derivables;
* no inventar requisitos críticos.

Entradas:

* WorkOrder;
* documentos fuente.

Salidas:

* catálogos JSON;
* reporte de normalización;
* decisiones pendientes.

### 8.2 Agente arquitecto y planificador

Responsabilidades:

* definir arquitectura;
* validar coherencia entre frontend, backend y DB;
* producir contratos;
* generar DAG de tareas;
* definir dependencias y criterios de finalización.

Salidas:

* `architecture.json`
* `implementation-plan.md`
* `tasks.json`
* `task-dag.json`

### 8.3 Agente Database

Responsabilidades:

* generar PostgreSQL real;
* crear migraciones;
* crear seeds;
* crear restricciones;
* crear índices;
* comprobar migraciones desde cero.

Salidas:

* `database/schema.sql`
* `database/migrations/`
* `database/seeds/`
* `database/validation-map.json`
* `database-report.json`

### 8.4 Agente Backend

Responsabilidades:

* implementar endpoints;
* implementar reglas de negocio;
* implementar validaciones;
* mantener contrato API;
* producir pruebas unitarias, API e integración.

### 8.5 Agente Frontend

Responsabilidades:

* implementar rutas;
* implementar las pantallas requeridas;
* conectar API;
* aplicar guards por rol;
* reutilizar componentes configurables;
* producir pruebas de navegación y E2E.

### 8.6 Agente QA y Release

Responsabilidades:

* build;
* lint;
* pruebas;
* cobertura;
* validación de DB;
* E2E;
* diagnóstico de errores;
* reparación acotada;
* empaquetado;
* health check;
* generación del informe final.

Cada agente debe declarar:

* identificador;
* responsabilidad;
* entradas;
* salidas;
* herramientas permitidas;
* gates;
* handoff de destino.

Crea o actualiza un manifiesto de agentes.

## 9. Arnés y handoffs

Modifica el arnés para que cada ejecución registre:

* `run_id`;
* `cycle_id`;
* agente;
* fase;
* tarea;
* hashes de entrada;
* contexto utilizado;
* herramientas invocadas;
* archivos creados o modificados;
* resultado;
* evidencia;
* gate;
* handoff de destino.

Genera:

```text
agent-ledger.jsonl
handoff-ledger.jsonl
tool-logs.jsonl
```

Un handoff debe contener como mínimo:

```json
{
  "from": "agent.database",
  "to": "agent.backend",
  "task_id": "TASK-DB-001",
  "outputs": [
    "database/schema.sql",
    "database-report.json"
  ],
  "status": "accepted"
}
```

## 10. Registro de herramientas

Amplía el registro actual de herramientas.

Implementa wrappers seguros para:

```text
tool.fs.read
tool.fs.list
tool.fs.search
tool.fs.write
tool.fs.patch
tool.shell.run
tool.build.run
tool.lint.run
tool.test.unit
tool.test.api
tool.test.integration
tool.test.e2e
tool.test.coverage
tool.db.migrate
tool.db.seed
tool.db.verify_schema
tool.http.healthcheck
tool.git.diff
```

Requisitos:

* solo operar dentro del workspace permitido;
* prohibir path traversal;
* tener timeout;
* registrar comando, exit code, stdout y stderr;
* limitar tamaño de salida;
* no permitir comandos destructivos arbitrarios;
* usar allowlist para ejecutables;
* registrar toda invocación;
* respetar presupuesto.

No ejecutes despliegue ni publicación sin aprobación.

## 11. Editor incremental del workspace

El materializador actual puede conservarse para la creación inicial, pero agrega edición incremental.

Implementa operaciones:

* crear archivo;
* aplicar parche;
* reemplazar archivo;
* eliminar archivo autorizado;
* snapshot;
* rollback.

Cada cambio debe producir un registro:

```json
{
  "change_id": "CHG-0001",
  "agent_id": "agent.backend",
  "task_id": "TASK-API-001",
  "files": [],
  "before_hashes": {},
  "after_hashes": {},
  "reason": "",
  "validation_required": []
}
```

No regeneres todo el proyecto por un cambio pequeño.

## 12. PostgreSQL real

Este punto es obligatorio.

Reemplaza el esquema genérico basado casi exclusivamente en:

* `id`;
* `uuid`;
* `code`;
* `name`;
* `status`;
* `payload JSONB`;

por un esquema relacional coherente con `Modelo_ER_Detallado_SIGED_Lampa.md`.

Implementa realmente:

* 40 tablas;
* PK;
* FK;
* `NOT NULL`;
* `UNIQUE`;
* `CHECK`;
* índices;
* campos funcionales;
* auditoría;
* soft delete cuando corresponda.

Resuelve correctamente relaciones circulares mediante:

* columnas inicialmente nullable;
* `ALTER TABLE` posterior;
* o eliminación justificada de redundancias.

No necesitas implementar las 40 tablas con CRUD completo, pero las 40 deben:

* existir;
* migrar correctamente;
* tener estructura coherente;
* tener pruebas de esquema;
* ser verificables en PostgreSQL.

Agrega Docker Compose para desarrollo y QA si no existe:

```text
docker-compose.dev.yml
docker-compose.qa.yml
```

Incluye PostgreSQL y la aplicación.

La aplicación debe usar PostgreSQL para sus flujos principales. No declares PostgreSQL como activo si la aplicación continúa usando exclusivamente JSON.

Si necesitas una transición, permite un adaptador de persistencia con:

* `JsonRepository` solo para compatibilidad;
* `PostgresRepository` como implementación objetivo;
* selección por configuración;
* PostgreSQL como configuración usada en QA y producción.

## 13. API y OpenAPI

Genera un contrato:

`openapi.yaml`

El contrato debe basarse en `Inventario_Endpoints_SIGED_Lampa.md`.

Mantén como mínimo los 40 endpoints.

Agrega los endpoints faltantes necesarios para coherencia, incluyendo, cuando corresponda:

```text
GET  /api/v1/admin/procedure-types
POST /api/v1/admin/procedure-types
GET  /api/v1/admin/external-entities
POST /api/v1/admin/external-entities
PATCH /api/v1/notifications/{id}/read
```

Puedes superar 40 endpoints.

Asegura consistencia entre:

* inventario;
* OpenAPI;
* router;
* controlador;
* pruebas;
* pantalla;
* permisos.

Las integraciones simuladas deben responder de manera explícita:

```json
{
  "mode": "academic_simulation"
}
```

## 14. Frontend y 30 pantallas

Mantén el frontend actual cuando sea posible.

Corrige la navegación para tener rutas canónicas:

```text
/                         portal público
/login                    login ciudadano
/recover                  recuperación
/portal/...                área ciudadana
/intranet/login           login funcionario
/intranet/...              área interna
/intranet/admin/...        administración
/intranet/reports/...      reportes
```

No dejes rutas alternativas ambiguas.

Asegura que las 30 pantallas declaradas:

* tengan ruta;
* carguen sin error;
* tengan componente o configuración;
* tengan actor autorizado;
* estén relacionadas con uno o más endpoints;
* sean navegables en pruebas.

Usa componentes reutilizables para reducir complejidad:

* `GenericListPage`;
* `GenericDetailPage`;
* `GenericFormPage`;
* `GenericWorkflowPage`;
* `DashboardPage`;
* `LoginPage`.

No generes treinta implementaciones totalmente duplicadas.

## 15. Reglas y validaciones

Crea:

```text
business-rule-map.json
validation-map.json
```

Cada una de las 60 reglas debe contener:

```json
{
  "id": "BR-001",
  "description": "",
  "module": "M01",
  "implementation": [],
  "tests": [],
  "status": "implemented"
}
```

Cada una de las 100 validaciones debe contener:

```json
{
  "id": "VAL-001",
  "description": "",
  "layers": ["frontend", "api", "database"],
  "implementation": [],
  "tests": [],
  "status": "implemented"
}
```

Clasifica las validaciones en:

* base de datos;
* backend;
* frontend;
* autorización;
* workflow.

No todas deben convertirse en `CHECK`. Usa la capa apropiada.

La fábrica no puede declarar éxito si una validación queda solamente documentada.

## 16. Matriz de trazabilidad

Genera automáticamente:

* `Matriz_Trazabilidad_SIGED_Lampa.md`
* `traceability.json`

Cada fila debe relacionar:

```text
Caso de uso
→ workflow
→ pantalla
→ endpoint
→ tabla
→ regla
→ validación
→ prueba
→ archivo de código
→ evidencia
```

La matriz debe detectar elementos huérfanos.

Genera un resumen:

```json
{
  "use_cases": {"defined": 12, "traced": 12},
  "workflows": {"defined": 30, "traced": 30},
  "screens": {"defined": 30, "traced": 30},
  "endpoints": {"defined": 44, "traced": 44},
  "tables": {"defined": 40, "traced": 40},
  "business_rules": {"defined": 60, "traced": 60},
  "validations": {"defined": 100, "traced": 100}
}
```

## 17. Plan y diseño de pruebas

Crea:

`docs/Plan_Pruebas_SIGED_Lampa.md`

Debe incluir:

* objetivo;
* alcance;
* ambiente;
* datos de prueba;
* estrategia;
* criterios de entrada;
* criterios de salida;
* pruebas unitarias;
* pruebas API;
* pruebas de integración;
* pruebas de DB;
* pruebas E2E;
* pruebas de permisos;
* pruebas negativas;
* pruebas de despliegue;
* matriz de cobertura;
* riesgos;
* evidencia esperada.

Implementa suites separadas:

```text
tests/
├── unit/
├── api/
├── database/
├── integration/
├── e2e/
└── acceptance/
```

Las pruebas deben cubrir comportamiento, no solo contar cadenas o elementos.

## 18. Cobertura

Agrega un comando reproducible:

```bash
npm run coverage
```

o el equivalente según la estructura actual.

El pipeline debe producir:

```text
coverage-report/
test-report.json
endpoint-coverage.json
screen-coverage.json
rule-coverage.json
validation-coverage.json
acceptance-report.json
```

Debes diferenciar:

* cobertura de líneas;
* cobertura de funciones;
* endpoints probados;
* pantallas probadas;
* reglas trazadas;
* validaciones probadas;
* casos de uso cubiertos.

Configura un umbral del 100% para el código incluido en la medición académica.

Excluye únicamente:

* archivos generados;
* configuración;
* adaptadores imposibles de probar localmente;
* bloques explícitamente marcados e informados.

No falsifiques cobertura y no declares 100% sin informe generado.

## 19. Ciclo build-test-repair

Agrega un ciclo controlado:

```text
implement
→ build
→ test
→ diagnose
→ repair
→ build
```

Política:

```yaml
max_cycles: 3
stop_on_same_error: 2
```

El diagnóstico debe recibir:

* comando;
* exit code;
* stderr;
* prueba fallida;
* archivos relevantes;
* último diff;
* criterio esperado.

Registra cada ciclo en:

`repair-ledger.jsonl`

No permitas ciclos infinitos.

## 20. Gates de producto

Separa el estado de la fábrica del estado del producto.

El informe final debe incluir:

```json
{
  "factory_status": "complete",
  "product_status": "accepted",
  "documentation_status": "complete",
  "normalization_status": "pass",
  "architecture_status": "pass",
  "build_status": "pass",
  "database_status": "pass",
  "api_status": "pass",
  "frontend_status": "pass",
  "test_status": "pass",
  "coverage_status": "pass",
  "security_status": "pass",
  "deployment_readiness": "pass"
}
```

El producto solo puede quedar `accepted` si pasan:

* conteos mínimos;
* build;
* migración de DB;
* pruebas de DB;
* pruebas API;
* E2E crítico;
* matriz de trazabilidad;
* 60 reglas trazadas;
* 100 validaciones implementadas y probadas;
* cobertura exigida;
* health check local.

El despliegue real en EC2 puede quedar como `pending_approval` si no existen credenciales.

## 21. Evidencias finales

Cada corrida debe producir:

```text
runs/<run_id>/
├── work-order.json
├── normalized-spec.json
├── normalization-report.json
├── architecture.json
├── implementation-plan.md
├── tasks.json
├── task-dag.json
├── agent-ledger.jsonl
├── handoff-ledger.jsonl
├── tool-logs.jsonl
├── repair-ledger.jsonl
├── traceability.json
├── Matriz_Trazabilidad_SIGED_Lampa.md
├── database-report.json
├── endpoint-report.json
├── screen-report.json
├── rule-coverage.json
├── validation-coverage.json
├── test-report.json
├── coverage-report/
├── security-review.md
├── deploy-readiness.json
├── healthcheck.json
└── final-report.json
```

## 22. CLI

Amplía la CLI manteniendo compatibilidad.

Agrega comandos equivalentes a:

```bash
python -m webforge normalize --work-order ...
python -m webforge plan --project siged-lampa
python -m webforge build --project siged-lampa
python -m webforge test --project siged-lampa
python -m webforge validate --project siged-lampa
python -m webforge resume --run-id ...
python -m webforge report --run-id ...
```

El comando actual `run` debe seguir funcionando y puede ejecutar el ciclo completo.

## 23. Documentación adicional

Crea o actualiza:

```text
docs/
├── PLAN_EVOLUCION_FABRICA.md
├── ARQUITECTURA_FABRICA.md
├── AGENTES_Y_HANDOFFS.md
├── HERRAMIENTAS_Y_GATES.md
├── Plan_Pruebas_SIGED_Lampa.md
├── Matriz_Trazabilidad_SIGED_Lampa.md
├── Checklist_Completitud_Producto.md
├── GUIA_EJECUCION_REPRODUCIBLE.md
└── GUIA_DESPLIEGUE_EC2.md
```

Corrige los enlaces absolutos de Windows en los documentos fuente cuando estén dentro del repositorio.

Usa enlaces relativos.

## 24. Despliegue EC2

Conserva el workflow existente de GitHub Actions cuando sea útil.

Asegura que:

* ejecute pruebas;
* valide cobertura;
* prepare variables;
* empaquete la aplicación;
* migre PostgreSQL;
* despliegue en Linux;
* reinicie el servicio;
* ejecute health check;
* preserve logs;
* no imprima secretos.

No ejecutes el despliegue real sin aprobación y credenciales.

Genera un reporte de preparación para despliegue aunque no se publique.

## 25. Compatibilidad y migraciones

No rompas los comandos actuales sin una justificación clara.

Cuando cambies formatos:

* conserva parser de formatos anteriores;
* agrega versión de esquema;
* documenta migración;
* agrega pruebas de compatibilidad.

Los artefactos nuevos deben incluir un campo `schema_version`.

## 26. Pruebas obligatorias de la fábrica

Agrega pruebas para verificar:

1. normalización correcta de los cuatro documentos;
2. detección de códigos duplicados;
3. detección de referencias inexistentes;
4. rechazo de path traversal;
5. generación del DAG;
6. handoffs;
7. registro de herramientas;
8. snapshot y rollback;
9. migración PostgreSQL desde cero;
10. existencia de 40 tablas;
11. correspondencia OpenAPI-router;
12. existencia de las 30 rutas;
13. trazabilidad de 60 reglas;
14. trazabilidad de 100 validaciones;
15. ciclo de reparación limitado;
16. cierre bloqueado cuando falla un gate;
17. generación de evidencia;
18. compatibilidad con el WorkOrder anterior.

## 27. Criterios de aceptación finales

La implementación se considera aceptable si:

* las pruebas anteriores al cambio siguen pasando o se documenta justificadamente su modificación;
* la fábrica procesa los cuatro documentos;
* se generan catálogos estructurados;
* existe DAG de tareas;
* existen agentes y handoffs verificables;
* existen logs de herramientas;
* PostgreSQL crea 40 tablas reales;
* el esquema contiene FK, `UNIQUE`, `CHECK` e índices;
* existe OpenAPI;
* al menos 40 endpoints son verificables;
* las 30 pantallas tienen rutas comprobables;
* las 60 reglas están trazadas;
* las 100 validaciones están clasificadas, implementadas y probadas;
* existe plan de pruebas;
* existe cobertura reproducible;
* existe matriz de trazabilidad;
* existe ciclo build-test-repair;
* existe informe final;
* la aplicación arranca en Linux o contenedor;
* el health check local pasa;
* existe preparación comprobable para EC2.

## 28. Forma de trabajo

Implementa por etapas y realiza commits locales lógicos si el entorno lo permite:

1. diagnóstico y plan;
2. modelos y normalización;
3. agentes, arnés y handoffs;
4. herramientas;
5. PostgreSQL;
6. API y OpenAPI;
7. frontend;
8. reglas y validaciones;
9. pruebas y cobertura;
10. evidencias y documentación;
11. integración final.

Después de cada etapa:

* ejecuta las pruebas relevantes;
* corrige errores;
* registra el resultado;
* evita avanzar dejando el repositorio roto.

No publiques, no hagas push y no despliegues sin autorización explícita.

## 29. Informe final de tu trabajo

Al terminar, responde con:

1. resumen de la arquitectura implementada;
2. archivos creados;
3. archivos modificados;
4. comandos para ejecutar la fábrica;
5. comandos para ejecutar SIGED;
6. comandos para iniciar PostgreSQL;
7. comandos para ejecutar todas las pruebas;
8. resultado de cobertura;
9. gates aprobados;
10. elementos pendientes;
11. riesgos conocidos;
12. pasos exactos para desplegar en EC2.

Sé honesto con cualquier requisito que no haya podido completarse.

Prioriza una solución funcional, reproducible y defendible académicamente sobre una arquitectura excesivamente ambiciosa.
