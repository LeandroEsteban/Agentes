# Spec

Product: SIGED-Lampa
Objective: Construir SIGED-Lampa como aplicacion web municipal trazable para gestion documental, expedientes, correspondencia, portal ciudadano, OIRS, reportes y notificaciones.
Type: siged_lampa_web_app
Version: v0.1

## Source coverage

- Authorized source docs: 4
- Modules: 10
- Use cases: 12
- Endpoints: 40
- Screens: 30
- ER tables: 40

## Actors

- ACT-ADM Administrador del sistema
- ACT-FUN Funcionario municipal
- ACT-OPA Oficina de partes
- ACT-REV Revisor o jefatura
- ACT-OIR Operador OIRS
- ACT-REP Analista de reportes
- ACT-CIU Ciudadano autenticado
- ACT-VIS Ciudadano visitante
- ACT-EXT Entidad externa receptora

## Functional modules

| code | module | objective |
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

## Acceptance criteria

- AC01: La fabrica debe registrar y hashear las cuatro fuentes SIGED autorizadas.
- AC02: La especificacion generada debe cubrir 10 modulos funcionales SIGED.
- AC03: El contrato operativo debe cubrir al menos 40 endpoints API.
- AC04: El mapa UX debe cubrir al menos 30 pantallas navegables.
- AC05: El modelo de datos debe cubrir al menos 40 tablas ER.
- AC06: El sandbox DEV debe contener una app web full-stack ejecutable con backend API, frontend, catalogos, trazabilidad y datos semilla.
- AC07: El final-report solo puede quedar complete si pasan P01-P12, aislamiento de proyecto, plantilla frontend, seguridad y materializacion DEV.

## Implementation target

- Build a local full-stack web prototype in the isolated DEV sandbox.
- Include a frontend, a backend API, intranet, citizen portal, route catalog, API catalog, ER catalog and traceability views.
- Keep full factory evidence in run artifacts and app-level evidence in DEV workspace data files.
- No external write, deploy, real authentication, real signature, real Clave Unica or production data.
