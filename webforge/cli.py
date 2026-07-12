from __future__ import annotations

import argparse
import json
import shutil
import sys
from pathlib import Path

from .capabilities import skill_manifest, validate_skill_package
from .orchestrator import WebForgeFactory
from .models import WorkOrder
from .normalization import NormalizationError, normalize_siged
from .planning import PlanningError, run_planning
from .principles import ordered_principles
from .policy import BudgetManager
from .tools import ToolRegistry
from .execution import ToolExecutionRunner, read_file, list_files, search_files, create_file, replace_file, patch_file, delete_file, move_file, create_directory
from .execution import run_process, resolve_authorized_path, check_executable_allowed
from .execution.runner import ToolExecutionRunner, CommandPolicy
from .execution.repair import run_repair_cycle
from .execution.handoffs import create_execution_handoff, accept_handoff, reject_handoff, validate_execution_handoff, write_execution_handoff_ledger
from .execution.report import build_execution_capabilities_report, build_execution_capabilities_summary, write_execution_capabilities_report
from .execution.gates_phase3 import run_phase3_gates
from .workspace import edit_workspace, create_snapshot, verify_snapshot, restore_snapshot, clone_version_to_dev, promote_dev_to_qa
from .workspace.changes import write_change_ledger
from .workspace.snapshots import snapshot_to_dict, WorkspaceSnapshot
from .api import api_command


def _load_work_order(args: argparse.Namespace) -> dict:
    if args.work_order:
        return json.loads(Path(args.work_order).read_text(encoding="utf-8"))
    if not args.objective:
        raise SystemExit("--objective or --work-order is required")
    return {
        "objective": args.objective,
        "project_id": args.project_id or "",
        "project_version": args.project_version,
        "type": args.type,
        "scope": "local_artifacts_only",
        "side_effects": "no_external_writes_no_deploy",
        "acceptance_criteria": args.acceptance or ["P01-P12 pass at 100 percent", "Required artifacts are generated"],
        "budget": {"tool_calls": args.max_tool_calls, "mcp_calls": 0, "cost_usd": 0},
    }


def run_command(args: argparse.Namespace) -> int:
    root = Path(args.project_root).resolve()
    output_dir = Path(args.output).resolve()
    work_order = _load_work_order(args)
    sources = [Path(item).resolve() for item in args.source] if args.source else None
    report = WebForgeFactory(root).run(work_order, output_dir, sources=sources)
    print(json.dumps({"status": report["status"], "run_id": report["run_id"], "output_dir": str(output_dir)}, indent=2))
    return 0 if report["status"] == "complete" else 1


def principles_command(_: argparse.Namespace) -> int:
    for principle in ordered_principles():
        print(f"{principle.id}: {principle.name} | gates={','.join(principle.gates)}")
    return 0


def skills_command(args: argparse.Namespace) -> int:
    root = Path(args.project_root).resolve()
    print(json.dumps(skill_manifest(root), indent=2, sort_keys=True))
    return 0


def toolreg_command(args: argparse.Namespace) -> int:
    output_dir = Path(args.output).resolve()
    registry = ToolRegistry(output_dir, BudgetManager({"tool_calls": 1}))
    print(json.dumps(registry.manifest(), indent=2, sort_keys=True))
    return 0


def doctor_command(args: argparse.Namespace) -> int:
    root = Path(args.project_root).resolve()
    errors = validate_skill_package(root)
    report = {
        "status": "pass" if not errors else "error",
        "skill_package_errors": errors,
        "skill_manifest": skill_manifest(root),
    }
    print(json.dumps(report, indent=2, sort_keys=True))
    return 0 if not errors else 1


def normalize_command(args: argparse.Namespace) -> int:
    root = Path(args.project_root).resolve()
    work_order_data = json.loads(Path(args.work_order).read_text(encoding="utf-8"))
    work_order = WorkOrder.from_dict(work_order_data)
    errors = work_order.validate()
    source_errors = _validate_source_documents(root, work_order.source_documents)
    if errors or source_errors:
        print(json.dumps({"status": "blocked", "errors": errors + source_errors}, ensure_ascii=True, indent=2))
        return 1
    output = Path(args.output).resolve()
    canonical = root / "project" / work_order.project_id / "spec"
    try:
        report = normalize_siged(root, output, root / "project/siged-lampa/sandboxes/DEV/workspace", work_order.minimum_scope, work_order.project_id)
        if canonical != output:
            canonical.mkdir(parents=True, exist_ok=True)
            for artifact in output.iterdir():
                if artifact.is_file():
                    shutil.copy2(artifact, canonical / artifact.name)
    except NormalizationError as exc:
        print(json.dumps({"status": "blocked", "error": str(exc)}, ensure_ascii=True, indent=2))
        return 1
    print(json.dumps({"status": report["status"], "project_id": work_order.project_id, "counts": report["counts"], "findings": report["findings"], "output": str(output)}, ensure_ascii=True, indent=2))
    return 0 if report["status"] == "pass" else 1


def plan_command(args: argparse.Namespace) -> int:
    root = Path(args.project_root).resolve()
    work_order_data = json.loads(Path(args.work_order).read_text(encoding="utf-8"))
    output = Path(args.output).resolve()
    try:
        result = run_planning(root, work_order_data, output)
    except PlanningError as exc:
        print(json.dumps({"status": "blocked", "error": str(exc)}, ensure_ascii=True, indent=2))
        return 1
    report = result.get("report", {})
    status = result.get("status", "blocked")
    print(json.dumps({"status": status, "run_id": result.get("run_id", ""), "decisions": report.get("decisions", {}), "agents": report.get("agents", {}), "tasks": report.get("tasks", {}), "dag": report.get("dag", {}), "handoffs": report.get("handoffs", {}), "gates": result.get("gates", []), "summary": result.get("summary", ""), "generated_files": result.get("generated_files", [])}, ensure_ascii=True, indent=2))
    return 0 if status == "pass" else 1


def tools_validate_command(args: argparse.Namespace) -> int:
    root = Path(args.project_root).resolve()
    output_dir = Path(args.output).resolve()
    work_order_path = Path(args.work_order)
    work_order = json.loads(work_order_path.read_text(encoding="utf-8"))

    output_dir.mkdir(parents=True, exist_ok=True)
    registry = ToolRegistry(output_dir, BudgetManager(work_order.get("budget", {"tool_calls": 200})))
    runner = ToolExecutionRunner(output_dir, root)
    required_db_tools = {
        "tool.db.start", "tool.db.stop", "tool.db.migrate", "tool.db.seed", "tool.db.verify_schema",
    }
    findings = []
    for tool_id in required_db_tools:
        spec = registry.specs.get(tool_id)
        if not spec:
            findings.append(f"required DB tool is not registered: {tool_id}")
            continue
        runner.register_policy(CommandPolicy(
            tool_id=tool_id, description=spec.purpose, allowed_agents=list(spec.allowed_agents),
            timeout_seconds=spec.timeout_seconds, max_stdout_bytes=spec.max_stdout_bytes,
            max_stderr_bytes=spec.max_stderr_bytes, network_policy=spec.network_policy,
            writes_workspace=spec.writes_workspace, requires_snapshot=spec.requires_snapshot,
            requires_approval=spec.requires_approval,
        ))
    reset = registry.specs.get("tool.db.reset")
    if reset:
        runner.register_policy(CommandPolicy(
            tool_id=reset.tool_id, description=reset.purpose, allowed_agents=list(reset.allowed_agents),
            timeout_seconds=reset.timeout_seconds, max_stdout_bytes=reset.max_stdout_bytes,
            max_stderr_bytes=reset.max_stderr_bytes, network_policy=reset.network_policy,
            writes_workspace=reset.writes_workspace, requires_snapshot=reset.requires_snapshot,
            requires_approval=reset.requires_approval,
        ))
    else:
        findings.append("required guarded DB reset tool is not registered")

    # The architecture manifest is a planning artefact; only DB permissions are
    # governed by this phase's executable registry.
    agents_path = root / "project" / work_order.get("project_id", "") / "architecture" / "agents.json"
    if not agents_path.is_file():
        findings.append("architecture agent manifest not found")
    is_valid = not findings and required_db_tools.issubset(runner.policies)
    report = {
        "status": "valid" if is_valid else "invalid",
        "tools_registered": len(runner.policies),
        "tools": runner.manifest(),
        "findings": findings,
        "registry_version": registry.version,
    }
    registry.write_manifest()
    (output_dir / "tools-validation.json").write_text(
        json.dumps(report, indent=2, sort_keys=True),
        encoding="utf-8",
    )
    print(json.dumps(report, indent=2))
    return 0 if is_valid else 1


def workspace_snapshot_command(args: argparse.Namespace) -> int:
    ws_dir = Path(args.workspace).resolve()
    output_dir = Path(args.output).resolve()
    output_dir.mkdir(parents=True, exist_ok=True)

    snapshot = create_snapshot(ws_dir)
    snapshot_dict = snapshot_to_dict(snapshot)
    snapshot_path = output_dir / f"snapshot_{snapshot.snapshot_id}.json"
    snapshot_path.write_text(json.dumps(snapshot_dict, indent=2), encoding="utf-8")

    result = {
        "snapshot_id": snapshot.snapshot_id,
        "file_count": len(snapshot.files),
        "manifest_hash": snapshot.manifest_hash,
        "path": str(snapshot_path),
    }
    print(json.dumps(result, indent=2))
    return 0


def workspace_verify_command(args: argparse.Namespace) -> int:
    ws_dir = Path(args.workspace).resolve()
    snapshot_data = json.loads(Path(args.snapshot).read_text(encoding="utf-8"))
    snapshot = WorkspaceSnapshot(**snapshot_data)

    result = verify_snapshot(ws_dir, snapshot)

    output = {
        "matched": len(result["matched"]),
        "missing": len(result["missing"]),
        "modified": len(result["modified"]),
        "unexpected": len(result.get("unexpected", [])),
        "status": result["status"],
    }
    print(json.dumps(output, indent=2))
    return 0 if result["status"] == "match" else 1


def workspace_rollback_command(args: argparse.Namespace) -> int:
    ws_dir = Path(args.workspace).resolve()
    snapshot_data = json.loads(Path(args.snapshot).read_text(encoding="utf-8"))
    snapshot = WorkspaceSnapshot(**snapshot_data)

    result = restore_snapshot(ws_dir, snapshot)

    print(json.dumps({"status": result["status"], "actions_required": result["actions_required"]}, indent=2))
    return 0 if result["status"] in ("ready", "needs_backup") else 1


def _validate_source_documents(root: Path, source_documents: list[str]) -> list[str]:
    errors = []
    for value in source_documents:
        path = (root / value).resolve()
        try:
            path.relative_to(root)
        except ValueError:
            errors.append(f"source_documents file is outside project root: {value}")
            continue
        if not path.is_file():
            errors.append(f"source_documents file does not exist: {value}")
    return errors


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(prog="webforge")
    subparsers = parser.add_subparsers(dest="command", required=True)

    run_parser = subparsers.add_parser("run", help="Run the local WEBFORGE SDD factory.")
    run_parser.add_argument("--project-root", default=".")
    run_parser.add_argument("--output", default="runs/latest")
    run_parser.add_argument("--work-order")
    run_parser.add_argument("--objective")
    run_parser.add_argument("--project-id", default="")
    run_parser.add_argument("--project-version", default="v0001")
    run_parser.add_argument("--type", default="factory_runtime")
    run_parser.add_argument("--acceptance", action="append")
    run_parser.add_argument("--source", action="append", default=[])
    run_parser.add_argument("--max-tool-calls", type=int, default=200)
    run_parser.set_defaults(func=run_command)

    p_parser = subparsers.add_parser("principles", help="Print P01-P12 controls.")
    p_parser.set_defaults(func=principles_command)

    skills_parser = subparsers.add_parser("skills", help="Print WEBFORGE factory skill catalog.")
    skills_parser.add_argument("--project-root", default=".")
    skills_parser.set_defaults(func=skills_command)

    tools_parser = subparsers.add_parser("tools", help="List tools or manage tool registry")
    tools_sub = tools_parser.add_subparsers(dest="tools_command")
    tools_parser.set_defaults(func=toolreg_command)
    tools_parser.add_argument("--output", default="runs/tool-preview")
    validate_tools_parser = tools_sub.add_parser("validate", help="Validate tool registry against work order")
    validate_tools_parser.add_argument("--project-root", default=".")
    validate_tools_parser.add_argument("--work-order", required=True)
    validate_tools_parser.add_argument("--output", default="runs/tools-validation")
    validate_tools_parser.set_defaults(func=tools_validate_command)

    toolreg_parser = subparsers.add_parser("toolreg", help="Alias for 'tools' - list registered tools")
    toolreg_parser.add_argument("--output", default="runs/tool-preview")
    toolreg_parser.set_defaults(func=toolreg_command)

    doctor_parser = subparsers.add_parser("doctor", help="Validate the WEBFORGE skill/tool package.")
    doctor_parser.add_argument("--project-root", default=".")
    doctor_parser.set_defaults(func=doctor_command)

    normalize_parser = subparsers.add_parser("normalize", help="Normalize the four SIGED-Lampa source documents.")
    normalize_parser.add_argument("--project-root", default=".")
    normalize_parser.add_argument("--work-order", required=True)
    normalize_parser.add_argument("--output", default="runs/siged-normalization")
    normalize_parser.set_defaults(func=normalize_command)

    plan_parser = subparsers.add_parser("plan", help="Plan architecture, agents, DAG and handoffs for SIGED-Lampa.")
    plan_parser.add_argument("--project-root", default=".")
    plan_parser.add_argument("--work-order", required=True)
    plan_parser.add_argument("--output", default="runs/siged-planning")
    plan_parser.set_defaults(func=plan_command)

    api_parser = subparsers.add_parser("api", help="Verify, test or report the SIGED backend API contract.")
    api_sub = api_parser.add_subparsers(dest="api_command", required=True)
    for name in ("verify", "test", "report"):
        command = api_sub.add_parser(name)
        command.add_argument("--project-root", default=".")
        command.add_argument("--work-order", required=True)
        command.add_argument("--environment", required=True, choices=["qa"])
        command.add_argument("--output", default="runs/phase5c")
        command.set_defaults(func=api_command)

    ws_parser = subparsers.add_parser("workspace", help="Workspace management commands")
    ws_sub = ws_parser.add_subparsers(dest="workspace_command", required=True)
    snap_parser = ws_sub.add_parser("snapshot", help="Create workspace snapshot")
    snap_parser.add_argument("--workspace", required=True)
    snap_parser.add_argument("--output", default="runs/workspace-snapshot")
    snap_parser.set_defaults(func=workspace_snapshot_command)
    ver_parser = ws_sub.add_parser("verify", help="Verify workspace against snapshot")
    ver_parser.add_argument("--workspace", required=True)
    ver_parser.add_argument("--snapshot", required=True)
    ver_parser.set_defaults(func=workspace_verify_command)
    roll_parser = ws_sub.add_parser("rollback", help="Rollback workspace from snapshot")
    roll_parser.add_argument("--workspace", required=True)
    roll_parser.add_argument("--snapshot", required=True)
    roll_parser.set_defaults(func=workspace_rollback_command)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    sys.exit(main())
