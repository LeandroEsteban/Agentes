from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timezone
from dataclasses import dataclass, field


def _generate_id(prefix: str = "INV") -> str:
    raw = secrets.token_bytes(8)
    h = hashlib.sha256(raw).hexdigest()[:10]
    return f"{prefix}-{h}"


def _now_utc() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ToolInvocation:
    schema_version: str = "webforge.tool_invocation.v1"
    invocation_id: str = ""
    run_id: str = ""
    cycle_id: str = ""
    task_id: str = ""
    agent_id: str = ""
    tool_id: str = ""
    working_directory: str = ""
    arguments: dict = field(default_factory=dict)
    requested_at: str = ""


@dataclass
class ToolResult:
    schema_version: str = "webforge.tool_result.v1"
    invocation_id: str = ""
    status: str = "failed"
    exit_code: int | None = None
    started_at: str = ""
    completed_at: str = ""
    duration_ms: int = 0
    stdout: str = ""
    stderr: str = ""
    stdout_truncated: bool = False
    stderr_truncated: bool = False
    artifacts: list[str] = field(default_factory=list)
    changed_files: list[str] = field(default_factory=list)
    evidence_hash: str = ""


@dataclass
class CommandPolicy:
    tool_id: str = ""
    description: str = ""
    allowed_agents: list[str] = field(default_factory=list)
    allowed_operations: list[str] = field(default_factory=list)
    timeout_seconds: int = 30
    max_stdout_bytes: int = 1048576
    max_stderr_bytes: int = 1048576
    network_policy: str = "deny"
    writes_workspace: bool = False
    requires_snapshot: bool = False
    requires_approval: bool = False


@dataclass
class ExecutionHandoff:
    schema_version: str = "webforge.execution_handoff.v1"
    handoff_id: str = ""
    planning_handoff_id: str = ""
    run_id: str = ""
    task_id: str = ""
    from_agent: str = ""
    to_agent: str = ""
    artifacts: list[str] = field(default_factory=list)
    artifact_hashes: dict[str, str] = field(default_factory=dict)
    gates: list[str] = field(default_factory=list)
    status: str = "proposed"
    rejection_reasons: list[str] = field(default_factory=list)
    created_at: str = ""
    accepted_at: str | None = None
