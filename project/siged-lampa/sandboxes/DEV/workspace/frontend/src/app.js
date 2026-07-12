const SIGED = {
  "api": {
    "endpoints": [
      {
        "auth": "publica",
        "code": "API-001",
        "method": "POST",
        "module": "M01",
        "path": "/api/v1/auth/login",
        "resource": "sesion intranet"
      },
      {
        "auth": "publica",
        "code": "API-002",
        "method": "POST",
        "module": "M01",
        "path": "/api/v1/auth/citizen-login",
        "resource": "sesion ciudadana"
      },
      {
        "auth": "publica",
        "code": "API-003",
        "method": "POST",
        "module": "M01",
        "path": "/api/v1/auth/recover",
        "resource": "recuperacion"
      },
      {
        "auth": "intranet",
        "code": "API-004",
        "method": "GET",
        "module": "M01",
        "path": "/api/v1/profile/me",
        "resource": "perfil"
      },
      {
        "auth": "intranet",
        "code": "API-005",
        "method": "PUT",
        "module": "M01",
        "path": "/api/v1/profile/me",
        "resource": "perfil"
      },
      {
        "auth": "intranet admin",
        "code": "API-006",
        "method": "GET",
        "module": "M02",
        "path": "/api/v1/users",
        "resource": "usuarios"
      },
      {
        "auth": "intranet admin",
        "code": "API-007",
        "method": "POST",
        "module": "M02",
        "path": "/api/v1/users",
        "resource": "usuarios"
      },
      {
        "auth": "intranet admin",
        "code": "API-008",
        "method": "PUT",
        "module": "M02",
        "path": "/api/v1/users/{id}",
        "resource": "usuarios"
      },
      {
        "auth": "intranet admin",
        "code": "API-009",
        "method": "GET",
        "module": "M02",
        "path": "/api/v1/roles",
        "resource": "roles"
      },
      {
        "auth": "intranet admin",
        "code": "API-010",
        "method": "PUT",
        "module": "M02",
        "path": "/api/v1/roles/{id}/permissions",
        "resource": "permisos"
      },
      {
        "auth": "intranet admin",
        "code": "API-011",
        "method": "GET",
        "module": "M02",
        "path": "/api/v1/departments",
        "resource": "departamentos"
      },
      {
        "auth": "intranet admin",
        "code": "API-012",
        "method": "POST",
        "module": "M02",
        "path": "/api/v1/departments",
        "resource": "departamentos"
      },
      {
        "auth": "intranet",
        "code": "API-013",
        "method": "GET",
        "module": "M02",
        "path": "/api/v1/document-types",
        "resource": "tipos documentales"
      },
      {
        "auth": "intranet admin",
        "code": "API-014",
        "method": "POST",
        "module": "M02",
        "path": "/api/v1/document-types",
        "resource": "tipos documentales"
      },
      {
        "auth": "intranet",
        "code": "API-015",
        "method": "GET",
        "module": "M03",
        "path": "/api/v1/documents",
        "resource": "documentos"
      },
      {
        "auth": "intranet",
        "code": "API-016",
        "method": "POST",
        "module": "M03",
        "path": "/api/v1/documents",
        "resource": "documentos"
      },
      {
        "auth": "intranet",
        "code": "API-017",
        "method": "GET",
        "module": "M03",
        "path": "/api/v1/documents/{id}",
        "resource": "documentos"
      },
      {
        "auth": "intranet",
        "code": "API-018",
        "method": "PUT",
        "module": "M03",
        "path": "/api/v1/documents/{id}",
        "resource": "documentos"
      },
      {
        "auth": "intranet",
        "code": "API-019",
        "method": "POST",
        "module": "M03",
        "path": "/api/v1/documents/{id}/attachments",
        "resource": "anexos"
      },
      {
        "auth": "intranet",
        "code": "API-020",
        "method": "POST",
        "module": "M03",
        "path": "/api/v1/documents/{id}/versions",
        "resource": "versiones"
      },
      {
        "auth": "intranet",
        "code": "API-021",
        "method": "POST",
        "module": "M04",
        "path": "/api/v1/documents/{id}/submit-review",
        "resource": "revisiones"
      },
      {
        "auth": "intranet",
        "code": "API-022",
        "method": "POST",
        "module": "M04",
        "path": "/api/v1/reviews/{id}/reply",
        "resource": "revisiones"
      },
      {
        "auth": "intranet",
        "code": "API-023",
        "method": "POST",
        "module": "M04",
        "path": "/api/v1/documents/{id}/approvals",
        "resource": "aprobaciones"
      },
      {
        "auth": "intranet",
        "code": "API-024",
        "method": "POST",
        "module": "M04",
        "path": "/api/v1/documents/{id}/signatures",
        "resource": "firmas"
      },
      {
        "auth": "intranet",
        "code": "API-025",
        "method": "GET",
        "module": "M05",
        "path": "/api/v1/expedients",
        "resource": "expedientes"
      },
      {
        "auth": "intranet",
        "code": "API-026",
        "method": "POST",
        "module": "M05",
        "path": "/api/v1/expedients",
        "resource": "expedientes"
      },
      {
        "auth": "intranet",
        "code": "API-027",
        "method": "GET",
        "module": "M05",
        "path": "/api/v1/expedients/{id}",
        "resource": "expedientes"
      },
      {
        "auth": "intranet",
        "code": "API-028",
        "method": "POST",
        "module": "M05",
        "path": "/api/v1/expedients/{id}/documents",
        "resource": "vinculos expediente"
      },
      {
        "auth": "intranet",
        "code": "API-029",
        "method": "GET",
        "module": "M06",
        "path": "/api/v1/correspondence",
        "resource": "correspondencia"
      },
      {
        "auth": "intranet",
        "code": "API-030",
        "method": "POST",
        "module": "M06",
        "path": "/api/v1/correspondence",
        "resource": "correspondencia"
      },
      {
        "auth": "intranet",
        "code": "API-031",
        "method": "POST",
        "module": "M06",
        "path": "/api/v1/correspondence/{id}/route",
        "resource": "derivaciones"
      },
      {
        "auth": "intranet",
        "code": "API-032",
        "method": "POST",
        "module": "M06",
        "path": "/api/v1/correspondence/{id}/link-response",
        "resource": "respuestas"
      },
      {
        "auth": "publica",
        "code": "API-033",
        "method": "GET",
        "module": "M07",
        "path": "/api/v1/public/tramites",
        "resource": "tramites"
      },
      {
        "auth": "ciudadano",
        "code": "API-034",
        "method": "POST",
        "module": "M07",
        "path": "/api/v1/public/tramites/{id}/requests",
        "resource": "solicitudes"
      },
      {
        "auth": "ciudadano",
        "code": "API-035",
        "method": "GET",
        "module": "M07",
        "path": "/api/v1/citizen/requests",
        "resource": "solicitudes"
      },
      {
        "auth": "ciudadano",
        "code": "API-036",
        "method": "GET",
        "module": "M07",
        "path": "/api/v1/citizen/requests/{id}",
        "resource": "solicitudes"
      },
      {
        "auth": "publica o ciudadano",
        "code": "API-037",
        "method": "POST",
        "module": "M08",
        "path": "/api/v1/public/oirs",
        "resource": "OIRS"
      },
      {
        "auth": "intranet OIRS",
        "code": "API-038",
        "method": "POST",
        "module": "M08",
        "path": "/api/v1/oirs/{id}/reply",
        "resource": "OIRS"
      },
      {
        "auth": "intranet",
        "code": "API-039",
        "method": "GET",
        "module": "M09",
        "path": "/api/v1/reports/dashboard",
        "resource": "reportes"
      },
      {
        "auth": "intranet o ciudadano",
        "code": "API-040",
        "method": "GET",
        "module": "M10",
        "path": "/api/v1/notifications",
        "resource": "notificaciones"
      }
    ],
    "product": "SIGED-Lampa"
  },
  "seed": {
    "access_policy": {
      "rules": [
        "La navegacion visible se deriva del Mapa_Pantallas_Navegacion_SIGED_Lampa.md.",
        "Un usuario de portal no puede ver vistas de superficie intranet.",
        "Las vistas no permitidas vuelven a la vista por defecto de su superficie."
      ],
      "surfaces": {
        "intranet": {
          "allowed_view_ids": [
            "dashboard",
            "documents",
            "expedients",
            "requests",
            "module-m10",
            "module-m04",
            "users"
          ],
          "default_view": "dashboard",
          "forbidden_view_ids": []
        },
        "portal": {
          "allowed_view_ids": [
            "portal-home",
            "requests",
            "new-request",
            "profile"
          ],
          "default_view": "portal-home",
          "forbidden_view_ids": [
            "dashboard",
            "documents",
            "expedients",
            "module-m10",
            "module-m04",
            "users"
          ]
        }
      }
    },
    "counts": {
      "endpoints": 40,
      "er_tables": 40,
      "modules": 10,
      "screens": 30,
      "source_docs": 4,
      "use_cases": 12
    },
    "critical_flows": [
      {
        "id": "FLOW-DOC",
        "name": "Flujo documental interno",
        "screens": [
          "P-01",
          "P-05",
          "P-12",
          "P-13",
          "P-14",
          "P-16",
          "P-17",
          "P-18"
        ]
      },
      {
        "id": "FLOW-EXP",
        "name": "Consulta de expediente",
        "screens": [
          "P-05",
          "P-19",
          "P-20",
          "P-14"
        ]
      },
      {
        "id": "FLOW-COR",
        "name": "Correspondencia municipal",
        "screens": [
          "P-05",
          "P-21",
          "P-22",
          "P-14"
        ]
      },
      {
        "id": "FLOW-CIU",
        "name": "Tramite ciudadano",
        "screens": [
          "P-23",
          "P-24",
          "P-02",
          "P-25",
          "P-26"
        ]
      },
      {
        "id": "FLOW-OIRS",
        "name": "Ingreso y gestion OIRS",
        "screens": [
          "P-23",
          "P-27",
          "P-28"
        ]
      }
    ],
    "demo": {
      "documents": [
        {
          "folio": "DOC-2026-0001",
          "owner": "Secretaria Municipal",
          "status": "En revision",
          "title": "Decreto alcaldicio"
        },
        {
          "folio": "DOC-2026-0002",
          "owner": "DOM",
          "status": "Borrador",
          "title": "Memo Direccion Obras"
        },
        {
          "folio": "DOC-2026-0003",
          "owner": "OIRS",
          "status": "Firmado",
          "title": "Respuesta OIRS"
        }
      ],
      "kpis": [
        {
          "label": "Documentos activos",
          "trend": "+12 esta semana",
          "value": 184
        },
        {
          "label": "Revisiones pendientes",
          "trend": "8 vencen hoy",
          "value": 27
        },
        {
          "label": "Solicitudes ciudadanas",
          "trend": "91% dentro de SLA",
          "value": 63
        },
        {
          "label": "Trazas auditadas",
          "trend": "100% con evidencia",
          "value": 1240
        }
      ],
      "requests": [
        {
          "status": "Ingresada",
          "subject": "Certificado de residencia",
          "tracking": "TR-2026-00044"
        },
        {
          "status": "Asignada",
          "subject": "Consulta retiro de escombros",
          "tracking": "OIRS-2026-00112"
        }
      ],
      "roles": [
        {
          "code": "ADMIN",
          "name": "Administrador",
          "surface": "intranet"
        },
        {
          "code": "FUNC",
          "name": "Funcionario municipal",
          "surface": "intranet"
        },
        {
          "code": "OF_PARTES",
          "name": "Oficina de partes",
          "surface": "intranet"
        },
        {
          "code": "REVISOR",
          "name": "Revisor o jefatura",
          "surface": "intranet"
        },
        {
          "code": "OIRS",
          "name": "Operador OIRS",
          "surface": "intranet"
        },
        {
          "code": "REPORTES",
          "name": "Analista de reportes",
          "surface": "intranet"
        },
        {
          "code": "CIUDADANO",
          "name": "Usuario ciudadano",
          "surface": "portal"
        }
      ],
      "users": [
        {
          "department": "Administracion Municipal",
          "email": "admin@lampa.cl",
          "full_name": "Marcela Torres",
          "role": "ADMIN",
          "surface": "intranet",
          "username": "admin.lampa"
        },
        {
          "department": "Direccion de Obras",
          "email": "lperez@lampa.cl",
          "full_name": "Luis Perez",
          "role": "FUNC",
          "surface": "intranet",
          "username": "funcionario.dom"
        },
        {
          "department": "Oficina de Partes",
          "email": "partes@lampa.cl",
          "full_name": "Ana Rojas",
          "role": "OF_PARTES",
          "surface": "intranet",
          "username": "partes"
        },
        {
          "department": "Secretaria Municipal",
          "email": "rsilva@lampa.cl",
          "full_name": "Roberto Silva",
          "role": "REVISOR",
          "surface": "intranet",
          "username": "revisor.secmun"
        },
        {
          "department": "OIRS",
          "email": "csoto@lampa.cl",
          "full_name": "Carolina Soto",
          "role": "OIRS",
          "surface": "intranet",
          "username": "oirs.operador"
        },
        {
          "department": "Portal ciudadano",
          "email": "vecino@correo.cl",
          "full_name": "Vecino Demo",
          "role": "CIUDADANO",
          "surface": "portal",
          "username": "vecino.demo"
        }
      ]
    },
    "er_tables": [
      {
        "fks": "`department_id -> departments.id`",
        "key_fields": "`uuid`, `username`, `email`, `password_hash`, `full_name`, `job_title`, `status`, `last_login_at`",
        "name": "users",
        "pk": "id",
        "purpose": "funcionarios y operadores internos"
      },
      {
        "fks": "-",
        "key_fields": "`code`, `name`, `description`, `is_system`",
        "name": "roles",
        "pk": "id",
        "purpose": "roles de acceso"
      },
      {
        "fks": "-",
        "key_fields": "`code`, `name`, `module_code`, `description`",
        "name": "permissions",
        "pk": "id",
        "purpose": "permisos atomicos"
      },
      {
        "fks": "`user_id -> users.id`, `role_id -> roles.id`",
        "key_fields": "`assigned_at`, `assigned_by`",
        "name": "user_roles",
        "pk": "id",
        "purpose": "relacion usuario-rol"
      },
      {
        "fks": "`role_id -> roles.id`, `permission_id -> permissions.id`",
        "key_fields": "`granted_at`, `granted_by`",
        "name": "role_permissions",
        "pk": "id",
        "purpose": "relacion rol-permiso"
      },
      {
        "fks": "`user_id -> users.id`",
        "key_fields": "`token_hash`, `ip_address`, `user_agent`, `started_at`, `expires_at`, `revoked_at`",
        "name": "sessions",
        "pk": "id",
        "purpose": "sesiones activas e historicas"
      },
      {
        "fks": "`user_id -> users.id`",
        "key_fields": "`method`, `secret_hash`, `phone_masked`, `enabled_at`, `disabled_at`",
        "name": "two_factor_settings",
        "pk": "id",
        "purpose": "configuracion de 2FA"
      },
      {
        "fks": "`parent_department_id -> departments.id`, `manager_user_id -> users.id`",
        "key_fields": "`code`, `name`, `description`, `cost_center`, `status`",
        "name": "departments",
        "pk": "id",
        "purpose": "unidades municipales"
      },
      {
        "fks": "-",
        "key_fields": "`entity_type`, `name`, `tax_id`, `email`, `phone`, `address`, `contact_name`",
        "name": "external_entities",
        "pk": "id",
        "purpose": "personas juridicas u organismos externos"
      },
      {
        "fks": "-",
        "key_fields": "`code`, `name`, `description`, `retention_days`, `requires_signature`",
        "name": "document_types",
        "pk": "id",
        "purpose": "clasificacion documental"
      },
      {
        "fks": "`document_type_id -> document_types.id`",
        "key_fields": "`code`, `name`, `template_path`, `version_label`, `is_active`",
        "name": "document_templates",
        "pk": "id",
        "purpose": "plantillas de documentos"
      },
      {
        "fks": "-",
        "key_fields": "`code`, `name`, `sort_order`, `is_terminal`",
        "name": "document_statuses",
        "pk": "id",
        "purpose": "estados del documento"
      },
      {
        "fks": "`document_type_id -> document_types.id`, `status_id -> document_statuses.id`, `owner_user_id -> users.id`, `department_id -> departments.id`, `current_version_id -> document_versions.id`",
        "key_fields": "`uuid`, `folio`, `title`, `summary`, `confidentiality_level`, `origin_type`, `due_date`, `published_at`",
        "name": "documents",
        "pk": "id",
        "purpose": "documento principal"
      },
      {
        "fks": "`document_id -> documents.id`, `author_user_id -> users.id`",
        "key_fields": "`version_number`, `content_snapshot`, `change_summary`, `is_major`, `generated_at`",
        "name": "document_versions",
        "pk": "id",
        "purpose": "versionado formal"
      },
      {
        "fks": "`document_id -> documents.id`, `uploaded_by -> users.id`",
        "key_fields": "`file_name`, `mime_type`, `storage_path`, `file_size`, `checksum_sha256`",
        "name": "document_attachments",
        "pk": "id",
        "purpose": "anexos binarios"
      },
      {
        "fks": "`document_id -> documents.id`, `author_user_id -> users.id`, `version_id -> document_versions.id`",
        "key_fields": "`comment_type`, `body`, `is_resolved`, `resolved_at`, `resolved_by`",
        "name": "document_comments",
        "pk": "id",
        "purpose": "comentarios colaborativos"
      },
      {
        "fks": "`document_id -> documents.id`, `requested_by -> users.id`, `reviewer_user_id -> users.id`",
        "key_fields": "`review_round`, `instructions`, `status`, `sent_at`, `due_at`",
        "name": "document_review_requests",
        "pk": "id",
        "purpose": "solicitudes de revision"
      },
      {
        "fks": "`review_request_id -> document_review_requests.id`, `reviewer_user_id -> users.id`",
        "key_fields": "`decision`, `observations`, `responded_at`, `requires_changes`",
        "name": "document_review_responses",
        "pk": "id",
        "purpose": "respuesta del revisor"
      },
      {
        "fks": "`document_id -> documents.id`, `approver_user_id -> users.id`, `requested_by -> users.id`",
        "key_fields": "`sequence_order`, `status`, `requested_at`, `decided_at`, `decision_note`",
        "name": "document_approvals",
        "pk": "id",
        "purpose": "cadena de visto bueno"
      },
      {
        "fks": "`document_id -> documents.id`, `signer_user_id -> users.id`, `signature_profile_id -> signature_profiles.id`",
        "key_fields": "`signature_mode`, `signed_at`, `signature_hash`, `signature_status`",
        "name": "document_signatures",
        "pk": "id",
        "purpose": "firma simulada o integrable"
      },
      {
        "fks": "`user_id -> users.id`",
        "key_fields": "`display_name`, `position_label`, `provider`, `certificate_alias`, `is_default`",
        "name": "signature_profiles",
        "pk": "id",
        "purpose": "perfil de firma"
      },
      {
        "fks": "`department_id -> departments.id`, `owner_user_id -> users.id`",
        "key_fields": "`uuid`, `code`, `subject`, `description`, `status`, `opened_at`, `closed_at`",
        "name": "expedients",
        "pk": "id",
        "purpose": "contenedor de caso o tramite interno"
      },
      {
        "fks": "`expedient_id -> expedients.id`, `document_id -> documents.id`, `linked_by -> users.id`",
        "key_fields": "`relation_type`, `linked_at`, `is_primary`",
        "name": "expedient_documents",
        "pk": "id",
        "purpose": "relacion expediente-documento"
      },
      {
        "fks": "`expedient_id -> expedients.id`, `actor_user_id -> users.id`, `document_id -> documents.id`",
        "key_fields": "`event_type`, `event_label`, `payload_json`, `occurred_at`",
        "name": "expedient_events",
        "pk": "id",
        "purpose": "timeline de trazabilidad"
      },
      {
        "fks": "`origin_entity_id -> external_entities.id`, `document_id -> documents.id`, `created_by -> users.id`",
        "key_fields": "`tracking_code`, `direction`, `subject`, `received_at`, `sent_at`, `priority`, `status`",
        "name": "correspondence",
        "pk": "id",
        "purpose": "ingreso o salida de correspondencia"
      },
      {
        "fks": "`correspondence_id -> correspondence.id`, `external_entity_id -> external_entities.id`, `department_id -> departments.id`",
        "key_fields": "`recipient_type`, `delivery_channel`, `delivery_status`",
        "name": "correspondence_recipients",
        "pk": "id",
        "purpose": "destinatarios asociados"
      },
      {
        "fks": "`correspondence_id -> correspondence.id`, `from_department_id -> departments.id`, `to_department_id -> departments.id`, `assigned_user_id -> users.id`",
        "key_fields": "`route_status`, `routed_at`, `accepted_at`, `closed_at`, `instructions`",
        "name": "correspondence_routes",
        "pk": "id",
        "purpose": "derivaciones internas"
      },
      {
        "fks": "-",
        "key_fields": "`uuid`, `email`, `password_hash`, `status`, `last_login_at`, `email_verified_at`",
        "name": "citizen_accounts",
        "pk": "id",
        "purpose": "acceso del ciudadano"
      },
      {
        "fks": "`citizen_account_id -> citizen_accounts.id`",
        "key_fields": "`national_id`, `full_name`, `birth_date`, `phone`, `address`, `commune`",
        "name": "citizen_profiles",
        "pk": "id",
        "purpose": "datos personales del ciudadano"
      },
      {
        "fks": "`owner_department_id -> departments.id`",
        "key_fields": "`code`, `name`, `description`, `requires_login`, `estimated_days`",
        "name": "procedure_types",
        "pk": "id",
        "purpose": "catalogo base de tramites"
      },
      {
        "fks": "`procedure_type_id -> procedure_types.id`, `published_by -> users.id`",
        "key_fields": "`slug`, `title`, `instructions`, `requirements_html`, `is_active`, `published_at`",
        "name": "published_procedures",
        "pk": "id",
        "purpose": "version publicada del tramite"
      },
      {
        "fks": "`citizen_account_id -> citizen_accounts.id`, `published_procedure_id -> published_procedures.id`, `assigned_department_id -> departments.id`, `expedient_id -> expedients.id`",
        "key_fields": "`tracking_code`, `status`, `submitted_at`, `resolved_at`, `resolution_summary`",
        "name": "citizen_requests",
        "pk": "id",
        "purpose": "solicitud ciudadana"
      },
      {
        "fks": "`citizen_request_id -> citizen_requests.id`",
        "key_fields": "`file_name`, `mime_type`, `storage_path`, `file_size`, `checksum_sha256`",
        "name": "citizen_request_attachments",
        "pk": "id",
        "purpose": "anexos de solicitud"
      },
      {
        "fks": "`citizen_account_id -> citizen_accounts.id`, `assigned_department_id -> departments.id`, `assigned_user_id -> users.id`",
        "key_fields": "`tracking_code`, `category`, `channel`, `subject`, `status`, `submitted_at`, `closed_at`",
        "name": "oirs_cases",
        "pk": "id",
        "purpose": "caso OIRS"
      },
      {
        "fks": "`oirs_case_id -> oirs_cases.id`, `author_user_id -> users.id`, `author_citizen_id -> citizen_accounts.id`",
        "key_fields": "`message_direction`, `body`, `attachment_path`, `sent_at`, `read_at`",
        "name": "oirs_messages",
        "pk": "id",
        "purpose": "intercambio de mensajes OIRS"
      },
      {
        "fks": "`author_user_id -> users.id`",
        "key_fields": "`slug`, `title`, `summary`, `content_html`, `published_at`, `status`",
        "name": "news_posts",
        "pk": "id",
        "purpose": "noticias municipales"
      },
      {
        "fks": "`author_user_id -> users.id`",
        "key_fields": "`title`, `body_html`, `start_at`, `end_at`, `notice_type`, `status`",
        "name": "public_notices",
        "pk": "id",
        "purpose": "avisos visibles al ciudadano"
      },
      {
        "fks": "`department_id -> departments.id`, `owner_user_id -> users.id`",
        "key_fields": "`title`, `description`, `start_at`, `end_at`, `audience`, `location`, `status`",
        "name": "calendar_events",
        "pk": "id",
        "purpose": "hitos de agenda"
      },
      {
        "fks": "`user_id -> users.id`, `citizen_account_id -> citizen_accounts.id`",
        "key_fields": "`channel`, `title`, `body`, `link_url`, `is_read`, `sent_at`, `read_at`",
        "name": "notifications",
        "pk": "id",
        "purpose": "mensajes al usuario"
      },
      {
        "fks": "`actor_user_id -> users.id`, `actor_citizen_id -> citizen_accounts.id`",
        "key_fields": "`event_name`, `module_code`, `entity_type`, `entity_id`, `ip_address`, `payload_json`, `occurred_at`",
        "name": "audit_events",
        "pk": "id",
        "purpose": "evidencia de acciones del sistema"
      }
    ],
    "modules": [
      {
        "code": "M01",
        "name": "Autenticacion, perfiles y autorizacion",
        "objective": "Gestionar acceso, roles, permisos y preferencias"
      },
      {
        "code": "M02",
        "name": "Administracion organizacional",
        "objective": "Gestionar usuarios, departamentos, tipos documentales y parametros"
      },
      {
        "code": "M03",
        "name": "Gestion documental",
        "objective": "Crear, editar, versionar, numerar y archivar documentos"
      },
      {
        "code": "M04",
        "name": "Revision, visto bueno y firma",
        "objective": "Orquestar revision, aprobacion y firma simulada"
      },
      {
        "code": "M05",
        "name": "Expedientes y trazabilidad",
        "objective": "Agrupar documentos, tramites y auditoria"
      },
      {
        "code": "M06",
        "name": "Correspondencia",
        "objective": "Registrar, derivar y responder correspondencia"
      },
      {
        "code": "M07",
        "name": "Portal ciudadano",
        "objective": "Publicar tramites, noticias, avisos y seguimiento"
      },
      {
        "code": "M08",
        "name": "OIRS digital",
        "objective": "Gestionar solicitudes, reclamos, sugerencias y respuestas"
      },
      {
        "code": "M09",
        "name": "Reportabilidad",
        "objective": "Exponer dashboards y exportaciones"
      },
      {
        "code": "M10",
        "name": "Notificaciones",
        "objective": "Emitir alertas internas y ciudadanas"
      }
    ],
    "navigation": {
      "all": [
        {
          "allowed_roles": [
            "REPORTES"
          ],
          "endpoint_codes": [
            "API-039"
          ],
          "id": "dashboard",
          "kind": "dashboard",
          "label": "Inicio",
          "module": "M09",
          "route": "/intranet/reports/dashboard",
          "source_screens": [
            {
              "actor": "analista",
              "code": "P-29",
              "module": "M09",
              "name": "Dashboard de reportes",
              "route": "/intranet/reports/dashboard"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "ADMIN"
          ],
          "endpoint_codes": [
            "API-006",
            "API-007",
            "API-008",
            "API-009",
            "API-010",
            "API-011",
            "API-012",
            "API-013",
            "API-014",
            "API-015",
            "API-016",
            "API-017",
            "API-018",
            "API-019",
            "API-020",
            "API-021",
            "API-022",
            "API-023",
            "API-024"
          ],
          "id": "documents",
          "kind": "documents",
          "label": "Documentos",
          "module": "M02",
          "route": "/intranet/admin/document-types",
          "source_screens": [
            {
              "actor": "administrador",
              "code": "P-09",
              "module": "M02",
              "name": "Tipos documentales",
              "route": "/intranet/admin/document-types"
            },
            {
              "actor": "funcionario",
              "code": "P-12",
              "module": "M03",
              "name": "Bandeja documental",
              "route": "/intranet/documents"
            },
            {
              "actor": "funcionario",
              "code": "P-13",
              "module": "M03",
              "name": "Crear documento",
              "route": "/intranet/documents/new"
            },
            {
              "actor": "funcionario",
              "code": "P-14",
              "module": "M03",
              "name": "Detalle de documento",
              "route": "/intranet/documents/:id"
            },
            {
              "actor": "funcionario",
              "code": "P-15",
              "module": "M03",
              "name": "Versiones y anexos",
              "route": "/intranet/documents/:id/assets"
            },
            {
              "actor": "jefatura",
              "code": "P-17",
              "module": "M04",
              "name": "Flujo de aprobacion",
              "route": "/intranet/documents/:id/approvals"
            },
            {
              "actor": "firmante",
              "code": "P-18",
              "module": "M04",
              "name": "Firma simulada",
              "route": "/intranet/documents/:id/signature"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "ADMIN",
            "FUNC"
          ],
          "endpoint_codes": [
            "API-025",
            "API-026",
            "API-027",
            "API-028"
          ],
          "id": "expedients",
          "kind": "expedients",
          "label": "Expedientes",
          "module": "M05",
          "route": "/intranet/expedients",
          "source_screens": [
            {
              "actor": "funcionario",
              "code": "P-19",
              "module": "M05",
              "name": "Bandeja de expedientes",
              "route": "/intranet/expedients"
            },
            {
              "actor": "funcionario",
              "code": "P-20",
              "module": "M05",
              "name": "Detalle de expediente",
              "route": "/intranet/expedients/:id"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "OF_PARTES"
          ],
          "endpoint_codes": [
            "API-029",
            "API-030",
            "API-031",
            "API-032",
            "API-037",
            "API-038"
          ],
          "id": "requests",
          "kind": "requests",
          "label": "Solicitudes",
          "module": "M06",
          "route": "/intranet/correspondence/new",
          "source_screens": [
            {
              "actor": "oficina de partes",
              "code": "P-21",
              "module": "M06",
              "name": "Registro de correspondencia",
              "route": "/intranet/correspondence/new"
            },
            {
              "actor": "funcionario",
              "code": "P-22",
              "module": "M06",
              "name": "Seguimiento de correspondencia",
              "route": "/intranet/correspondence"
            },
            {
              "actor": "operador OIRS",
              "code": "P-28",
              "module": "M08",
              "name": "Gestion de OIRS",
              "route": "/intranet/oirs"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "ADMIN",
            "FUNC"
          ],
          "endpoint_codes": [
            "API-040"
          ],
          "id": "module-m10",
          "kind": "module",
          "label": "Notificaciones",
          "module": "M10",
          "route": "/notifications` o `/intranet/notifications",
          "source_screens": [
            {
              "actor": "usuario",
              "code": "P-30",
              "module": "M10",
              "name": "Bandeja de notificaciones",
              "route": "/notifications` o `/intranet/notifications"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "REVISOR"
          ],
          "endpoint_codes": [
            "API-021",
            "API-022",
            "API-023",
            "API-024"
          ],
          "id": "module-m04",
          "kind": "module",
          "label": "Revision, visto bueno y firma",
          "module": "M04",
          "route": "/intranet/reviews/:id",
          "source_screens": [
            {
              "actor": "revisor",
              "code": "P-16",
              "module": "M04",
              "name": "Revision pendiente",
              "route": "/intranet/reviews/:id"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "ADMIN",
            "FUNC"
          ],
          "endpoint_codes": [
            "API-001",
            "API-002",
            "API-003",
            "API-004",
            "API-005",
            "API-006",
            "API-007",
            "API-008",
            "API-009",
            "API-010",
            "API-011",
            "API-012",
            "API-013",
            "API-014"
          ],
          "id": "users",
          "kind": "users",
          "label": "Usuarios y roles",
          "module": "M01",
          "route": "/intranet/login",
          "source_screens": [
            {
              "actor": "funcionario",
              "code": "P-01",
              "module": "M01",
              "name": "Login intranet",
              "route": "/intranet/login"
            },
            {
              "actor": "usuario",
              "code": "P-03",
              "module": "M01",
              "name": "Recuperacion de acceso",
              "route": "/recover"
            },
            {
              "actor": "usuario interno",
              "code": "P-04",
              "module": "M01",
              "name": "Perfil de usuario",
              "route": "/intranet/profile"
            },
            {
              "actor": "funcionario",
              "code": "P-05",
              "module": "M01",
              "name": "Dashboard intranet",
              "route": "/intranet/dashboard"
            },
            {
              "actor": "administrador",
              "code": "P-06",
              "module": "M02",
              "name": "Gestion de usuarios",
              "route": "/intranet/admin/users"
            },
            {
              "actor": "administrador",
              "code": "P-07",
              "module": "M02",
              "name": "Gestion de roles y permisos",
              "route": "/intranet/admin/roles"
            },
            {
              "actor": "administrador",
              "code": "P-08",
              "module": "M02",
              "name": "Gestion de departamentos",
              "route": "/intranet/admin/departments"
            },
            {
              "actor": "administrador",
              "code": "P-11",
              "module": "M02",
              "name": "Entidades externas",
              "route": "/intranet/admin/external-entities"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "CIUDADANO"
          ],
          "endpoint_codes": [
            "API-033",
            "API-034",
            "API-035",
            "API-036"
          ],
          "id": "portal-home",
          "kind": "portal-home",
          "label": "Inicio",
          "module": "M07",
          "route": "/",
          "source_screens": [
            {
              "actor": "ciudadano",
              "code": "P-23",
              "module": "M07",
              "name": "Portal ciudadano home",
              "route": "/"
            }
          ],
          "surface": "portal"
        },
        {
          "allowed_roles": [
            "CIUDADANO"
          ],
          "endpoint_codes": [
            "API-033",
            "API-034",
            "API-035",
            "API-036"
          ],
          "id": "requests",
          "kind": "requests",
          "label": "Mis solicitudes",
          "module": "M07",
          "route": "/portal/requests",
          "source_screens": [
            {
              "actor": "ciudadano",
              "code": "P-26",
              "module": "M07",
              "name": "Mis solicitudes",
              "route": "/portal/requests"
            }
          ],
          "surface": "portal"
        },
        {
          "allowed_roles": [
            "CIUDADANO"
          ],
          "endpoint_codes": [
            "API-006",
            "API-007",
            "API-008",
            "API-009",
            "API-010",
            "API-011",
            "API-012",
            "API-013",
            "API-014",
            "API-033",
            "API-034",
            "API-035",
            "API-036",
            "API-037",
            "API-038"
          ],
          "id": "new-request",
          "kind": "request-form",
          "label": "Nuevo tramite",
          "module": "M02",
          "route": "/intranet/admin/procedure-types",
          "source_screens": [
            {
              "actor": "administrador",
              "code": "P-10",
              "module": "M02",
              "name": "Tipos de tramites",
              "route": "/intranet/admin/procedure-types"
            },
            {
              "actor": "ciudadano",
              "code": "P-24",
              "module": "M07",
              "name": "Catalogo de tramites",
              "route": "/tramites"
            },
            {
              "actor": "ciudadano",
              "code": "P-25",
              "module": "M07",
              "name": "Formulario de tramite",
              "route": "/tramites/:id/apply"
            },
            {
              "actor": "ciudadano",
              "code": "P-27",
              "module": "M08",
              "name": "Ingreso OIRS",
              "route": "/oirs"
            }
          ],
          "surface": "portal"
        },
        {
          "allowed_roles": [
            "CIUDADANO"
          ],
          "endpoint_codes": [
            "API-001",
            "API-002",
            "API-003",
            "API-004",
            "API-005"
          ],
          "id": "profile",
          "kind": "profile",
          "label": "Mi perfil",
          "module": "M01",
          "route": "/login",
          "source_screens": [
            {
              "actor": "ciudadano",
              "code": "P-02",
              "module": "M01",
              "name": "Login ciudadano",
              "route": "/login"
            }
          ],
          "surface": "portal"
        }
      ],
      "intranet": [
        {
          "allowed_roles": [
            "REPORTES"
          ],
          "endpoint_codes": [
            "API-039"
          ],
          "id": "dashboard",
          "kind": "dashboard",
          "label": "Inicio",
          "module": "M09",
          "route": "/intranet/reports/dashboard",
          "source_screens": [
            {
              "actor": "analista",
              "code": "P-29",
              "module": "M09",
              "name": "Dashboard de reportes",
              "route": "/intranet/reports/dashboard"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "ADMIN"
          ],
          "endpoint_codes": [
            "API-006",
            "API-007",
            "API-008",
            "API-009",
            "API-010",
            "API-011",
            "API-012",
            "API-013",
            "API-014",
            "API-015",
            "API-016",
            "API-017",
            "API-018",
            "API-019",
            "API-020",
            "API-021",
            "API-022",
            "API-023",
            "API-024"
          ],
          "id": "documents",
          "kind": "documents",
          "label": "Documentos",
          "module": "M02",
          "route": "/intranet/admin/document-types",
          "source_screens": [
            {
              "actor": "administrador",
              "code": "P-09",
              "module": "M02",
              "name": "Tipos documentales",
              "route": "/intranet/admin/document-types"
            },
            {
              "actor": "funcionario",
              "code": "P-12",
              "module": "M03",
              "name": "Bandeja documental",
              "route": "/intranet/documents"
            },
            {
              "actor": "funcionario",
              "code": "P-13",
              "module": "M03",
              "name": "Crear documento",
              "route": "/intranet/documents/new"
            },
            {
              "actor": "funcionario",
              "code": "P-14",
              "module": "M03",
              "name": "Detalle de documento",
              "route": "/intranet/documents/:id"
            },
            {
              "actor": "funcionario",
              "code": "P-15",
              "module": "M03",
              "name": "Versiones y anexos",
              "route": "/intranet/documents/:id/assets"
            },
            {
              "actor": "jefatura",
              "code": "P-17",
              "module": "M04",
              "name": "Flujo de aprobacion",
              "route": "/intranet/documents/:id/approvals"
            },
            {
              "actor": "firmante",
              "code": "P-18",
              "module": "M04",
              "name": "Firma simulada",
              "route": "/intranet/documents/:id/signature"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "ADMIN",
            "FUNC"
          ],
          "endpoint_codes": [
            "API-025",
            "API-026",
            "API-027",
            "API-028"
          ],
          "id": "expedients",
          "kind": "expedients",
          "label": "Expedientes",
          "module": "M05",
          "route": "/intranet/expedients",
          "source_screens": [
            {
              "actor": "funcionario",
              "code": "P-19",
              "module": "M05",
              "name": "Bandeja de expedientes",
              "route": "/intranet/expedients"
            },
            {
              "actor": "funcionario",
              "code": "P-20",
              "module": "M05",
              "name": "Detalle de expediente",
              "route": "/intranet/expedients/:id"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "OF_PARTES"
          ],
          "endpoint_codes": [
            "API-029",
            "API-030",
            "API-031",
            "API-032",
            "API-037",
            "API-038"
          ],
          "id": "requests",
          "kind": "requests",
          "label": "Solicitudes",
          "module": "M06",
          "route": "/intranet/correspondence/new",
          "source_screens": [
            {
              "actor": "oficina de partes",
              "code": "P-21",
              "module": "M06",
              "name": "Registro de correspondencia",
              "route": "/intranet/correspondence/new"
            },
            {
              "actor": "funcionario",
              "code": "P-22",
              "module": "M06",
              "name": "Seguimiento de correspondencia",
              "route": "/intranet/correspondence"
            },
            {
              "actor": "operador OIRS",
              "code": "P-28",
              "module": "M08",
              "name": "Gestion de OIRS",
              "route": "/intranet/oirs"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "ADMIN",
            "FUNC"
          ],
          "endpoint_codes": [
            "API-040"
          ],
          "id": "module-m10",
          "kind": "module",
          "label": "Notificaciones",
          "module": "M10",
          "route": "/notifications` o `/intranet/notifications",
          "source_screens": [
            {
              "actor": "usuario",
              "code": "P-30",
              "module": "M10",
              "name": "Bandeja de notificaciones",
              "route": "/notifications` o `/intranet/notifications"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "REVISOR"
          ],
          "endpoint_codes": [
            "API-021",
            "API-022",
            "API-023",
            "API-024"
          ],
          "id": "module-m04",
          "kind": "module",
          "label": "Revision, visto bueno y firma",
          "module": "M04",
          "route": "/intranet/reviews/:id",
          "source_screens": [
            {
              "actor": "revisor",
              "code": "P-16",
              "module": "M04",
              "name": "Revision pendiente",
              "route": "/intranet/reviews/:id"
            }
          ],
          "surface": "intranet"
        },
        {
          "allowed_roles": [
            "ADMIN",
            "FUNC"
          ],
          "endpoint_codes": [
            "API-001",
            "API-002",
            "API-003",
            "API-004",
            "API-005",
            "API-006",
            "API-007",
            "API-008",
            "API-009",
            "API-010",
            "API-011",
            "API-012",
            "API-013",
            "API-014"
          ],
          "id": "users",
          "kind": "users",
          "label": "Usuarios y roles",
          "module": "M01",
          "route": "/intranet/login",
          "source_screens": [
            {
              "actor": "funcionario",
              "code": "P-01",
              "module": "M01",
              "name": "Login intranet",
              "route": "/intranet/login"
            },
            {
              "actor": "usuario",
              "code": "P-03",
              "module": "M01",
              "name": "Recuperacion de acceso",
              "route": "/recover"
            },
            {
              "actor": "usuario interno",
              "code": "P-04",
              "module": "M01",
              "name": "Perfil de usuario",
              "route": "/intranet/profile"
            },
            {
              "actor": "funcionario",
              "code": "P-05",
              "module": "M01",
              "name": "Dashboard intranet",
              "route": "/intranet/dashboard"
            },
            {
              "actor": "administrador",
              "code": "P-06",
              "module": "M02",
              "name": "Gestion de usuarios",
              "route": "/intranet/admin/users"
            },
            {
              "actor": "administrador",
              "code": "P-07",
              "module": "M02",
              "name": "Gestion de roles y permisos",
              "route": "/intranet/admin/roles"
            },
            {
              "actor": "administrador",
              "code": "P-08",
              "module": "M02",
              "name": "Gestion de departamentos",
              "route": "/intranet/admin/departments"
            },
            {
              "actor": "administrador",
              "code": "P-11",
              "module": "M02",
              "name": "Entidades externas",
              "route": "/intranet/admin/external-entities"
            }
          ],
          "surface": "intranet"
        }
      ],
      "portal": [
        {
          "allowed_roles": [
            "CIUDADANO"
          ],
          "endpoint_codes": [
            "API-033",
            "API-034",
            "API-035",
            "API-036"
          ],
          "id": "portal-home",
          "kind": "portal-home",
          "label": "Inicio",
          "module": "M07",
          "route": "/",
          "source_screens": [
            {
              "actor": "ciudadano",
              "code": "P-23",
              "module": "M07",
              "name": "Portal ciudadano home",
              "route": "/"
            }
          ],
          "surface": "portal"
        },
        {
          "allowed_roles": [
            "CIUDADANO"
          ],
          "endpoint_codes": [
            "API-033",
            "API-034",
            "API-035",
            "API-036"
          ],
          "id": "requests",
          "kind": "requests",
          "label": "Mis solicitudes",
          "module": "M07",
          "route": "/portal/requests",
          "source_screens": [
            {
              "actor": "ciudadano",
              "code": "P-26",
              "module": "M07",
              "name": "Mis solicitudes",
              "route": "/portal/requests"
            }
          ],
          "surface": "portal"
        },
        {
          "allowed_roles": [
            "CIUDADANO"
          ],
          "endpoint_codes": [
            "API-006",
            "API-007",
            "API-008",
            "API-009",
            "API-010",
            "API-011",
            "API-012",
            "API-013",
            "API-014",
            "API-033",
            "API-034",
            "API-035",
            "API-036",
            "API-037",
            "API-038"
          ],
          "id": "new-request",
          "kind": "request-form",
          "label": "Nuevo tramite",
          "module": "M02",
          "route": "/intranet/admin/procedure-types",
          "source_screens": [
            {
              "actor": "administrador",
              "code": "P-10",
              "module": "M02",
              "name": "Tipos de tramites",
              "route": "/intranet/admin/procedure-types"
            },
            {
              "actor": "ciudadano",
              "code": "P-24",
              "module": "M07",
              "name": "Catalogo de tramites",
              "route": "/tramites"
            },
            {
              "actor": "ciudadano",
              "code": "P-25",
              "module": "M07",
              "name": "Formulario de tramite",
              "route": "/tramites/:id/apply"
            },
            {
              "actor": "ciudadano",
              "code": "P-27",
              "module": "M08",
              "name": "Ingreso OIRS",
              "route": "/oirs"
            }
          ],
          "surface": "portal"
        },
        {
          "allowed_roles": [
            "CIUDADANO"
          ],
          "endpoint_codes": [
            "API-001",
            "API-002",
            "API-003",
            "API-004",
            "API-005"
          ],
          "id": "profile",
          "kind": "profile",
          "label": "Mi perfil",
          "module": "M01",
          "route": "/login",
          "source_screens": [
            {
              "actor": "ciudadano",
              "code": "P-02",
              "module": "M01",
              "name": "Login ciudadano",
              "route": "/login"
            }
          ],
          "surface": "portal"
        }
      ]
    },
    "objective": "Construir SIGED-Lampa como aplicacion web municipal trazable para gestion documental, expedientes, correspondencia, portal ciudadano, OIRS, reportes y notificaciones.",
    "product": "SIGED-Lampa",
    "project_id": "siged-lampa",
    "screens": [
      {
        "actor": "funcionario",
        "code": "P-01",
        "module": "M01",
        "name": "Login intranet",
        "route": "/intranet/login",
        "zone": "intranet"
      },
      {
        "actor": "ciudadano",
        "code": "P-02",
        "module": "M01",
        "name": "Login ciudadano",
        "route": "/login",
        "zone": "portal"
      },
      {
        "actor": "usuario",
        "code": "P-03",
        "module": "M01",
        "name": "Recuperacion de acceso",
        "route": "/recover",
        "zone": "compartida"
      },
      {
        "actor": "usuario interno",
        "code": "P-04",
        "module": "M01",
        "name": "Perfil de usuario",
        "route": "/intranet/profile",
        "zone": "intranet"
      },
      {
        "actor": "funcionario",
        "code": "P-05",
        "module": "M01",
        "name": "Dashboard intranet",
        "route": "/intranet/dashboard",
        "zone": "intranet"
      },
      {
        "actor": "administrador",
        "code": "P-06",
        "module": "M02",
        "name": "Gestion de usuarios",
        "route": "/intranet/admin/users",
        "zone": "administracion"
      },
      {
        "actor": "administrador",
        "code": "P-07",
        "module": "M02",
        "name": "Gestion de roles y permisos",
        "route": "/intranet/admin/roles",
        "zone": "administracion"
      },
      {
        "actor": "administrador",
        "code": "P-08",
        "module": "M02",
        "name": "Gestion de departamentos",
        "route": "/intranet/admin/departments",
        "zone": "administracion"
      },
      {
        "actor": "administrador",
        "code": "P-09",
        "module": "M02",
        "name": "Tipos documentales",
        "route": "/intranet/admin/document-types",
        "zone": "administracion"
      },
      {
        "actor": "administrador",
        "code": "P-10",
        "module": "M02",
        "name": "Tipos de tramites",
        "route": "/intranet/admin/procedure-types",
        "zone": "administracion"
      },
      {
        "actor": "administrador",
        "code": "P-11",
        "module": "M02",
        "name": "Entidades externas",
        "route": "/intranet/admin/external-entities",
        "zone": "administracion"
      },
      {
        "actor": "funcionario",
        "code": "P-12",
        "module": "M03",
        "name": "Bandeja documental",
        "route": "/intranet/documents",
        "zone": "intranet"
      },
      {
        "actor": "funcionario",
        "code": "P-13",
        "module": "M03",
        "name": "Crear documento",
        "route": "/intranet/documents/new",
        "zone": "intranet"
      },
      {
        "actor": "funcionario",
        "code": "P-14",
        "module": "M03",
        "name": "Detalle de documento",
        "route": "/intranet/documents/:id",
        "zone": "intranet"
      },
      {
        "actor": "funcionario",
        "code": "P-15",
        "module": "M03",
        "name": "Versiones y anexos",
        "route": "/intranet/documents/:id/assets",
        "zone": "intranet"
      },
      {
        "actor": "revisor",
        "code": "P-16",
        "module": "M04",
        "name": "Revision pendiente",
        "route": "/intranet/reviews/:id",
        "zone": "intranet"
      },
      {
        "actor": "jefatura",
        "code": "P-17",
        "module": "M04",
        "name": "Flujo de aprobacion",
        "route": "/intranet/documents/:id/approvals",
        "zone": "intranet"
      },
      {
        "actor": "firmante",
        "code": "P-18",
        "module": "M04",
        "name": "Firma simulada",
        "route": "/intranet/documents/:id/signature",
        "zone": "intranet"
      },
      {
        "actor": "funcionario",
        "code": "P-19",
        "module": "M05",
        "name": "Bandeja de expedientes",
        "route": "/intranet/expedients",
        "zone": "intranet"
      },
      {
        "actor": "funcionario",
        "code": "P-20",
        "module": "M05",
        "name": "Detalle de expediente",
        "route": "/intranet/expedients/:id",
        "zone": "intranet"
      },
      {
        "actor": "oficina de partes",
        "code": "P-21",
        "module": "M06",
        "name": "Registro de correspondencia",
        "route": "/intranet/correspondence/new",
        "zone": "intranet"
      },
      {
        "actor": "funcionario",
        "code": "P-22",
        "module": "M06",
        "name": "Seguimiento de correspondencia",
        "route": "/intranet/correspondence",
        "zone": "intranet"
      },
      {
        "actor": "ciudadano",
        "code": "P-23",
        "module": "M07",
        "name": "Portal ciudadano home",
        "route": "/",
        "zone": "portal"
      },
      {
        "actor": "ciudadano",
        "code": "P-24",
        "module": "M07",
        "name": "Catalogo de tramites",
        "route": "/tramites",
        "zone": "portal"
      },
      {
        "actor": "ciudadano",
        "code": "P-25",
        "module": "M07",
        "name": "Formulario de tramite",
        "route": "/tramites/:id/apply",
        "zone": "portal"
      },
      {
        "actor": "ciudadano",
        "code": "P-26",
        "module": "M07",
        "name": "Mis solicitudes",
        "route": "/portal/requests",
        "zone": "portal autenticado"
      },
      {
        "actor": "ciudadano",
        "code": "P-27",
        "module": "M08",
        "name": "Ingreso OIRS",
        "route": "/oirs",
        "zone": "portal"
      },
      {
        "actor": "operador OIRS",
        "code": "P-28",
        "module": "M08",
        "name": "Gestion de OIRS",
        "route": "/intranet/oirs",
        "zone": "intranet"
      },
      {
        "actor": "analista",
        "code": "P-29",
        "module": "M09",
        "name": "Dashboard de reportes",
        "route": "/intranet/reports/dashboard",
        "zone": "reportes"
      },
      {
        "actor": "usuario",
        "code": "P-30",
        "module": "M10",
        "name": "Bandeja de notificaciones",
        "route": "/notifications` o `/intranet/notifications",
        "zone": "compartida"
      }
    ],
    "version": "v0001"
  },
  "trace": {
    "factory_gates": [
      "P01-P12",
      "project_isolation",
      "frontend_template",
      "sandbox",
      "security",
      "traceability"
    ],
    "module_trace": [
      {
        "endpoints": [
          "API-001",
          "API-002",
          "API-003",
          "API-004",
          "API-005"
        ],
        "module": "M01",
        "name": "Autenticacion, perfiles y autorizacion",
        "screens": [
          "P-01",
          "P-02",
          "P-03",
          "P-04",
          "P-05"
        ]
      },
      {
        "endpoints": [
          "API-006",
          "API-007",
          "API-008",
          "API-009",
          "API-010",
          "API-011",
          "API-012",
          "API-013",
          "API-014"
        ],
        "module": "M02",
        "name": "Administracion organizacional",
        "screens": [
          "P-06",
          "P-07",
          "P-08",
          "P-09",
          "P-10",
          "P-11"
        ]
      },
      {
        "endpoints": [
          "API-015",
          "API-016",
          "API-017",
          "API-018",
          "API-019",
          "API-020"
        ],
        "module": "M03",
        "name": "Gestion documental",
        "screens": [
          "P-12",
          "P-13",
          "P-14",
          "P-15"
        ]
      },
      {
        "endpoints": [
          "API-021",
          "API-022",
          "API-023",
          "API-024"
        ],
        "module": "M04",
        "name": "Revision, visto bueno y firma",
        "screens": [
          "P-16",
          "P-17",
          "P-18"
        ]
      },
      {
        "endpoints": [
          "API-025",
          "API-026",
          "API-027",
          "API-028"
        ],
        "module": "M05",
        "name": "Expedientes y trazabilidad",
        "screens": [
          "P-19",
          "P-20"
        ]
      },
      {
        "endpoints": [
          "API-029",
          "API-030",
          "API-031",
          "API-032"
        ],
        "module": "M06",
        "name": "Correspondencia",
        "screens": [
          "P-21",
          "P-22"
        ]
      },
      {
        "endpoints": [
          "API-033",
          "API-034",
          "API-035",
          "API-036"
        ],
        "module": "M07",
        "name": "Portal ciudadano",
        "screens": [
          "P-23",
          "P-24",
          "P-25",
          "P-26"
        ]
      },
      {
        "endpoints": [
          "API-037",
          "API-038"
        ],
        "module": "M08",
        "name": "OIRS digital",
        "screens": [
          "P-27",
          "P-28"
        ]
      },
      {
        "endpoints": [
          "API-039"
        ],
        "module": "M09",
        "name": "Reportabilidad",
        "screens": [
          "P-29"
        ]
      },
      {
        "endpoints": [
          "API-040"
        ],
        "module": "M10",
        "name": "Notificaciones",
        "screens": [
          "P-30"
        ]
      }
    ],
    "product": "SIGED-Lampa",
    "profile_hash": "sha256:7e25aed71f57f8646d675a33bb73aee85713ac37f6ec976f13f74d1a815d48e6",
    "source_docs": [
      {
        "lines": 903,
        "name": "Especificacion_Funcional_SIGED_Lampa.md",
        "path": "C:/Users/lmata/Documents/Universidad/Agentes/Especificacion_Funcional_SIGED_Lampa.md",
        "sha256": "sha256:14f43714ae53d3dd49ce130569919467c2d68d50c203350cc747f3e036269a24"
      },
      {
        "lines": 828,
        "name": "Inventario_Endpoints_SIGED_Lampa.md",
        "path": "C:/Users/lmata/Documents/Universidad/Agentes/Inventario_Endpoints_SIGED_Lampa.md",
        "sha256": "sha256:e453f402bb04d4c1e7cb71c16375c0ea562c34f284b1d1fe038838beb535a245"
      },
      {
        "lines": 246,
        "name": "Mapa_Pantallas_Navegacion_SIGED_Lampa.md",
        "path": "C:/Users/lmata/Documents/Universidad/Agentes/Mapa_Pantallas_Navegacion_SIGED_Lampa.md",
        "sha256": "sha256:dd399054204dfd1a31dde7f9b890ad2868dd53dab631e4da53a9a65dec24268d"
      },
      {
        "lines": 322,
        "name": "Modelo_ER_Detallado_SIGED_Lampa.md",
        "path": "C:/Users/lmata/Documents/Universidad/Agentes/Modelo_ER_Detallado_SIGED_Lampa.md",
        "sha256": "sha256:ba8340353bf20345bf5b1f1e40d7db26906ca32898f8100a6cc4974fa88f3282"
      }
    ]
  }
};

const state = {
  surface: "intranet",
  user: null,
  token: "",
  error: "",
  view: "dashboard",
  data: {
    roles: SIGED.seed.demo.roles,
    users: SIGED.seed.demo.users,
    documents: SIGED.seed.demo.documents,
    expedients: [],
    requests: SIGED.seed.demo.requests,
    audit: []
  }
};

const navigation = SIGED.seed.navigation || {
  intranet: [{id: "dashboard", label: "Inicio", kind: "dashboard", surface: "intranet"}],
  portal: [{id: "portal-home", label: "Inicio", kind: "portal-home", surface: "portal"}],
  all: []
};
const intranetViews = navigation.intranet.map(item => [item.id, item.label, item]);
const portalViews = navigation.portal.map(item => [item.id, item.label, item]);
const accessPolicy = SIGED.seed.access_policy || {surfaces: {}};

function render() {
  const route = currentRoute();
  if (route === "/login") {
    document.querySelector("#app").innerHTML = login();
  } else if (state.user) {
    if (!isAllowedView(state.view)) state.view = defaultView();
    document.querySelector("#app").innerHTML = shell();
  } else {
    navigate("/login", false);
    document.querySelector("#app").innerHTML = login();
  }
  bind();
}

function currentRoute() {
  return location.pathname === "/" ? "/login" : location.pathname;
}

function navigate(path, rerender = true) {
  if (location.pathname !== path) history.pushState({}, "", path);
  if (rerender) render();
}

function visibleViews() {
  return state.user?.surface === "portal" ? portalViews : intranetViews;
}

function defaultView() {
  const surface = state.user?.surface === "portal" ? "portal" : "intranet";
  return accessPolicy.surfaces?.[surface]?.default_view || (surface === "portal" ? "portal-home" : "dashboard");
}

function isAllowedView(view) {
  return visibleViews().some(([id]) => id === view);
}

function currentNavItem() {
  return visibleViews().find(([id]) => id === state.view)?.[2] || null;
}

function login() {
  const users = SIGED.seed.demo.users.filter(user => user.surface === state.surface);
  return `
    <main class="login-page">
      <section class="login-side">
        <div>
          <div class="mark">SL</div>
          <h1>SIGED-Lampa</h1>
          <p>Acceso municipal y portal ciudadano para gestion documental, expedientes, OIRS, correspondencia y trazabilidad operacional.</p>
          <div class="source-list">
            <div><span>Fuentes autorizadas</span><strong>${SIGED.trace.source_docs.length}</strong></div>
            <div><span>Modulos funcionales</span><strong>${SIGED.seed.modules.length}</strong></div>
            <div><span>Endpoints inventariados</span><strong>${SIGED.api.endpoints.length}</strong></div>
            <div><span>Tablas ER</span><strong>${SIGED.seed.er_tables.length}</strong></div>
          </div>
        </div>
        <p>DEV local generado por la fabrica. Sin datos productivos ni integraciones externas activas.</p>
      </section>
      <section class="login-main">
        <form class="login-card" data-form="login">
          <h2>Inicio de sesion</h2>
          <div class="muted">Seleccione superficie y usuario demo.</div>
          <div class="tabs">
            <button type="button" data-surface="intranet" class="${state.surface === "intranet" ? "active" : ""}">Intranet</button>
            <button type="button" data-surface="portal" class="${state.surface === "portal" ? "active" : ""}">Usuario normal</button>
          </div>
          <div class="field">
            <label for="username">Usuario</label>
            <select id="username">${users.map(user => `<option value="${user.username}">${user.full_name} - ${roleName(user.role)}</option>`).join("")}</select>
          </div>
          <div class="field">
            <label for="password">Clave</label>
            <input id="password" type="password" value="${state.surface === "portal" ? "vecino123" : "demo123"}">
          </div>
          <button class="btn primary full" type="submit">Ingresar</button>
          <div class="error">${state.error}</div>
          <div class="hint">Endpoint usado: <strong>POST /api/v1/auth/login</strong>. La sesion queda en memoria local para este incremento DEV.</div>
        </form>
      </section>
    </main>
  `;
}

function shell() {
  return `
    <main class="shell">
      <aside class="sidebar">
        <div class="mark">SL</div>
        <div class="brand">SIGED-Lampa</div>
        <div class="muted">${state.user.full_name}<br>${roleName(state.user.role)}</div>
        <nav class="nav">
          ${visibleViews().map(([id, label]) => `<button data-view="${id}" class="${state.view === id ? "active" : ""}">${label}</button>`).join("")}
          <button data-action="logout">Cerrar sesion</button>
        </nav>
      </aside>
      <section class="main">
        <div class="topbar">
          <div>
            <h1>${title()}</h1>
            <div class="muted">${state.user.surface === "portal" ? "Portal ciudadano" : "Intranet municipal"} conectado a backend local.</div>
          </div>
          <div class="actions">
            <button class="btn" data-action="refresh">Actualizar</button>
            <button class="btn green" data-action="health">Health API</button>
          </div>
        </div>
        ${content()}
      </section>
    </main>
  `;
}

function content() {
  if (state.user?.surface === "portal") return portalContent();
  if (state.view === "documents") return documents();
  if (state.view === "expedients") return tableCard("Expedientes activos", ["Codigo", "Materia", "Estado", "Responsable"], state.data.expedients.map(item => [item.code, item.subject, badge(item.status), item.owner]));
  if (state.view === "requests") return requests();
  if (state.view === "users") return users();
  if (state.view === "trace") return trace();
  if (state.view === "dashboard") return dashboard();
  return generatedView();
}

function portalContent() {
  if (state.view === "new-request") return requestForm("Nuevo tramite municipal");
  if (state.view === "profile") return citizenProfile();
  if (state.view === "requests") return citizenRequests();
  if (state.view === "portal-home") return portalHome();
  return generatedView();
}

function portalHome() {
  return `
    <section class="grid">
      <div class="card kpi"><span class="muted">Solicitudes activas</span><strong>${state.data.requests.length}</strong><span>Seguimiento ciudadano</span></div>
      <div class="card kpi"><span class="muted">Ultimo estado</span><strong>${escapeHtml(state.data.requests[0]?.status || "Sin casos")}</strong><span>${escapeHtml(state.data.requests[0]?.tracking || "Ingrese un tramite")}</span></div>
      <div class="card kpi"><span class="muted">Canal</span><strong>Portal</strong><span>Atencion municipal digital</span></div>
      <div class="card kpi"><span class="muted">Usuario</span><strong>${escapeHtml(state.user.full_name)}</strong><span>${escapeHtml(state.user.email)}</span></div>
    </section>
    <section class="split">
      ${citizenRequests()}
      <div class="card">
        <h2>Acciones disponibles</h2>
        <div class="actions">
          <button class="btn primary" data-view="new-request">Ingresar tramite</button>
          <button class="btn" data-view="requests">Ver seguimiento</button>
        </div>
      </div>
    </section>
  `;
}

function dashboard() {
  const kpis = [
    ["Documentos activos", state.data.documents.length],
    ["Usuarios demo", state.data.users.length],
    ["Solicitudes ciudadanas", state.data.requests.length],
    ["Eventos auditados", state.data.audit.length]
  ];
  return `
    <section class="grid">${kpis.map(([label, value]) => `<div class="card kpi"><span class="muted">${label}</span><strong>${value}</strong><span>Datos desde API local</span></div>`).join("")}</section>
    <section class="split">
      ${tableCard("Trabajo documental reciente", ["Folio", "Titulo", "Estado", "Unidad"], state.data.documents.map(item => [item.folio, item.title, badge(item.status), item.owner]))}
      <div class="card">
        <h2>Flujos criticos</h2>
        ${SIGED.seed.critical_flows.map(flow => `<div class="trace-line"><strong>${flow.name}</strong><br><span class="muted">${flow.screens.join(" -> ")}</span></div>`).join("")}
      </div>
    </section>
  `;
}

function documents() {
  return `
    <section class="split">
      <div>
        ${tableCard("Bandeja documental", ["Folio", "Titulo", "Tipo", "Estado", "Responsable"], state.data.documents.map(item => [item.folio, item.title, item.type || "-", badge(item.status), item.owner]))}
      </div>
      <form class="card" data-form="document">
        <h2>Nuevo documento</h2>
        <div class="form-grid">
          ${field("doc-title", "Titulo", "Oficio a entidad externa")}
          ${field("doc-type", "Tipo", "Oficio")}
          ${field("doc-department", "Unidad", "Secretaria Municipal")}
          ${field("doc-owner", "Responsable", state.user.full_name)}
        </div>
        <button class="btn primary" type="submit">Crear borrador</button>
      </form>
    </section>
  `;
}

function requests() {
  return `
    <section class="split">
      ${tableCard("Solicitudes ciudadanas", ["Tracking", "Materia", "Estado", "Canal"], state.data.requests.map(item => [item.tracking, item.subject, badge(item.status), item.channel]))}
      ${requestForm("Ingreso ciudadano")}
    </section>
  `;
}

function citizenRequests() {
  return tableCard("Mis solicitudes", ["Tracking", "Materia", "Estado", "Canal"], state.data.requests.map(item => [item.tracking, item.subject, badge(item.status), item.channel]));
}

function requestForm(titleText) {
  return `
    <form class="card" data-form="request">
      <h2>${titleText}</h2>
      ${field("request-subject", "Materia", "Certificado de residencia")}
      <button class="btn primary" type="submit">Enviar solicitud</button>
    </form>
  `;
}

function citizenProfile() {
  return tableCard("Mi perfil", ["Campo", "Valor"], [
    ["Nombre", state.user.full_name],
    ["Usuario", state.user.username],
    ["Correo", state.user.email],
    ["Rol", roleName(state.user.role)]
  ]);
}

function users() {
  return `
    <section class="split">
      ${tableCard("Usuarios semilla", ["Usuario", "Nombre", "Rol", "Superficie"], state.data.users.map(item => [item.username, item.full_name, roleName(item.role), item.surface]))}
      ${tableCard("Roles", ["Codigo", "Nombre", "Superficie"], state.data.roles.map(item => [item.code, item.name, item.surface]))}
    </section>
  `;
}

function trace() {
  return `
    <section class="trace">
      ${tableCard("Fuentes autorizadas", ["Archivo", "Lineas", "SHA-256"], SIGED.trace.source_docs.map(item => [item.name, item.lines, item.sha256]))}
      ${tableCard("Modulo a pantallas y endpoints", ["Modulo", "Nombre", "Pantallas", "Endpoints"], SIGED.trace.module_trace.map(item => [item.module, item.name, item.screens.join(" "), item.endpoints.join(" ")]))}
      ${tableCard("Catalogo API", ["Codigo", "Metodo", "Ruta", "Auth"], SIGED.api.endpoints.slice(0, 20).map(item => [item.code, item.method, item.path, item.auth]))}
    </section>
  `;
}

function generatedView() {
  const item = currentNavItem();
  if (!item) return `<section class="card"><h2>Vista no disponible</h2><p class="muted">La vista solicitada no pertenece a esta superficie.</p></section>`;
  const screens = item.source_screens || [];
  const endpoints = (item.endpoint_codes || []).map(code => SIGED.api.endpoints.find(endpoint => endpoint.code === code)).filter(Boolean);
  return `
    <section class="split">
      ${tableCard(item.label, ["Pantalla", "Ruta", "Actor"], screens.map(screen => [screen.code, screen.route || "-", screen.actor || "-"]))}
      ${tableCard("Endpoints relacionados", ["Codigo", "Metodo", "Ruta"], endpoints.map(endpoint => [endpoint.code, endpoint.method, endpoint.path]))}
    </section>
  `;
}

function bind() {
  document.querySelectorAll("[data-surface]").forEach(button => button.addEventListener("click", () => {
    state.surface = button.dataset.surface;
    state.error = "";
    render();
  }));
  document.querySelector("[data-form='login']")?.addEventListener("submit", loginSubmit);
  document.querySelector("[data-form='document']")?.addEventListener("submit", documentSubmit);
  document.querySelector("[data-form='request']")?.addEventListener("submit", requestSubmit);
  document.querySelectorAll("[data-view]").forEach(button => button.addEventListener("click", () => {
    state.view = button.dataset.view;
    if (state.user && currentRoute() === "/login") {
      navigate(state.user.surface === "portal" ? "/portal" : "/intranet", false);
    }
    render();
  }));
  document.querySelector("[data-action='logout']")?.addEventListener("click", () => {
    state.user = null;
    state.token = "";
    state.view = "dashboard";
    navigate("/login", false);
    render();
  });
  document.querySelector("[data-action='refresh']")?.addEventListener("click", loadBootstrap);
  document.querySelector("[data-action='health']")?.addEventListener("click", health);
}

async function loginSubmit(event) {
  event.preventDefault();
  const body = {
    surface: state.surface,
    username: value("username"),
    password: value("password")
  };
  try {
    const result = await api("/api/v1/auth/login", {method: "POST", body});
    state.user = result.data.user;
    state.token = result.data.access_token;
    state.error = "";
    await loadBootstrap();
    state.view = defaultView();
    navigate(state.user.surface === "portal" ? "/portal" : "/intranet", false);
    render();
  } catch (error) {
    state.error = error.message;
    render();
  }
}

async function documentSubmit(event) {
  event.preventDefault();
  const result = await api("/api/v1/documents", {method: "POST", body: {title: value("doc-title"), type: value("doc-type"), department: value("doc-department"), owner: value("doc-owner")}});
  state.data.documents.unshift(result.data);
  render();
}

async function requestSubmit(event) {
  event.preventDefault();
  const result = await api("/api/v1/citizen/requests", {method: "POST", body: {subject: value("request-subject")}});
  state.data.requests.unshift(result.data);
  render();
}

async function loadBootstrap() {
  try {
    const result = await api("/api/v1/bootstrap");
    state.data = result.data.runtime;
  } catch (error) {
    state.data = {...state.data, audit: [{action: "static.fallback", detail: "Backend no disponible"}]};
  }
}

async function health() {
  const result = await api("/api/v1/health");
  alert(`${result.service || "SIGED"}: ${result.mode || "ok"}`);
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    method: options.method || "GET",
    headers: {"Content-Type": "application/json"},
    body: options.body ? JSON.stringify(options.body) : undefined
  });
  const payload = await response.json();
  if (!response.ok || payload.ok === false) throw new Error(payload.error || "Error API");
  return payload;
}

function title() {
  return visibleViews().find(([id]) => id === state.view)?.[1] || "SIGED-Lampa";
}

function tableCard(titleText, headers, rows) {
  return `<div class="card"><h2>${titleText}</h2><div class="table-wrap"><table><thead><tr>${headers.map(h => `<th>${h}</th>`).join("")}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(cell => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table></div></div>`;
}

function field(id, label, initial) {
  return `<div class="field"><label for="${id}">${label}</label><input id="${id}" value="${escapeHtml(initial)}"></div>`;
}

function value(id) {
  return document.querySelector(`#${id}`)?.value || "";
}

function roleName(code) {
  return SIGED.seed.demo.roles.find(role => role.code === code)?.name || code;
}

function badge(value) {
  const text = String(value || "");
  const cls = text.includes("Firmado") ? "green" : text.includes("revision") || text.includes("Asignada") || text.includes("tramite") ? "amber" : "blue";
  return `<span class="pill ${cls}">${escapeHtml(text)}</span>`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "'": "&#39;"}[char]));
}

window.addEventListener("popstate", render);
render();
