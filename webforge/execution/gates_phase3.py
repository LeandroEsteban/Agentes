from __future__ import annotations

from pathlib import Path
from typing import Any


def gate_tools_001_registry_valid(policies: list[dict]) -> tuple[bool, str]:
    """GATE-TOOLS-001: All tool registrations are valid."""
    ids = [p["tool_id"] for p in policies]
    if len(ids) != len(set(ids)):
        return False, f"Duplicate tool IDs: {[i for i in ids if ids.count(i) > 1]}"
    for p in policies:
        if not p.get("allowed_agents"):
            return False, f"Tool {p['tool_id']} has no allowed agents"
        if p.get("timeout_seconds", 0) <= 0:
            return False, f"Tool {p['tool_id']} has invalid timeout"
        if p.get("max_stdout_bytes", 0) <= 0:
            return False, f"Tool {p['tool_id']} has invalid max_stdout_bytes"
    return True, f"All {len(policies)} tools valid"


def gate_tools_002_permissions_effective(policies: list[dict], agent_id: str) -> tuple[bool, str]:
    """GATE-TOOLS-002: Unauthorized agent blocked."""
    for p in policies:
        if agent_id not in p["allowed_agents"]:
            return False, f"Agent {agent_id} not authorized for {p['tool_id']}"
    return True, f"Agent {agent_id} authorized for all tools"


def gate_tools_003_filesystem_secure(test_results: dict) -> tuple[bool, str]:
    """GATE-TOOLS-003: Filesystem traversal blocked."""
    checks = test_results.get("security_checks", {})
    if not checks.get("traversal_blocked"):
        return False, "Path traversal not blocked"
    if not checks.get("external_path_blocked"):
        return False, "External paths not blocked"
    if not checks.get("secrets_protected"):
        return False, "Secrets not protected"
    return True, "Filesystem security checks pass"


def gate_tools_004_execution_secure(test_results: dict) -> tuple[bool, str]:
    """GATE-TOOLS-004: Process execution is secure."""
    if not test_results.get("shell_false", True):
        return False, "shell=True is not allowed"
    if not test_results.get("allowlist_applied", True):
        return False, "Executable allowlist not applied"
    if not test_results.get("operators_blocked", True):
        return False, "Shell operators not blocked"
    return True, "Process execution security checks pass"


def gate_workspace_001_changes_traceable(test_results: dict) -> tuple[bool, str]:
    """GATE-WORKSPACE-001: All changes are traceable."""
    if not test_results.get("changes_recorded", False):
        return False, "Changes not recorded"
    if not test_results.get("hashes_recorded", False):
        return False, "Hashes not recorded"
    if not test_results.get("change_set_created", False):
        return False, "Change set not created"
    return True, "Workspace changes are traceable"


def gate_workspace_002_snapshot_rollback(test_results: dict) -> tuple[bool, str]:
    """GATE-WORKSPACE-002: Snapshot and rollback work."""
    if not test_results.get("snapshot_verified", False):
        return False, "Snapshot verification failed"
    if not test_results.get("rollback_restored_hashes", False):
        return False, "Rollback did not restore hashes"
    return True, "Snapshot and rollback verified"


def gate_workspace_003_promotion_controlled(test_results: dict) -> tuple[bool, str]:
    """GATE-WORKSPACE-003: Promotion is controlled."""
    if not test_results.get("clone_passed", False):
        return False, "Version clone failed"
    if not test_results.get("promotion_passed", False):
        return False, "DEV to QA promotion failed"
    return True, "Promotion controls verified"


def gate_repair_001_limited(test_results: dict) -> tuple[bool, str]:
    """GATE-REPAIR-001: Repair is limited."""
    if not test_results.get("max_cycles_enforced", False):
        return False, "Max cycles not enforced"
    if not test_results.get("same_error_stop_enforced", False):
        return False, "Same error stop not enforced"
    return True, "Repair limits verified"


def gate_baseline_001_preserved(before_hashes: dict, after_hashes: dict) -> tuple[bool, str]:
    """GATE-BASELINE-001: Baseline preserved."""
    changes = []
    for key in before_hashes:
        if before_hashes[key] != after_hashes.get(key):
            changes.append(key)
    if changes:
        return False, f"Baseline changed: {changes}"
    return True, "Baseline preserved"


def run_phase3_gates(policies: list[dict], agent_id: str, fs_test: dict, proc_test: dict, ws_test: dict, before_hashes: dict, after_hashes: dict) -> list[dict]:
    """Run all phase 3 gates and return results."""
    gates = []
    
    gates.append({"gate_id": "GATE-TOOLS-001", "name": "Registry Valid", "passed": True, "message": ""})
    g1_pass, g1_msg = gate_tools_001_registry_valid(policies)
    gates[-1]["passed"] = g1_pass
    gates[-1]["message"] = g1_msg
    
    gates.append({"gate_id": "GATE-TOOLS-002", "name": "Permissions Effective", "passed": True, "message": ""})
    g2_pass, g2_msg = gate_tools_002_permissions_effective(policies, agent_id)
    gates[-1]["passed"] = g2_pass
    gates[-1]["message"] = g2_msg
    
    gates.append({"gate_id": "GATE-TOOLS-003", "name": "Filesystem Secure", "passed": True, "message": ""})
    g3_pass, g3_msg = gate_tools_003_filesystem_secure(fs_test)
    gates[-1]["passed"] = g3_pass
    gates[-1]["message"] = g3_msg
    
    gates.append({"gate_id": "GATE-TOOLS-004", "name": "Execution Secure", "passed": True, "message": ""})
    g4_pass, g4_msg = gate_tools_004_execution_secure(proc_test)
    gates[-1]["passed"] = g4_pass
    gates[-1]["message"] = g4_msg
    
    gates.append({"gate_id": "GATE-WORKSPACE-001", "name": "Changes Traceable", "passed": True, "message": ""})
    g5_pass, g5_msg = gate_workspace_001_changes_traceable(ws_test)
    gates[-1]["passed"] = g5_pass
    gates[-1]["message"] = g5_msg
    
    gates.append({"gate_id": "GATE-WORKSPACE-002", "name": "Snapshot Rollback", "passed": True, "message": ""})
    g6_pass, g6_msg = gate_workspace_002_snapshot_rollback(ws_test)
    gates[-1]["passed"] = g6_pass
    gates[-1]["message"] = g6_msg
    
    gates.append({"gate_id": "GATE-WORKSPACE-003", "name": "Promotion Controlled", "passed": True, "message": ""})
    g7_pass, g7_msg = gate_workspace_003_promotion_controlled(ws_test)
    gates[-1]["passed"] = g7_pass
    gates[-1]["message"] = g7_msg
    
    gates.append({"gate_id": "GATE-REPAIR-001", "name": "Repair Limited", "passed": True, "message": ""})
    g8_pass, g8_msg = gate_repair_001_limited(ws_test)
    gates[-1]["passed"] = g8_pass
    gates[-1]["message"] = g8_msg
    
    gates.append({"gate_id": "GATE-BASELINE-001", "name": "Baseline Preserved", "passed": True, "message": ""})
    g9_pass, g9_msg = gate_baseline_001_preserved(before_hashes, after_hashes)
    gates[-1]["passed"] = g9_pass
    gates[-1]["message"] = g9_msg
    
    return gates
