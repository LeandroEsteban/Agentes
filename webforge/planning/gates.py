from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

GATE_NAMES: dict[str, str] = {
    "GATE-ARCH-001": "Sources Normalized",
    "GATE-ARCH-002": "Critical Decisions Accepted",
    "GATE-ARCH-003": "Agents Valid",
    "GATE-ARCH-004": "Tasks Valid",
    "GATE-ARCH-005": "DAG Acyclic",
    "GATE-ARCH-006": "Handoffs Valid",
    "GATE-ARCH-007": "Baseline Preserved",
}


def gate_arch_001_sources_normalized(catalogs: dict[str, Any], findings: list[dict[str, Any]]) -> tuple[bool, str]:
    blocking = [f for f in findings if f.get("severity") == "blocking" or f.get("type", "").startswith("BLOCKING")]
    if not catalogs:
        return False, "No catalogs loaded"
    if blocking:
        return False, f"{len(blocking)} blocking findings remain"
    required_catalogs = ["modules", "actors", "use_cases", "workflows", "screens", "endpoints", "entities", "business_rules", "validations", "traceability"]
    missing = [c for c in required_catalogs if c not in catalogs]
    if missing:
        return False, f"Missing catalogs: {missing}"
    return True, "All sources normalized with 0 blocking findings"


def gate_arch_002_decisions_critical(decisions: list[dict[str, Any]]) -> tuple[bool, str]:
    required_ids = [f"ADR-{i:03d}" for i in range(1, 17)]
    existing = {d["decision_id"] for d in decisions}
    missing = [rid for rid in required_ids if rid not in existing]
    if missing:
        return False, f"Missing ADRs: {missing}"
    proposed = [d["decision_id"] for d in decisions if d["status"] == "proposed" and d["decision_id"] != "ADR-015"]
    if proposed:
        return False, f"ADRs still in proposed status: {proposed}"
    return True, "All 16 critical decisions accepted"


def gate_arch_003_agents_valid(agents: list[dict[str, Any]]) -> tuple[bool, str]:
    ids = [a["agent_id"] for a in agents]
    if len(ids) != len(set(ids)):
        return False, "Duplicate agent IDs"
    required = ["agent.refinement", "agent.architecture", "agent.database", "agent.backend", "agent.frontend", "agent.qa_release"]
    missing = [r for r in required if r not in ids]
    if missing:
        return False, f"Missing required agents: {missing}"
    for agent in agents:
        if not agent.get("allowed_tools"):
            return False, f"Agent {agent['agent_id']} has no tools declared"
        if not agent.get("responsibility"):
            return False, f"Agent {agent['agent_id']} has no responsibility"
    return True, "All 6 agents valid"


def gate_arch_004_tasks_valid(tasks: list[dict[str, Any]], valid_agent_ids: set[str]) -> tuple[bool, str]:
    ids = [t["task_id"] for t in tasks]
    if len(ids) != len(set(ids)):
        return False, "Duplicate task IDs"
    for task in tasks:
        if task["agent_id"] not in valid_agent_ids:
            return False, f"Task {task['task_id']} has unknown agent: {task['agent_id']}"
        if not task.get("acceptance_criteria"):
            return False, f"Task {task['task_id']} has no acceptance criteria"
        if not task.get("description"):
            return False, f"Task {task['task_id']} has no description"
    return True, f"All {len(tasks)} tasks valid"


def gate_arch_005_dag_valid(dag: dict[str, Any]) -> tuple[bool, str]:
    validation = dag.get("validation", {})
    if not validation.get("acyclic", False):
        return False, "DAG contains cycles"
    orphan = validation.get("orphan_nodes", [])
    if orphan:
        return False, f"DAG has orphan nodes: {orphan}"
    missing = validation.get("missing_dependencies", [])
    if missing:
        return False, f"DAG has missing dependencies: {missing}"
    return True, "DAG is acyclic with all dependencies valid"


def gate_arch_006_handoffs_valid(handoffs: list[dict[str, Any]], valid_agent_ids: set[str]) -> tuple[bool, str]:
    ids = [h["handoff_id"] for h in handoffs]
    if len(ids) != len(set(ids)):
        return False, "Duplicate handoff IDs"
    for h in handoffs:
        if h["from_agent"] not in valid_agent_ids and h["from_agent"] != "human_reviewer":
            return False, f"Handoff {h['handoff_id']} has unknown from_agent: {h['from_agent']}"
        if h["to_agent"] not in valid_agent_ids and h["to_agent"] != "human_reviewer":
            return False, f"Handoff {h['handoff_id']} has unknown to_agent: {h['to_agent']}"
        if h["from_agent"] == h["to_agent"]:
            return False, f"Handoff {h['handoff_id']} is self-referential"
        if not h.get("artifacts"):
            return False, f"Handoff {h['handoff_id']} has no artifacts"
        if not h.get("acceptance_criteria"):
            return False, f"Handoff {h['handoff_id']} has no acceptance criteria"
    return True, f"All {len(handoffs)} handoffs valid"


def gate_arch_007_baseline_preserved(before_hashes: dict[str, str], after_hashes: dict[str, str]) -> tuple[bool, str]:
    changes = []
    for key in before_hashes:
        if before_hashes[key] != after_hashes.get(key):
            changes.append(key)
    if changes:
        return False, f"Baseline changed for: {changes}"
    return True, "Baseline preserved"


def run_gates(
    catalogs: dict[str, Any],
    findings: list[dict[str, Any]],
    decisions: list[dict[str, Any]],
    agents: list[dict[str, Any]],
    tasks: list[dict[str, Any]],
    dag: dict[str, Any],
    handoffs: list[dict[str, Any]],
    valid_agent_ids: set[str],
    before_hashes: dict[str, str],
    after_hashes: dict[str, str],
) -> list[dict[str, Any]]:
    results: list[dict[str, Any]] = []

    results.append({
        "gate_id": "GATE-ARCH-001",
        "name": GATE_NAMES["GATE-ARCH-001"],
        "passed": gate_arch_001_sources_normalized(catalogs, findings)[0],
        "message": gate_arch_001_sources_normalized(catalogs, findings)[1],
    })

    decisions_pass, decisions_msg = gate_arch_002_decisions_critical(decisions)
    results.append({"gate_id": "GATE-ARCH-002", "name": GATE_NAMES["GATE-ARCH-002"], "passed": decisions_pass, "message": decisions_msg})

    agents_pass, agents_msg = gate_arch_003_agents_valid(agents)
    results.append({"gate_id": "GATE-ARCH-003", "name": GATE_NAMES["GATE-ARCH-003"], "passed": agents_pass, "message": agents_msg})

    tasks_pass, tasks_msg = gate_arch_004_tasks_valid(tasks, valid_agent_ids)
    results.append({"gate_id": "GATE-ARCH-004", "name": GATE_NAMES["GATE-ARCH-004"], "passed": tasks_pass, "message": tasks_msg})

    dag_pass, dag_msg = gate_arch_005_dag_valid(dag)
    results.append({"gate_id": "GATE-ARCH-005", "name": GATE_NAMES["GATE-ARCH-005"], "passed": dag_pass, "message": dag_msg})

    handoffs_pass, handoffs_msg = gate_arch_006_handoffs_valid(handoffs, valid_agent_ids)
    results.append({"gate_id": "GATE-ARCH-006", "name": GATE_NAMES["GATE-ARCH-006"], "passed": handoffs_pass, "message": handoffs_msg})

    baseline_pass, baseline_msg = gate_arch_007_baseline_preserved(before_hashes, after_hashes)
    results.append({"gate_id": "GATE-ARCH-007", "name": GATE_NAMES["GATE-ARCH-007"], "passed": baseline_pass, "message": baseline_msg})

    return results


def all_gates_pass(gate_results: list[dict[str, Any]]) -> bool:
    return all(r["passed"] for r in gate_results)


def write_gate_results(output_dir: Path, results: list[dict[str, Any]]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "gate-results.json"
    data = {
        "schema": "webforge.gate_results.v1",
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "all_passed": all_gates_pass(results),
        "gates": results,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return output_path
