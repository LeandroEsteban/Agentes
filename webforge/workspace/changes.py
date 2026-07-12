from __future__ import annotations

import hashlib
import json
import uuid
from datetime import datetime, timezone
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class WorkspaceChange:
    schema_version: str = "webforge.workspace_change.v1"
    change_id: str = ""
    run_id: str = ""
    cycle_id: str = ""
    task_id: str = ""
    agent_id: str = ""
    operation: str = ""
    path: str = ""
    destination: str | None = None
    reason: str = ""
    before_sha256: str | None = None
    after_sha256: str | None = None
    before_size: int | None = None
    after_size: int | None = None
    validation_required: list[str] = field(default_factory=list)
    timestamp: str = ""


@dataclass
class ChangeSet:
    schema_version: str = "webforge.change_set.v1"
    change_set_id: str = ""
    run_id: str = ""
    task_id: str = ""
    agent_id: str = ""
    snapshot_id: str = ""
    changes: list[dict] = field(default_factory=list)
    status: str = "open"
    validation_results: list[dict] = field(default_factory=list)


def _generate_change_id() -> str:
    return uuid.uuid4().hex[:12]


def _generate_changeset_id() -> str:
    return uuid.uuid4().hex[:12]


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


def write_change_ledger(output_dir: Path, entries: list[dict]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    ledger_path = output_dir / f"change_ledger_{_now_utc()[:10]}.jsonl"
    with open(ledger_path, "a", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False, default=str) + "\n")
    return ledger_path


def sha256_file(path: Path) -> str | None:
    try:
        return hashlib.sha256(path.read_bytes()).hexdigest()
    except FileNotFoundError:
        return None
