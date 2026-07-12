from __future__ import annotations

import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .decisions import (
    ArchitectureDecision,
    generate_decisions,
    validate_decisions,
    decisions_to_dict,
    write_decisions,
)
from .architecture import build_architecture, write_architecture, load_catalogs
from .agents import generate_agents, validate_agents, write_agents
from .contracts import write_contracts, HandoffEnvelope, validate_handoff_envelope
from .tasks import generate_tasks, validate_tasks, write_tasks, task_summary
from .dag import build_dag, validate_dag, write_dag
from .handoffs import generate_handoffs, validate_handoffs, write_handoffs
from .gates import run_gates, all_gates_pass, write_gate_results
from .ledgers import (
    generate_ledger_entries_for_planning,
    write_agent_ledger,
    write_handoff_ledger,
    write_planning_ledger,
)
from .report import (
    build_planning_report,
    build_planning_summary,
    write_planning_report,
    write_planning_summary,
)
from ..baseline import SOURCE_NAMES
from ..utils import sha256_file, ensure_dir, sha256_text, stable_json


class PlanningError(Exception):
    pass


class PlanningReport:
    def __init__(
        self,
        status: str,
        report: dict[str, Any],
        summary: str,
        gates: list[dict[str, Any]],
        agents: list[dict[str, Any]],
        tasks: list[dict[str, Any]],
        dag: dict[str, Any],
        decisions: list[dict[str, Any]],
        handoffs: list[dict[str, Any]],
        ledgers: dict[str, Any],
    ) -> None:
        self.status = status
        self.report = report
        self.summary = summary
        self.gates = gates
        self.agents = agents
        self.tasks = tasks
        self.dag = dag
        self.decisions = decisions
        self.handoffs = handoffs
        self.ledgers = ledgers


VALID_AGENT_IDS: set[str] = {
    "agent.refinement",
    "agent.architecture",
    "agent.database",
    "agent.backend",
    "agent.frontend",
    "agent.qa_release",
    "human_reviewer",
}


def _compute_directory_hash(root: Path) -> str:
    if not root.is_dir():
        return ""
    entries: list[tuple[str, str]] = []
    for path in sorted(root.rglob("*")):
        if path.is_file() and "node_modules" not in path.parts and "__pycache__" not in path.parts:
            rel = path.relative_to(root).as_posix()
            entries.append((rel, sha256_file(path)))
    digest = hashlib.sha256()
    for rel, file_hash in entries:
        digest.update(f"{rel}:{file_hash}\n".encode("utf-8"))
    return "sha256:" + digest.hexdigest()


def compute_baseline_hashes(project_root: Path) -> dict[str, str]:
    hashes: dict[str, str] = {}
    for name in SOURCE_NAMES:
        path = project_root / name
        if path.is_file():
            hashes[f"source:{name}"] = sha256_file(path)
        else:
            hashes[f"source:{name}"] = ""
    dev = project_root / "project" / "siged-lampa" / "sandboxes" / "DEV" / "workspace"
    qa = project_root / "project" / "siged-lampa" / "sandboxes" / "QA" / "workspace"
    v1 = project_root / "project" / "siged-lampa" / "versions" / "v0001"
    hashes["dev_workspace"] = _compute_directory_hash(dev)
    hashes["qa_workspace"] = _compute_directory_hash(qa)
    hashes["version_v0001"] = _compute_directory_hash(v1)
    return hashes


def _extract_findings_from_md(findings_path: Path) -> list[dict[str, str]]:
    results: list[dict[str, str]] = []
    if not findings_path.is_file():
        return results
    text = findings_path.read_text(encoding="utf-8", errors="replace")
    for line in text.splitlines():
        stripped = line.strip()
        if stripped.startswith("WARNING:"):
            results.append({"type": "WARNING", "message": stripped[len("WARNING:"):].strip()})
        elif stripped.startswith("BLOCKING:"):
            results.append({"type": "BLOCKING", "message": stripped[len("BLOCKING:"):].strip()})
    return results


def run_planning(
    project_root: Path,
    work_order: dict[str, Any],
    output_dir: Path,
    catalogs_dir: Path | None = None,
) -> dict[str, Any]:
    before_hashes = compute_baseline_hashes(project_root)

    project_id = work_order.get("project_id", "siged-lampa")
    project_version = work_order.get("project_version", "v0002")

    if catalogs_dir is None:
        catalogs_dir = project_root / "project" / project_id / "spec"

    catalogs: dict[str, Any] = {}
    try:
        if catalogs_dir.is_dir():
            catalogs = load_catalogs(catalogs_dir)
    except Exception:
        pass

    findings_path = catalogs_dir / "normalization-findings.md"
    findings = _extract_findings_from_md(findings_path)

    try:
        decisions_raw: list[ArchitectureDecision] = generate_decisions(
            project_root, work_order, catalogs, findings
        )
    except Exception as exc:
        raise PlanningError(f"generate_decisions failed: {exc}") from exc

    decision_errors = validate_decisions(decisions_raw)
    decisions_dict = decisions_to_dict(decisions_raw)

    agents = generate_agents()
    agent_errors = validate_agents(agents)

    tasks = generate_tasks()
    task_errors = validate_tasks(tasks, VALID_AGENT_IDS)

    source_hashes: dict[str, str] = {}
    for cat_data in catalogs.values():
        if isinstance(cat_data, dict) and "source_hashes" in cat_data:
            source_hashes.update(cat_data["source_hashes"])

    architecture = build_architecture(
        project_id=project_id,
        project_version=project_version,
        source_hashes=source_hashes,
        decisions=decisions_dict,
        agents=agents,
    )

    dag = build_dag(tasks)
    dag = validate_dag(dag, VALID_AGENT_IDS)

    handoffs = generate_handoffs()
    handoff_errors = validate_handoffs(handoffs, VALID_AGENT_IDS)

    ensure_dir(output_dir)

    generated_files: list[Path] = []
    generated_files.append(write_decisions(output_dir, decisions_raw))
    generated_files.append(write_architecture(output_dir, architecture))
    generated_files.append(write_agents(output_dir, agents))
    generated_files.append(write_contracts(output_dir))
    generated_files.append(write_tasks(output_dir, tasks))
    dag_path = output_dir / "task-dag.json"
    dag_path.write_text(
        json.dumps(dag, indent=2, ensure_ascii=False) + "\n",
        encoding="utf-8",
    )
    generated_files.append(dag_path)
    generated_files.append(write_handoffs(output_dir, handoffs))

    after_hashes = compute_baseline_hashes(project_root)

    gate_results = run_gates(
        catalogs=catalogs,
        findings=findings,
        decisions=decisions_dict,
        agents=agents,
        tasks=tasks,
        dag=dag,
        handoffs=handoffs,
        valid_agent_ids=VALID_AGENT_IDS,
        before_hashes=before_hashes,
        after_hashes=after_hashes,
    )

    generated_files.append(write_gate_results(output_dir, gate_results))

    run_id = sha256_text(
        stable_json({"project_id": project_id, "ts": datetime.now(timezone.utc).isoformat()})
    )[:16]

    ledger_entries = generate_ledger_entries_for_planning(
        run_id=run_id,
        decisions=decisions_dict,
        tasks=tasks,
        dag=dag,
        gates=gate_results,
    )

    generated_files.append(write_agent_ledger(output_dir, run_id, ledger_entries["agent_ledger_entries"]))
    generated_files.append(
        write_handoff_ledger(output_dir, run_id, ledger_entries["handoff_ledger_entries"])
    )
    generated_files.append(
        write_planning_ledger(output_dir, run_id, ledger_entries["planning_ledger_entries"])
    )

    baseline_preserved = before_hashes == after_hashes
    report = build_planning_report(
        project_id=project_id,
        project_version=project_version,
        decisions=decisions_dict,
        agents=agents,
        tasks=tasks,
        dag=dag,
        handoffs=handoffs,
        gates=gate_results,
        baseline_preserved=baseline_preserved,
        generated_files=[str(p.relative_to(output_dir)) for p in generated_files],
    )

    counts: dict[str, Any] = {
        "decisions": len(decisions_dict),
        "agents": len(agents),
        "tasks": len(tasks),
        "dag_nodes": len(dag.get("nodes", [])),
        "dag_edges": len(dag.get("edges", [])),
        "handoffs": len(handoffs),
        "gates": len(gate_results),
        "gates_passed": sum(1 for g in gate_results if g["passed"]),
    }
    summary = build_planning_summary(
        project_id=project_id,
        project_version=project_version,
        status=report["status"],
        counts=counts,
        gates=gate_results,
    )

    generated_files.append(write_planning_report(output_dir, report))
    generated_files.append(write_planning_summary(output_dir, summary))

    return {
        "status": report["status"],
        "run_id": run_id,
        "gates": gate_results,
        "report": report,
        "summary": summary,
        "generated_files": [str(p) for p in generated_files],
    }
