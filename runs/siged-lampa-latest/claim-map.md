# Claim map

| claim | evidence_id | artifact |
|---|---|---|
| Authorized sources are hashed and registered. | EV-SRC-001 | `evidence-register.md` |
| Authorized sources are mirrored inside the project and current version. | EV-SRC-001, EV-SRC-002, EV-SRC-003, EV-SRC-004 | `source-mirror-manifest.json` |
| Every project is isolated under project/<project_id> with DEV and QA sandboxes. | EV-SRC-001 | `project-isolation-policy.md` |
| Every project and sandbox must use PLANTILLA_FRONTEND. | EV-SRC-001 | `frontend-template-policy.md` |
| SIGED-Lampa sources are parsed into modules, screens, endpoints and ER tables. | EV-SRC-001, EV-SRC-002, EV-SRC-003, EV-SRC-004 | `spec.md` |
| WorkOrder objective is verifiable and side effects are scoped. | EV-SRC-001 | `work_order.json` |
| P01-P12 are instantiated with gates and evidence. | EV-SRC-001 | `constitution.md` |
| SIGED-Lampa spec is derived from authorized source documents. | EV-SRC-001, EV-SRC-002, EV-SRC-003, EV-SRC-004 | `spec.md` |
| Critical runtime decisions are closed for local operation. | EV-SRC-001 | `clarifications.md` |
| Critical checklist controls are pass for local runtime scope. | EV-SRC-001 | `checklist.md` |
| Context pack uses only authorized minimal snippets with hashes. | EV-SRC-001 | `context-pack.json` |
| Plan maps requirements, risks and policy constraints. | EV-SRC-001 | `plan.md` |
| Every principle maps to an implementation task and evidence. | EV-SRC-001 | `tasks.md` |
| Analyze phase found no critical spec-plan-task drift. | EV-SRC-001 | `analyze-report.md` |
| Implementation phase materialized a bundle through the P12/INV DEV isolation API without external side effects. | EV-SRC-001 | `dev-materialization-manifest.json` |
| Validation tools passed with allowlisted tool outputs. | EV-SRC-001 | `validation-report.json` |
| Security phase has zero secret and high/critical dependency blockers. | EV-SRC-001 | `security-review.md` |
| PR handoff bundle is prepared without external write. | EV-SRC-001 | `PRBundle.md` |
| Deploy is blocked unless explicitly approved with rollback. | EV-SRC-001 | `deploy-plan.md` |
| Observability artifacts are complete and reconstructible. | EV-SRC-001 | `log-completeness-report.json` |
