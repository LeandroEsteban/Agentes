---
name: webforge-factory
description: Run and govern the WEBFORGE SDD software factory. Use when Codex is asked to operate, implement, audit, repair, or explain the factory; enforce P01-P12; create project project-id workspaces; keep project memory isolated from factory memory; require DEV/QA sandboxes; require PLANTILLA_FRONTEND; run WEBFORGE tools/gates; or produce final evidence from runs/latest.
---

# WEBFORGE Factory

Use this skill to operate WEBFORGE as a deterministic local SDD factory, not as loose documentation.

## Hard Rules

- Always run projects under `project/<project_id>/`.
- Never share project memory or learning with factory memory.
- Always create independent `sandboxes/DEV` and `sandboxes/QA`.
- Always require `PLANTILLA_FRONTEND` for every frontend project, version and sandbox.
- Never mark work complete unless `final-report.json` is `complete`, P01-P12 pass, and no required artifact is missing.
- Treat external writes, PR creation, production data and deploy as denied until explicitly approved.

## Standard Workflow

1. Inspect the request and build or select a WorkOrder.
2. Run WEBFORGE through the script wrapper:

```bash
python3 skills/webforge-factory/scripts/webforge_run.py run --project-root . --work-order examples/work_order_factory.json --output runs/latest
```

3. Verify capabilities:

```bash
python3 skills/webforge-factory/scripts/webforge_run.py doctor --project-root .
python3 skills/webforge-factory/scripts/webforge_run.py skills --project-root .
python3 skills/webforge-factory/scripts/webforge_run.py tools --output runs/tool-preview
```

4. Inspect `runs/latest/final-report.json` and fail closed if status is not `complete`.
5. For changed runtime behavior, run:

```bash
PYTHONDONTWRITEBYTECODE=1 python3 -m pytest -q -p no:cacheprovider
```

## Required Evidence

Every complete run must include:

- `factory-skill-manifest.json`
- `factory-tool-manifest.json`
- `project-isolation-policy.md`
- `project-manifest.json`
- `project-sandboxes.json`
- `frontend-template-manifest.json`
- `validation-report.json`
- `security-review.md`
- `traceability-matrix.md`
- `final-report.json`

## References

Read `references/operating-rules.md` when changing policies, gates, tools, project isolation, sandbox behavior or frontend template enforcement.
