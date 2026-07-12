from __future__ import annotations

from dataclasses import asdict, dataclass, field
from pathlib import Path
from typing import Any

from .utils import sha256_file


CLOSED_STATES = {"complete", "needs_user_input", "not_answerable", "error"}


@dataclass
class EvidenceSource:
    evidence_id: str
    path: str
    summary: str
    sha256: str

    @classmethod
    def from_path(cls, evidence_id: str, path: Path, summary: str, root: Path | None = None) -> "EvidenceSource":
        source_path = path
        if root is not None:
            try:
                source_path = path.resolve().relative_to(root.resolve())
            except ValueError:
                source_path = path.resolve()
        path_value = source_path.as_posix() if isinstance(source_path, Path) else str(source_path)
        return cls(evidence_id=evidence_id, path=path_value, summary=summary, sha256=sha256_file(path))


@dataclass
class WorkOrder:
    objective: str
    schema_version: str = "webforge.work_order.v1"
    product_type: str = "factory_runtime"
    source_documents: list[str] = field(default_factory=list)
    stack: dict[str, str] = field(default_factory=dict)
    minimum_scope: dict[str, int] = field(default_factory=dict)
    quality: dict[str, Any] = field(default_factory=dict)
    project_id: str = ""
    project_version: str = "v0001"
    type: str = "factory_runtime"
    scope: str = "local_artifacts_only"
    side_effects: str = "no_external_writes_no_deploy"
    acceptance_criteria: list[str] = field(default_factory=list)
    authorized_sources: list[str] = field(default_factory=list)
    approvals: dict[str, bool] = field(default_factory=dict)
    budget: dict[str, int | float] = field(default_factory=dict)
    metadata: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "WorkOrder":
        source_documents = data.get("source_documents", [])
        stack = data.get("stack", {})
        minimum_scope = data.get("minimum_scope", {})
        quality = data.get("quality", {})
        return cls(
            objective=str(data.get("objective", "")).strip(),
            schema_version=str(data.get("schema_version", "webforge.work_order.v1")).strip() or "webforge.work_order.v1",
            product_type=str(data.get("product_type", data.get("type", "factory_runtime"))).strip() or "factory_runtime",
            source_documents=source_documents if isinstance(source_documents, list) else source_documents,
            stack=stack if isinstance(stack, dict) else stack,
            minimum_scope=minimum_scope if isinstance(minimum_scope, dict) else minimum_scope,
            quality=quality if isinstance(quality, dict) else quality,
            project_id=str(data.get("project_id", data.get("metadata", {}).get("project_id", ""))).strip(),
            project_version=str(data.get("project_version", data.get("metadata", {}).get("project_version", "v0001"))).strip()
            or "v0001",
            type=str(data.get("type", "factory_runtime")).strip() or "factory_runtime",
            scope=str(data.get("scope", "local_artifacts_only")).strip() or "local_artifacts_only",
            side_effects=str(data.get("side_effects", "no_external_writes_no_deploy")).strip()
            or "no_external_writes_no_deploy",
            acceptance_criteria=list(data.get("acceptance_criteria", [])),
            authorized_sources=list(data.get("authorized_sources", [])),
            approvals=dict(data.get("approvals", {})),
            budget=dict(data.get("budget", {})),
            metadata=dict(data.get("metadata", {})),
        )

    def validate(self) -> list[str]:
        errors: list[str] = []
        if not self.objective:
            errors.append("objective is required")
        if self.project_id and ".." in self.project_id:
            errors.append("project_id cannot contain parent traversal")
        if self.side_effects not in {"no_external_writes_no_deploy", "approved_external_writes", "approved_deploy"}:
            errors.append("side_effects must be a closed value")
        if not self.acceptance_criteria:
            errors.append("acceptance_criteria must contain at least one measurable item")
        if not isinstance(self.source_documents, list) or any(not isinstance(item, str) for item in self.source_documents):
            errors.append("source_documents must be a list of strings")
        for source in self.source_documents:
            value = source.strip()
            normalized = value.replace("\\", "/")
            if not value:
                errors.append("source_documents cannot contain empty paths")
            elif value.startswith("\\\\") or normalized.startswith("//"):
                errors.append(f"source_documents path is UNC and not allowed: {source}")
            elif Path(value).is_absolute() or (len(value) >= 3 and value[1:3] == ":\\") or (len(value) >= 3 and value[1:3] == ":/"):
                errors.append(f"source_documents path must be relative: {source}")
            elif ".." in Path(normalized).parts:
                errors.append(f"source_documents path traversal is not allowed: {source}")
        if not isinstance(self.minimum_scope, dict):
            errors.append("minimum_scope must be an object of non-negative integers")
        else:
            for key, value in self.minimum_scope.items():
                if not isinstance(value, int) or isinstance(value, bool) or value < 0:
                    errors.append(f"minimum_scope.{key} must be a non-negative integer")
        if not isinstance(self.stack, dict) or any(not isinstance(key, str) or not isinstance(value, str) for key, value in self.stack.items()):
            errors.append("stack must be an object of string values")
        if not isinstance(self.quality, dict):
            errors.append("quality must be an object")
        return errors

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)


@dataclass
class GateResult:
    name: str
    status: str
    phase: str
    principles: list[str]
    evidence: list[str]
    message: str

    def passed(self) -> bool:
        return self.status == "pass"


@dataclass
class PhaseResult:
    phase: str
    agent_id: str
    status: str
    outputs: dict[str, str]
    gates: list[GateResult]
    evidence_ids: list[str]

    def passed(self) -> bool:
        return self.status == "pass" and all(gate.passed() for gate in self.gates)


@dataclass
class CycleState:
    run_id: str
    cycle_id: str
    workflow_version: str
    status: str
    phase: str
    task_id: str
    agent_id: str
    input_hash: str
    spec_hash: str
    plan_hash: str
    tasks_hash: str
    context_pack_id: str
    context_pack_hash: str
    repo_commit: str
    policy_version: str
    tool_registry_version: str
    mcp_registry_version: str
    memory_version: str
    budget_remaining: dict[str, int | float]
    permissions: dict[str, Any]
    outputs: dict[str, str] = field(default_factory=dict)
    evidence: list[str] = field(default_factory=list)
    open_risks: list[str] = field(default_factory=list)
    blocked_items: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)
