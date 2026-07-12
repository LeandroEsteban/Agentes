# Spec

Objective: Desarrollar PROYECTO_DOS como ERP web pequeno completo, local y verificable desde projects/dos/especificacion_cinco.md.
Type: erp_web_small

## Actors
- Operator: runs the local factory.
- Reviewer: inspects artifacts and gates.

## Functional requirements
- RF01: Execute the complete SDD workflow with closed states.
- RF02: Produce required operational artifacts.
- RF03: Enforce P01-P12 gates before complete.
- RF04: Keep every project isolated under project/<project_id>.
- RF05: Create independent DEV and QA sandboxes cloned from the current project version.
- RF06: Use PLANTILLA_FRONTEND as the mandatory frontend template for every project.
- RF07: Expose WEBFORGE as a Codex Skill with deterministic tools.

## Non-functional requirements
- RNF01: No external writes or deploy by default.
- RNF02: Deterministic local execution with hashed evidence.
- RNF03: Logs must be reconstructible.
- RNF04: Project memory and learning never share state with factory memory.
- RNF05: Frontend work cannot use another template unless the factory policy is changed.
- RNF06: Skill and tool catalog must be present before complete.

## Acceptance criteria
- AC01: El proyecto vive bajo project/proyecto-dos con memoria aislada, versiones y sandboxes DEV/QA independientes.
- AC02: La version v0001 mantiene vinculacion obligatoria con PLANTILLA_FRONTEND.
- AC03: La app ERP web cubre las 40 pantallas P-01 a P-40 descritas en la especificacion.
- AC04: La implementacion expone y valida el catalogo de 130 endpoints REST declarados para /api/v1.
- AC05: La trazabilidad cubre casos de uso, pantallas, reglas de negocio, validaciones, endpoints, permisos, estados, RNF y criterios de aceptacion por modulo.
- AC06: Los scripts locales verifican cobertura estatica, navegacion web, acciones criticas y ausencia de errores de consola.
- AC07: DEV y QA contienen clones autonomos de la version validada y evidencias propias.

## Out of scope
- Real production deploy.
- External CI/PR creation without approval.
- Runtime activation of unapproved MCP servers.
