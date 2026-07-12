# Plan de Evolucion de WEBFORGE

## 1. Alcance y metodo del diagnostico

Este plan corresponde a la etapa de analisis. No modifica el runtime, la aplicacion SIGED ni los artefactos materializados existentes.

Se revisaron la estructura del repositorio, el paquete `webforge/`, el skill local, `PLANTILLA_FRONTEND/`, los artefactos de corrida, el workspace actual de SIGED-Lampa y los cuatro documentos fuente:

- `Especificacion_Funcional_SIGED_Lampa.md`
- `Inventario_Endpoints_SIGED_Lampa.md`
- `Mapa_Pantallas_Navegacion_SIGED_Lampa.md`
- `Modelo_ER_Detallado_SIGED_Lampa.md`

Tambien se reviso `docs/REQUERIMIENTOS_EVOLUCION_WEBFORGE.md`.

## 2. Diagnostico del estado actual

### 2.1 Estructura y ejecucion actual

- El repositorio contiene un runtime Python sin dependencias declaradas en `pyproject.toml`, una suite en `tests/` y un workspace SIGED generado en `project/siged-lampa/sandboxes/DEV/workspace/`.
- El directorio de trabajo no tiene metadatos de Git disponibles. No hay workflow de GitHub Actions localizado.
- La CLI solo ofrece `run`, `principles`, `skills`, `tools` y `doctor`; no existen aun los comandos especializados `normalize`, `plan`, `build`, `test`, `validate`, `resume` y `report`.
- La unica aplicacion SIGED materializada esta en el sandbox DEV. El sandbox QA existe como estructura aislada, pero no contiene una aplicacion promovida ni una ejecucion de pruebas propia.
- Existe un `Dockerfile` y un `docker-compose.yml` para el workspace DEV. No existen `docker-compose.dev.yml`, `docker-compose.qa.yml`, guia EC2, automatizacion CI/CD ni despliegue EC2 ejecutable.

### 2.2 Funcionamiento de `WebForgeFactory`

`webforge.orchestrator.WebForgeFactory.run()` realiza lo siguiente:

1. Normaliza el WorkOrder vigente y prepara `project/<project_id>/`, la version y los sandboxes DEV/QA.
2. Registra y replica las fuentes autorizadas.
3. Detecta SIGED por texto/nombre mediante `is_siged_request()`.
4. Ejecuta secuencialmente 16 fases fijas: `intake`, `constitution`, `specify`, `clarify`, `checklist`, `context`, `plan`, `tasks`, `analyze`, `implement`, `validate`, `security`, `pr_handoff`, `deploy_checkpoint`, `observe` y `close`.
5. Envuelve cada fase en `HarnessRunner.run_agent()`, registra el resultado en `log.jsonl` y `phase-ledger.json`, y detiene la corrida ante el primer gate fallido.
6. Para SIGED, `build_siged_profile()` extrae solo modulos, casos de uso, endpoints, pantallas y tablas ER; despues `build_siged_implementation_bundle()` entrega archivos de plantilla al materializador DEV.
7. `DevSandboxMaterializer` escribe exclusivamente archivos de texto bajo el workspace DEV, bloquea traversal, rutas absolutas y patrones de secretos, y deja un manifiesto de materializacion.

El resultado es determinista para un mismo WorkOrder y conjunto de fuentes, pero no es aun una fabrica que refine, planifique e implemente incrementalmente el producto conforme a los documentos.

### 2.3 Fases, agentes, handlers, gates, herramientas y sandboxes

- Los 16 agentes del manifiesto son identificadores de fase, no seis agentes especializados de producto. Cada uno delega en un handler determinista privado de `WebForgeFactory`.
- Los handlers de especificacion, plan, analisis y cierre producen principalmente texto fijo. No reciben ni devuelven contratos tipados de producto.
- Los gates P01-P12, el registro de evidencias, la politica default-deny, el presupuesto, MCP default-deny, el aislamiento de memoria y los sandboxes estan presentes y son reutilizables.
- El gate `coverage` se aprueba incondicionalmente y el gate `tests` solo verifica artefactos y politica estatica. Ninguno ejecuta pruebas de producto ni mide cobertura de codigo.
- `ToolRegistry` solo registra seis herramientas: materializacion DEV, escaneo de secretos, escaneo nominal de dependencias, SBOM local, politica estatica y completitud de artefactos. No existen wrappers para filesystem, shell seguro, build, lint, pruebas por nivel, migraciones, verificacion PostgreSQL, health check ni diff.
- Las herramientas registran un hash de salida, pero no el comando, exit code, stdout/stderr, timeout efectivo, archivos cambiados, `cycle_id` ni una relacion por tarea/agente.
- DEV y QA se crean como directorios independientes, pero no se clona realmente el contenido de `versions/<version>` hacia cada workspace. La aplicacion se materializa solo en DEV.

### 2.4 Generacion actual de SIGED-Lampa y partes hardcodeadas

La generacion SIGED esta concentrada en `webforge/siged.py`, `webforge/siged_tasks.py` y `webforge/siged_templates.py`.

- El parser usa tablas Markdown y expresiones regulares simples. No normaliza actores, 30 workflows, 60 reglas, 100 validaciones, payloads, restricciones, relaciones detalladas ni referencias cruzadas.
- Ante datos faltantes, genera modulos, endpoints y pantallas de fallback. Esa conducta puede inventar alcance y contradice el objetivo de no inventar requisitos criticos.
- `siged_templates.py` contiene varias redefiniciones de las mismas funciones. Python utiliza solo las ultimas definiciones, dejando implementaciones muertas y haciendo dificil saber que se materializa.
- Seeds, usuarios, contrasenas demo, documentos, expedientes, solicitudes, KPIs, estados, rutas agrupadas y comportamiento de la UI estan escritos dentro de las plantillas.
- El perfil conserva la ruta de la fuente entregada; las corridas existentes registran rutas absolutas de Windows. Esto no cumple la exigencia de rutas relativas y limita la reproducibilidad Linux.
- La trazabilidad actual solo relaciona modulo con pantallas y endpoints. No enlaza caso de uso, workflow, tabla, regla, validacion, codigo, prueba y evidencia.

### 2.5 Aplicacion frontend y backend

- El frontend es JavaScript sin framework, servido por el backend Node HTTP. Incluye catalogos completos embebidos y una UI demo que agrupa muchas pantallas en unas pocas vistas.
- El cliente no implementa un router canonico por las 30 rutas. Solo usa `/login`, `/intranet` y `/portal` para la navegacion de sesion; las rutas del catalogo son datos de presentacion. El servidor tambien solo sirve el index para `/`, `/login`, `/intranet` y `/portal`.
- No hay guards de rol efectivos por ruta ni autorizacion del backend. La politica de navegacion generada contiene agrupaciones incorrectas: pantallas administrativas se mezclan con pantallas ciudadanas y se asignan rutas de intranet a una vista de portal.
- El backend mantiene todos los datos en el objeto `db` en memoria. No lee `DATABASE_URL`, no persiste cambios ni implementa sesiones, JWT, hash de contrasenas, 2FA, RBAC, carga de adjuntos, auditoria persistente ni flujos transaccionales.
- De los 40 endpoints documentados, el backend implementa solo estos ocho del catalogo: API-001, API-006, API-009, API-015, API-016, API-025, API-035 y API-039. Expone tambien endpoints auxiliares de health/bootstrap/trazabilidad/catalogo y un `POST /api/v1/citizen/requests` que no coincide con API-034. El frontend intenta usar API-002, que el backend no expone.

### 2.6 Persistencia y PostgreSQL

- El esquema generado declara 40 tablas por nombre, pero 34 son esqueletos con solo `id`, `created_at` y `updated_at`.
- Solo seis tablas tienen campos de dominio; varias de ellas tampoco siguen el modelo ER objetivo. Las tablas restantes no contienen los campos, FK, `UNIQUE`, `CHECK`, soft delete ni indices definidos en `Modelo_ER_Detallado_SIGED_Lampa.md`.
- No existe repositorio PostgreSQL, ORM o capa de persistencia. El backend opera exclusivamente en memoria aunque `docker-compose.yml` levanta PostgreSQL y `.env.example` declara `DATABASE_URL`.
- La migracion y el esquema son el mismo archivo, incluyen datos semilla y no hay versionado incremental ni prueba de migracion desde cero.
- `docker-compose.yml` usa `POSTGRES_HOST_AUTH_METHOD: trust`, adecuado solo para una demo local y no para QA/EC2. El contenedor de aplicacion no consume ni verifica PostgreSQL.

### 2.7 Pruebas, cobertura y despliegue

- La suite actual contiene 14 pruebas Python centradas en el runtime: fases, aislamiento, skill, materializador, path traversal y una materializacion SIGED sintetica. No prueba la aplicacion real ni los cuatro documentos reales de forma integral.
- No hay pruebas unitarias del backend Node, API, integracion PostgreSQL, E2E, permisos, flujos, reglas, validaciones, OpenAPI ni aceptacion.
- No existe configuracion o comando de cobertura. El informe de corrida llama "coverage" a la cobertura de principios P01-P12, que no equivale a cobertura de lineas, funciones, endpoints, pantallas, reglas o validaciones.
- No hay `openapi.yaml`, informe de pruebas, matriz de cobertura, evidencia de health check ni paquete de release verificable.
- La configuracion Docker valida sintacticamente, pero no se ejecuto una migracion real ni se inicio un contenedor en este diagnostico. No hay workflow EC2, migracion remota, reinicio de servicio, HTTPS, logs de operacion ni health check de despliegue.

## 3. Resultados de pruebas previas

Los siguientes resultados corresponden al estado previo a cualquier modificacion de esta etapa:

| Comando | Resultado | Observacion |
|---|---|---|
| `python -m pytest` | PASS, 14 passed en 6.30 s | Suite actual del runtime Python. |
| `npm run verify` | FAIL de entorno | PowerShell bloquea `npm.ps1` por politica de ejecucion. |
| `npm run check:backend` | FAIL de entorno | Misma politica de PowerShell, sin ejecutar el script. |
| `npm run check:frontend` | FAIL de entorno | Misma politica de PowerShell, sin ejecutar el script. |
| `npm.cmd run verify` | PASS | Verificador estructural del bundle; no prueba comportamiento funcional. |
| `npm.cmd run check:backend` | PASS | Sintaxis Node valida. |
| `npm.cmd run check:frontend` | PASS | Sintaxis JavaScript valida. |
| `docker compose config --quiet` | PASS | Valida composicion, sin levantar servicios. |
| `python -m coverage --version` | FAIL | Modulo `coverage` no instalado; no hay medicion de cobertura. |

Los fallos de `npm` y `coverage` son preexistentes de ambiente/herramientas y deben conservarse como evidencia hasta que una fase posterior los resuelva de forma reproducible. No son evidencia de que la aplicacion haya fallado sus pruebas, porque las pruebas respectivas no llegaron a ejecutarse.

## 4. Comparacion con los documentos funcionales

| Area | Especificacion | Estado actual | Brecha |
|---|---|---|---|
| Casos y workflows | 12 casos de uso y 30 flujos | Se extraen 12 casos; no se extraen ni trazan los 30 flujos | No hay modelo de workflow ni pruebas de flujo. |
| Pantallas | 30 rutas, actor y endpoint por pantalla | Se almacenan 30 catalogos, pero se agrupan en pocas vistas y no existen 30 rutas ejecutables | No hay navegacion, guards ni E2E por pantalla. |
| API | 40 endpoints con contratos, auth y reglas | 8 endpoints catalogados implementados y sin control de acceso | Faltan 32 endpoints, contratos y pruebas API. |
| Datos | 40 tablas relacionales detalladas | 40 nombres de tabla, 34 esqueletos | No hay esquema ER real ni persistencia activa. |
| Reglas | 60 reglas de negocio | No se parsean, implementan ni prueban | No existe `business-rule-map.json`. |
| Validaciones | 100 validaciones y restricciones | No se parsean, clasifican ni prueban | No existe `validation-map.json`. |
| Trazabilidad | UC a evidencia de prueba y codigo | Modulo a pantalla/endpoint | No detecta huerfanos ni permite defender cobertura. |
| Operacion | Linux, EC2, logs y DB persistente | Docker demo y backend memoria | No hay readiness EC2 verificable. |

### Inconsistencias concretas detectadas

- El mapa de pantallas declara P-10 y P-11 con endpoints futuros, mientras el inventario minimo de 40 no los incluye. La evolucion debe añadir endpoints administrativos explicitamente y reflejarlos en OpenAPI, frontend, pruebas y trazabilidad.
- P-30 tiene dos rutas alternativas (`/notifications` o `/intranet/notifications`). La generacion conserva ese texto como ruta literal, por lo que debe normalizarse una ruta canonica por actor/superficie.
- El inventario requiere `POST /api/v1/auth/citizen-login` y `POST /api/v1/public/tramites/{id}/requests`; el frontend/backend actual usan respectivamente API-001 y un endpoint no documentado `POST /api/v1/citizen/requests`.
- El modelo ER separa usuarios internos de cuentas ciudadanas; el esquema actual mezcla roles de portal en `users` y no modela las relaciones declaradas.
- El modelo ER define `documents.current_version_id`, versiones, anexos, revisiones, aprobaciones, firmas y relaciones de expediente; el esquema y backend no las implementan.
- Las reglas de confidencialidad, autorizacion, bloqueo de flujo, numeracion, auditoria y propiedad ciudadana no se aplican en frontend, backend ni base de datos.
- Los documentos fuente incluyen enlaces absolutos de Windows. Deben corregirse a rutas relativas dentro de una fase documental, sin cambiar su semantica.

## 5. Componentes que se pueden conservar

- `WebForgeFactory` como punto de entrada y ciclo determinista base.
- `HarnessRunner`, `PolicyEngine`, `MCPGateway` default-deny y `BudgetManager` como controles de ejecucion.
- `ProjectWorkspace` y `DevSandboxMaterializer` como limites de aislamiento y escritura segura; deben ampliarse, no sustituirse.
- P01-P12, `GateResult`, `PhaseResult`, registro de evidencias, hashes, manifiestos, `phase-ledger.json` y reportes de seguridad.
- La CLI actual y sus comandos existentes, preservando compatibilidad de WorkOrders anteriores.
- La separacion de fuentes, version, memoria, aprendizaje, DEV y QA bajo `project/<project_id>/`.
- El backend Node sin dependencias y el frontend actual como baseline ejecutable durante la transicion, no como arquitectura final.
- `PLANTILLA_FRONTEND` como referencia visual y su gate obligatorio; la futura aplicacion debe respetar sus lineamientos sin bloquear rutas, accesibilidad o pruebas.
- Docker Compose como punto de partida local, reemplazando credenciales de confianza y separando perfiles DEV/QA.

## 6. Componentes que deben modificarse

- Ampliar `WorkOrder` con fuentes, stack, alcance minimo, calidad y version de esquema con defaults compatibles.
- Reemplazar el parser parcial/fallback de SIGED por normalizacion tipada, validada y bloqueante ante errores criticos.
- Separar las plantillas monoliticas y duplicadas de `siged_templates.py` en generadores o editores por artefacto. Eliminar definiciones muertas solo tras cubrirlas con pruebas de regresion.
- Formalizar seis agentes de producto: refinamiento, arquitectura/planificacion, database, backend, frontend y QA/release; conservar los agentes transversales actuales cuando aporten control.
- Agregar DAG, handoffs y ledgers por agente/tarea/herramienta; el workflow actual lineal puede conservarse como macrosecuencia.
- Convertir el registro de herramientas en wrappers seguros con allowlist, timeout, salida acotada y logs completos.
- Implementar editor incremental con snapshots, cambios registrados y rollback; no regenerar el workspace completo para cambios menores.
- Reemplazar el esquema generico por migraciones PostgreSQL relacionales reales y conectar el backend a un repositorio PostgreSQL en QA/produccion.
- Crear OpenAPI y hacer que router, controladores, pantallas, permisos y pruebas se validen contra el contrato.
- Crear rutas canonicas y 30 pantallas configurables, con guards por actor/rol y componentes reutilizables.
- Convertir reglas y validaciones en mapas trazables con implementacion y prueba obligatoria.
- Implementar suites de prueba separadas, cobertura real y gates que fallen ante evidencia faltante.
- Crear configuracion de release y readiness EC2 sin ejecutar despliegue ni utilizar credenciales.

## 7. Deuda tecnica y riesgos academicos

### Deuda tecnica relevante

- Plantillas Python con redefiniciones silenciosas, codigo muerto y responsabilidades mezcladas.
- Datos demo, rutas y decisiones de producto hardcodeados en generadores y cliente.
- La declaracion de PostgreSQL no corresponde con la persistencia efectiva en memoria.
- Conteos de catalogos se usan como sustituto de comportamiento implementado.
- El final report puede ser `complete` aunque no haya build, pruebas de producto, cobertura, OpenAPI, migracion ni health check real.
- La copia `app/` y `frontend/` duplica interfaz sin una fuente de verdad clara.
- Rutas absolutas Windows aparecen en fuentes y artefactos de corrida.

### Riesgos frente a la rubrica

- Alto: afirmar 40 endpoints, 30 pantallas o 40 tablas por catalogo puede ser evaluado como conteo documental y no como aplicacion funcional.
- Alto: el requisito de cobertura 100% no es medible hoy; el gate de coverage actual es nominal.
- Alto: no existe trazabilidad verificable de 60 reglas ni 100 validaciones hasta codigo, prueba y evidencia.
- Alto: PostgreSQL no participa de los flujos principales y no hay prueba de migracion desde cero.
- Alto: no existe evidencia de aplicacion online Linux/EC2 ni preparacion operativa completa.
- Medio: los agentes actuales son handlers del mismo proceso, por lo que la especializacion y los handoffs no son defendibles aun como proceso agéntico.
- Medio: una reescritura grande pondria en riesgo los 14 tests existentes y el prototipo demostrable; la migracion debe ser incremental.

## 8. Arquitectura objetivo

WEBFORGE debe evolucionar como mini fabrica especializada en SIGED-Lampa y sistemas web administrativos, no como plataforma universal de generacion de software.

```text
WorkOrder versionado + cuatro documentos SIGED
  -> Refinamiento y normalizacion tipada
  -> Catalogos JSON + hallazgos + trazabilidad inicial
  -> Arquitecto/planificador
  -> arquitectura.json + contratos + task-dag.json
  -> Agentes Database, Backend y Frontend en tareas acotadas
  -> Workspace incremental DEV
  -> QA/Release: build -> test -> diagnose -> repair limitado
  -> Sandbox QA con DB PostgreSQL real y E2E
  -> Evidencias, gates de fabrica y gates de producto separados
  -> Paquete Linux/EC2 preparado; despliegue solo con aprobacion
```

Principios de diseno:

- Los documentos son fuente de verdad; los catálogos normalizados conservan sus codigos originales.
- Los errores de normalizacion bloquean; las ambiguedades se registran como decisiones pendientes.
- Los agentes producen archivos y handoffs verificables, no solo texto descriptivo.
- La generacion inicial se conserva, pero las actualizaciones usan cambios incrementales y reversibles.
- La condicion `factory_status=complete` no implica `product_status=accepted`.
- QA y produccion usan PostgreSQL; el modo JSON/memoria queda solo como compatibilidad explicita del prototipo mientras se migra.
- Toda operacion externa sigue bajo aprobacion explicita; el plan no contempla secretos, push ni despliegue real.

## 9. Fases de implementacion propuestas

| Fase | Objetivo | Dependencias | Pruebas requeridas | Criterio de aceptacion |
|---|---|---|---|---|
| 0. Baseline y contratos de cambio | Congelar resultados actuales, documentar fallos previos y crear fixtures de las cuatro fuentes reales | Ninguna | 14 tests actuales, bundle verify, sintaxis Node | No se degrada el baseline y todos los fallos previos quedan registrados. |
| 1. Modelos y normalizacion | Extender WorkOrder y generar catalogos tipados, reporte y hallazgos | 0 | Parser real, duplicados, referencias invalidas, conteos, rutas ambiguas, compatibilidad WorkOrder anterior | Se generan los 11 catalogos requeridos, `normalization-report.json` y `normalization-findings.md`; errores bloquean. |
| 2. Arquitectura, DAG y handoffs | Formalizar seis agentes, tareas, dependencias y registros completos | 1 | DAG aciclico, handoff valido, rechazo de gate, ledger y presupuesto | Cada tarea tiene responsable, entradas, salidas, gate, dependencia y handoff; se producen tres ledgers. |
| 3. Herramientas y editor incremental | Agregar wrappers seguros, snapshot/rollback y ciclo repair limitado | 2 | Allowlist, traversal, timeout, stdout/stderr, snapshot, rollback, repeticion de error | Toda modificacion incremental queda registrada y el repair se detiene en maximo tres ciclos. |
| 4. PostgreSQL real | Implementar 40 tablas, migraciones, seeds, repositorios y verificaciones | 1 y 3 | Migracion desde cero, 40 tablas, FK, UNIQUE, CHECK, indices, seeds y repositorio PostgreSQL | QA usa PostgreSQL; el esquema representa el modelo ER y la aplicacion persiste flujos principales. |
| 5. API y reglas de dominio | Crear OpenAPI, endpoints, auth simulada explicita, autorizacion, reglas y validaciones backend | 1, 2 y 4 | Contrato OpenAPI-router, API positiva/negativa, permisos, integracion DB, reglas | Al menos 40 endpoints verificables, 60 reglas y validaciones backend trazadas. |
| 6. Frontend y rutas | Implementar las 30 pantallas/rutas canonicas con componentes reutilizables, guards y conexion API | 1, 4 y 5 | Render de ruta, guard por actor, navegacion, E2E de flujos maestros | Las 30 pantallas cargan, tienen ruta, actor, endpoint y prueba navegable. |
| 7. QA, cobertura y aceptacion | Implementar plan de pruebas, matriz total, cobertura y gates de producto | 4, 5 y 6 | Unit, API, DB, integration, E2E, acceptance, cobertura real y health check | Reportes reproducibles y umbral 100% para el codigo incluido, sin falsificar exclusiones. |
| 8. Evidencia y readiness EC2 | Preparar paquete, guias, compose DEV/QA, workflow y reporte sin desplegar | 7 | Build Linux/contenedor, compose config, migracion QA, health check y validacion de secretos | `deploy-readiness.json` es verificable y el estado queda `pending_approval` sin credenciales. |
| 9. Integracion final | Ejecutar una corrida completa y separar estado de fabrica/producto/documentacion | 1 a 8 | Regresion completa, reproducibilidad, artefactos de evidencia, gates | Solo se acepta el producto si todos los gates de producto pasan; no se ejecuta despliegue. |

## 10. Archivos que probablemente se modificaran

### Runtime de fabrica

- `webforge/models.py`
- `webforge/orchestrator.py`
- `webforge/harness.py`
- `webforge/policy.py`
- `webforge/tools.py`
- `webforge/isolation.py`
- `webforge/project_workspace.py`
- `webforge/context.py`
- `webforge/cli.py`
- `webforge/siged.py`
- `webforge/siged_templates.py`
- `webforge/siged_tasks.py`
- Nuevos modulos focalizados para normalizacion, DAG, trazabilidad, cambios y validacion PostgreSQL.

### Producto SIGED generado/mantenido

- `project/siged-lampa/versions/v0002/` como proxima fuente versionada, sin destruir `v0001`.
- `project/siged-lampa/sandboxes/DEV/workspace/` mediante cambios incrementales registrados.
- `project/siged-lampa/sandboxes/QA/workspace/` para la promocion y validacion aislada.
- Nuevos `openapi.yaml`, `database/`, `backend/`, `frontend/` y configuraciones de compose, segun la estructura acordada en la fase 2.

### Pruebas y documentacion

- `tests/test_webforge_runtime.py` y nuevas carpetas `tests/unit/`, `tests/api/`, `tests/database/`, `tests/integration/`, `tests/e2e/` y `tests/acceptance/`.
- `pyproject.toml` y/o el manifiesto Node para comandos reproducibles de prueba/cobertura.
- Los cuatro documentos fuente para reemplazar enlaces absolutos por relativos, preservando contenido funcional.
- Nuevos documentos requeridos en `docs/`: arquitectura, agentes/handoffs, herramientas/gates, plan de pruebas, matriz de trazabilidad, checklist, guia reproducible y guia EC2.

## 11. Estrategia de continuidad y migracion segura

1. Mantener `run` y los WorkOrders existentes; agregar campos con defaults y pruebas de compatibilidad.
2. Mantener `v0001` y su prototipo como baseline demostrable. Crear `v0002` para la evolucion.
3. Introducir normalizacion y artefactos de planificacion antes de tocar el bundle generado.
4. Conservar temporalmente el adaptador en memoria solo para el demo actual, etiquetado como compatibilidad; QA y la configuracion objetivo deben usar PostgreSQL.
5. Implementar por modulos verticales trazables, empezando por seguridad/documentos/expedientes, sin regenerar todo el producto por cambios puntuales.
6. Ejecutar regresion del runtime y las pruebas de la fase despues de cada cambio. Un gate nuevo no debe declararse pass sin el reporte correspondiente.
7. Promover DEV a QA solo mediante snapshot/materializacion registrada y despues de pasar migraciones, API y E2E exigidos.
8. Mantener despliegue, publicaciones, accesos a EC2 y credenciales fuera de la ejecucion automatica; generar solamente readiness y guias hasta tener aprobacion.

## 12. Primer bloque recomendado de implementacion

Iniciar las fases 0 y 1 como un bloque unico y acotado:

1. Crear fixtures inmutables de los cuatro documentos reales y registrar el baseline de pruebas, incluyendo las limitaciones de `npm` y cobertura.
2. Ampliar `WorkOrder` de forma compatible y crear los modelos tipados de especificacion.
3. Implementar el normalizador SIGED que produzca los catalogos requeridos, `normalization-report.json` y `normalization-findings.md`.
4. Implementar primero las validaciones de duplicados, modulos/rutas/metodos faltantes, referencias, conteos, pantallas sin endpoint y rutas ambiguas.
5. Agregar pruebas de normalizacion contra las fuentes reales y contra fixtures negativos.

Este bloque reduce el principal riesgo academico: que la fabrica solo cuente elementos hardcodeados. Tambien provee la fuente estructurada necesaria para planificar PostgreSQL, API, frontend, reglas, validaciones y evidencia sin iniciar una reescritura amplia.
