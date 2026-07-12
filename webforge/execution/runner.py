from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from dataclasses import asdict

from .models import ToolInvocation, ToolResult, CommandPolicy, _generate_id, _now_utc
from .permissions import resolve_authorized_path, check_executable_allowed, redact_sensitive
from ..utils import append_jsonl, sha256_text, stable_json


class ToolExecutionRunner:
    def __init__(self, output_dir: Path, project_root: Path):
        self.output_dir = output_dir
        self.project_root = Path(project_root).resolve()
        self.policies: dict[str, CommandPolicy] = {}
        self.invocations: list[ToolResult] = []

    def register_policy(self, policy: CommandPolicy) -> None:
        self.policies[policy.tool_id] = policy

    def register_policies(self, policies: list[CommandPolicy]) -> None:
        for p in policies:
            self.register_policy(p)

    def can_execute(self, tool_id: str, agent_id: str, task_id: str) -> tuple[bool, str]:
        policy = self.policies.get(tool_id)
        if not policy:
            return False, f"Tool not registered: {tool_id}"
        if agent_id not in policy.allowed_agents:
            return False, f"Agent {agent_id} not authorized for tool {tool_id}"
        return True, ""

    def execute(self, tool_id: str, agent_id: str, task_id: str, working_dir: str | Path = "", **kwargs) -> ToolResult:
        invocation = ToolInvocation(
            invocation_id=_generate_id("TINV"),
            run_id=kwargs.pop("run_id", ""),
            cycle_id=kwargs.pop("cycle_id", ""),
            task_id=task_id, agent_id=agent_id, tool_id=tool_id,
            working_directory=str(working_dir),
            arguments=kwargs,
            requested_at=_now_utc(),
        )
        policy = self.policies.get(tool_id)
        if not policy:
            result = self._make_result(invocation, "blocked", error=f"Tool not registered: {tool_id}")
            self._log(invocation, result)
            return result
        if agent_id not in policy.allowed_agents:
            result = self._make_result(invocation, "blocked", error=f"Agent {agent_id} not authorized")
            self._log(invocation, result)
            return result
        started = datetime.now(timezone.utc)
        try:
            result = self._run_tool(tool_id, policy, **kwargs)
        except Exception as exc:
            return self._make_result(invocation, "failed", error=str(exc), started=started)
        completed = datetime.now(timezone.utc)
        duration = int((completed - started).total_seconds() * 1000)
        tool_result = ToolResult(
            invocation_id=invocation.invocation_id,
            status=result.get("status", "success"),
            exit_code=result.get("exit_code"),
            started_at=started.strftime("%Y-%m-%dT%H:%M:%SZ"),
            completed_at=completed.strftime("%Y-%m-%dT%H:%M:%SZ"),
            duration_ms=duration,
            stdout=result.get("stdout", ""),
            stderr=result.get("stderr", ""),
            stdout_truncated=result.get("stdout_truncated", False),
            stderr_truncated=result.get("stderr_truncated", False),
            artifacts=result.get("artifacts", []),
            changed_files=result.get("changed_files", []),
            evidence_hash=sha256_text(stable_json(result)),
        )
        self.invocations.append(tool_result)
        self._log(invocation, tool_result)
        return tool_result

    def _run_tool(self, tool_id: str, policy: CommandPolicy, **kwargs) -> dict:
        # Dispatch to appropriate implementation
        handlers = {
            "tool.fs.read": self._fs_read,
            "tool.fs.list": self._fs_list,
            "tool.fs.search": self._fs_search,
            "tool.fs.create": self._fs_create,
            "tool.fs.replace": self._fs_replace,
            "tool.fs.patch": self._fs_patch,
            "tool.fs.delete": self._fs_delete,
            "tool.fs.move": self._fs_move,
            "tool.process.run": self._process_run,
        }
        handler = handlers.get(tool_id)
        if not handler:
            return {"status": "failed", "error": f"No handler for {tool_id}"}
        return handler(**kwargs)

    def _fs_read(self, **kw) -> dict:
        from .filesystem import read_file
        root = Path(kw.get("root", self.project_root))
        path = kw.get("path", "")
        result = read_file(root, path, kw.get("max_chars"))
        return result

    def _fs_list(self, **kw) -> dict:
        from .filesystem import list_files
        root = Path(kw.get("root", self.project_root))
        path = kw.get("path", ".")
        result = list_files(root, path, kw.get("pattern", "*"))
        return result

    def _fs_search(self, **kw) -> dict:
        from .filesystem import search_files
        root = Path(kw.get("root", self.project_root))
        path = kw.get("path", ".")
        result = search_files(root, path, kw.get("pattern", "**/*"))
        return result

    def _fs_create(self, **kw) -> dict:
        from .filesystem import create_file
        root = Path(kw.get("root", self.project_root))
        path = kw.get("path", "")
        content = kw.get("content", "")
        return create_file(root, path, content)

    def _fs_replace(self, **kw) -> dict:
        from .filesystem import replace_file
        root = Path(kw.get("root", self.project_root))
        path = kw.get("path", "")
        return replace_file(root, path, kw.get("old_content", ""), kw.get("new_content", ""))

    def _fs_patch(self, **kw) -> dict:
        from .filesystem import patch_file
        root = Path(kw.get("root", self.project_root))
        path = kw.get("path", "")
        return patch_file(root, path, kw.get("old_content", ""), kw.get("new_content", ""))

    def _fs_delete(self, **kw) -> dict:
        from .filesystem import delete_file
        root = Path(kw.get("root", self.project_root))
        path = kw.get("path", "")
        return delete_file(root, path)

    def _fs_move(self, **kw) -> dict:
        from .filesystem import move_file
        root = Path(kw.get("root", self.project_root))
        source = kw.get("source", "")
        dest = kw.get("destination", "")
        return move_file(root, source, dest)

    def _process_run(self, **kw) -> dict:
        from .process import run_process
        exe = kw.get("executable", "")
        args = kw.get("args", [])
        wd = kw.get("working_directory", str(self.project_root))
        timeout = kw.get("timeout", 30)
        return run_process(exe, args, wd, timeout)

    def _make_result(self, inv: ToolInvocation, status: str, error: str = "", started=None) -> ToolResult:
        if started is None:
            started = datetime.now(timezone.utc)
        return ToolResult(
            invocation_id=inv.invocation_id,
            status=status, exit_code=None,
            started_at=started.strftime("%Y-%m-%dT%H:%M:%SZ"),
            completed_at=_now_utc(),
            duration_ms=0,
            stdout="", stderr=error,
            evidence_hash=sha256_text(error),
        )

    def _log(self, inv: ToolInvocation, result: ToolResult) -> None:
        redacted_args = {}
        for k, v in inv.arguments.items():
            redacted, _ = redact_sensitive(str(v))
            redacted_args[k] = redacted
        line = {
            "schema_version": "webforge.tool_ledger.v1",
            "timestamp": _now_utc(),
            "run_id": inv.run_id, "cycle_id": inv.cycle_id,
            "task_id": inv.task_id, "agent_id": inv.agent_id,
            "tool_id": inv.tool_id,
            "working_directory": inv.working_directory,
            "arguments_redacted": redacted_args,
            "status": result.status, "exit_code": result.exit_code,
            "duration_ms": result.duration_ms,
            "stdout_bytes": len(result.stdout),
            "stderr_bytes": len(result.stderr),
            "stdout_truncated": result.stdout_truncated,
            "stderr_truncated": result.stderr_truncated,
            "changed_files": result.changed_files,
            "evidence_hash": result.evidence_hash,
        }
        append_jsonl(self.output_dir / "tool-ledger.jsonl", line)

    def manifest(self) -> list[dict]:
        return [asdict(p) for p in self.policies.values()]

    def write_manifest(self) -> None:
        from ..utils import write_json
        write_json(self.output_dir / "tool-execution-manifest.json", self.manifest())
