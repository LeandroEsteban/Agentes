from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from dataclasses import asdict, dataclass, field

from ..utils import append_jsonl, sha256_text, stable_json


CYCLE_POLICY = {
    "max_cycles": 3,
    "stop_on_same_error": 2,
    "rollback_on_unrecoverable_failure": True,
}


def compute_error_signature(command: str, exit_code: int | None, error_message: str, test_type: str = "") -> str:
    """Compute a reproducible error signature for cycle detection."""
    normalized_msg = " ".join(error_message.strip().split())[:200]
    raw = f"{command}|{exit_code}|{test_type}|{normalized_msg}"
    return sha256_text(raw)


@dataclass
class RepairCycle:
    schema_version: str = "webforge.repair_cycle.v1"
    run_id: str = ""
    task_id: str = ""
    cycle_number: int = 1
    failure_signature: str = ""
    diagnosis: str = ""
    repair_change_set: str = ""
    validation_result: str = ""
    status: str = "failed"


def run_repair_cycle(
    task_id: str,
    run_id: str,
    execute_fn: Callable[[], dict],
    validate_fn: Callable[[], dict],
    repair_fn: Callable[[str], dict],
    rollback_fn: Callable[[], dict] | None = None,
    output_dir: Path | None = None,
    max_cycles: int = 3,
) -> dict:
    """Execute a repair cycle: execute -> validate -> diagnose -> repair -> validate.
    
    Returns dict with cycles, status, ledgers.
    """
    cycles: list[RepairCycle] = []
    previous_signatures: list[str] = []
    
    for cycle_num in range(1, max_cycles + 1):
        # Execute
        exec_result = execute_fn()
        exec_status = exec_result.get("status", "failed")
        
        # Validate
        validation = validate_fn()
        val_status = validation.get("status", "failed")
        
        if val_status == "pass":
            cycles.append(RepairCycle(
                run_id=run_id, task_id=task_id, cycle_number=cycle_num,
                status="repaired", validation_result="pass",
            ))
            return {"status": "repaired", "cycles": [asdict(c) for c in cycles], "total_cycles": cycle_num}
        
        # Diagnose
        error_msg = validation.get("error", validation.get("stderr", "unknown error"))
        test_type = validation.get("test_type", "")
        signature = compute_error_signature(task_id, exec_result.get("exit_code"), error_msg, test_type)
        
        # Check for repeated signature
        if signature in previous_signatures:
            cycles.append(RepairCycle(
                run_id=run_id, task_id=task_id, cycle_number=cycle_num,
                failure_signature=signature,
                diagnosis="Same error signature repeated, stopping",
                status="stopped",
            ))
            if rollback_fn:
                rollback_fn()
            return {"status": "stopped_same_error", "cycles": [asdict(c) for c in cycles], "total_cycles": cycle_num}
        
        previous_signatures.append(signature)
        diagnosis = f"Cycle {cycle_num}: {error_msg[:200]}"
        
        # Repair
        repair_result = repair_fn(diagnosis)
        change_set_id = repair_result.get("change_set_id", "")
        
        cycles.append(RepairCycle(
            run_id=run_id, task_id=task_id, cycle_number=cycle_num,
            failure_signature=signature, diagnosis=diagnosis,
            repair_change_set=change_set_id,
            status="repaired" if repair_result.get("status") == "success" else "failed",
        ))
    
    # Max cycles reached without success
    if rollback_fn:
        rollback_fn()
    
    return {"status": "max_cycles_reached", "cycles": [asdict(c) for c in cycles], "total_cycles": max_cycles}


def write_repair_ledger(output_dir: Path, run_id: str, entries: list[dict]) -> Path:
    path = output_dir / "repair-ledger.jsonl"
    for entry in entries:
        append_jsonl(path, entry)
    return path
