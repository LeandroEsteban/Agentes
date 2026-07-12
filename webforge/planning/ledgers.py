from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _write_jsonl(output_dir: Path, filename: str, entries: list[dict[str, Any]]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / filename
    with open(output_path, "a", encoding="utf-8") as f:
        for entry in entries:
            f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    return output_path


def write_agent_ledger(output_dir: Path, run_id: str, entries: list[dict[str, Any]]) -> Path:
    enriched = []
    for entry in entries:
        enriched.append({
            "schema": "webforge.agent_ledger.v1",
            "timestamp": entry.get("timestamp", _now()),
            "run_id": run_id,
            "cycle_id": entry.get("cycle_id", ""),
            "phase": entry.get("phase", ""),
            "agent_id": entry.get("agent_id", ""),
            "task_id": entry.get("task_id", ""),
            "event": entry.get("event", ""),
            "input_hashes": entry.get("input_hashes", {}),
            "output_artifacts": entry.get("output_artifacts", []),
            "gate": entry.get("gate", ""),
            "result": entry.get("result", ""),
        })
    return _write_jsonl(output_dir, "agent-ledger.jsonl", enriched)


def write_handoff_ledger(output_dir: Path, run_id: str, entries: list[dict[str, Any]]) -> Path:
    enriched = []
    for entry in entries:
        enriched.append({
            "schema": "webforge.handoff_ledger.v1",
            "timestamp": entry.get("timestamp", _now()),
            "run_id": run_id,
            "handoff_id": entry.get("handoff_id", ""),
            "task_id": entry.get("task_id", ""),
            "from_agent": entry.get("from_agent", ""),
            "to_agent": entry.get("to_agent", ""),
            "artifacts": entry.get("artifacts", []),
            "status": entry.get("status", "proposed"),
            "reasons": entry.get("reasons", []),
        })
    return _write_jsonl(output_dir, "handoff-ledger.jsonl", enriched)


def write_planning_ledger(output_dir: Path, run_id: str, entries: list[dict[str, Any]]) -> Path:
    enriched = []
    for entry in entries:
        enriched.append({
            "schema": "webforge.planning_ledger.v1",
            "timestamp": entry.get("timestamp", _now()),
            "run_id": run_id,
            "event": entry.get("event", ""),
            "detail": entry.get("detail", ""),
        })
    return _write_jsonl(output_dir, "planning-ledger.jsonl", enriched)


def generate_ledger_entries_for_planning(
    run_id: str,
    decisions: list[dict[str, Any]],
    tasks: list[dict[str, Any]],
    dag: dict[str, Any],
    gates: list[dict[str, Any]],
) -> dict[str, list[dict[str, Any]]]:
    ts = _now()

    agent_ledger_entries: list[dict[str, Any]] = [
        {
            "timestamp": ts,
            "run_id": run_id,
            "cycle_id": "planning-1",
            "phase": "planning",
            "agent_id": "agent.architecture",
            "task_id": "TASK-ARCH-001",
            "event": "completed",
            "input_hashes": {},
            "output_artifacts": ["decisions.json"],
            "gate": "",
            "result": "success",
        },
        {
            "timestamp": ts,
            "run_id": run_id,
            "cycle_id": "planning-1",
            "phase": "planning",
            "agent_id": "agent.architecture",
            "task_id": "TASK-ARCH-005",
            "event": "completed",
            "input_hashes": {},
            "output_artifacts": ["tasks.json"],
            "gate": "",
            "result": "success",
        },
        {
            "timestamp": ts,
            "run_id": run_id,
            "cycle_id": "planning-1",
            "phase": "planning",
            "agent_id": "agent.architecture",
            "task_id": "TASK-ARCH-006",
            "event": "completed",
            "input_hashes": {},
            "output_artifacts": ["task-dag.json"],
            "gate": "",
            "result": "success",
        },
        {
            "timestamp": ts,
            "run_id": run_id,
            "cycle_id": "planning-1",
            "phase": "planning",
            "agent_id": "agent.architecture",
            "task_id": "TASK-ARCH-008",
            "event": "completed",
            "input_hashes": {},
            "output_artifacts": ["gate-results.json"],
            "gate": "GATE-ARCH-ALL",
            "result": "success" if all(g.get("passed", False) for g in gates) else "failed",
        },
    ]

    handoff_ledger_entries: list[dict[str, Any]] = []

    planning_ledger_entries: list[dict[str, Any]] = [
        {"timestamp": ts, "run_id": run_id, "event": "decisions_created", "detail": f"{len(decisions)} ADRs created"},
        {"timestamp": ts, "run_id": run_id, "event": "tasks_created", "detail": f"{len(tasks)} tasks created"},
        {"timestamp": ts, "run_id": run_id, "event": "dependencies_created", "detail": f"{len(dag.get('edges', []))} dependencies created"},
        {"timestamp": ts, "run_id": run_id, "event": "dag_validated", "detail": f"acyclic={dag.get('validation', {}).get('acyclic', False)}"},
    ]

    for g in gates:
        planning_ledger_entries.append({
            "timestamp": ts,
            "run_id": run_id,
            "event": "gates",
            "detail": f"{g['gate_id']}: {'PASS' if g['passed'] else 'FAIL'} - {g['message']}",
        })

    return {
        "agent_ledger_entries": agent_ledger_entries,
        "handoff_ledger_entries": handoff_ledger_entries,
        "planning_ledger_entries": planning_ledger_entries,
    }
