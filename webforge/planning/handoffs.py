from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

HANDOFF_PLAN: list[dict[str, Any]] = [
    {"handoff_id": "HO-REF-ARCH", "from_agent": "agent.refinement", "to_agent": "agent.architecture", "artifacts": ["normalization-report.json", "normalization-findings.md", "catalogs/*.json"], "required_gates": ["GATE-ARCH-001"], "acceptance_criteria": ["Normalization has 0 blocking findings", "All catalogs are present"], "rejection_reasons_possible": ["Blocking findings unresolved", "Missing catalogs"]},
    {"handoff_id": "HO-ARCH-DB", "from_agent": "agent.architecture", "to_agent": "agent.database", "artifacts": ["architecture.json", "tasks.json", "task-dag.json"], "required_gates": ["GATE-ARCH-002", "GATE-ARCH-003", "GATE-ARCH-004", "GATE-ARCH-005", "GATE-ARCH-006"], "acceptance_criteria": ["Architecture approved", "DB tasks defined"], "rejection_reasons_possible": ["Architecture not approved", "DB tasks incomplete"]},
    {"handoff_id": "HO-ARCH-BE", "from_agent": "agent.architecture", "to_agent": "agent.backend", "artifacts": ["architecture.json", "endpoints.json", "business-rules.json", "validations.json", "contracts.json"], "required_gates": ["GATE-ARCH-002", "GATE-ARCH-003", "GATE-ARCH-004", "GATE-ARCH-005"], "acceptance_criteria": ["Architecture approved", "API tasks defined"], "rejection_reasons_possible": ["Architecture not approved"]},
    {"handoff_id": "HO-ARCH-FE", "from_agent": "agent.architecture", "to_agent": "agent.frontend", "artifacts": ["architecture.json", "screens.json", "endpoints.json", "contracts.json"], "required_gates": ["GATE-ARCH-002", "GATE-ARCH-003"], "acceptance_criteria": ["Architecture approved", "UI tasks defined"], "rejection_reasons_possible": ["Architecture not approved"]},
    {"handoff_id": "HO-ARCH-QA", "from_agent": "agent.architecture", "to_agent": "agent.qa_release", "artifacts": ["architecture.json", "tasks.json", "contracts.json"], "required_gates": ["GATE-ARCH-002", "GATE-ARCH-003", "GATE-ARCH-004", "GATE-ARCH-005", "GATE-ARCH-006"], "acceptance_criteria": ["Architecture approved", "QA tasks defined"], "rejection_reasons_possible": ["Architecture not approved"]},
    {"handoff_id": "HO-DB-BE", "from_agent": "agent.database", "to_agent": "agent.backend", "artifacts": ["database/migrations/*.sql", "database/seeds/*.sql", "database/schema.sql"], "required_gates": ["GATE-DB-001"], "acceptance_criteria": ["All 40 tables created", "FK constraints defined", "Seeds load successfully"], "rejection_reasons_possible": ["Missing migrations", "FK constraints missing"]},
    {"handoff_id": "HO-BE-FE", "from_agent": "agent.backend", "to_agent": "agent.frontend", "artifacts": ["openapi.yaml", "backend/src/controllers/*.js"], "required_gates": ["GATE-API-001"], "acceptance_criteria": ["OpenAPI contract complete", "All 40+ endpoints implemented"], "rejection_reasons_possible": ["OpenAPI incomplete", "Endpoints missing"]},
    {"handoff_id": "HO-DB-QA", "from_agent": "agent.database", "to_agent": "agent.qa_release", "artifacts": ["database/migrations/*.sql", "database/test-results.xml"], "required_gates": ["GATE-DB-001"], "acceptance_criteria": ["Migration from zero passes", "All DB tests pass"], "rejection_reasons_possible": ["Migration fails", "DB tests fail"]},
    {"handoff_id": "HO-BE-QA", "from_agent": "agent.backend", "to_agent": "agent.qa_release", "artifacts": ["openapi.yaml", "backend/test-results.xml"], "required_gates": ["GATE-API-001"], "acceptance_criteria": ["All API tests pass", "Coverage threshold met"], "rejection_reasons_possible": ["API tests fail", "Coverage below threshold"]},
    {"handoff_id": "HO-FE-QA", "from_agent": "agent.frontend", "to_agent": "agent.qa_release", "artifacts": ["frontend/src/routes.js", "frontend/test-results.xml"], "required_gates": ["GATE-UI-001"], "acceptance_criteria": ["All 30 routes render", "E2E tests pass"], "rejection_reasons_possible": ["Routes missing", "E2E failures"]},
]


def generate_handoffs() -> list[dict[str, Any]]:
    return [dict(h) for h in HANDOFF_PLAN]


def validate_handoffs(handoffs: list[dict[str, Any]], valid_agent_ids: set[str]) -> list[str]:
    errors: list[str] = []
    valid_targets = valid_agent_ids | {"human_reviewer"}

    seen_ids: set[str] = set()
    for i, h in enumerate(handoffs):
        hid = h.get("handoff_id", "")
        if not hid:
            errors.append(f"Handoff at index {i} has empty handoff_id")
            continue

        if hid in seen_ids:
            errors.append(f"Duplicate handoff_id: {hid}")
        seen_ids.add(hid)

        from_agent = h.get("from_agent", "")
        to_agent = h.get("to_agent", "")

        if from_agent not in valid_targets:
            errors.append(f"{hid}: from_agent '{from_agent}' not in valid_agent_ids or human_reviewer")
        if to_agent not in valid_targets:
            errors.append(f"{hid}: to_agent '{to_agent}' not in valid_agent_ids or human_reviewer")
        if from_agent and to_agent and from_agent == to_agent:
            errors.append(f"{hid}: from_agent equals to_agent (self-handoff)")

        artifacts = h.get("artifacts", [])
        if not artifacts:
            errors.append(f"{hid}: artifacts list is empty")

        acceptance = h.get("acceptance_criteria", [])
        if not acceptance:
            errors.append(f"{hid}: acceptance_criteria list is empty")

        if "required_gates" not in h:
            errors.append(f"{hid}: required_gates key missing")

    return errors


def write_handoffs(output_dir: Path, handoffs: list[dict[str, Any]]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "handoff-plan.json"
    data = {
        "schema": "webforge.handoff_plan.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "handoffs": handoffs,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return output_path
