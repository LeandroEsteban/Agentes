from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Callable

from .policy import BudgetManager, PolicyDecision
from .utils import append_jsonl, find_secret_hits, read_text, stable_json, write_json


@dataclass(frozen=True)
class ToolSpec:
    tool_id: str
    purpose: str
    gate: str
    writes: bool
    timeout_seconds: int
    allowed_agents: tuple[str, ...] = ()
    max_stdout_bytes: int = 100000
    max_stderr_bytes: int = 100000
    network_policy: str = "deny"
    writes_workspace: bool = False
    requires_snapshot: bool = False
    requires_approval: bool = False


@dataclass
class ToolResult:
    tool_id: str
    status: str
    output: dict[str, Any]
    gate: str


class ToolRegistry:
    version = "toolreg.webforge.v1"

    def __init__(self, output_dir: Path, budget: BudgetManager) -> None:
        self.output_dir = output_dir
        self.budget = budget
        self.specs: dict[str, ToolSpec] = {
            "tool.sandbox.dev_materialize": ToolSpec(
                "tool.sandbox.dev_materialize",
                "DEV sandbox bundle materialization through P12/INV isolation API",
                "sandbox",
                True,
                30,
            ),
            "tool.security.secrets": ToolSpec("tool.security.secrets", "Secret scan", "secrets", True, 30),
            "tool.security.deps": ToolSpec("tool.security.deps", "Dependency manifest scan", "dependency", True, 30),
            "tool.sbom.generate": ToolSpec("tool.sbom.generate", "SBOM generation", "sbom", True, 30),
            "tool.policy.static": ToolSpec("tool.policy.static", "Static policy scan", "policy", True, 30),
            "tool.validation.artifacts": ToolSpec("tool.validation.artifacts", "Artifact completeness", "final_format", True, 30),
            "tool.fs.read": ToolSpec("tool.fs.read", "Read file content", "filesystem", False, 30),
            "tool.fs.list": ToolSpec("tool.fs.list", "List directory contents", "filesystem", False, 30),
            "tool.fs.search": ToolSpec("tool.fs.search", "Search files by glob pattern", "filesystem", False, 30),
            "tool.fs.create": ToolSpec("tool.fs.create", "Create a new file", "filesystem", True, 30),
            "tool.fs.replace": ToolSpec("tool.fs.replace", "Replace content in a file", "filesystem", True, 30),
            "tool.fs.patch": ToolSpec("tool.fs.patch", "Patch a file (single match)", "filesystem", True, 30),
            "tool.fs.delete": ToolSpec("tool.fs.delete", "Delete a file", "filesystem", True, 30),
            "tool.fs.move": ToolSpec("tool.fs.move", "Move/rename a file", "filesystem", True, 30),
            "tool.process.run": ToolSpec("tool.process.run", "Run a safe process with allowlist", "process", False, 60),
            "tool.build.run": ToolSpec("tool.build.run", "Run build command", "build", False, 120),
            "tool.lint.run": ToolSpec("tool.lint.run", "Run linter", "quality", False, 60),
            "tool.test.unit": ToolSpec("tool.test.unit", "Run unit tests", "testing", False, 120),
            "tool.test.api": ToolSpec("tool.test.api", "Run API tests", "testing", False, 120),
            "tool.test.integration": ToolSpec("tool.test.integration", "Run integration tests", "testing", False, 180),
            "tool.test.e2e": ToolSpec("tool.test.e2e", "Run end-to-end tests", "testing", False, 300),
            "tool.test.coverage": ToolSpec("tool.test.coverage", "Run test coverage", "testing", False, 120),
            "tool.db.start": ToolSpec("tool.db.start", "Start database", "database", False, 120, ("agent.database", "agent.backend", "agent.qa_release"), network_policy="localhost_only"),
            "tool.db.stop": ToolSpec("tool.db.stop", "Stop database", "database", False, 120, ("agent.database", "agent.backend", "agent.qa_release"), network_policy="localhost_only"),
            "tool.db.migrate": ToolSpec("tool.db.migrate", "Run database migrations", "database", True, 120, ("agent.database",), network_policy="localhost_only"),
            "tool.db.seed": ToolSpec("tool.db.seed", "Seed database", "database", True, 120, ("agent.database",), network_policy="localhost_only"),
            "tool.db.verify_schema": ToolSpec("tool.db.verify_schema", "Verify database schema", "database", False, 120, ("agent.database", "agent.backend", "agent.qa_release"), network_policy="localhost_only"),
            "tool.db.reset": ToolSpec("tool.db.reset", "Reset database", "database", True, 120, ("agent.database",), network_policy="localhost_only", requires_snapshot=True, requires_approval=True),
            "tool.http.healthcheck": ToolSpec("tool.http.healthcheck", "HTTP healthcheck", "http", False, 30),
            "tool.workspace.snapshot": ToolSpec("tool.workspace.snapshot", "Create workspace snapshot", "workspace", False, 30),
            "tool.workspace.rollback": ToolSpec("tool.workspace.rollback", "Rollback workspace", "workspace", True, 30),
            "tool.workspace.promote_to_qa": ToolSpec("tool.workspace.promote_to_qa", "Promote DEV to QA fixture", "workspace", True, 30),
        }

    def manifest(self) -> dict[str, Any]:
        return {
            "version": self.version,
            "default": "deny_unregistered_tools",
            "tools": [asdict(spec) for spec in self.specs.values()],
        }

    def write_manifest(self) -> None:
        write_json(self.output_dir / "tool-registry.json", self.manifest())

    def run(self, tool_id: str, func: Callable[[], dict[str, Any]]) -> ToolResult:
        if tool_id not in self.specs:
            result = ToolResult(tool_id, "error", {"reason": "tool not allowlisted"}, "policy")
            self._log(result)
            return result
        budget_decision = self.budget.assert_tool_available(tool_id)
        if not budget_decision.allowed:
            result = ToolResult(tool_id, "error", {"reason": budget_decision.reason}, budget_decision.gate)
            self._log(result)
            return result
        try:
            output = func()
            status = "pass" if not output.get("blocking_findings") else "error"
            result = ToolResult(tool_id, status, output, self.specs[tool_id].gate)
        except Exception as exc:  # pragma: no cover - defensive safe fail
            result = ToolResult(tool_id, "error", {"reason": repr(exc)}, self.specs[tool_id].gate)
        self.budget.record_tool_call(tool_id, result.status)
        self._log(result)
        return result

    def _log(self, result: ToolResult) -> None:
        append_jsonl(
            self.output_dir / "tool-logs.jsonl",
            {"tool_id": result.tool_id, "status": result.status, "gate": result.gate, "output_hash": stable_json(result.output)},
        )


def secret_scan(paths: list[Path]) -> dict[str, Any]:
    findings: list[dict[str, Any]] = []
    for path in paths:
        if not path.exists() or path.is_dir():
            continue
        if path.suffix.lower() not in {".md", ".json", ".yaml", ".yml", ".toml", ".py", ".txt"}:
            continue
        hits = find_secret_hits(read_text(path))
        for hit in hits:
            findings.append({"path": path.name, "match": hit})
    return {"findings": findings, "blocking_findings": len(findings), "secrets_detected": len(findings)}


def dependency_scan(root: Path) -> dict[str, Any]:
    manifests = []
    for name in ["pyproject.toml", "requirements.txt", "package.json", "package-lock.json", "poetry.lock"]:
        if (root / name).exists():
            manifests.append(name)
    return {
        "manifests": manifests,
        "scanner": "local_manifest_policy_scan",
        "high_critical_open": 0,
        "blocking_findings": 0,
        "note": "No external CVE database was called; runtime has no third-party dependencies.",
    }


def generate_sbom(root: Path) -> dict[str, Any]:
    components = [{"name": "python-stdlib", "type": "runtime", "version": "system"}]
    if (root / "pyproject.toml").exists():
        components.append({"name": "webforge-factory", "type": "application", "version": "0.1.0"})
    return {"sbom_format": "webforge.local.v1", "components": components, "blocking_findings": 0}


def static_policy_scan(root: Path) -> dict[str, Any]:
    disallowed_markers = ["direct_" + "model_call(", "invoke_mcp_" + "unchecked(", "external_write_" + "unapproved("]
    findings: list[dict[str, Any]] = []
    for path in (root / "webforge").glob("*.py"):
        text = read_text(path)
        for marker in disallowed_markers:
            if marker in text:
                findings.append({"path": str(path), "marker": marker})
    return {"findings": findings, "blocking_findings": len(findings)}


def artifact_check(output_dir: Path, required: list[str]) -> dict[str, Any]:
    missing = [name for name in required if not (output_dir / name).exists()]
    return {"required": required, "missing": missing, "blocking_findings": len(missing)}
