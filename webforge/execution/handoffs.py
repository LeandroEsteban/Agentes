from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import ExecutionHandoff, _generate_id, _now_utc
from ..utils import append_jsonl, sha256_file


def create_execution_handoff(
    planning_handoff_id: str,
    from_agent: str,
    to_agent: str,
    artifacts: list[str],
    run_id: str = "",
    task_id: str = "",
) -> ExecutionHandoff:
    """Create an execution handoff referencing a planning handoff."""
    handoff = ExecutionHandoff(
        handoff_id=_generate_id("HOEX"),
        planning_handoff_id=planning_handoff_id,
        run_id=run_id,
        task_id=task_id,
        from_agent=from_agent,
        to_agent=to_agent,
        artifacts=artifacts,
        status="proposed",
        created_at=_now_utc(),
    )
    return handoff


def compute_artifact_hashes(artifacts: list[Path | str]) -> dict[str, str]:
    """Compute SHA256 hashes for artifact files. Only includes files that exist."""
    hashes = {}
    for artifact in artifacts:
        path = Path(artifact)
        if path.exists() and path.is_file():
            hashes[str(artifact)] = sha256_file(path)
    return hashes


def accept_handoff(handoff: ExecutionHandoff, artifact_hashes: dict[str, str]) -> ExecutionHandoff:
    """Accept an execution handoff with artifact hashes."""
    handoff.status = "accepted"
    handoff.artifact_hashes = artifact_hashes
    handoff.accepted_at = _now_utc()
    return handoff


def reject_handoff(handoff: ExecutionHandoff, reasons: list[str]) -> ExecutionHandoff:
    """Reject an execution handoff with reasons."""
    handoff.status = "rejected"
    handoff.rejection_reasons = reasons
    return handoff


def validate_execution_handoff(handoff: ExecutionHandoff, valid_agent_ids: set[str], planning_handoff_ids: set[str]) -> list[str]:
    """Validate execution handoff."""
    errors = []
    if not handoff.handoff_id:
        errors.append("handoff_id is required")
    if handoff.planning_handoff_id not in planning_handoff_ids:
        errors.append(f"Unknown planning handoff: {handoff.planning_handoff_id}")
    if handoff.from_agent not in valid_agent_ids:
        errors.append(f"Unknown from_agent: {handoff.from_agent}")
    if handoff.to_agent not in valid_agent_ids:
        errors.append(f"Unknown to_agent: {handoff.to_agent}")
    if handoff.from_agent == handoff.to_agent:
        errors.append("Self-handoff not allowed")
    if not handoff.artifacts:
        errors.append("No artifacts declared")
    if handoff.status not in ("proposed", "accepted", "rejected"):
        errors.append(f"Invalid status: {handoff.status}")
    if handoff.status == "rejected" and not handoff.rejection_reasons:
        errors.append("Rejected handoff must have reasons")
    return errors


def write_execution_handoff_ledger(output_dir: Path, handoff: ExecutionHandoff) -> Path:
    """Write a single handoff event to the execution handoff ledger."""
    from ..utils import append_jsonl
    entry = {
        "schema_version": "webforge.execution_handoff_ledger.v1",
        "timestamp": _now_utc(),
        "handoff_id": handoff.handoff_id,
        "planning_handoff_id": handoff.planning_handoff_id,
        "run_id": handoff.run_id,
        "task_id": handoff.task_id,
        "from_agent": handoff.from_agent,
        "to_agent": handoff.to_agent,
        "artifacts": handoff.artifacts,
        "artifact_hashes": handoff.artifact_hashes,
        "status": handoff.status,
        "reasons": handoff.rejection_reasons,
    }
    path = output_dir / "execution-handoff-ledger.jsonl"
    append_jsonl(path, entry)
    return path
