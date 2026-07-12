# Spec

Objective: Implementar WEBFORGE como fabrica agentica SDD local con P01-P12 operativos al 100 percent.
Type: factory_runtime

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
- RF08: Materialize implementation bundles into DEV only through the P12/INV isolation API.

## Non-functional requirements
- RNF01: No external writes or deploy by default.
- RNF02: Deterministic local execution with hashed evidence.
- RNF03: Logs must be reconstructible.
- RNF04: Project memory and learning never share state with factory memory.
- RNF05: Frontend work cannot use another template unless the factory policy is changed.
- RNF06: Skill and tool catalog must be present before complete.

## Acceptance criteria
- AC01: El catalogo P01-P12 existe con gates y evidencia.
- AC02: El workflow SDD completo produce artefactos locales.
- AC03: Policy, MCP, memoria, tools y seguridad quedan default-deny o allowlisted.
- AC04: Cada proyecto queda aislado en project/<project_id> con memoria propia y sandboxes DEV/QA independientes.
- AC05: El final-report solo declara complete si la cobertura critica es 100 percent.

## Out of scope
- Real production deploy.
- External CI/PR creation without approval.
- Runtime activation of unapproved MCP servers.
