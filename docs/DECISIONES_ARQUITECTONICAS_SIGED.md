# DECISIONES ARQUITECTÓNICAS — SIGED-Lampa

**Proyecto:** SIGED-Lampa — Sistema de Gestión Documental Municipal  
**Versión del documento:** v0002  
**Estado:** Aprobado (GATE-ARCH-002)  
**Fecha:** Julio 2026

---

## 1. Introducción: Proceso ADR

### 1.1 ¿Qué es un ADR?

Un *Architecture Decision Record* (ADR) es un registro formal y versionado de una decisión arquitectónica significativa. Cada ADR documenta el contexto que motivó la decisión, la alternativa seleccionada, las opciones descartadas y las consecuencias conocidas. En el marco de WEBFORGE — Fábrica de Software SDD — los ADR constituyen el mecanismo central para cerrar decisiones operacionales críticas durante la fase de planificación arquitectónica.

### 1.2 Ciclo de vida de una decisión

Toda decisión arquitectónica en SIGED-Lampa sigue el siguiente ciclo:

1. **Detección**: un hallazgo (*finding*) de normalización identifica una ambigüedad, vacío o conflicto en las fuentes autorizadas.
2. **Formalización**: el hallazgo se traduce a un ADR con contexto, alternativas y consecuencias.
3. **Decisión**: el arquitecto selecciona una alternativa y registra la justificación.
4. **Validación**: la decisión es verificada por el gate `GATE-ARCH-002 (Critical Decisions Accepted)`, que comprueba que los 16 ADR están presentes y aceptados.
5. **Implementación**: el ADR se materializa en migraciones, endpoints, componentes y pruebas.

Cada ADR se vincula a su hallazgo fuente mediante un `evidence_id` (formato `EV-SRC-NNN`), garantizando trazabilidad directa al documento original que originó la decisión.

### 1.3 Estados posibles

| Estado | Significado |
|--------|-------------|
| **Accepted** | Decisión adoptada y vigente para la implementación actual |
| **Proposed** | Decisión propuesta pendiente de revisión |
| **Deferred** | Decisión postergada para una fase futura |
| **Rejected** | Decisión evaluada y descartada |

### 1.4 Gates de validación

Las decisiones arquitectónicas son validadas por el gate **GATE-ARCH-002**, que exige:

- Los 16 ADR (ADR-001 a ADR-016) deben estar documentados.
- Cada ADR debe tener un estado explícito.
- Cada ADR debe referenciar al menos un hallazgo fuente.
- No deben existir ADR en estado `Proposed` al momento del cierre de planificación (salvo autorización explícita).

---

## 2. Registro de Decisiones Arquitectónicas

---

### ADR-001: Ruta canónica de notificaciones

| Campo | Valor |
|-------|-------|
| **ID** | ADR-001 |
| **Título** | Ruta canónica de notificaciones |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento D |
| **Módulo** | M10 — Notificaciones |
| **Pantalla afectada** | P-30 — Bandeja de notificaciones |
| **Endpoint afectado** | API-040 — `GET /api/v1/notifications` |

#### Contexto

La pantalla P-30 (*Bandeja de notificaciones*) declara en el mapa de navegación dos rutas alternativas: `/notifications` y `/intranet/notifications` (Mapa_Pantallas_Navegacion_SIGED_Lampa.md:115). Esta ambigüedad fue detectada por los hallazgos de normalización `WARNING SCREEN_ROUTE_AMBIGUOUS` y `WARNING P30_ALTERNATE_ROUTE`. La ruta compartida genera confusión sobre la zona de pertenencia (intranet vs. portal) y sobre el mecanismo de autenticación requerido.

#### Decisión

Se definen dos rutas canónicas diferenciadas por zona:

- **Intranet municipal**: `/intranet/notifications` — para usuarios internos autenticados (funcionarios, administradores, operadores). Requiere autenticación `Bearer JWT` intranet.
- **Portal ciudadano autenticado**: `/portal/notifications` — para ciudadanos con sesión activa. Requiere autenticación `Bearer JWT` ciudadano.

Ambas rutas consumen el mismo endpoint backend `API-040` (`GET /api/v1/notifications`), que discrimina por el tipo de token para retornar solo las notificaciones del actor autenticado.

#### Alternativas consideradas

1. **Ruta única compartida** (`/notifications` con discriminación por rol): se descartó porque mezcla dos superficies de usuario con distintos controles de sesión, dificultando la implementación de guards de navegación.
2. **Redirección automática** desde `/notifications` según el tipo de sesión: se descartó por ser opaca para el usuario final y generar complejidad en el router.
3. **Dos rutas separadas** (solución adoptada): cada zona tiene su propia ruta, clara para el usuario y fácil de proteger con guards.

#### Consecuencias

- El router frontend debe implementar dos entradas independientes con guards de autenticación diferenciados.
- El backend (`API-040`) debe discriminar el origen del token para filtrar notificaciones.
- La barra de navegación de intranet enlaza a `/intranet/notifications`; la del portal ciudadano a `/portal/notifications`.
- Se mantiene compatibilidad hacia atrás: `/intranet/notifications` como canónica para intranet; `/portal/notifications` para ciudadanos.

#### Hallazgos fuente

- `WARNING SCREEN_ROUTE_AMBIGUOUS` — Mapa_Pantallas_Navegacion_SIGED_Lampa.md:115
- `WARNING P30_ALTERNATE_ROUTE` — Mapa_Pantallas_Navegacion_SIGED_Lampa.md:115

---

### ADR-002: Administración de tipos de trámite

| Campo | Valor |
|-------|-------|
| **ID** | ADR-002 |
| **Título** | Administración de tipos de trámite |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento D |
| **Módulo** | M02 — Administración organizacional |
| **Pantalla afectada** | P-10 — Tipos de trámites |

#### Contexto

La pantalla P-10 (*Tipos de trámites*) aparece en el catálogo de pantallas con una ruta definida (`/intranet/admin/procedure-types`) pero no tiene endpoints asociados en el inventario original de 40 endpoints (Mapa_Pantallas_Navegacion_SIGED_Lampa.md:95). Los hallazgos `WARNING SCREEN_WITHOUT_ENDPOINT` y `WARNING MISSING_ADMIN_ENDPOINT` detectaron este vacío. La pantalla requiere operaciones ABM (*Alta, Baja, Modificación*) sobre el catálogo de tipos de trámite (`procedure_types`).

#### Decisión

Se agregan tres nuevos endpoints administrativos bajo el prefijo `/api/v1/admin/procedure-types`:

| Método | Endpoint | Acción |
|--------|----------|--------|
| `GET` | `/api/v1/admin/procedure-types` | Listar tipos de trámite (con paginación y filtros) |
| `POST` | `/api/v1/admin/procedure-types` | Crear un nuevo tipo de trámite |
| `PUT` | `/api/v1/admin/procedure-types/{id}` | Actualizar un tipo de trámite existente |

Estos endpoints requieren autenticación de intranet con rol `admin`. El recurso `procedure_types` ya existe en el modelo ER (Modelo_ER_Detallado_SIGED_Lampa.md:197).

#### Alternativas consideradas

1. **No agregar endpoints y usar la tabla directamente desde el frontend**: se descartó por violar el principio de separación de capas.
2. **Reutilizar endpoints genéricos de administración**: se descartó porque no existía un mecanismo genérico en el diseño original.
3. **Endpoints específicos** (solución adoptada): siguiendo el patrón del resto de la API REST.

#### Consecuencias

- El contrato API se incrementa de 40 a 43 endpoints (3 nuevos).
- Se requiere migración para agregar seeds de tipos de trámite si corresponde.
- La pantalla P-10 ahora tiene trazabilidad completa endpoint-pantalla.

#### Hallazgos fuente

- `WARNING SCREEN_WITHOUT_ENDPOINT` — Mapa_Pantallas_Navegacion_SIGED_Lampa.md:95
- `WARNING MISSING_ADMIN_ENDPOINT` — Mapa_Pantallas_Navegacion_SIGED_Lampa.md:95

---

### ADR-003: Administración de entidades externas

| Campo | Valor |
|-------|-------|
| **ID** | ADR-003 |
| **Título** | Administración de entidades externas |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento D |
| **Módulo** | M02 — Administración organizacional |
| **Pantalla afectada** | P-11 — Entidades externas |

#### Contexto

La pantalla P-11 (*Entidades externas*) tiene ruta definida (`/intranet/admin/external-entities`) pero carece de endpoints en el inventario base (Mapa_Pantallas_Navegacion_SIGED_Lampa.md:96). Los hallazgos `WARNING SCREEN_WITHOUT_ENDPOINT` y `WARNING MISSING_ADMIN_ENDPOINT` identificaron esta omisión. La entidad `external_entities` ya está modelada en el ER (Modelo_ER_Detallado_SIGED_Lampa.md:125) y es referenciada por correspondencia (M06) como origen/destino.

#### Decisión

Se agregan tres nuevos endpoints administrativos bajo el prefijo `/api/v1/admin/external-entities`:

| Método | Endpoint | Acción |
|--------|----------|--------|
| `GET` | `/api/v1/admin/external-entities` | Listar entidades externas |
| `POST` | `/api/v1/admin/external-entities` | Crear una entidad externa |
| `PUT` | `/api/v1/admin/external-entities/{id}` | Actualizar una entidad externa |

Autenticación requerida: intranet con rol `admin`.

#### Alternativas consideradas

1. **Endpoints incrustados en correspondencia**: se descartó porque desacopla la administración del catálogo de su uso operativo.
2. **Mantenimiento manual en base de datos**: inviable para un sistema web.
3. **Endpoints administrativos dedicados** (solución adoptada): consistente con ADR-002 y con el diseño general de la API.

#### Consecuencias

- El contrato API se incrementa de 43 a 46 endpoints (sumando ADR-002 y ADR-003).
- La pantalla P-11 se integra al menú de administración con trazabilidad completa.
- Las entidades creadas desde estos endpoints alimentan los selectores de correspondencia (M06).

#### Hallazgos fuente

- `WARNING SCREEN_WITHOUT_ENDPOINT` — Mapa_Pantallas_Navegacion_SIGED_Lampa.md:96
- `WARNING MISSING_ADMIN_ENDPOINT` — Mapa_Pantallas_Navegacion_SIGED_Lampa.md:96

---

### ADR-004: Login ciudadano

| Campo | Valor |
|-------|-------|
| **ID** | ADR-004 |
| **Título** | Login ciudadano |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento A |
| **Módulo** | M01 — Autenticación, perfiles y autorización |
| **Endpoint afectado** | API-002 — `POST /api/v1/auth/citizen-login` |

#### Contexto

El endpoint `API-002` (`POST /api/v1/auth/citizen-login`) está documentado en el inventario de endpoints (Inventario_Endpoints_SIGED_Lampa.md:148) y en el mapa de pantallas (P-02 — Login ciudadano), pero el hallazgo `WARNING API002_NOT_IMPLEMENTED` reportó que no estaba implementado en el backend. La especificación funcional declara la autenticación ciudadana como requisito (UC-01 variante ciudadana) y la rúbrica exige su presencia.

#### Decisión

Se mantiene `API-002` como endpoint obligatorio dentro del conjunto base de 40 endpoints. Su implementación es una simulación académica: las credenciales se validan contra la tabla `citizen_accounts` sin integración con Clave Única ni otros proveedores externos. El flujo es:

1. El ciudadano envía `email` y `password`.
2. El sistema valida contra `citizen_accounts` (password_hash con bcrypt simulado).
3. Si es válido, genera un JWT con alcance `citizen`.
4. Si no es válido, retorna `401` con mensaje genérico (sin revelar existencia de la cuenta).

#### Alternativas consideradas

1. **Eliminar el endpoint y usar login único**: descartado porque la especificación distingue explícitamente actores internos y ciudadanos.
2. **Integración real con Clave Única**: diferida (ver ADR-015). No está dentro del alcance de v0002.
3. **Simulación académica** (solución adoptada): cumple el contrato API y permite pruebas funcionales completas.

#### Consecuencias

- El endpoint debe documentarse explícitamente como "simulación académica" en su descripción OpenAPI.
- El seed de base de datos debe incluir cuentas ciudadanas de prueba.
- Las pruebas E2E del flujo ciudadano (FLOW-CIU) pueden ejecutarse sin dependencias externas.

#### Hallazgos fuente

- `WARNING API002_NOT_IMPLEMENTED` — normalization-findings.md:38

---

### ADR-005: Creación de solicitud ciudadana

| Campo | Valor |
|-------|-------|
| **ID** | ADR-005 |
| **Título** | Creación de solicitud ciudadana |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento D |
| **Módulo** | M07 — Portal ciudadano |
| **Endpoint afectado** | API-034 — `POST /api/v1/public/tramites/{id}/requests` |

#### Contexto

El endpoint `API-034` está documentado en el inventario como `POST /api/v1/public/tramites/{id}/requests` (Inventario_Endpoints_SIGED_Lampa.md:638). Sin embargo, el hallazgo `WARNING API034_ROUTE_DIFFERENCE` detectó una discrepancia entre la ruta documentada y una ruta alternativa (`POST /api/v1/citizen/requests`) que podría esperarse por convención. Ambas rutas cumplen propósitos similares pero con alcances distintos.

#### Decisión

Se establece `POST /api/v1/public/tramites/{id}/requests` como ruta canónica para la creación de solicitudes ciudadanas (API-034). Adicionalmente, se mantiene `POST /api/v1/citizen/requests` como ruta de compatibilidad heredada para consulta (API-035), no para creación. La diferencia semántica es:

| Endpoint | Ruta | Propósito |
|----------|------|-----------|
| API-034 | `POST /api/v1/public/tramites/{id}/requests` | Crear una nueva solicitud ciudadana asociada a un trámite publicado |
| API-035 | `GET /api/v1/citizen/requests` | Listar las solicitudes del ciudadano autenticado |
| API-036 | `GET /api/v1/citizen/requests/{id}` | Ver detalle de una solicitud específica |

#### Alternativas consideradas

1. **Unificar en una sola ruta**: descartado porque `API-034` requiere un `tramite_id` en la URL, mientras que `API-035/036` operan sobre el conjunto de solicitudes del ciudadano.
2. **Usar solo `/api/v1/citizen/requests` como POST**: descartado porque pierde la asociación explícita al trámite publicado.
3. **Ruta canónica más ruta de compatibilidad** (solución adoptada): claridad semántica sin romper convenciones REST.

#### Consecuencias

- El frontend debe usar `API-034` para la creación desde P-25 (Formulario de trámite).
- `API-035` y `API-036` se usan para el historial y seguimiento desde P-26 (Mis Solicitudes).
- No hay duplicación funcional porque cada endpoint tiene un propósito distinto.

#### Hallazgos fuente

- `WARNING API034_ROUTE_DIFFERENCE` — normalization-findings.md:39

---

### ADR-006: Anexos asociados a versiones

| Campo | Valor |
|-------|-------|
| **ID** | ADR-006 |
| **Título** | Anexos asociados a versiones |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento B |
| **Módulo** | M03 — Gestión documental |
| **Tabla afectada** | `document_attachments` |

#### Contexto

La regla de negocio `BR-017` exige que los anexos estén asociados a una versión específica del documento. Sin embargo, el modelo ER actual no incluye un campo `document_version_id` en la tabla `document_attachments` (Modelo_ER_Detallado_SIGED_Lampa.md:143). El hallazgo `WARNING BR017_ATTACHMENT_VERSION_GAP` detectó esta brecha entre la regla de negocio y el modelo de datos.

#### Decisión

Se agrega la columna `document_version_id BIGINT NULL` a la tabla `document_attachments`, con Foreign Key a `document_versions.id`. Esta columna es nullable para permitir anexos genéricos no versionados (ej. imágenes de referencia), aunque la regla BR-017 exige que los anexos formales de un documento en flujo de revisión estén siempre versionados.

Además, se agrega un índice compuesto `(document_id, document_version_id)` para optimizar consultas por documento y versión.

#### Alternativas consideradas

1. **NO agregar la columna y asociar anexos solo a documentos**: descartado porque viola BR-017.
2. **Tabla separada `version_attachments`**: descartado por sobreingeniería; la relación es 1:N directa desde `document_versions`.
3. **Columna nullable** (solución adoptada): equilibra la regla de negocio con flexibilidad para casos de uso no versionados.

#### Consecuencias

- Migración ALTER TABLE requerida sobre `document_attachments`.
- El endpoint `API-019` (`POST /api/v1/documents/{id}/attachments`) debe aceptar un campo opcional `document_version_id`.
- Las validaciones deben asegurar que, si el documento está en flujo de revisión, el anexo esté versionado.

#### Hallazgos fuente

- `WARNING BR017_ATTACHMENT_VERSION_GAP` — Modelo_ER_Detallado_SIGED_Lampa.md:143

---

### ADR-007: Referencia a versión anterior

| Campo | Valor |
|-------|-------|
| **ID** | ADR-007 |
| **Título** | Referencia a versión anterior |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento B |
| **Módulo** | M03 — Gestión documental |
| **Tabla afectada** | `document_versions` |

#### Contexto

La regla de negocio `BR-021` exige que cada versión de un documento registre explícitamente la versión anterior de la que deriva. El modelo ER actual de `document_versions` no incluye un campo `previous_version_id` (Modelo_ER_Detallado_SIGED_Lampa.md:142). El hallazgo `WARNING BR021_PREVIOUS_VERSION_GAP` identificó esta omisión.

#### Decisión

Se agrega la columna `previous_version_id BIGINT NULL` en la tabla `document_versions`, con Foreign Key autorreferente a `document_versions.id`. Esta columna permite construir la cadena de versionado completa y verificar integridad referencial:

- La primera versión de un documento tiene `previous_version_id = NULL`.
- Cada versión subsiguiente apunta a la versión inmediatamente anterior.
- Se agrega un `CHECK` que impide que `previous_version_id` apunte a una versión de otro documento.

#### Alternativas consideradas

1. **Calcular la versión anterior por `version_number - 1`**: descartado porque es frágil ante reordenamientos o eliminaciones lógicas.
2. **Lista enlazada en una tabla separada**: descartado por sobreingeniería para el caso de uso actual.
3. **Columna autorreferente** (solución adoptada): simple, eficiente y respeta la regla BR-021.

#### Consecuencias

- Migración ALTER TABLE sobre `document_versions`.
- El endpoint `API-020` (`POST /api/v1/documents/{id}/versions`) debe establecer automáticamente `previous_version_id` a partir de la versión vigente.
- Las consultas de historial pueden recorrer la cadena de versiones mediante joins recursivos o lógica aplicativa.

#### Hallazgos fuente

- `WARNING BR021_PREVIOUS_VERSION_GAP` — Modelo_ER_Detallado_SIGED_Lampa.md:142

---

### ADR-008: Numeración documental

| Campo | Valor |
|-------|-------|
| **ID** | ADR-008 |
| **Título** | Numeración documental |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento B |
| **Módulo** | M03 — Gestión documental |
| **Tabla afectada** | `documents` |

#### Contexto

El modelo ER carece de un mecanismo explícito para la numeración documental. La regla de negocio interna del SIGED exige que cada documento tenga un número único dentro de su tipo documental (ej. MEMO-2026-0001, ORD-2026-0042). Sin embargo, la tabla `documents` no define una restricción que garantice esta unicidad. El hallazgo `WARNING DOCUMENT_NUMBERING_MODEL_GAP` detectó la ausencia de un modelo de numeración dedicado.

#### Decisión

Se implementa la restricción `UNIQUE(document_type_id, document_number)` sobre la tabla `documents`, donde `document_number` es un nuevo campo `VARCHAR(20)` que almacena el número secuencial del documento dentro de su tipo. La generación del número sigue la lógica aplicativa:

- Formato: `{TIPO}-{AÑO}-{SECUENCIAL}` (ej. `MEMO-2026-0001`).
- El secuencial se reinicia cada año calendario por tipo documental.
- La numeración se asigna al momento de emitir el documento (no al crearlo en borrador).

Se descarta el uso de secuencias SQL nativas para mantener portabilidad con la persistencia en memoria de v0002.

#### Alternativas consideradas

1. **Secuencia SQL nativa (`SEQUENCE`)**: descartado por incompatibilidad con persistencia en memoria (ADR-014).
2. **Número global único sin prefijo**: descartado porque no satisface el requisito de numeración por tipo documental.
3. **Campo `folio` como único**: el campo `folio` existe pero no discrimina por tipo documental.
4. **Restricción UNIQUE compuesta** (solución adoptada): portátil, explícita y alineada con la regla de negocio.

#### Consecuencias

- Se agrega el campo `document_number VARCHAR(20)` a la tabla `documents`.
- La lógica de generación del número debe implementarse en el backend (API-016 o API-018 al emitir).
- La restricción `UNIQUE(document_type_id, document_number)` previene duplicados a nivel base de datos.
- El formato de `folio` puede derivarse de `{document_type.code}-{document_number}`.

#### Hallazgos fuente

- `WARNING DOCUMENT_NUMBERING_MODEL_GAP` — Modelo_ER_Detallado_SIGED_Lampa.md:141

---

### ADR-009: OIRS anónima

| Campo | Valor |
|-------|-------|
| **ID** | ADR-009 |
| **Título** | OIRS anónima |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento D |
| **Módulo** | M08 — OIRS digital |
| **Tabla afectada** | `oirs_cases` |

#### Contexto

La tabla `oirs_cases` en el modelo ER solo contempla casos OIRS asociados a un `citizen_account_id`, asumiendo que el ciudadano está autenticado. Sin embargo, la especificación funcional (API-037) permite el ingreso de casos OIRS sin autenticación (público anónimo). El hallazgo `WARNING OIRS_CONTACT_MODEL_GAP` detectó que el modelo de datos no representa los datos de contacto para casos anónimos.

#### Decisión

Se agregan cuatro campos opcionales a la tabla `oirs_cases` para soportar casos OIRS de ciudadanos no autenticados:

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `contact_name` | `VARCHAR(255) NULL` | Nombre del ciudadano que ingresó el caso |
| `contact_email` | `VARCHAR(255) NULL` | Correo electrónico de contacto |
| `contact_phone` | `VARCHAR(20) NULL` | Teléfono de contacto |
| `privacy_consent` | `BOOLEAN NOT NULL DEFAULT FALSE` | Consentimiento para tratamiento de datos personales |

Reglas de validación:
- Si `citizen_account_id IS NULL`, al menos uno de `contact_email` o `contact_phone` debe ser proporcionado.
- `privacy_consent` debe ser `TRUE` para casos anónimos.

#### Alternativas consideradas

1. **Forzar autenticación para todo caso OIRS**: descartado porque contradice la especificación funcional que exige OIRS pública.
2. **Tabla separada `oirs_anonymous_contacts`**: descartado por complejidad innecesaria.
3. **Campos embebidos en `oirs_cases`** (solución adoptada): simplicidad y consistencia con el modelo existente.

#### Consecuencias

- Migración ALTER TABLE sobre `oirs_cases`.
- El endpoint `API-037` (`POST /api/v1/public/oirs`) debe validar las reglas de contacto.
- La pantalla P-28 (Gestión de OIRS) debe mostrar los datos de contacto cuando `citizen_account_id` sea nulo.
- Se debe incluir verificación de `privacy_consent` en el formulario de ingreso OIRS (P-27).

#### Hallazgos fuente

- `WARNING OIRS_CONTACT_MODEL_GAP` — Modelo_ER_Detallado_SIGED_Lampa.md:215

---

### ADR-010: Relación circular usuarios-departamentos

| Campo | Valor |
|-------|-------|
| **ID** | ADR-010 |
| **Título** | Relación circular usuarios-departamentos |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento A |
| **Tablas afectadas** | `departments`, `users` |

#### Contexto

La tabla `departments` tiene una FK a `users` (`manager_user_id -> users.id`) y la tabla `users` tiene una FK a `departments` (`department_id -> departments.id`). Esta relación circular impide crear ambas tablas con todas sus FK en una sola migración: ninguna de las dos tablas existe completamente cuando se intenta crear la primera FK. El hallazgo `WARNING POTENTIAL_RELATIONSHIP_CYCLE` detectó esta dependencia.

#### Decisión

Se implementa una migración en tres pasos:

1. **Paso 1**: Crear `departments` *sin* la FK `manager_user_id`. Crear `users` *sin* la FK `department_id`.
2. **Paso 2**: Agregar la FK `department_id -> departments.id` en `users` (departamentos ya existen del paso 1).
3. **Paso 3**: Agregar la FK `manager_user_id -> users.id` en `departments` (usuarios ya existen del paso 2).

El orden del modelo ER (Modelo_ER_Detallado_SIGED_Lampa.md:300) ya refleja esta estrategia: los departamentos se crean antes que los usuarios, y `manager_user_id` se agrega después.

#### Alternativas consideradas

1. **FK deferidas (DEFERRABLE INITIALLY DEFERRED)**: descartado por falta de soporte en motores livianos y en memoria.
2. **`manager_user_id` como NULLABLE y agregada al final** (solución adoptada): estándar para resolver ciclos de dependencia.
3. **Tabla puente `department_managers`**: descartado por sobreingeniería; un departamento tiene un solo jefe directo.

#### Consecuencias

- La migración debe ejecutarse en estricto orden de 3 pasos.
- El seed debe insertar departamentos sin jefe, luego usuarios, luego actualizar los jefes.
- Las herramientas de ORM deben respetar este ordenamiento.

#### Hallazgos fuente

- `WARNING POTENTIAL_RELATIONSHIP_CYCLE` — normalization-findings.md:36

---

### ADR-011: Relación circular documentos-versiones

| Campo | Valor |
|-------|-------|
| **ID** | ADR-011 |
| **Título** | Relación circular documentos-versiones |
| **Estado** | Accepted |
| **Fase de implementación** | Incremento B |
| **Tablas afectadas** | `documents`, `document_versions` |

#### Contexto

La tabla `documents` tiene una FK `current_version_id -> document_versions.id`, y la tabla `document_versions` tiene una FK `document_id -> documents.id`. Esta es una relación circular similar a la de ADR-010. El hallazgo `WARNING POTENTIAL_DOCUMENT_VERSION_CYCLE` la identificó en el modelo ER (Modelo_ER_Detallado_SIGED_Lampa.md:141).

#### Decisión

Se implementa una migración en tres pasos:

1. **Paso 1**: Crear `documents` *sin* la FK `current_version_id`. Crear `document_versions` *sin* la FK `document_id` (o con ella, dado que `documents` ya existe del paso 1).
2. **Paso 2**: Agregar la FK `document_id -> documents.id` en `document_versions`.
3. **Paso 3**: Agregar la FK `current_version_id -> document_versions.id` en `documents`.

Estrategia alternativa equivalente: crear `documents` primero, luego `document_versions` con FK a `documents`, y finalmente agregar `current_version_id` como FK nullable a `document_versions`.

#### Alternativas consideradas

1. **Usar `current_version_id` como campo sin FK**: descartado porque perdería integridad referencial.
2. **Trigger para mantener `current_version_id`**: descartado por complejidad y menor portabilidad.
3. **Migración en 3 pasos** (solución adoptada): mismo patrón probado en ADR-010.

#### Consecuencias

- El orden de migraciones debe respetar: `documents` → `document_versions` → FK circular.
- `current_version_id` debe ser nullable porque al crear un documento aún no existe su primera versión.
- El endpoint `API-016` (crear documento) debe crear también la versión inicial y luego actualizar `current_version_id`.

#### Hallazgos fuente

- `WARNING POTENTIAL_DOCUMENT_VERSION_CYCLE` — Modelo_ER_Detallado_SIGED_Lampa.md:141

---

### ADR-012: Cantidad de actores

| Campo | Valor |
|-------|-------|
| **ID** | ADR-012 |
| **Título** | Cantidad de actores (9 actores) |
| **Estado** | Accepted |
| **Fase de implementación** | Base |
| **Actores** | ACT-ADM, ACT-FUN, ACT-OPA, ACT-REV, ACT-OIR, ACT-REP, ACT-CIU, ACT-VIS, ACT-EXT |

#### Contexto

La especificación funcional define 9 actores (Especificacion_Funcional_SIGED_Lampa.md:94-117): 6 internos (ACT-ADM, ACT-FUN, ACT-OPA, ACT-REV, ACT-OIR, ACT-REP) y 3 externos (ACT-CIU, ACT-VIS, ACT-EXT). Sin embargo, durante la normalización se observó que la asignación `ACT-007` aparece dos veces en las fuentes con descripciones distintas, lo que podría generar confusión sobre si se deben fusionar actores o si son válidas ambas definiciones.

#### Decisión

Se conservan los 9 actores sin fusiones. Las dos apariciones de `ACT-007` en las fuentes corresponden a dos contextos distintos (interno y ciudadano), y ambas son válidas:

| Actor | Código | Ámbito |
|-------|--------|--------|
| Administrador del sistema | ACT-ADM | Interno |
| Funcionario municipal | ACT-FUN | Interno |
| Oficina de partes | ACT-OPA | Interno |
| Revisor o jefatura | ACT-REV | Interno |
| Operador OIRS | ACT-OIR | Interno |
| Analista de reportes | ACT-REP | Interno |
| Ciudadano autenticado | ACT-CIU | Externo |
| Ciudadano visitante | ACT-VIS | Externo |
| Entidad externa receptora | ACT-EXT | Externo |

No se modifica la nomenclatura. Las descripciones duplicadas de `ACT-007` se registran como una anomalía documental sin impacto en el diseño.

#### Alternativas consideradas

1. **Fusionar ACT-007 en un solo actor**: descartado porque las descripciones corresponden a roles distintos.
2. **Renombrar actores para eliminar la ambigüedad**: descartado por respeto a las fuentes originales.
3. **Mantener 9 actores** (solución adoptada): no hay impacto funcional en mantener ambas descripciones.

#### Consecuencias

- El sistema RBAC debe implementar 9 roles (uno por actor).
- La documentación debe aclarar que `ACT-007` aparece dos veces en fuentes pero no genera conflicto.
- Las pruebas E2E deben cubrir los 9 perfiles de acceso.

#### Hallazgos fuente

- Duplicidad de `ACT-007` en especificación funcional
- Catálogo de actores en Especificacion_Funcional_SIGED_Lampa.md:94-117

---

### ADR-013: Frontend objetivo

| Campo | Valor |
|-------|-------|
| **ID** | ADR-013 |
| **Título** | Frontend objetivo: Vanilla JS → React |
| **Estado** | Accepted |
| **Fase de implementación** | Base |

#### Contexto

El proyecto requiere un frontend funcional para v0002. Las opciones tecnológicas disponibles son Vanilla JavaScript (SPA) y React. La fábrica WEBFORGE incluye una `PLANTILLA_FRONTEND` basada en Vanilla JS. No hay experiencia ni configuración React disponible en el sandbox actual.

#### Decisión

Se establece una estrategia en dos fases:

- **v0001 (compatibilidad)**: Vanilla JavaScript como *baseline* de implementación. La `PLANTILLA_FRONTEND` proporciona el andamiaje base para construir las 30 pantallas del sistema.
- **v0002+ (target)**: React como objetivo arquitectónico para fases posteriores. No se implementa en esta fase.

Razones:
1. La plantilla existente está en Vanilla JS y es funcional.
2. No hay configuración React (JSX, bundler, dependencias) disponible sin intervención externa.
3. Vanilla JS permite cumplir con el requisito de 30 pantallas sin sobrecarga de tooling.
4. La migración a React se planifica como refactorización controlada en una fase dedicada.

#### Alternativas consideradas

1. **React desde el inicio**: descartado por falta de infraestructura y tiempo de configuración.
2. **Vue.js o Svelte**: descartado por no estar en la plantilla de la fábrica.
3. **Vanilla JS primero, React después** (solución adoptada): pragmática y alineada con los recursos disponibles.

#### Consecuencias

- Las 30 pantallas se implementan en Vanilla JS con componentes reutilizables.
- Se debe documentar la interfaz entre componentes para facilitar la migración React futura.
- El handoff `HO-FE-REACT` (previsto para v0002) incluirá la migración a React.
- Las pruebas E2E deben ser independientes del framework frontend.

#### Hallazgos fuente

- Evaluación de capacidades de la fábrica WEBFORGE
- Stack tecnológico definido en ARQUITECTURA_FABRICA.md

---

### ADR-014: Persistencia

| Campo | Valor |
|-------|-------|
| **ID** | ADR-014 |
| **Título** | Persistencia: memoria → PostgreSQL |
| **Estado** | Accepted |
| **Fase de implementación** | Base |

#### Contexto

El backend de v0002 opera con persistencia en memoria (estructuras de datos en RAM). PostgreSQL está declarado en la configuración pero no implementado. El hallazgo `WARNING MEMORY_PERSISTENCE_ACTIVE` confirmó que 34 tablas materializadas usan solo columnas de auditoría genéricas. La rúbrica y el diseño ER asumen PostgreSQL como motor objetivo.

#### Decisión

Se establece una estrategia en dos fases:

- **v0002 (compatibilidad)**: persistencia en memoria usando estructuras de datos JavaScript (arrays, maps). Las migraciones SQL se generan como especificación documentada pero no se ejecutan contra una base de datos real. Los seeds se cargan desde archivos JSON.
- **Fase 4 (post-v0002)**: migración a PostgreSQL real con ejecución de migraciones SQL, conexión nativa y reemplazo de la capa de persistencia.

La capa de acceso a datos se implementa con una interfaz abstracta (`DataStore`) que permite cambiar la implementación en memoria por PostgreSQL sin modificar la lógica de negocio.

#### Alternativas consideradas

1. **PostgreSQL desde v0002**: descartado por la complejidad de configuración y la ausencia de una base de datos disponible en el sandbox.
2. **SQLite como paso intermedio**: descartado porque la rúbrica exige PostgreSQL.
3. **Memoria con interfaz abstracta** (solución adoptada): permite prototipado rápido y migración controlada posterior.

#### Consecuencias

- Los datos se pierden al reiniciar el servidor (esperado para v0002).
- Las migraciones SQL se generan como documentación y especificación.
- La interfaz `DataStore` debe implementar todos los métodos CRUD y de consulta requeridos por los 40 endpoints.
- Las pruebas deben poder ejecutarse tanto en memoria como contra PostgreSQL.
- Los seeds JSON deben cubrir datos de prueba para todos los módulos.

#### Hallazgos fuente

- `WARNING MEMORY_PERSISTENCE_ACTIVE` — normalization-findings.md:42
- `WARNING GENERIC_DATABASE_TABLES` — normalization-findings.md:41

---

### ADR-015: Autenticación e integraciones externas

| Campo | Valor |
|-------|-------|
| **ID** | ADR-015 |
| **Título** | Autenticación e integraciones externas (simulación académica) |
| **Estado** | Accepted (requiere aprobación humana) |
| **Fase de implementación** | Base |

#### Contexto

La especificación funcional menciona integraciones con Clave Única (autenticación ciudadana), FirmaGob (firma electrónica) y SII (validación de datos). Estas integraciones no están disponibles en el entorno de desarrollo académico. Implementarlas requeriría convenios, credenciales productivas y acceso a entornos reales fuera del alcance del proyecto.

#### Decisión

Todas las integraciones externas se implementan como **simulaciones académicas**:

| Integración | Simulación |
|-------------|------------|
| **Clave Única** | Login ciudadano contra `citizen_accounts` local; no hay llamado externo a Clave Única. |
| **FirmaGob** | Firma simulada que registra un hash local en `document_signatures` sin certificado real. |
| **SII** | Validación de RUT mediante algoritmo de dígito verificador; no hay consulta a servicios SII. |
| **Autenticación institucional** | Login contra `users` local; no hay LDAP/AzureAD/SSO. |
| **Notificaciones** | Almacenamiento en tabla `notifications` local; no hay integración con correo/SMS real. |

Cada endpoint simulado incluye en su documentación OpenAPI la advertencia: **"Simulación académica — no apto para producción"**.

#### Alternativas consideradas

1. **Integraciones reales**: descartado por falta de acceso a entornos productivos y credenciales.
2. **Mocking externo con servicios cloud**: descartado por el principio de operación 100% local de la fábrica.
3. **Simulación documentada** (solución adoptada): cumple el propósito funcional y académico.

#### Consecuencias

- Esta decisión requiere aprobación humana explícita (marcada como "Requiere aprobación humana").
- Cualquier despliegue en entorno real debe migrar estas simulaciones a integraciones productivas.
- Las pruebas de seguridad deben verificar que las simulaciones no expongan fallos de seguridad reales.
- El plan de evolución (Fase 8+) debe incluir la migración de cada integración simulada.

#### Hallazgos fuente

- Especificacion_Funcional_SIGED_Lampa.md:85-90 (Integraciones diferidas o mockeadas)
- Principio de operación 100% local de WEBFORGE

---

### ADR-016: Conteo de endpoints

| Campo | Valor |
|-------|-------|
| **ID** | ADR-016 |
| **Título** | Conteo de endpoints (>40) |
| **Estado** | Accepted |
| **Fase de implementación** | Base |

#### Contexto

El inventario original declara 40 endpoints (API-001 a API-040). Sin embargo, los hallazgos de normalización y las decisiones arquitectónicas ADR-002 y ADR-003 agregan 6 endpoints administrativos adicionales. Además, pueden existir endpoints técnicos (health check, métricas, documentación OpenAPI) que no están en el inventario funcional. El hallazgo `WARNING PARTIAL_ENDPOINT_IMPLEMENTATION` reportó que solo 8 de 40 rutas estaban implementadas en una revisión anterior.

#### Decisión

Se acepta que el contrato objetivo puede superar los 40 endpoints originales. La composición esperada es:

| Origen | Cantidad | Ejemplos |
|--------|----------|----------|
| Endpoints originales (API-001 a API-040) | 40 | login, CRUD documentos, OIRS, etc. |
| ADR-002 (procedure-types) | 3 | GET/POST/PUT `/api/v1/admin/procedure-types` |
| ADR-003 (external-entities) | 3 | GET/POST/PUT `/api/v1/admin/external-entities` |
| Endpoints técnicos (opcionales) | 1-3 | `GET /api/v1/health`, `GET /api/v1/docs` |
| **Total estimado** | **46-47** | |

Todos los endpoints deben implementarse, documentarse en OpenAPI y cubrirse con pruebas. El mínimo exigible para la rúbrica son 40 endpoints funcionales documentados e implementados.

#### Alternativas consideradas

1. **Mantener estrictamente 40 endpoints**: descartado porque dejaría sin soporte a las pantallas P-10 y P-11.
2. **Incluir solo los 40 originales y documentar los adicionales como "futuros"**: descartado por consistencia.
3. **Aceptar un contrato expandido** (solución adoptada): realista y alineado con las necesidades del sistema.

#### Consecuencias

- La especificación OpenAPI debe reflejar los 46+ endpoints.
- Las pruebas de contrato deben cubrir todos los endpoints, no solo los 40 originales.
- La matriz endpoint-pantalla-tabla debe actualizarse.
- El conteo para la rúbrica debe discriminar entre endpoints funcionales (40 mínimo) y adicionales.

#### Hallazgos fuente

- `WARNING PARTIAL_ENDPOINT_IMPLEMENTATION` — normalization-findings.md:40
- ADR-002 y ADR-003 del presente documento

---

## 3. Decisiones pendientes

Las siguientes decisiones no están cubiertas por los ADR actuales y se identifican como candidatas para futuras iteraciones:

| ID pendiente | Tema | Descripción | Fase sugerida |
|-------------|------|-------------|---------------|
| PEND-001 | Middleware de auditoría transversal | Definir si la auditoría se implementa como middleware global o por endpoint | Incremento A |
| PEND-002 | Algoritmo de numeración documental | Detalle de la lógica de reinicio anual por tipo documental | Incremento B |
| PEND-003 | Política de refresco de tokens | Definir mecanismo de refresh token y expiración de sesiones | Incremento A |
| PEND-004 | Estrategia de carga de archivos | Almacenamiento local vs. proveedor externo para anexos | Incremento B |
| PEND-005 | Paginación estándar | Definir tamaño de página por defecto y máximo permitido | Base |
| PEND-006 | Migración React | Plan detallado de migración de Vanilla JS a React | Fase 6 |
| PEND-007 | Integración PostgreSQL real | Migración de persistencia en memoria a PostgreSQL | Fase 4 |
| PEND-008 | Despliegue EC2 | Plan de despliegue en entorno de producción | Fase 8 |

Estas decisiones pendientes no bloquean la implementación de v0002. Se resolverán en las fases correspondientes del plan de evolución.

---

## 4. Resumen

| ID | Decisión | Estado | Fase | Módulo | Hallazgo fuente clave |
|----|----------|--------|------|--------|----------------------|
| ADR-001 | Rutas canónicas `/intranet/notifications` y `/portal/notifications` | Accepted | D | M10 | SCREEN_ROUTE_AMBIGUOUS |
| ADR-002 | Endpoints GET/POST/PUT `/api/v1/admin/procedure-types` | Accepted | D | M02 | MISSING_ADMIN_ENDPOINT |
| ADR-003 | Endpoints GET/POST/PUT `/api/v1/admin/external-entities` | Accepted | D | M02 | MISSING_ADMIN_ENDPOINT |
| ADR-004 | API-002 como endpoint obligatorio con simulación académica | Accepted | A | M01 | API002_NOT_IMPLEMENTED |
| ADR-005 | `POST /api/v1/public/tramites/{id}/requests` como canónico | Accepted | D | M07 | API034_ROUTE_DIFFERENCE |
| ADR-006 | Columna `document_version_id` en `document_attachments` | Accepted | B | M03 | BR017_ATTACHMENT_VERSION_GAP |
| ADR-007 | Columna `previous_version_id` en `document_versions` | Accepted | B | M03 | BR021_PREVIOUS_VERSION_GAP |
| ADR-008 | Restricción `UNIQUE(document_type_id, document_number)` | Accepted | B | M03 | DOCUMENT_NUMBERING_MODEL_GAP |
| ADR-009 | Campos de contacto (nombre, email, teléfono, consentimiento) en OIRS | Accepted | D | M08 | OIRS_CONTACT_MODEL_GAP |
| ADR-010 | Migración 3 pasos para FK circular users-departments | Accepted | A | M02 | POTENTIAL_RELATIONSHIP_CYCLE |
| ADR-011 | Migración 3 pasos para FK circular documentos-versiones | Accepted | B | M03 | POTENTIAL_DOCUMENT_VERSION_CYCLE |
| ADR-012 | 9 actores conservados; ACT-007 válido en ambas apariciones | Accepted | Base | — | Duplicidad en fuentes |
| ADR-013 | Vanilla JS v0001, React target v0002+ | Accepted | Base | — | Evaluación de capacidades |
| ADR-014 | Memoria v0002, PostgreSQL target Fase 4 | Accepted | Base | — | MEMORY_PERSISTENCE_ACTIVE |
| ADR-015 | Simulaciones académicas para Clave Única, FirmaGob, SII | Accepted* | Base | — | Integraciones diferidas |
| ADR-016 | Contrato expandido a 46-47 endpoints | Accepted | Base | — | PARTIAL_ENDPOINT_IMPLEMENTATION |

*\*ADR-015 requiere aprobación humana explícita por su naturaleza de simulación académica.*

**Total de decisiones:** 16 aceptadas, 0 rechazadas, 0 propuestas, 0 diferidas.  
**Gate GATE-ARCH-002:** ✅ Verificado — 16/16 ADR presentes y aceptados.
