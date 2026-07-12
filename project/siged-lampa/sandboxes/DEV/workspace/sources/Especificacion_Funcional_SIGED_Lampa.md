# Especificacion Funcional

## SIGED-Lampa

Version: `v0.1`

Estado: `Borrador funcional base`

Tipo de producto: `Aplicacion web full stack, exclusivamente web`

## 1. Proposito

Este documento define la especificacion funcional de `SIGED-Lampa`, una aplicacion web de gestion documental municipal con intranet para funcionarios y portal ciudadano. Su objetivo es traducir el alcance priorizado de la licitacion revisada en un sistema construible, verificable y alineado con la rubrica del curso.

El documento sirve como base para:

- construccion del backlog del producto;
- modelado de base de datos;
- definicion de endpoints;
- diseno de pantallas;
- plan de pruebas;
- trazabilidad entre requisitos, implementacion y evidencia.

## 2. Fuentes

- [Documento_Maestro_App_Gestor_Documental_Municipal.md](C:\Users\lmata\Documents\Universidad\Agentes\Nueva Fabrica Software Web\Documento_Maestro_App_Gestor_Documental_Municipal.md:1)
- [EspecificacionesTecnicas (1).pdf](<C:\Users\lmata\Downloads\EspecificacionesTecnicas (1).pdf>)
- [terminosTecnicos2.pdf](<C:\Users\lmata\Downloads\terminosTecnicos2.pdf>)
- [Informe_Ejecutivo_WEBFORGE_V2.md](C:\Users\lmata\Documents\Universidad\Agentes\Nueva Fabrica Software Web\Informe_Ejecutivo_WEBFORGE_V2.md:1)

## 3. Vision del producto

`SIGED-Lampa` sera una plataforma web municipal para:

- gestionar documentos oficiales y expedientes electronicos;
- controlar flujos de revision, visto bueno y firma;
- registrar y derivar correspondencia;
- publicar tramites ciudadanos en linea;
- gestionar OIRS;
- mantener trazabilidad, auditoria y reportabilidad;
- operar mediante intranet y portal ciudadano, ambos via navegador.

## 4. Objetivos del sistema

### 4.1 Objetivos funcionales

- digitalizar el ciclo documental municipal;
- reducir dependencia del soporte papel;
- centralizar trazabilidad y auditoria;
- permitir seguimiento ciudadano de solicitudes;
- habilitar reportes operativos por modulo;
- unificar gestion interna y atencion digital.

### 4.2 Objetivos de entrega

- cumplir con los minimos de la rubrica;
- dejar una arquitectura web implementable;
- demostrar una fabrica agéntica capaz de conducir el proceso;
- producir evidencia tecnica, trazabilidad y plan de validacion.

## 5. Alcance funcional de la primera version

### 5.1 Modulos incluidos

- `M01` Autenticacion, perfiles y autorizacion
- `M02` Administracion organizacional
- `M03` Gestion documental
- `M04` Revision, visto bueno y firma simulada
- `M05` Expedientes y trazabilidad
- `M06` Correspondencia
- `M07` Portal ciudadano
- `M08` OIRS digital
- `M09` Reportabilidad
- `M10` Notificaciones

### 5.2 Modulos diferidos

- gestion de facturas y boletas;
- viajes y cometidos;
- permisos administrativos y vacaciones;
- control horario;
- seguimiento PMG;
- app nativa movil.

### 5.3 Integraciones diferidas o mockeadas

- Clave Unica;
- FirmaGob;
- validacion real con SII;
- operacion SaaS contractual completa.

## 6. Stakeholders y actores

### 6.1 Stakeholders

- administracion municipal;
- oficina de partes;
- jefaturas y directivos;
- funcionarios operativos;
- ciudadanos;
- equipo de soporte y administracion del sistema;
- equipo del curso y evaluadores.

### 6.2 Actores internos

- `ACT-ADM` Administrador del sistema
- `ACT-FUN` Funcionario municipal
- `ACT-OPA` Oficina de partes
- `ACT-REV` Revisor o jefatura
- `ACT-OIR` Operador OIRS
- `ACT-REP` Analista de reportes

### 6.3 Actores externos

- `ACT-CIU` Ciudadano autenticado
- `ACT-VIS` Ciudadano visitante
- `ACT-EXT` Entidad externa receptora

## 7. Arquitectura funcional de alto nivel

### 7.1 Superficies

- intranet web para funcionarios;
- portal web ciudadano;
- API REST;
- panel administrativo;
- panel de reportes;
- servicio de auditoria y notificaciones.

### 7.2 Capas logicas

- presentacion;
- aplicacion;
- dominio;
- persistencia;
- integraciones.

## 8. Catalogo de modulos

| Codigo | Modulo | Objetivo |
|---|---|---|
| M01 | Autenticacion, perfiles y autorizacion | Gestionar acceso, roles, permisos y preferencias |
| M02 | Administracion organizacional | Gestionar usuarios, departamentos, tipos documentales y parametros |
| M03 | Gestion documental | Crear, editar, versionar, numerar y archivar documentos |
| M04 | Revision, visto bueno y firma | Orquestar revision, aprobacion y firma simulada |
| M05 | Expedientes y trazabilidad | Agrupar documentos, tramites y auditoria |
| M06 | Correspondencia | Registrar, derivar y responder correspondencia |
| M07 | Portal ciudadano | Publicar tramites, noticias, avisos y seguimiento |
| M08 | OIRS digital | Gestionar solicitudes, reclamos, sugerencias y respuestas |
| M09 | Reportabilidad | Exponer dashboards y exportaciones |
| M10 | Notificaciones | Emitir alertas internas y ciudadanas |

## 9. Casos de uso

Se definen 12 casos de uso base. La rubrica exige 10 como minimo.

### UC-01 Iniciar sesion en intranet

- Actor principal: Administrador o Funcionario
- Precondicion: cuenta activa
- Flujo principal:
1. usuario accede a la pantalla de login;
2. ingresa credenciales;
3. sistema valida acceso;
4. sistema carga dashboard segun rol.
- Flujo alterno:
1. credenciales invalidas;
2. sistema informa error y bloquea tras intentos repetidos.

### UC-02 Crear documento institucional

- Actor principal: Funcionario
- Precondicion: usuario autenticado con permisos
- Flujo principal:
1. usuario selecciona tipo documental;
2. sistema despliega formulario asociado;
3. usuario completa datos y adjunta anexos;
4. sistema guarda documento en borrador.

### UC-03 Enviar documento a revision

- Actor principal: Funcionario
- Precondicion: documento en borrador
- Flujo principal:
1. usuario selecciona revisores;
2. define fecha limite;
3. sistema cambia estado a en revision;
4. sistema genera notificaciones.

### UC-04 Responder revision de documento

- Actor principal: Revisor
- Precondicion: revision pendiente asignada
- Flujo principal:
1. revisor abre documento;
2. registra comentarios;
3. aprueba o devuelve observaciones;
4. sistema registra evento y actualiza estado.

### UC-05 Solicitar visto bueno y firma

- Actor principal: Funcionario o Jefatura
- Precondicion: documento revisado
- Flujo principal:
1. usuario define secuencia de firmantes;
2. sistema crea solicitudes de VB y firma;
3. firmantes ejecutan aprobacion;
4. sistema deja documento finalizado.

### UC-06 Consultar expediente

- Actor principal: Funcionario
- Precondicion: expediente existente
- Flujo principal:
1. usuario busca expediente por folio;
2. sistema muestra timeline;
3. usuario revisa documentos, eventos y responsables.

### UC-07 Registrar correspondencia

- Actor principal: Oficina de partes
- Precondicion: usuario autenticado
- Flujo principal:
1. se registra correspondencia entrante o saliente;
2. se asignan departamentos y responsables;
3. se define plazo;
4. sistema habilita seguimiento.

### UC-08 Responder correspondencia con documento vinculado

- Actor principal: Funcionario
- Precondicion: correspondencia activa
- Flujo principal:
1. usuario genera o vincula documento de respuesta;
2. sistema actualiza estado;
3. sistema conserva trazabilidad entre ambos registros.

### UC-09 Iniciar tramite ciudadano

- Actor principal: Ciudadano
- Precondicion: tramite publicado
- Flujo principal:
1. ciudadano ingresa al portal;
2. selecciona tramite;
3. completa formulario y adjunta antecedentes;
4. sistema crea solicitud y expediente asociado.

### UC-10 Consultar estado de solicitud ciudadana

- Actor principal: Ciudadano
- Precondicion: solicitud existente
- Flujo principal:
1. ciudadano ingresa a su panel;
2. sistema lista solicitudes;
3. ciudadano abre detalle y revisa estado, hitos y mensajes.

### UC-11 Ingresar solicitud OIRS

- Actor principal: Ciudadano
- Precondicion: acceso al portal
- Flujo principal:
1. ciudadano elige tipo de caso;
2. registra mensaje y antecedentes;
3. sistema genera ticket;
4. sistema notifica recepcion.

### UC-12 Gestionar dashboard y reportes

- Actor principal: Administrador o Analista
- Precondicion: usuario con permisos
- Flujo principal:
1. usuario accede a dashboard;
2. aplica filtros;
3. sistema muestra graficos y listados;
4. usuario exporta reporte.

## 10. Catalogo de flujos funcionales

Se definen 30 flujos funcionales base. La rubrica exige 30 como minimo.

| Codigo | Flujo | Modulo |
|---|---|---|
| FF-01 | Login intranet | M01 |
| FF-02 | Login portal ciudadano | M01 |
| FF-03 | Recuperacion de acceso | M01 |
| FF-04 | Gestion de usuarios | M02 |
| FF-05 | Gestion de roles y permisos | M02 |
| FF-06 | Gestion de departamentos | M02 |
| FF-07 | Gestion de entidades externas | M02 |
| FF-08 | Gestion de tipos documentales | M02 |
| FF-09 | Creacion de documento | M03 |
| FF-10 | Edicion de documento en borrador | M03 |
| FF-11 | Adjuntar anexos | M03 |
| FF-12 | Versionar documento | M03 |
| FF-13 | Solicitar revision | M04 |
| FF-14 | Responder revision | M04 |
| FF-15 | Solicitar visto bueno | M04 |
| FF-16 | Ejecutar firma simulada | M04 |
| FF-17 | Cerrar documento finalizado | M04 |
| FF-18 | Crear expediente | M05 |
| FF-19 | Vincular documento a expediente | M05 |
| FF-20 | Consultar timeline de expediente | M05 |
| FF-21 | Registrar correspondencia | M06 |
| FF-22 | Derivar correspondencia | M06 |
| FF-23 | Vincular respuesta documental | M06 |
| FF-24 | Publicar tramite ciudadano | M07 |
| FF-25 | Iniciar solicitud ciudadana | M07 |
| FF-26 | Consultar estado ciudadano | M07 |
| FF-27 | Registrar OIRS | M08 |
| FF-28 | Gestionar respuesta OIRS | M08 |
| FF-29 | Visualizar dashboard | M09 |
| FF-30 | Emitir notificaciones y alertas | M10 |

## 11. Requisitos funcionales por modulo

### 11.1 M01 Autenticacion, perfiles y autorizacion

- soporte de acceso diferenciado para intranet y portal;
- control de sesiones;
- perfiles por rol;
- cambio de contrasena;
- preferencias de notificacion;
- 2FA preparada a nivel de interfaz y dominio.

### 11.2 M02 Administracion organizacional

- CRUD de usuarios;
- CRUD de roles;
- asignacion de permisos;
- CRUD de departamentos;
- mantenimiento de tipos documentales;
- mantenimiento de tipos de tramite;
- mantenimiento de entidades externas.

### 11.3 M03 Gestion documental

- alta de documento;
- borrador editable;
- carga de anexos;
- comentarios;
- versionado;
- numeracion automatica;
- generacion PDF;
- estado documental;
- confidencialidad;
- archivo final.

### 11.4 M04 Revision, visto bueno y firma

- solicitud de revision;
- respuesta de revision;
- cola de pendientes;
- solicitud de VB;
- secuencia de firmantes;
- firma simulada;
- carga de firma fisica escaneada;
- bitacora del flujo.

### 11.5 M05 Expedientes y trazabilidad

- crear expediente;
- asociar documentos;
- asociar tramites;
- timeline;
- seguimiento por estado;
- busqueda avanzada;
- auditoria.

### 11.6 M06 Correspondencia

- ingreso de correspondencia;
- origen y destino;
- derivacion;
- destinatarios multiples;
- confidencialidad;
- plazo de respuesta;
- vinculacion con documentos.

### 11.7 M07 Portal ciudadano

- home de tramites;
- catalogo de tramites;
- noticias;
- avisos;
- calendario;
- mapa de servicios;
- panel de solicitudes.

### 11.8 M08 OIRS digital

- ingreso de caso;
- clasificacion por tipo;
- derivacion interna;
- respuesta;
- seguimiento ciudadano;
- cierre de caso.

### 11.9 M09 Reportabilidad

- panel de documentos;
- panel de expedientes;
- panel de correspondencia;
- panel de tramites;
- panel OIRS;
- exportacion CSV/Excel.

### 11.10 M10 Notificaciones

- notificaciones internas;
- notificaciones al ciudadano;
- alertas por plazo;
- alertas por urgencia;
- alertas por cambio de estado;
- bandeja historica.

## 12. Catalogo de pantallas

Se definen 30 pantallas base. La rubrica exige 30 como minimo.

| Codigo | Pantalla | Modulo | Actor principal |
|---|---|---|---|
| P-01 | Login intranet | M01 | Funcionario |
| P-02 | Login ciudadano | M01 | Ciudadano |
| P-03 | Recuperacion de acceso | M01 | Usuario |
| P-04 | Perfil de usuario | M01 | Usuario |
| P-05 | Dashboard intranet | M01 | Funcionario |
| P-06 | Gestion de usuarios | M02 | Administrador |
| P-07 | Gestion de roles y permisos | M02 | Administrador |
| P-08 | Gestion de departamentos | M02 | Administrador |
| P-09 | Tipos documentales | M02 | Administrador |
| P-10 | Tipos de tramites | M02 | Administrador |
| P-11 | Entidades externas | M02 | Administrador |
| P-12 | Bandeja documental | M03 | Funcionario |
| P-13 | Crear documento | M03 | Funcionario |
| P-14 | Detalle de documento | M03 | Funcionario |
| P-15 | Versiones y anexos | M03 | Funcionario |
| P-16 | Revision pendiente | M04 | Revisor |
| P-17 | Flujo de aprobacion | M04 | Jefatura |
| P-18 | Firma simulada | M04 | Firmante |
| P-19 | Bandeja de expedientes | M05 | Funcionario |
| P-20 | Detalle de expediente | M05 | Funcionario |
| P-21 | Registro de correspondencia | M06 | Oficina de partes |
| P-22 | Seguimiento de correspondencia | M06 | Funcionario |
| P-23 | Portal ciudadano home | M07 | Ciudadano |
| P-24 | Catalogo de tramites | M07 | Ciudadano |
| P-25 | Formulario de tramite | M07 | Ciudadano |
| P-26 | Mis solicitudes | M07 | Ciudadano |
| P-27 | Ingreso OIRS | M08 | Ciudadano |
| P-28 | Gestion de OIRS | M08 | Operador OIRS |
| P-29 | Dashboard de reportes | M09 | Analista |
| P-30 | Bandeja de notificaciones | M10 | Usuario |

## 13. Catalogo de endpoints API

Se definen 40 endpoints base. La rubrica exige 40 como minimo.

| Codigo | Metodo | Endpoint | Modulo | Proposito |
|---|---|---|---|---|
| API-001 | POST | `/api/v1/auth/login` | M01 | iniciar sesion intranet |
| API-002 | POST | `/api/v1/auth/citizen-login` | M01 | iniciar sesion ciudadano |
| API-003 | POST | `/api/v1/auth/recover` | M01 | recuperar acceso |
| API-004 | GET | `/api/v1/profile/me` | M01 | obtener perfil |
| API-005 | PUT | `/api/v1/profile/me` | M01 | actualizar perfil |
| API-006 | GET | `/api/v1/users` | M02 | listar usuarios |
| API-007 | POST | `/api/v1/users` | M02 | crear usuario |
| API-008 | PUT | `/api/v1/users/{id}` | M02 | editar usuario |
| API-009 | GET | `/api/v1/roles` | M02 | listar roles |
| API-010 | PUT | `/api/v1/roles/{id}/permissions` | M02 | actualizar permisos |
| API-011 | GET | `/api/v1/departments` | M02 | listar departamentos |
| API-012 | POST | `/api/v1/departments` | M02 | crear departamento |
| API-013 | GET | `/api/v1/document-types` | M02 | listar tipos documentales |
| API-014 | POST | `/api/v1/document-types` | M02 | crear tipo documental |
| API-015 | GET | `/api/v1/documents` | M03 | listar documentos |
| API-016 | POST | `/api/v1/documents` | M03 | crear documento |
| API-017 | GET | `/api/v1/documents/{id}` | M03 | ver documento |
| API-018 | PUT | `/api/v1/documents/{id}` | M03 | editar documento |
| API-019 | POST | `/api/v1/documents/{id}/attachments` | M03 | adjuntar archivo |
| API-020 | POST | `/api/v1/documents/{id}/versions` | M03 | crear version |
| API-021 | POST | `/api/v1/documents/{id}/submit-review` | M04 | enviar a revision |
| API-022 | POST | `/api/v1/reviews/{id}/reply` | M04 | responder revision |
| API-023 | POST | `/api/v1/documents/{id}/approvals` | M04 | solicitar VB |
| API-024 | POST | `/api/v1/documents/{id}/signatures` | M04 | registrar firma simulada |
| API-025 | GET | `/api/v1/expedients` | M05 | listar expedientes |
| API-026 | POST | `/api/v1/expedients` | M05 | crear expediente |
| API-027 | GET | `/api/v1/expedients/{id}` | M05 | ver expediente |
| API-028 | POST | `/api/v1/expedients/{id}/documents` | M05 | vincular documento |
| API-029 | GET | `/api/v1/correspondence` | M06 | listar correspondencia |
| API-030 | POST | `/api/v1/correspondence` | M06 | registrar correspondencia |
| API-031 | POST | `/api/v1/correspondence/{id}/route` | M06 | derivar correspondencia |
| API-032 | POST | `/api/v1/correspondence/{id}/link-response` | M06 | vincular respuesta |
| API-033 | GET | `/api/v1/public/tramites` | M07 | listar tramites publicados |
| API-034 | POST | `/api/v1/public/tramites/{id}/requests` | M07 | iniciar tramite |
| API-035 | GET | `/api/v1/citizen/requests` | M07 | listar solicitudes ciudadanas |
| API-036 | GET | `/api/v1/citizen/requests/{id}` | M07 | ver solicitud ciudadana |
| API-037 | POST | `/api/v1/public/oirs` | M08 | ingresar OIRS |
| API-038 | POST | `/api/v1/oirs/{id}/reply` | M08 | responder OIRS |
| API-039 | GET | `/api/v1/reports/dashboard` | M09 | obtener dashboard |
| API-040 | GET | `/api/v1/notifications` | M10 | listar notificaciones |

## 14. Modelo de datos objetivo

Se definen 40 tablas base. La rubrica exige 40 como minimo.

| N | Tabla | Dominio |
|---|---|---|
| 1 | `users` | seguridad |
| 2 | `roles` | seguridad |
| 3 | `permissions` | seguridad |
| 4 | `user_roles` | seguridad |
| 5 | `role_permissions` | seguridad |
| 6 | `sessions` | seguridad |
| 7 | `two_factor_settings` | seguridad |
| 8 | `departments` | organizacion |
| 9 | `external_entities` | organizacion |
| 10 | `document_types` | documental |
| 11 | `document_templates` | documental |
| 12 | `document_statuses` | documental |
| 13 | `documents` | documental |
| 14 | `document_versions` | documental |
| 15 | `document_attachments` | documental |
| 16 | `document_comments` | documental |
| 17 | `document_review_requests` | documental |
| 18 | `document_review_responses` | documental |
| 19 | `document_approvals` | documental |
| 20 | `document_signatures` | documental |
| 21 | `signature_profiles` | documental |
| 22 | `expedients` | expedientes |
| 23 | `expedient_documents` | expedientes |
| 24 | `expedient_events` | expedientes |
| 25 | `correspondence` | correspondencia |
| 26 | `correspondence_recipients` | correspondencia |
| 27 | `correspondence_routes` | correspondencia |
| 28 | `citizen_accounts` | portal |
| 29 | `citizen_profiles` | portal |
| 30 | `procedure_types` | portal |
| 31 | `published_procedures` | portal |
| 32 | `citizen_requests` | portal |
| 33 | `citizen_request_attachments` | portal |
| 34 | `oirs_cases` | OIRS |
| 35 | `oirs_messages` | OIRS |
| 36 | `news_posts` | portal |
| 37 | `public_notices` | portal |
| 38 | `calendar_events` | portal/intranet |
| 39 | `notifications` | notificaciones |
| 40 | `audit_events` | trazabilidad |

## 15. Reglas de negocio

Se definen 60 reglas base. La rubrica exige 60 como minimo.

### 15.1 Reglas M01 y M02

- `BR-001` Solo usuarios activos pueden iniciar sesion.
- `BR-002` Todo usuario debe pertenecer al menos a un rol.
- `BR-003` Un usuario no puede acceder a funciones sin permiso explicito.
- `BR-004` Los perfiles ciudadanos y funcionarios no comparten el mismo ambito de autorizacion.
- `BR-005` Todo departamento debe tener nombre unico.
- `BR-006` Todo tipo documental debe tener un codigo unico.
- `BR-007` Todo tramite publicado debe estar asociado a un tipo de tramite vigente.
- `BR-008` Toda entidad externa debe tener nombre y canal de contacto.
- `BR-009` Solo administradores pueden crear roles.
- `BR-010` Solo administradores pueden modificar permisos.
- `BR-011` Las preferencias de notificacion son configurables por usuario.
- `BR-012` El acceso fallido repetido debe gatillar proteccion de seguridad.

### 15.2 Reglas M03 Gestion documental

- `BR-013` Todo documento debe pertenecer a un tipo documental.
- `BR-014` La numeracion documental es unica por tipo documental.
- `BR-015` Un documento en borrador puede editarse libremente por su creador y usuarios autorizados.
- `BR-016` Un documento enviado a revision ya no puede cambiar de tipo documental.
- `BR-017` Todo anexo debe quedar asociado a una version del documento.
- `BR-018` Todo comentario debe registrar autor y fecha.
- `BR-019` Un documento confidencial solo es visible para usuarios autorizados.
- `BR-020` Todo documento con urgencia debe generar alerta preventiva.
- `BR-021` Una nueva version debe referenciar explicitamente a la version anterior.
- `BR-022` Un documento finalizado no puede volver a borrador sin accion administrativa.
- `BR-023` Todo documento archivado debe seguir siendo consultable segun permisos.
- `BR-024` Todo documento emitido debe contar con codigo de verificacion.

### 15.3 Reglas M04 Revision, VB y firma

- `BR-025` Un documento no puede solicitar firma sin haber pasado por revision minima.
- `BR-026` Toda solicitud de revision debe tener responsable.
- `BR-027` Toda revision respondida debe quedar historizada.
- `BR-028` Un visto bueno pendiente impide el cierre del flujo.
- `BR-029` La secuencia de firmantes debe respetar el orden definido.
- `BR-030` El estado firmado se alcanza solo cuando todos los firmantes requeridos completan su accion.
- `BR-031` La firma simulada debe distinguirse de la firma fisica cargada.
- `BR-032` Cada evento de firma genera auditoria.
- `BR-033` Un firmante no puede firmar dos veces la misma etapa.
- `BR-034` Un rechazo de revision retorna el documento a su emisor.
- `BR-035` Un rechazo de VB bloquea el avance del flujo.
- `BR-036` Todo documento finalizado debe registrar firmantes y revisores.

### 15.4 Reglas M05 Expedientes y trazabilidad

- `BR-037` Todo expediente debe tener folio unico.
- `BR-038` Un documento puede pertenecer a uno o mas expedientes segun regla de negocio.
- `BR-039` Todo evento relevante debe quedar en timeline de expediente.
- `BR-040` El expediente debe reflejar estado agregado de sus documentos principales.
- `BR-041` Toda accion critica genera evento de auditoria.
- `BR-042` La busqueda por expediente debe soportar folio, estado, fecha y responsable.

### 15.5 Reglas M06 Correspondencia

- `BR-043` Toda correspondencia debe tener origen, destino y estado.
- `BR-044` La correspondencia puede asignarse a varios departamentos.
- `BR-045` La correspondencia confidencial restringe acceso por permiso.
- `BR-046` Toda correspondencia con plazo debe calcular vencimiento.
- `BR-047` La respuesta oficial puede vincularse a uno o varios documentos.
- `BR-048` Toda derivacion genera notificacion al responsable.

### 15.6 Reglas M07 Portal ciudadano

- `BR-049` Solo tramites publicados pueden iniciarse desde el portal.
- `BR-050` Toda solicitud ciudadana debe tener identificador unico.
- `BR-051` El ciudadano solo puede ver sus propias solicitudes.
- `BR-052` Todo tramite debe indicar requisitos y estado.
- `BR-053` Las noticias visibles en portal provienen de administracion autorizada.
- `BR-054` Los avisos ciudadanos tienen periodo de vigencia.

### 15.7 Reglas M08 OIRS

- `BR-055` Toda solicitud OIRS debe clasificarse por tipo.
- `BR-056` Todo caso OIRS debe tener estado y responsable.
- `BR-057` Toda respuesta OIRS debe quedar auditada.
- `BR-058` El ciudadano debe poder consultar historial de su caso.
- `BR-059` El cierre de un caso requiere registrar resolucion.
- `BR-060` Toda derivacion OIRS debe conservar trazabilidad completa.

## 16. Validaciones funcionales y restricciones

Se definen 100 validaciones base. La rubrica exige 100 como minimo.

### 16.1 Validaciones M01 y M02

- `VAL-001` Usuario obligatorio en login.
- `VAL-002` Contrasena obligatoria en login.
- `VAL-003` Email con formato valido en recuperacion de acceso.
- `VAL-004` Nombre de usuario unico.
- `VAL-005` Correo institucional unico para funcionarios.
- `VAL-006` Rol obligatorio al crear usuario.
- `VAL-007` Estado activo/inactivo obligatorio.
- `VAL-008` Nombre de departamento obligatorio.
- `VAL-009` Codigo de departamento unico.
- `VAL-010` Nombre de entidad externa obligatorio.

### 16.2 Validaciones M03

- `VAL-011` Tipo documental obligatorio.
- `VAL-012` Titulo del documento obligatorio.
- `VAL-013` Creador obligatorio.
- `VAL-014` Estado documental obligatorio.
- `VAL-015` Version inicial obligatoria.
- `VAL-016` Fecha de creacion obligatoria.
- `VAL-017` Numero documental unico por tipo.
- `VAL-018` Archivo adjunto con extension permitida.
- `VAL-019` Tamanio de adjunto dentro de limite.
- `VAL-020` Comentario no vacio.
- `VAL-021` Marca de confidencialidad booleana.
- `VAL-022` Fecha de urgencia no puede ser anterior a hoy.
- `VAL-023` Plantilla documental obligatoria cuando el tipo la exige.
- `VAL-024` Toda nueva version debe tener origen.
- `VAL-025` No se puede archivar documento sin estado final.
- `VAL-026` Documento final debe tener codigo de verificacion.
- `VAL-027` Documento debe pertenecer a un departamento responsable.
- `VAL-028` Solo usuarios autorizados pueden editar documento confidencial.
- `VAL-029` El historial debe registrar accion no vacia.
- `VAL-030` El PDF final debe existir antes de cierre.

### 16.3 Validaciones M04

- `VAL-031` Revisor obligatorio en solicitud de revision.
- `VAL-032` Fecha limite valida en revision.
- `VAL-033` Respuesta de revision no puede estar vacia.
- `VAL-034` VB requiere destinatario.
- `VAL-035` Orden de firmantes debe ser consecutivo.
- `VAL-036` Firmante no puede repetirse en misma secuencia.
- `VAL-037` Firma simulada requiere usuario autenticado.
- `VAL-038` Firma fisica requiere archivo adjunto.
- `VAL-039` No se puede firmar documento rechazado.
- `VAL-040` No se puede cerrar flujo con firmas pendientes.
- `VAL-041` Estado de revision debe ser valido.
- `VAL-042` Estado de aprobacion debe ser valido.
- `VAL-043` Comentario de rechazo obligatorio.
- `VAL-044` Secuencia de firmantes obligatoria cuando el tipo la requiere.
- `VAL-045` Todo evento de firma requiere timestamp.

### 16.4 Validaciones M05

- `VAL-046` Folio de expediente unico.
- `VAL-047` Responsable de expediente obligatorio.
- `VAL-048` Estado de expediente obligatorio.
- `VAL-049` Documento vinculado debe existir.
- `VAL-050` No se puede duplicar el mismo documento en el mismo expediente.
- `VAL-051` Evento de expediente requiere tipo de evento.
- `VAL-052` Busqueda por fecha debe usar rango valido.
- `VAL-053` Busqueda por estado debe usar catalogo valido.
- `VAL-054` Expediente debe registrar fecha de apertura.
- `VAL-055` Cierre de expediente requiere estado final.

### 16.5 Validaciones M06

- `VAL-056` Tipo de correspondencia obligatorio.
- `VAL-057` Remitente obligatorio.
- `VAL-058` Destino obligatorio.
- `VAL-059` Fecha de ingreso obligatoria.
- `VAL-060` Estado de correspondencia obligatorio.
- `VAL-061` Plazo de respuesta no puede ser anterior a fecha de ingreso.
- `VAL-062` Documento de respuesta vinculado debe existir.
- `VAL-063` Derivacion requiere responsable.
- `VAL-064` Correspondencia confidencial requiere marca explicita.
- `VAL-065` Observacion de cierre no vacia.

### 16.6 Validaciones M07

- `VAL-066` Tramite publicado requiere titulo.
- `VAL-067` Tramite publicado requiere descripcion.
- `VAL-068` Tramite requiere estado de publicacion.
- `VAL-069` Formulario ciudadano requiere campos obligatorios definidos.
- `VAL-070` Solicitud ciudadana requiere identificador unico.
- `VAL-071` Ciudadano autenticado obligatorio para tramites privados.
- `VAL-072` Adjuntos ciudadanos con extension permitida.
- `VAL-073` Fecha de envio de solicitud obligatoria.
- `VAL-074` Noticia requiere fecha de publicacion.
- `VAL-075` Aviso requiere vigencia de inicio y fin.

### 16.7 Validaciones M08

- `VAL-076` Tipo OIRS obligatorio.
- `VAL-077` Mensaje inicial obligatorio.
- `VAL-078` Canal de ingreso obligatorio.
- `VAL-079` Estado de caso obligatorio.
- `VAL-080` Responsable interno obligatorio tras derivacion.
- `VAL-081` Respuesta final no puede ser vacia.
- `VAL-082` Cierre requiere clasificacion de resultado.
- `VAL-083` Ciudadano propietario obligatorio.
- `VAL-084` Archivo adjunto OIRS con extension permitida.
- `VAL-085` Fecha de ingreso obligatoria.

### 16.8 Validaciones M09 y M10

- `VAL-086` Dashboard requiere rango de fechas valido.
- `VAL-087` Filtro de modulo debe pertenecer a catalogo valido.
- `VAL-088` Exportacion requiere formato soportado.
- `VAL-089` Reporte guardado requiere nombre unico por usuario.
- `VAL-090` Notificacion requiere destinatario.
- `VAL-091` Notificacion requiere tipo.
- `VAL-092` Notificacion requiere estado de lectura valido.
- `VAL-093` Alerta por plazo requiere fecha objetivo.
- `VAL-094` Alerta por urgencia requiere referencia a entidad origen.
- `VAL-095` Mensaje de notificacion no puede estar vacio.

### 16.9 Restricciones transversales CHECK

- `VAL-096` Todos los IDs deben ser positivos.
- `VAL-097` Todas las fechas de cierre deben ser mayores o iguales a fecha de apertura.
- `VAL-098` Todos los estados deben pertenecer a catalogos cerrados.
- `VAL-099` Toda entidad auditable debe registrar `created_at`.
- `VAL-100` Toda entidad modificable debe registrar `updated_at`.

## 17. Requisitos no funcionales

### 17.1 Seguridad

- autenticacion por credenciales seguras;
- hash de contrasenas;
- control de acceso por roles;
- auditoria de acciones;
- proteccion basica ante fuerza bruta;
- preparacion para 2FA;
- despliegue sobre HTTPS.

### 17.2 Trazabilidad

- timeline de expediente;
- historial documental;
- auditoria por accion;
- relacion entre ciudadano, solicitud y respuesta;
- reportes trazables a modulo y actor.

### 17.3 Disponibilidad y operacion

- despliegue Linux;
- estructura preparada para correr online;
- logs tecnicos;
- configuracion reproducible;
- base de datos relacional persistente.

### 17.4 Usabilidad

- responsive;
- navegacion clara;
- formularios guiados;
- mensajes de error explicitos;
- separacion visual entre intranet y portal ciudadano.

## 18. Plan base de pruebas

### 18.1 Niveles de prueba

- pruebas unitarias;
- pruebas de integracion;
- pruebas API;
- pruebas end-to-end web;
- pruebas de permisos;
- pruebas de trazabilidad.

### 18.2 Cobertura objetivo

- cobertura de codigo objetivo: 100%;
- cobertura de requisitos: 100%;
- cobertura de pantallas criticas: 100%;
- cobertura de flujos maestros: 100%.

### 18.3 Evidencia esperada

- reportes de test;
- capturas de flujo;
- matriz requisito-prueba-evidencia;
- evidencia de despliegue y acceso online.

## 19. Criterios de aceptacion del producto

El sistema se considerara aceptable si:

- permite crear y cerrar documentos institucionales;
- conserva trazabilidad de documentos, expedientes y solicitudes;
- conecta intranet con portal ciudadano;
- soporta OIRS;
- expone API consistente;
- cumple los minimos de la rubrica;
- queda preparado para despliegue Linux online.

## 20. Cobertura explicita de la rubrica

### 20.1 Cobertura cuantitativa minima

| Elemento | Minimo exigido | Definido en esta especificacion |
|---|---:|---:|
| Casos de uso | 10 | 12 |
| Flujos funcionales | 30 | 30 |
| Tablas | 40 | 40 |
| Endpoints API | 40 | 40 |
| Pantallas | 30 | 30 |
| Reglas de negocio | 60 | 60 |
| Validaciones y restricciones | 100 | 100 |

### 20.2 Cobertura de entregables de evaluacion

| Entregable de rubrica | Estado objetivo |
|---|---|
| Documentacion del proyecto | Cubierto con documento maestro, especificacion funcional, informe ejecutivo de la fabrica y artefactos tecnicos derivados |
| Codigo fuente | Debe incluir fabrica v2, backend web, frontend web, pruebas y scripts de despliegue |
| Sistema funcionando online en Linux sobre EC2 AWS | Debe demostrarse con despliegue verificable, URL publica, evidencia de acceso y guia de operacion |
| Diseno y plan de pruebas | Cubierto base en esta especificacion; debe completarse con matriz de pruebas y suite automatizada |
| Cobertura automatizada 100% | Meta obligatoria para la entrega; debe evidenciarse con reporte reproducible |
| Video de 6 a 9 minutos | Debe mostrar fabrica, flujo de trabajo, sistema funcionando, evidencia tecnica y resultados |

### 20.3 Implicancia para la construccion

Esta especificacion no cierra por si sola la evaluacion. Su funcion es fijar el alcance verificable del sistema web, de modo que la implementacion, las pruebas, el despliegue Linux y la evidencia audiovisual puedan ejecutarse contra un objetivo estable y medible.

## 21. Checklist de completitud del documento

- [x] vision del producto
- [x] alcance y fuera de alcance
- [x] actores
- [x] modulos
- [x] casos de uso
- [x] flujos funcionales
- [x] pantallas
- [x] endpoints
- [x] tablas
- [x] reglas de negocio
- [x] validaciones
- [x] requisitos no funcionales
- [x] lineamientos de prueba
- [x] matriz de cobertura de rubrica

## 22. Proximos artefactos derivados

Desde esta especificacion se deben generar a continuacion:

- modelo ER detallado;
- inventario de endpoints con payloads;
- mapa de pantallas con navegacion;
- backlog tecnico por modulo;
- plan de implementacion incremental;
- matriz de trazabilidad requisito-modulo-prueba-evidencia.

## 23. Prioridad de construccion recomendada

Para maximizar nota y factibilidad en el tiempo del curso, el orden recomendado es:

1. cerrar modelo de datos y contratos API;
2. construir autenticacion, gestion documental y expedientes;
3. construir portal ciudadano, OIRS y correspondencia;
4. completar dashboards, auditoria y notificaciones;
5. automatizar pruebas hasta cobertura objetivo;
6. desplegar en Linux sobre EC2 AWS;
7. preparar evidencia, capturas y guion del video final.
