from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def build_planning_report(
    project_id: str,
    project_version: str,
    decisions: list[dict[str, Any]],
    agents: list[dict[str, Any]],
    tasks: list[dict[str, Any]],
    dag: dict[str, Any],
    handoffs: list[dict[str, Any]],
    gates: list[dict[str, Any]],
    baseline_preserved: bool,
    generated_files: list[str],
) -> dict[str, Any]:
    decisions_total = len(decisions)
    decisions_accepted = len([d for d in decisions if d.get("status") == "accepted"])
    decisions_deferred = len([d for d in decisions if d.get("status") == "deferred"])
    decisions_proposed = len([d for d in decisions if d.get("status") == "proposed"])

    agents_total = len(agents)
    agents_valid = len([a for a in agents if a.get("agent_id") and a.get("allowed_tools") and a.get("responsibility")])

    tasks_total = len(tasks)
    tasks_by_agent: dict[str, int] = {}
    tasks_by_phase: dict[str, int] = {}
    tasks_by_priority: dict[str, int] = {}
    for t in tasks:
        tasks_by_agent[t["agent_id"]] = tasks_by_agent.get(t["agent_id"], 0) + 1
        tasks_by_phase[t["phase"]] = tasks_by_phase.get(t["phase"], 0) + 1
        tasks_by_priority[t["priority"]] = tasks_by_priority.get(t["priority"], 0) + 1

    dag_acyclic = dag.get("validation", {}).get("acyclic", False)
    dag_nodes = len(dag.get("nodes", []))
    dag_edges = len(dag.get("edges", []))
    dag_orphan = dag.get("validation", {}).get("orphan_nodes", [])

    handoffs_total = len(handoffs)
    handoffs_valid = len([h for h in handoffs if h.get("handoff_id") and h.get("from_agent") and h.get("to_agent")])

    all_pass = all(g.get("passed", False) for g in gates)
    status = "pass" if all_pass and baseline_preserved else "blocked"

    return {
        "schema_version": "webforge.planning_report.v1",
        "project_id": project_id,
        "project_version": project_version,
        "status": status,
        "decisions": {"total": decisions_total, "accepted": decisions_accepted, "deferred": decisions_deferred, "proposed": decisions_proposed},
        "agents": {"total": agents_total, "valid": agents_valid},
        "tasks": {"total": tasks_total, "by_agent": tasks_by_agent, "by_phase": tasks_by_phase, "by_priority": tasks_by_priority},
        "dag": {"acyclic": dag_acyclic, "nodes": dag_nodes, "edges": dag_edges, "orphan_nodes": dag_orphan},
        "handoffs": {"total": handoffs_total, "valid": handoffs_valid},
        "gates": [{"gate_id": g["gate_id"], "name": g["name"], "passed": g["passed"], "message": g["message"]} for g in gates],
        "baseline_preserved": baseline_preserved,
        "generated_files": generated_files,
    }


def build_planning_summary(
    project_id: str,
    project_version: str,
    status: str,
    counts: dict[str, Any],
    gates: list[dict[str, Any]],
) -> str:
    lines: list[str] = []
    lines.append(f"# Planning Summary: {project_id} v{project_version}")
    lines.append("")
    lines.append(f"**Status**: {status}")
    lines.append("")
    lines.append("## Counts")
    for key, value in counts.items():
        if isinstance(value, dict):
            lines.append(f"- **{key}**: {json.dumps(value)}")
        else:
            lines.append(f"- **{key}**: {value}")
    lines.append("")
    lines.append("## Gates")
    for g in gates:
        badge = "✅" if g.get("passed") else "❌"
        lines.append(f"- {badge} **{g['gate_id']}** ({g.get('name', '')}): {g.get('message', '')}")
    lines.append("")
    lines.append(f"*Generated at {datetime.now(timezone.utc).isoformat()}*")
    return "\n".join(lines)


def write_planning_report(output_dir: Path, report: dict[str, Any]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "planning-report.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    return output_path


def write_planning_summary(output_dir: Path, summary: str) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "planning-summary.md"
    with open(output_path, "w", encoding="utf-8") as f:
        f.write(summary)
    return output_path
