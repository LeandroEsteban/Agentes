# WEBFORGE Operating Rules

## Invariants

- `project/<project_id>/` is the only valid project root.
- `memory/` and `learning/` inside a project are project-scoped only.
- `sandboxes/DEV` and `sandboxes/QA` are mandatory independent clones from `versions/<version>`.
- `PLANTILLA_FRONTEND` is mandatory and must be declared by hash in project, version and sandbox manifests.
- `factory-skill-manifest.json` and `factory-tool-manifest.json` must be present in every complete run.

## Tool Surface

WEBFORGE tools are allowlisted through `ToolRegistry`; unknown tools are denied. Current deterministic tools:

- `tool.security.secrets`
- `tool.security.deps`
- `tool.sbom.generate`
- `tool.policy.static`
- `tool.validation.artifacts`
- `tool.sandbox.dev_materialize`

`tool.sandbox.dev_materialize` is the only approved implementation side-effect path. It must write text bundles only under `project/<project_id>/sandboxes/DEV/workspace` through the P12/INV isolation API, reject traversal/absolute/reserved paths, reject detected secrets, emit `dev-materialization-manifest.json`, and leave external writes at zero.

## Closure

`complete` requires 100 percent critical gates, 100 percent critical evidence coverage, zero detected secrets, no unsafe unapproved actions, no missing required artifacts, and P01-P12 all `pass`.
