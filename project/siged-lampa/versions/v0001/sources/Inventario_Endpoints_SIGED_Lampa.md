# Inventario de Endpoints

## SIGED-Lampa

Version: `v0.1`

Estado: `Contrato funcional inicial`

Fuentes:

- [Especificacion_Funcional_SIGED_Lampa.md](C:\Users\lmata\Documents\Universidad\Agentes\Nueva Fabrica Software Web\Especificacion_Funcional_SIGED_Lampa.md:1)
- [Modelo_ER_Detallado_SIGED_Lampa.md](C:\Users\lmata\Documents\Universidad\Agentes\Nueva Fabrica Software Web\Modelo_ER_Detallado_SIGED_Lampa.md:1)

## 1. Proposito

Este documento detalla el inventario operativo de los 40 endpoints base de `SIGED-Lampa`, incluyendo autenticacion requerida, payload minimo, respuesta esperada y observaciones funcionales.

## 2. Convenciones API

- base path: `/api/v1`
- formato: `JSON`
- auth intranet: `Bearer JWT`
- auth ciudadano: `Bearer JWT`
- subida de archivos: `multipart/form-data`
- fechas: `ISO 8601`
- respuestas de error:
  - `400` validacion
  - `401` no autenticado
  - `403` sin permisos
  - `404` recurso no encontrado
  - `409` conflicto de negocio
  - `422` regla invalida

## 3. Respuesta estandar sugerida

### 3.1 Exito

```json
{
  "ok": true,
  "message": "Operacion exitosa",
  "data": {},
  "meta": {}
}
```

### 3.2 Error

```json
{
  "ok": false,
  "message": "Error de validacion",
  "errors": [
    {
      "field": "email",
      "code": "required",
      "detail": "El campo email es obligatorio"
    }
  ]
}
```

## 4. Matriz resumen de endpoints

| Codigo | Metodo | Endpoint | Auth | Modulo | Recurso principal |
|---|---|---|---|---|---|
| API-001 | POST | `/api/v1/auth/login` | publica | M01 | sesion intranet |
| API-002 | POST | `/api/v1/auth/citizen-login` | publica | M01 | sesion ciudadana |
| API-003 | POST | `/api/v1/auth/recover` | publica | M01 | recuperacion |
| API-004 | GET | `/api/v1/profile/me` | intranet | M01 | perfil |
| API-005 | PUT | `/api/v1/profile/me` | intranet | M01 | perfil |
| API-006 | GET | `/api/v1/users` | intranet admin | M02 | usuarios |
| API-007 | POST | `/api/v1/users` | intranet admin | M02 | usuarios |
| API-008 | PUT | `/api/v1/users/{id}` | intranet admin | M02 | usuarios |
| API-009 | GET | `/api/v1/roles` | intranet admin | M02 | roles |
| API-010 | PUT | `/api/v1/roles/{id}/permissions` | intranet admin | M02 | permisos |
| API-011 | GET | `/api/v1/departments` | intranet admin | M02 | departamentos |
| API-012 | POST | `/api/v1/departments` | intranet admin | M02 | departamentos |
| API-013 | GET | `/api/v1/document-types` | intranet | M02 | tipos documentales |
| API-014 | POST | `/api/v1/document-types` | intranet admin | M02 | tipos documentales |
| API-015 | GET | `/api/v1/documents` | intranet | M03 | documentos |
| API-016 | POST | `/api/v1/documents` | intranet | M03 | documentos |
| API-017 | GET | `/api/v1/documents/{id}` | intranet | M03 | documentos |
| API-018 | PUT | `/api/v1/documents/{id}` | intranet | M03 | documentos |
| API-019 | POST | `/api/v1/documents/{id}/attachments` | intranet | M03 | anexos |
| API-020 | POST | `/api/v1/documents/{id}/versions` | intranet | M03 | versiones |
| API-021 | POST | `/api/v1/documents/{id}/submit-review` | intranet | M04 | revisiones |
| API-022 | POST | `/api/v1/reviews/{id}/reply` | intranet | M04 | revisiones |
| API-023 | POST | `/api/v1/documents/{id}/approvals` | intranet | M04 | aprobaciones |
| API-024 | POST | `/api/v1/documents/{id}/signatures` | intranet | M04 | firmas |
| API-025 | GET | `/api/v1/expedients` | intranet | M05 | expedientes |
| API-026 | POST | `/api/v1/expedients` | intranet | M05 | expedientes |
| API-027 | GET | `/api/v1/expedients/{id}` | intranet | M05 | expedientes |
| API-028 | POST | `/api/v1/expedients/{id}/documents` | intranet | M05 | vinculos expediente |
| API-029 | GET | `/api/v1/correspondence` | intranet | M06 | correspondencia |
| API-030 | POST | `/api/v1/correspondence` | intranet | M06 | correspondencia |
| API-031 | POST | `/api/v1/correspondence/{id}/route` | intranet | M06 | derivaciones |
| API-032 | POST | `/api/v1/correspondence/{id}/link-response` | intranet | M06 | respuestas |
| API-033 | GET | `/api/v1/public/tramites` | publica | M07 | tramites |
| API-034 | POST | `/api/v1/public/tramites/{id}/requests` | ciudadano | M07 | solicitudes |
| API-035 | GET | `/api/v1/citizen/requests` | ciudadano | M07 | solicitudes |
| API-036 | GET | `/api/v1/citizen/requests/{id}` | ciudadano | M07 | solicitudes |
| API-037 | POST | `/api/v1/public/oirs` | publica o ciudadano | M08 | OIRS |
| API-038 | POST | `/api/v1/oirs/{id}/reply` | intranet OIRS | M08 | OIRS |
| API-039 | GET | `/api/v1/reports/dashboard` | intranet | M09 | reportes |
| API-040 | GET | `/api/v1/notifications` | intranet o ciudadano | M10 | notificaciones |

## 5. Endpoints detallados por modulo

### 5.1 M01 Autenticacion y perfil

#### API-001 POST `/api/v1/auth/login`

- objetivo: autenticar funcionario
- auth: publica
- request:

```json
{
  "username": "jlopez",
  "password": "Secret123!",
  "otp_code": "123456"
}
```

- response `200`:

```json
{
  "ok": true,
  "data": {
    "access_token": "jwt",
    "refresh_token": "jwt",
    "user": {
      "id": 1,
      "full_name": "Juan Lopez",
      "roles": ["ADMIN"]
    }
  }
}
```

- reglas:
  - credenciales obligatorias;
  - valida estado activo del usuario;
  - exige `otp_code` si 2FA esta habilitado.

#### API-002 POST `/api/v1/auth/citizen-login`

- objetivo: autenticar ciudadano
- auth: publica
- request:

```json
{
  "email": "vecino@correo.cl",
  "password": "Secret123!"
}
```

- response `200`: token y perfil ciudadano
- reglas:
  - email en formato valido;
  - cuenta debe estar activa y verificada si la politica lo exige.

#### API-003 POST `/api/v1/auth/recover`

- objetivo: iniciar recuperacion de acceso
- auth: publica
- request:

```json
{
  "channel": "email",
  "identifier": "jlopez@muni.cl"
}
```

- response `202`: solicitud aceptada
- reglas:
  - no revelar si la cuenta existe;
  - registrar auditoria.

#### API-004 GET `/api/v1/profile/me`

- objetivo: obtener perfil del usuario autenticado
- auth: intranet
- response `200`: datos basicos, roles, departamento y preferencias
- reglas:
  - solo devuelve el perfil del token actual.

#### API-005 PUT `/api/v1/profile/me`

- objetivo: actualizar perfil propio
- auth: intranet
- request:

```json
{
  "full_name": "Juan Lopez Perez",
  "phone": "+56911111111",
  "notification_email": true,
  "notification_web": true
}
```

- response `200`: perfil actualizado
- reglas:
  - no permite cambiar roles ni departamento;
  - valida telefono y longitud de nombre.

### 5.2 M02 Administracion organizacional

#### API-006 GET `/api/v1/users`

- objetivo: listar usuarios internos
- auth: intranet admin
- query params: `page`, `size`, `q`, `department_id`, `status`
- response `200`: listado paginado
- reglas:
  - requiere permiso `users.read`.

#### API-007 POST `/api/v1/users`

- objetivo: crear usuario interno
- auth: intranet admin
- request:

```json
{
  "username": "mrojas",
  "email": "mrojas@muni.cl",
  "full_name": "Maria Rojas",
  "department_id": 3,
  "role_ids": [2, 4],
  "job_title": "Secretaria"
}
```

- response `201`: usuario creado
- reglas:
  - username y email unicos;
  - `department_id` debe existir.

#### API-008 PUT `/api/v1/users/{id}`

- objetivo: editar usuario
- auth: intranet admin
- request: mismos campos administrables de usuario
- response `200`
- reglas:
  - no permite editar usuarios eliminados logicamente;
  - debe registrar `updated_by`.

#### API-009 GET `/api/v1/roles`

- objetivo: listar roles
- auth: intranet admin
- response `200`: roles con cantidad de permisos
- reglas:
  - requiere permiso `roles.read`.

#### API-010 PUT `/api/v1/roles/{id}/permissions`

- objetivo: actualizar permisos de un rol
- auth: intranet admin
- request:

```json
{
  "permission_ids": [1, 2, 3, 7, 8]
}
```

- response `200`
- reglas:
  - reemplazo atomico del set de permisos;
  - no duplicar permisos.

#### API-011 GET `/api/v1/departments`

- objetivo: listar departamentos
- auth: intranet admin
- response `200`
- reglas:
  - puede incluir arbol jerarquico.

#### API-012 POST `/api/v1/departments`

- objetivo: crear departamento
- auth: intranet admin
- request:

```json
{
  "code": "SECPLA",
  "name": "Secretaria Comunal de Planificacion",
  "parent_department_id": null,
  "manager_user_id": 12
}
```

- response `201`
- reglas:
  - `code` unico;
  - no permite padre igual al mismo nodo.

#### API-013 GET `/api/v1/document-types`

- objetivo: listar tipos documentales
- auth: intranet
- response `200`
- reglas:
  - visible para creadores de documentos.

#### API-014 POST `/api/v1/document-types`

- objetivo: crear tipo documental
- auth: intranet admin
- request:

```json
{
  "code": "MEMO",
  "name": "Memorandum",
  "retention_days": 365,
  "requires_signature": true
}
```

- response `201`
- reglas:
  - `code` unico;
  - `retention_days >= 0`.

### 5.3 M03 Gestion documental

#### API-015 GET `/api/v1/documents`

- objetivo: listar documentos
- auth: intranet
- query params: `page`, `size`, `q`, `status`, `type_id`, `owner_id`, `expedient_id`
- response `200`: listado paginado
- reglas:
  - filtrar segun permisos y confidencialidad.

#### API-016 POST `/api/v1/documents`

- objetivo: crear documento
- auth: intranet
- request:

```json
{
  "document_type_id": 2,
  "title": "Ordinario de respuesta",
  "summary": "Respuesta a requerimiento ciudadano",
  "department_id": 4,
  "confidentiality_level": "internal",
  "content": "Contenido inicial del documento"
}
```

- response `201`: documento creado con version `1`
- reglas:
  - crea registro en `documents` y `document_versions`;
  - titulo obligatorio;
  - `document_type_id` valido.

#### API-017 GET `/api/v1/documents/{id}`

- objetivo: obtener detalle de documento
- auth: intranet
- response `200`: documento, version actual, anexos, comentarios y flujo
- reglas:
  - valida permisos de lectura.

#### API-018 PUT `/api/v1/documents/{id}`

- objetivo: editar metadatos del documento
- auth: intranet
- request:

```json
{
  "title": "Ordinario actualizado",
  "summary": "Nuevo resumen",
  "due_date": "2026-07-20T18:00:00Z"
}
```

- response `200`
- reglas:
  - no editable si esta firmado o cerrado;
  - audita diferencias.

#### API-019 POST `/api/v1/documents/{id}/attachments`

- objetivo: adjuntar archivo
- auth: intranet
- content type: `multipart/form-data`
- campos: `file`, `description`
- response `201`
- reglas:
  - limita tipo MIME y tamano;
  - calcula hash del archivo.

#### API-020 POST `/api/v1/documents/{id}/versions`

- objetivo: generar nueva version
- auth: intranet
- request:

```json
{
  "content": "Contenido actualizado",
  "change_summary": "Se corrigen observaciones del revisor",
  "is_major": false
}
```

- response `201`: nueva version
- reglas:
  - incrementa `version_number`;
  - actualiza `current_version_id`.

### 5.4 M04 Revision, VB y firma

#### API-021 POST `/api/v1/documents/{id}/submit-review`

- objetivo: enviar documento a revision
- auth: intranet
- request:

```json
{
  "reviewer_user_id": 14,
  "instructions": "Revisar forma y fondo",
  "due_at": "2026-07-15T18:00:00Z"
}
```

- response `201`: revision creada
- reglas:
  - no se envia a si mismo;
  - documento debe tener version vigente.

#### API-022 POST `/api/v1/reviews/{id}/reply`

- objetivo: responder revision
- auth: intranet
- request:

```json
{
  "decision": "changes_required",
  "observations": "Falta referencia normativa"
}
```

- response `201`
- reglas:
  - solo responde el revisor asignado;
  - una solicitud abierta solo admite una respuesta final.

#### API-023 POST `/api/v1/documents/{id}/approvals`

- objetivo: solicitar aprobacion o VB
- auth: intranet
- request:

```json
{
  "approvers": [
    { "user_id": 20, "sequence_order": 1 },
    { "user_id": 21, "sequence_order": 2 }
  ]
}
```

- response `201`
- reglas:
  - orden secuencial sin duplicados;
  - documento debe estar listo para aprobacion.

#### API-024 POST `/api/v1/documents/{id}/signatures`

- objetivo: registrar firma simulada
- auth: intranet
- request:

```json
{
  "signature_profile_id": 5,
  "signature_mode": "simulated"
}
```

- response `201`
- reglas:
  - requiere aprobaciones previas completas;
  - usuario firmante debe coincidir con el perfil.

### 5.5 M05 Expedientes

#### API-025 GET `/api/v1/expedients`

- objetivo: listar expedientes
- auth: intranet
- query params: `page`, `size`, `q`, `status`, `department_id`
- response `200`
- reglas:
  - orden por apertura descendente.

#### API-026 POST `/api/v1/expedients`

- objetivo: crear expediente
- auth: intranet
- request:

```json
{
  "subject": "Solicitud de patente comercial",
  "description": "Expediente interno asociado al tramite",
  "department_id": 6
}
```

- response `201`
- reglas:
  - genera `code` unico;
  - crea evento inicial en `expedient_events`.

#### API-027 GET `/api/v1/expedients/{id}`

- objetivo: ver expediente
- auth: intranet
- response `200`: cabecera, documentos vinculados y timeline
- reglas:
  - puede incluir trazabilidad agregada.

#### API-028 POST `/api/v1/expedients/{id}/documents`

- objetivo: vincular documento a expediente
- auth: intranet
- request:

```json
{
  "document_id": 88,
  "relation_type": "support",
  "is_primary": false
}
```

- response `201`
- reglas:
  - evita duplicidad del vinculo;
  - crea evento de trazabilidad.

### 5.6 M06 Correspondencia

#### API-029 GET `/api/v1/correspondence`

- objetivo: listar correspondencia
- auth: intranet
- query params: `page`, `size`, `direction`, `status`, `tracking_code`
- response `200`

#### API-030 POST `/api/v1/correspondence`

- objetivo: registrar correspondencia
- auth: intranet
- request:

```json
{
  "direction": "INBOUND",
  "subject": "Ingreso de antecedente",
  "origin_entity_id": 9,
  "received_at": "2026-07-06T14:00:00Z",
  "priority": "normal"
}
```

- response `201`
- reglas:
  - genera `tracking_code`;
  - `direction` en catalogo permitido.

#### API-031 POST `/api/v1/correspondence/{id}/route`

- objetivo: derivar correspondencia
- auth: intranet
- request:

```json
{
  "to_department_id": 7,
  "assigned_user_id": 25,
  "instructions": "Favor analizar y responder"
}
```

- response `201`
- reglas:
  - no deriva al mismo departamento de origen;
  - registra historial de ruta.

#### API-032 POST `/api/v1/correspondence/{id}/link-response`

- objetivo: vincular documento respuesta
- auth: intranet
- request:

```json
{
  "document_id": 120
}
```

- response `200`
- reglas:
  - documento debe estar emitido o firmado;
  - actualiza estado de correspondencia.

### 5.7 M07 Portal ciudadano

#### API-033 GET `/api/v1/public/tramites`

- objetivo: listar tramites publicados
- auth: publica
- query params: `q`, `department_id`
- response `200`
- reglas:
  - solo tramites activos y publicados.

#### API-034 POST `/api/v1/public/tramites/{id}/requests`

- objetivo: iniciar solicitud ciudadana
- auth: ciudadano
- request:

```json
{
  "form_data": {
    "motivo": "Solicitud de certificado",
    "direccion": "Calle 123"
  },
  "attachments": [
    {
      "file_token": "tmp-file-01"
    }
  ]
}
```

- response `201`: solicitud creada con `tracking_code`
- reglas:
  - tramite debe estar vigente;
  - crea `citizen_request`;
  - puede generar expediente interno.

#### API-035 GET `/api/v1/citizen/requests`

- objetivo: listar solicitudes del ciudadano
- auth: ciudadano
- query params: `page`, `size`, `status`
- response `200`
- reglas:
  - solo solicitudes del token actual.

#### API-036 GET `/api/v1/citizen/requests/{id}`

- objetivo: ver detalle de solicitud ciudadana
- auth: ciudadano
- response `200`: solicitud, trazabilidad y respuesta final si existe
- reglas:
  - propietario obligatorio.

### 5.8 M08 OIRS

#### API-037 POST `/api/v1/public/oirs`

- objetivo: ingresar caso OIRS
- auth: publica o ciudadano
- request:

```json
{
  "category": "reclamo",
  "subject": "Problema con retiro de residuos",
  "body": "Detalle del caso",
  "email": "vecino@correo.cl"
}
```

- response `201`: caso creado con `tracking_code`
- reglas:
  - categoria obligatoria;
  - si no hay cuenta ciudadana, conserva datos de contacto minimos.

#### API-038 POST `/api/v1/oirs/{id}/reply`

- objetivo: responder caso OIRS
- auth: intranet OIRS
- request:

```json
{
  "body": "Su caso fue derivado al departamento de aseo",
  "close_case": false
}
```

- response `201`
- reglas:
  - solo operador o responsable autorizado;
  - si `close_case = true`, valida estado resoluble.

### 5.9 M09 Reportabilidad

#### API-039 GET `/api/v1/reports/dashboard`

- objetivo: obtener dashboard
- auth: intranet
- query params: `from`, `to`, `department_id`
- response `200`:

```json
{
  "ok": true,
  "data": {
    "documents_open": 34,
    "expedients_open": 12,
    "oirs_open": 5,
    "citizen_requests_open": 8
  }
}
```

- reglas:
  - filtra segun permisos y ambito del usuario;
  - no expone detalle personal sensible.

### 5.10 M10 Notificaciones

#### API-040 GET `/api/v1/notifications`

- objetivo: listar notificaciones del actor autenticado
- auth: intranet o ciudadano
- query params: `page`, `size`, `is_read`
- response `200`
- reglas:
  - solo devuelve notificaciones del actor actual;
  - orden por `sent_at DESC`.

## 6. Payloads comunes reutilizables

### 6.1 Paginacion

```json
{
  "page": 1,
  "size": 20,
  "total": 145,
  "pages": 8
}
```

### 6.2 Referencia minima de usuario

```json
{
  "id": 12,
  "full_name": "Maria Rojas",
  "department": "SECPLA"
}
```

### 6.3 Referencia minima de documento

```json
{
  "id": 88,
  "folio": "DOC-2026-000088",
  "title": "Ordinario de respuesta",
  "status": "in_review"
}
```

## 7. Matriz endpoint-tabla principal

| Endpoint | Tablas principales impactadas |
|---|---|
| API-001 | `users`, `sessions`, `two_factor_settings`, `audit_events` |
| API-002 | `citizen_accounts`, `audit_events` |
| API-003 | `audit_events` |
| API-004 | `users`, `roles`, `user_roles`, `departments` |
| API-005 | `users`, `audit_events` |
| API-006 a API-012 | `users`, `roles`, `permissions`, `user_roles`, `role_permissions`, `departments` |
| API-013 a API-014 | `document_types` |
| API-015 a API-020 | `documents`, `document_versions`, `document_attachments`, `document_comments`, `audit_events` |
| API-021 a API-024 | `document_review_requests`, `document_review_responses`, `document_approvals`, `document_signatures`, `signature_profiles`, `audit_events` |
| API-025 a API-028 | `expedients`, `expedient_documents`, `expedient_events` |
| API-029 a API-032 | `correspondence`, `correspondence_recipients`, `correspondence_routes`, `documents` |
| API-033 a API-036 | `procedure_types`, `published_procedures`, `citizen_requests`, `citizen_request_attachments`, `expedients` |
| API-037 a API-038 | `oirs_cases`, `oirs_messages`, `notifications` |
| API-039 | agregaciones sobre `documents`, `expedients`, `citizen_requests`, `oirs_cases` |
| API-040 | `notifications` |

## 8. Checklist de implementacion backend

- [x] 40 endpoints definidos
- [x] auth por tipo de actor definida
- [x] payload minimo por endpoint critico
- [x] respuestas base documentadas
- [x] reglas funcionales por endpoint
- [x] correlacion inicial con tablas del modelo ER

## 9. Siguientes artefactos sugeridos

- especificacion OpenAPI YAML;
- contratos DTO por modulo;
- matriz de permisos por endpoint;
- casos de prueba API positivos y negativos;
- coleccion Postman o Bruno;
- mapa frontend endpoint-pantalla.
