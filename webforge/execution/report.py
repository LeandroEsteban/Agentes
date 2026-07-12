from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from ..utils import write_json, write_text


def build_execution_capabilities_report(
    tools: list[dict],
    fs_test: dict,
    proc_test: dict,
    ws_test: dict,
    handoff_test: dict,
    repair_test: dict,
    gates: list[dict],
    baseline_preserved: bool,
) -> dict:
    """Build execution capabilities report."""
    return {
        "schema_version": "webforge.execution_capabilities_report.v1",
        "status": "pass" if all(g.get("passed", False) for g in gates) else "blocked",
        "tools": {
            "registered": len(tools),
            "valid": len(tools),
        },
        "filesystem": {
            "operations_tested": fs_test.get("operations_tested", []),
            "security_checks_passed": fs_test.get("security_checks_passed", 0),
        },
        "process": {
            "executables_allowlisted": proc_test.get("executables_allowlisted", []),
            "timeouts_verified": proc_test.get("timeouts_verified", False),
            "truncation_verified": proc_test.get("truncation_verified", False),
        },
        "workspace": {
            "snapshot_passed": ws_test.get("snapshot_passed", False),
            "rollback_passed": ws_test.get("rollback_passed", False),
            "promotion_fixture_passed": ws_test.get("promotion_fixture_passed", False),
        },
        "handoffs": {
            "execution_handoffs_tested": handoff_test.get("tested", 0),
            "accepted": handoff_test.get("accepted", 0),
            "rejected": handoff_test.get("rejected", 0),
        },
        "repair": {
            "cycles_tested": repair_test.get("cycles_tested", 0),
            "max_cycles_enforced": repair_test.get("max_cycles_enforced", False),
            "same_error_stop_enforced": repair_test.get("same_error_stop_enforced", False),
        },
        "gates": gates,
        "baseline_preserved": baseline_preserved,
    }


def build_execution_capabilities_summary(report: dict) -> str:
    """Build human-readable summary."""
    lines = [
        "# Execution Capabilities Summary",
        "",
        f"**Status**: {report['status']}",
        "",
        "## Tools",
        f"- Registered: {report['tools']['registered']}",
        f"- Valid: {report['tools']['valid']}",
        "",
        "## Filesystem",
        f"- Operations tested: {report['filesystem']['operations_tested']}",
        f"- Security checks passed: {report['filesystem']['security_checks_passed']}",
        "",
        "## Process",
        f"- Allowlisted executables: {report['process']['executables_allowlisted']}",
        f"- Timeouts verified: {report['process']['timeouts_verified']}",
        f"- Truncation verified: {report['process']['truncation_verified']}",
        "",
        "## Workspace",
        f"- Snapshot: {'PASS' if report['workspace']['snapshot_passed'] else 'FAIL'}",
        f"- Rollback: {'PASS' if report['workspace']['rollback_passed'] else 'FAIL'}",
        f"- Promotion: {'PASS' if report['workspace']['promotion_fixture_passed'] else 'FAIL'}",
        "",
        "## Handoffs",
        f"- Tested: {report['handoffs']['execution_handoffs_tested']}",
        f"- Accepted: {report['handoffs']['accepted']}",
        f"- Rejected: {report['handoffs']['rejected']}",
        "",
        "## Repair",
        f"- Cycles tested: {report['repair']['cycles_tested']}",
        f"- Max cycles enforced: {report['repair']['max_cycles_enforced']}",
        f"- Same error stop: {report['repair']['same_error_stop_enforced']}",
        "",
        "## Gates",
    ]
    for g in report.get("gates", []):
        icon = "PASS" if g.get("passed") else "FAIL"
        lines.append(f"- {icon} {g['gate_id']}: {g['message']}")
    lines.append("")
    lines.append(f"**Baseline preserved**: {report['baseline_preserved']}")
    return "\n".join(lines)


def write_execution_capabilities_report(output_dir: Path, report: dict, summary: str) -> tuple[Path, Path]:
    report_path = output_dir / "execution-capabilities-report.json"
    summary_path = output_dir / "execution-capabilities-summary.md"
    write_json(report_path, report)
    write_text(summary_path, summary)
    return report_path, summary_path
