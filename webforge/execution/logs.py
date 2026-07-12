from __future__ import annotations

from pathlib import Path

from ..utils import append_jsonl


def write_tool_ledger(output_dir: Path, entry: dict) -> Path:
    path = output_dir / "tool-ledger.jsonl"
    append_jsonl(path, entry)
    return path


def write_change_ledger(output_dir: Path, entry: dict) -> Path:
    path = output_dir / "change-ledger.jsonl"
    append_jsonl(path, entry)
    return path


def write_handoff_ledger(output_dir: Path, entry: dict) -> Path:
    path = output_dir / "handoff-ledger.jsonl"
    append_jsonl(path, entry)
    return path


def write_repair_ledger(output_dir: Path, entry: dict) -> Path:
    path = output_dir / "repair-ledger.jsonl"
    append_jsonl(path, entry)
    return path


def write_gate_evidence(output_dir: Path, entry: dict) -> Path:
    path = output_dir / "gate-evidence.jsonl"
    append_jsonl(path, entry)
    return path
