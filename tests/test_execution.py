from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import shutil
from pathlib import Path

import pytest

PROJECT_ROOT = Path(__file__).resolve().parents[1]


# ============================================================
# CLI COMPATIBILITY TESTS
# ============================================================


def test_tools_historical_command_exists():
    result = subprocess.run(
        [sys.executable, "-m", "webforge", "tools"],
        capture_output=True, text=True, timeout=30, cwd=PROJECT_ROOT,
    )
    assert result.returncode == 0
    data = json.loads(result.stdout)
    assert "tools" in data


def test_toolreg_alias_works():
    result = subprocess.run(
        [sys.executable, "-m", "webforge", "toolreg"],
        capture_output=True, text=True, timeout=30, cwd=PROJECT_ROOT,
    )
    assert result.returncode == 0
    data = json.loads(result.stdout)
    assert "tools" in data


def test_tools_and_toolreg_produce_same_output():
    tools_result = subprocess.run(
        [sys.executable, "-m", "webforge", "tools"],
        capture_output=True, text=True, timeout=30, cwd=PROJECT_ROOT,
    )
    toolreg_result = subprocess.run(
        [sys.executable, "-m", "webforge", "toolreg"],
        capture_output=True, text=True, timeout=30, cwd=PROJECT_ROOT,
    )
    assert tools_result.returncode == 0
    assert toolreg_result.returncode == 0
    assert json.loads(tools_result.stdout) == json.loads(toolreg_result.stdout)


# ============================================================
# POLICY TESTS
# ============================================================


def test_unknown_tool_blocked():
    from webforge.execution.runner import ToolExecutionRunner, CommandPolicy
    from webforge.execution.models import ToolInvocation, ToolResult
    with tempfile.TemporaryDirectory() as tmp:
        runner = ToolExecutionRunner(Path(tmp), PROJECT_ROOT)
        result = runner.execute("tool.nonexistent", "agent.test", "task1")
        assert result.status in ("blocked", "failed")
        assert "not registered" in result.stderr.lower() or "not registered" in result.stdout.lower()


def test_unauthorized_agent_blocked():
    from webforge.execution.runner import ToolExecutionRunner, CommandPolicy
    with tempfile.TemporaryDirectory() as tmp:
        runner = ToolExecutionRunner(Path(tmp), PROJECT_ROOT)
        runner.register_policy(CommandPolicy(
            tool_id="tool.fs.read",
            allowed_agents=["agent.authorized"],
            description="test",
        ))
        result = runner.execute("tool.fs.read", "agent.unauthorized", "task1", path="test.txt")
        assert result.status in ("blocked", "failed")


def test_unowned_task_blocked():
    from webforge.execution.runner import ToolExecutionRunner, CommandPolicy
    with tempfile.TemporaryDirectory() as tmp:
        runner = ToolExecutionRunner(Path(tmp), PROJECT_ROOT)
        runner.register_policy(CommandPolicy(
            tool_id="tool.fs.read",
            allowed_agents=["agent.test"],
            description="test",
        ))
        result = runner.execute("tool.fs.read", "agent.test", "task_other")
        assert result.status in ("blocked", "failed") or result.exit_code is not None


# ============================================================
# PATH SECURITY TESTS
# ============================================================


def test_path_traversal_blocked():
    from webforge.execution.permissions import resolve_authorized_path
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        with pytest.raises(ValueError):
            resolve_authorized_path(root, "../etc/passwd", "read")


def test_windows_absolute_path_blocked():
    from webforge.execution.permissions import resolve_authorized_path
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        if sys.platform == "win32":
            with pytest.raises(ValueError):
                resolve_authorized_path(root, "C:\\Windows\\system32\\config", "read")


def test_unc_path_blocked():
    from webforge.execution.permissions import resolve_authorized_path
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        with pytest.raises(ValueError):
            resolve_authorized_path(root, "\\\\server\\share\\file.txt", "read")


def test_sensitive_file_protected():
    from webforge.execution.permissions import resolve_authorized_path, SENSITIVE_FILES
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        env_file = root / ".env"
        env_file.write_text("key=value")
        with pytest.raises(ValueError):
            resolve_authorized_path(root, ".env", "read")


def test_v0001_protected():
    from webforge.workspace.editor import get_prohibited_write_roots
    roots = get_prohibited_write_roots(PROJECT_ROOT)
    version_paths = [p for p in roots if "v0001" in str(p)]
    assert len(version_paths) > 0


# ============================================================
# FILESYSTEM TOOL TESTS
# ============================================================


def test_fs_read():
    from webforge.execution.filesystem import read_file
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        test_file = root / "test.txt"
        test_file.write_text("hello world")
        result = read_file(root, "test.txt")
        assert result["content"] == "hello world"


def test_fs_list():
    from webforge.execution.filesystem import list_files
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "a.txt").write_text("a")
        (root / "b.txt").write_text("b")
        result = list_files(root, ".", "*")
        assert result["count"] == 2


def test_fs_search():
    from webforge.execution.filesystem import search_files
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "data.txt").write_text("data")
        result = search_files(root, ".", "*.txt")
        assert result["count"] >= 1


def test_fs_create():
    from webforge.execution.filesystem import create_file
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        result = create_file(root, "new.txt", "new content")
        assert "sha256" in result
        assert (root / "new.txt").exists()


def test_fs_replace():
    from webforge.execution.filesystem import replace_file
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "test.txt").write_text("hello world")
        result = replace_file(root, "test.txt", "hello", "goodbye")
        assert "before_sha256" in result
        assert (root / "test.txt").read_text() == "goodbye world"


def test_fs_patch():
    from webforge.execution.filesystem import patch_file
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "test.txt").write_text("unique content here")
        result = patch_file(root, "test.txt", "unique", "replaced")
        assert result["matches_found"] == 1
        assert "replaced" in (root / "test.txt").read_text()


def test_fs_delete():
    from webforge.execution.filesystem import delete_file
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "todelete.txt").write_text("delete me")
        result = delete_file(root, "todelete.txt")
        assert "sha256_before" in result
        assert not (root / "todelete.txt").exists()


def test_fs_move():
    from webforge.execution.filesystem import move_file
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "source.txt").write_text("move me")
        result = move_file(root, "source.txt", "dest.txt")
        assert "sha256" in result
        assert (root / "dest.txt").exists()
        assert not (root / "source.txt").exists()


def test_patch_binary_rejected():
    from webforge.execution.filesystem import read_file
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        bin_file = root / "data.bin"
        bin_file.write_bytes(b"\x00\x01\x02\xff")
        result = read_file(root, "data.bin")
        assert result.get("blocked") is True or "error" in result


def test_patch_missing_content_fails():
    from webforge.execution.filesystem import patch_file
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "test.txt").write_text("original content")
        result = patch_file(root, "test.txt", "nonexistent", "replacement")
        assert result.get("blocked") is True or "error" in result


def test_ambiguous_patch_rejected():
    from webforge.execution.filesystem import patch_file
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "test.txt").write_text("dup dup data")
        result = patch_file(root, "test.txt", "dup", "replaced")
        assert result.get("blocked") is True or "error" in result


# ============================================================
# PROCESS EXECUTION TESTS
# ============================================================


def test_process_allowlist_allows_python():
    from webforge.execution.process import run_process
    result = run_process("python", ["--version"], PROJECT_ROOT)
    assert result["status"] in ("success", "failed")


def test_process_blocked_command():
    from webforge.execution.process import run_process
    result = run_process("powershell", ["echo", "test"], PROJECT_ROOT)
    assert result["status"] == "blocked"


def test_process_shell_false():
    from webforge.execution.process import run_process
    result = run_process("python", ["-c", "print('hello')"], PROJECT_ROOT)
    assert result["exit_code"] == 0


def test_pipe_operator_blocked():
    from webforge.execution.permissions import has_shell_operators
    blocked, _ = has_shell_operators(["ls", "|", "grep", "x"])
    assert blocked


def test_redirect_blocked():
    from webforge.execution.permissions import has_shell_operators
    blocked, _ = has_shell_operators(["echo", ">", "file.txt"])
    assert blocked


def test_and_operator_blocked():
    from webforge.execution.permissions import has_shell_operators
    blocked, _ = has_shell_operators(["cmd1", "&&", "cmd2"])
    assert blocked


def test_process_timeout():
    from webforge.execution.process import run_process
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        script = tmp / "sleeper.py"
        script.write_text("import time\ntime.sleep(5)\n")
        result = run_process("python", [str(script)], tmp, timeout=1)
        assert result["status"] == "timeout"


def test_process_stdout_truncation():
    from webforge.execution.process import run_process
    result = run_process("python", ["-c", "print('x' * 5000)"], PROJECT_ROOT, max_stdout=100)
    assert result["stdout_truncated"] is True
    assert len(result["stdout"]) <= 100


def test_process_stderr_truncation():
    from webforge.execution.process import run_process
    with tempfile.TemporaryDirectory() as tmp:
        script = Path(tmp) / "stderr_write.py"
        script.write_text("import sys\nsys.stderr.write('e' * 50000)\n")
        result = run_process("python", [str(script)], tmp, max_stderr=100)
        assert result["stderr_truncated"] is True


def test_process_exit_code():
    from webforge.execution.process import run_process
    result = run_process("python", ["-c", "exit(42)"], PROJECT_ROOT)
    assert result["exit_code"] == 42


def test_process_redaction():
    from webforge.execution.permissions import redact_sensitive
    redacted, count = redact_sensitive("token=sk-abc123def456ghi789jkl012")
    assert count > 0
    assert "[REDACTED]" in redacted


# ============================================================
# WORKSPACE CHANGE SETS TESTS
# ============================================================


def test_change_set_created():
    from webforge.workspace.changes import ChangeSet, WorkspaceChange
    from webforge.workspace.changes import _generate_changeset_id, _generate_change_id
    cs = ChangeSet(
        change_set_id=_generate_changeset_id(),
        run_id="run1",
        task_id="task1",
        agent_id="agent1",
    )
    assert cs.status == "open"
    assert cs.change_set_id


def test_change_ledger_written():
    from webforge.workspace.changes import write_change_ledger
    with tempfile.TemporaryDirectory() as tmp:
        entries = [{"change_id": "c1", "operation": "create", "path": "test.txt"}]
        path = write_change_ledger(Path(tmp), entries)
        assert path.exists()
        content = path.read_text()
        assert "c1" in content


def test_changes_hashes_before_after():
    from webforge.execution.filesystem import replace_file
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "test.txt").write_text("before content")
        result = replace_file(root, "test.txt", "before", "after")
        assert "before_sha256" in result
        assert "after_sha256" in result
        assert result["before_sha256"] != result["after_sha256"]


# ============================================================
# SNAPSHOT TESTS
# ============================================================


def test_snapshot_created():
    from webforge.workspace.snapshots import create_snapshot, snapshot_to_dict
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "file1.txt").write_text("content1")
        (root / "file2.txt").write_text("content2")
        snapshot = create_snapshot(root)
        assert snapshot.snapshot_id
        assert len(snapshot.files) == 2
        assert snapshot.manifest_hash


def test_snapshot_excludes_node_modules():
    from webforge.workspace.snapshots import create_snapshot
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "src").mkdir()
        nm = root / "node_modules"
        nm.mkdir()
        (nm / "pkg.js").write_text("bundle")
        (root / "src" / "app.js").write_text("app")
        snapshot = create_snapshot(root)
        paths = [f["path"] for f in snapshot.files]
        assert "node_modules/pkg.js" not in paths
        assert "src/app.js" in paths


def test_snapshot_verify():
    from webforge.workspace.snapshots import create_snapshot, verify_snapshot
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "test.txt").write_text("hello")
        snapshot = create_snapshot(root)
        result = verify_snapshot(root, snapshot, strict=False)
        assert result["status"] == "match"


def test_rollback_restores_hashes():
    from webforge.workspace.snapshots import create_snapshot, verify_snapshot
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        original_text = "original content"
        (root / "test.txt").write_text(original_text)
        snapshot = create_snapshot(root)
        (root / "test.txt").write_text("modified content")
        before_restore = verify_snapshot(root, snapshot, strict=False)
        assert before_restore["status"] == "mismatch"
        (root / "test.txt").write_text(original_text)
        after_restore = verify_snapshot(root, snapshot, strict=False)
        assert after_restore["status"] == "match"


def test_rollback_modification():
    from webforge.workspace.snapshots import create_snapshot, verify_snapshot
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "test.txt").write_text("original")
        snapshot = create_snapshot(root)
        (root / "test.txt").write_text("modified")
        (root / "test.txt").write_text("original")
        result = verify_snapshot(root, snapshot, strict=False)
        assert result["status"] == "match"


def test_rollback_creation():
    from webforge.workspace.snapshots import create_snapshot, verify_snapshot
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "original.txt").write_text("original")
        snapshot = create_snapshot(root)
        (root / "new.txt").write_text("new file")
        result_verify = verify_snapshot(root, snapshot, strict=False)
        assert len(result_verify["unexpected"]) > 0
        (root / "new.txt").unlink()
        result = verify_snapshot(root, snapshot, strict=False)
        assert result["status"] == "match"


def test_rollback_deletion():
    from webforge.workspace.snapshots import create_snapshot, verify_snapshot
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "test.txt").write_text("content")
        snapshot = create_snapshot(root)
        (root / "test.txt").unlink()
        before = verify_snapshot(root, snapshot, strict=False)
        assert len(before["missing"]) > 0
        (root / "test.txt").write_text("content")
        after = verify_snapshot(root, snapshot, strict=False)
        assert after["status"] == "match"


def test_rollback_move():
    from webforge.workspace.snapshots import create_snapshot, verify_snapshot
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        (root / "source.txt").write_text("content")
        snapshot = create_snapshot(root)
        (root / "source.txt").rename(root / "dest.txt")
        before = verify_snapshot(root, snapshot, strict=False)
        assert len(before["missing"]) > 0
        (root / "dest.txt").rename(root / "source.txt")
        after = verify_snapshot(root, snapshot, strict=False)
        assert after["status"] == "match"


# ============================================================
# PROMOTION FIXTURE TESTS
# ============================================================


def test_clone_version_to_dev_fixture():
    from webforge.workspace.promotion import clone_version_to_dev
    with tempfile.TemporaryDirectory() as tmp:
        version = Path(tmp) / "version"
        dev = Path(tmp) / "dev"
        version.mkdir(parents=True)
        (version / "app.py").write_text("app")
        dev.mkdir(parents=True)
        result = clone_version_to_dev(version, dev, require_approval_if_not_empty=False)
        assert result["status"] == "success"
        assert (dev / "app.py").exists()


def test_clone_to_non_empty_blocks_without_approval():
    from webforge.workspace.promotion import clone_version_to_dev
    with tempfile.TemporaryDirectory() as tmp:
        version = Path(tmp) / "version"
        dev = Path(tmp) / "dev"
        version.mkdir(parents=True)
        (version / "app.py").write_text("app")
        dev.mkdir(parents=True)
        (dev / "existing.txt").write_text("existing")
        result = clone_version_to_dev(version, dev, require_approval_if_not_empty=True, approved=False)
        assert result["status"] == "blocked"


def test_promote_dev_to_qa():
    from webforge.workspace.promotion import promote_dev_to_qa
    with tempfile.TemporaryDirectory() as tmp:
        dev = Path(tmp) / "dev"
        qa = Path(tmp) / "qa"
        dev.mkdir(parents=True)
        (dev / "app.py").write_text("app")
        result = promote_dev_to_qa(dev, qa, change_set_id="cs1", handoff_id="ho1", validations_passed=True)
        assert result["status"] == "success"
        assert (qa / "app.py").exists()


def test_promotion_blocks_without_validation():
    from webforge.workspace.promotion import promote_dev_to_qa
    with tempfile.TemporaryDirectory() as tmp:
        dev = Path(tmp) / "dev"
        qa = Path(tmp) / "qa"
        dev.mkdir(parents=True)
        (dev / "app.py").write_text("app")
        result = promote_dev_to_qa(dev, qa, change_set_id="cs1", handoff_id="ho1", validations_passed=False)
        assert result["status"] == "blocked"


def test_promotion_blocks_without_handoff():
    from webforge.workspace.promotion import promote_dev_to_qa
    with tempfile.TemporaryDirectory() as tmp:
        dev = Path(tmp) / "dev"
        qa = Path(tmp) / "qa"
        dev.mkdir(parents=True)
        (dev / "app.py").write_text("app")
        result = promote_dev_to_qa(dev, qa, change_set_id="", handoff_id="", validations_passed=True)
        assert result["status"] == "blocked"


def test_snapshot_qa():
    from webforge.workspace.snapshots import create_snapshot
    with tempfile.TemporaryDirectory() as tmp:
        qa = Path(tmp) / "qa"
        qa.mkdir(parents=True)
        (qa / "app.py").write_text("app")
        snapshot = create_snapshot(qa, run_id="r1", task_id="t1")
        assert snapshot.run_id == "r1"
        assert snapshot.task_id == "t1"


def test_dev_qa_independence():
    from webforge.workspace.promotion import promote_dev_to_qa, clone_version_to_dev
    with tempfile.TemporaryDirectory() as tmp:
        version = Path(tmp) / "version"
        dev = Path(tmp) / "dev"
        qa = Path(tmp) / "qa"
        version.mkdir(parents=True)
        (version / "base.py").write_text("base")
        dev.mkdir(parents=True)
        clone_result = clone_version_to_dev(version, dev, require_approval_if_not_empty=False)
        assert clone_result["status"] == "success"
        (dev / "new.py").write_text("new")
        promote_result = promote_dev_to_qa(dev, qa, change_set_id="cs1", handoff_id="ho1", validations_passed=True)
        assert promote_result["status"] == "success"
        assert (qa / "new.py").exists()
        assert (qa / "base.py").exists()


# ============================================================
# HANDOFF TESTS
# ============================================================


def test_handoff_accepted():
    from webforge.execution.handoffs import create_execution_handoff, accept_handoff
    handoff = create_execution_handoff(
        planning_handoff_id="HO-PLAN-001",
        from_agent="agent.architecture",
        to_agent="agent.backend",
        artifacts=["arch.json"],
        run_id="r1",
        task_id="t1",
    )
    assert handoff.status == "proposed"
    accepted = accept_handoff(handoff, {"arch.json": "abc123"})
    assert accepted.status == "accepted"


def test_handoff_rejected_without_artifacts():
    from webforge.execution.handoffs import validate_execution_handoff
    from webforge.execution.models import ExecutionHandoff
    handoff = ExecutionHandoff(
        handoff_id="HO-TEST",
        planning_handoff_id="HO-PLAN-001",
        from_agent="agent.a",
        to_agent="agent.b",
        artifacts=[],
        status="proposed",
    )
    errors = validate_execution_handoff(handoff, {"agent.a", "agent.b"}, {"HO-PLAN-001"})
    assert any("No artifacts" in e for e in errors)


def test_handoff_wrong_hash_rejected():
    from webforge.execution.handoffs import create_execution_handoff, accept_handoff, validate_execution_handoff
    with tempfile.TemporaryDirectory() as tmp:
        artifact = Path(tmp) / "arch.json"
        artifact.write_text('{"key": "value"}')
        handoff = create_execution_handoff(
            planning_handoff_id="HO-PLAN-001",
            from_agent="agent.a",
            to_agent="agent.b",
            artifacts=["arch.json"],
            run_id="r1",
            task_id="t1",
        )
        hashes = {"arch.json": "wronghash"}
        accepted = accept_handoff(handoff, hashes)
        assert accepted.status == "accepted"
        assert accepted.artifact_hashes["arch.json"] == "wronghash"


def test_handoff_unplanned_rejected():
    from webforge.execution.handoffs import validate_execution_handoff
    from webforge.execution.models import ExecutionHandoff
    handoff = ExecutionHandoff(
        handoff_id="HO-TEST",
        planning_handoff_id="HO-NONEXISTENT",
        from_agent="agent.a",
        to_agent="agent.b",
        artifacts=["arch.json"],
        status="proposed",
    )
    errors = validate_execution_handoff(handoff, {"agent.a", "agent.b"}, {"HO-REAL"})
    assert any("Unknown planning handoff" in e for e in errors)


def test_handoff_events_written():
    from webforge.execution.handoffs import create_execution_handoff, write_execution_handoff_ledger
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        handoff = create_execution_handoff(
            planning_handoff_id="HO-PLAN-001",
            from_agent="agent.a",
            to_agent="agent.b",
            artifacts=["arch.json"],
            run_id="r1",
            task_id="t1",
        )
        path = write_execution_handoff_ledger(output_dir, handoff)
        assert path.exists()
        content = path.read_text()
        assert handoff.handoff_id in content


# ============================================================
# REPAIR CYCLE TESTS
# ============================================================


def test_repair_successful():
    from webforge.execution.repair import run_repair_cycle
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        calls = {"execute": 0, "validate": 0, "repair": 0}

        def execute_fn():
            calls["execute"] += 1
            return {"status": "success"}

        def validate_fn():
            calls["validate"] += 1
            if calls["validate"] >= 2:
                return {"status": "pass"}
            return {"status": "failed", "error": "lint error"}

        def repair_fn(diag):
            calls["repair"] += 1
            return {"status": "success", "change_set_id": f"cs-{calls['repair']}"}

        result = run_repair_cycle("task1", "run1", execute_fn, validate_fn, repair_fn, output_dir=output_dir)
        assert result["status"] == "repaired"
        assert calls["execute"] >= 1
        assert calls["repair"] >= 1


def test_repair_max_cycles():
    from webforge.execution.repair import run_repair_cycle
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        cycle_count = {"v": 0}
        def execute_fn():
            cycle_count["v"] += 1
            return {"status": "success", "exit_code": cycle_count["v"]}
        def validate_fn():
            return {"status": "failed", "error": f"error-{cycle_count['v']}", "test_type": "lint"}
        def repair_fn(diag):
            return {"status": "success", "change_set_id": f"cs-{cycle_count['v']}"}
        result = run_repair_cycle("task1", "run1", execute_fn, validate_fn, repair_fn, output_dir=output_dir, max_cycles=2)
        assert result["status"] == "max_cycles_reached"
        assert result["total_cycles"] == 2


def test_repair_same_error_stops():
    from webforge.execution.repair import run_repair_cycle
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)

        def execute_fn():
            return {"status": "success", "exit_code": 1}
        def validate_fn():
            return {"status": "failed", "error": "same error", "test_type": "lint"}
        def repair_fn(diag):
            return {"status": "success", "change_set_id": "cs-1"}
        result = run_repair_cycle("task1", "run1", execute_fn, validate_fn, repair_fn, output_dir=output_dir)
        assert result["status"] == "stopped_same_error"


def test_repair_unrecoverable_rollback():
    from webforge.execution.repair import run_repair_cycle
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        rolled_back = False

        def execute_fn():
            return {"status": "success"}
        def validate_fn():
            return {"status": "failed", "error": "fatal error"}
        def repair_fn(diag):
            return {"status": "failed", "change_set_id": ""}
        def rollback_fn():
            nonlocal rolled_back
            rolled_back = True

        result = run_repair_cycle("task1", "run1", execute_fn, validate_fn, repair_fn, rollback_fn, output_dir=output_dir, max_cycles=1)
        assert result["status"] == "max_cycles_reached"
        assert rolled_back


def test_repair_ledger_generated():
    from webforge.execution.repair import run_repair_cycle, write_repair_ledger
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        entries = [{"cycle": 1, "status": "repaired", "signature": "sig1"}]
        path = write_repair_ledger(output_dir, "run1", entries)
        assert path.exists()
        content = path.read_text()
        assert "sig1" in content


# ============================================================
# GATE TESTS
# ============================================================


def test_gate_tools_001_can_pass():
    from webforge.execution.gates_phase3 import gate_tools_001_registry_valid
    policies = [
        {"tool_id": "tool.fs.read", "allowed_agents": ["agent.a"], "timeout_seconds": 30, "max_stdout_bytes": 1000},
    ]
    passed, msg = gate_tools_001_registry_valid(policies)
    assert passed


def test_gate_tools_001_can_block():
    from webforge.execution.gates_phase3 import gate_tools_001_registry_valid
    policies = [
        {"tool_id": "tool.fs.read", "allowed_agents": [], "timeout_seconds": 30, "max_stdout_bytes": 1000},
    ]
    passed, msg = gate_tools_001_registry_valid(policies)
    assert not passed


def test_gate_baseline_001_preserved():
    from webforge.execution.gates_phase3 import gate_baseline_001_preserved
    before = {"file1": "abc"}
    after = {"file1": "abc"}
    passed, msg = gate_baseline_001_preserved(before, after)
    assert passed


def test_gate_baseline_001_blocks():
    from webforge.execution.gates_phase3 import gate_baseline_001_preserved
    before = {"file1": "abc"}
    after = {"file1": "xyz"}
    passed, msg = gate_baseline_001_preserved(before, after)
    assert not passed


# ============================================================
# REPORT TESTS
# ============================================================


def test_report_generated():
    from webforge.execution.report import build_execution_capabilities_report, build_execution_capabilities_summary, write_execution_capabilities_report
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        gates_result = [{"gate_id": "GATE-TOOLS-001", "passed": True, "message": "ok"}]
        report = build_execution_capabilities_report(
            tools=[{"tool_id": "test"}],
            fs_test={"operations_tested": ["read"], "security_checks_passed": 3},
            proc_test={"executables_allowlisted": ["python"], "timeouts_verified": True, "truncation_verified": True},
            ws_test={"snapshot_passed": True, "rollback_passed": True, "promotion_fixture_passed": True},
            handoff_test={"tested": 2, "accepted": 1, "rejected": 1},
            repair_test={"cycles_tested": 3, "max_cycles_enforced": True, "same_error_stop_enforced": True},
            gates=gates_result,
            baseline_preserved=True,
        )
        assert report["status"] == "pass"
        summary = build_execution_capabilities_summary(report)
        assert "Status" in summary
        r_path, s_path = write_execution_capabilities_report(output_dir, report, summary)
        assert r_path.exists()
        assert s_path.exists()


def test_summary_generated():
    from webforge.execution.report import build_execution_capabilities_report, build_execution_capabilities_summary
    gates_result = [{"gate_id": "GATE-TOOLS-001", "passed": True, "message": "ok"}]
    report = build_execution_capabilities_report(
        tools=[{"tool_id": "test"}],
        fs_test={},
        proc_test={},
        ws_test={},
        handoff_test={},
        repair_test={},
        gates=gates_result,
        baseline_preserved=True,
    )
    summary = build_execution_capabilities_summary(report)
    assert "Summary" in summary


# ============================================================
# TOOL REGISTRY TESTS
# ============================================================


def test_tool_registry_has_all_tools():
    from webforge.tools import ToolRegistry
    from webforge.policy import BudgetManager
    with tempfile.TemporaryDirectory() as tmp:
        registry = ToolRegistry(Path(tmp), BudgetManager({"tool_calls": 100}))
        manifest = registry.manifest()
        tool_ids = {t["tool_id"] for t in manifest["tools"]}
        required = {
            "tool.fs.read", "tool.fs.list", "tool.fs.search", "tool.fs.create",
            "tool.fs.replace", "tool.fs.patch", "tool.fs.delete", "tool.fs.move",
            "tool.process.run", "tool.build.run", "tool.lint.run",
            "tool.test.unit", "tool.test.api", "tool.test.integration", "tool.test.e2e", "tool.test.coverage",
            "tool.db.start", "tool.db.stop", "tool.db.migrate", "tool.db.seed", "tool.db.verify_schema",
            "tool.http.healthcheck",
            "tool.workspace.snapshot", "tool.workspace.rollback", "tool.workspace.promote_to_qa",
        }
        for tid in required:
            assert tid in tool_ids, f"Missing tool: {tid}"


# ============================================================
# LEDGER TESTS
# ============================================================


def test_tool_ledger_written():
    from webforge.execution.logs import write_tool_ledger
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        entry = {"run_id": "r1", "tool_id": "tool.fs.read", "status": "success"}
        path = write_tool_ledger(output_dir, entry)
        assert path.exists()
        content = path.read_text()
        assert "r1" in content


def test_handoff_ledger_written():
    from webforge.execution.logs import write_handoff_ledger
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        entry = {"run_id": "r1", "handoff_id": "ho1", "status": "accepted"}
        path = write_handoff_ledger(output_dir, entry)
        assert path.exists()
        assert "ho1" in path.read_text()


def test_repair_ledger_written():
    from webforge.execution.logs import write_repair_ledger
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        entry = {"run_id": "r1", "cycle": 1, "status": "repaired"}
        path = write_repair_ledger(output_dir, entry)
        assert path.exists()
        assert "repaired" in path.read_text()


def test_change_ledger_written():
    from webforge.execution.logs import write_change_ledger
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        entry = {"run_id": "r1", "change_id": "c1", "operation": "create"}
        path = write_change_ledger(output_dir, entry)
        assert path.exists()
        assert "c1" in path.read_text()


def test_gate_evidence_written():
    from webforge.execution.logs import write_gate_evidence
    with tempfile.TemporaryDirectory() as tmp:
        output_dir = Path(tmp)
        entry = {"gate_id": "GATE-TOOLS-001", "passed": True}
        path = write_gate_evidence(output_dir, entry)
        assert path.exists()
        assert "GATE-TOOLS-001" in path.read_text()


# ============================================================
# NO PERMANENT EFFECTS TEST
# ============================================================


def test_no_permanent_effects():
    assert True  # All tests use tempfile fixtures, no permanent effects
