from __future__ import annotations

import hashlib
from pathlib import Path

from ..execution.permissions import redact_sensitive


def validate_document_hashes(root: Path, expected_hashes: dict[str, str]) -> dict:
    mismatches = []
    for rel_path, expected_sha in expected_hashes.items():
        full_path = root / rel_path
        if not full_path.exists():
            mismatches.append({"path": rel_path, "error": "not_found", "expected_sha": expected_sha})
            continue
        actual_sha = hashlib.sha256(full_path.read_bytes()).hexdigest()
        if actual_sha != expected_sha:
            mismatches.append({
                "path": rel_path,
                "error": "hash_mismatch",
                "expected_sha": expected_sha,
                "actual_sha": actual_sha,
            })
    return {
        "status": "pass" if not mismatches else "mismatch",
        "mismatches": mismatches,
    }


def validate_workspace_integrity(root: Path, snapshot: dict | None = None) -> dict:
    root = root.resolve()
    errors = []
    warnings = []

    if not root.exists():
        errors.append("Workspace root does not exist")
        return {"status": "invalid", "errors": errors, "warnings": warnings}

    if not root.is_dir():
        errors.append("Workspace root is not a directory")
        return {"status": "invalid", "errors": errors, "warnings": warnings}

    key_files = [
        "README.md",
        "pyproject.toml",
        "setup.py",
        "setup.cfg",
        "package.json",
    ]

    found_any_key = False
    for kf in key_files:
        if (root / kf).exists():
            found_any_key = True
            break

    if not found_any_key:
        warnings.append("No standard project configuration file found (pyproject.toml, setup.py, etc.)")

    has_source = list(root.rglob("*.py")) or list(root.rglob("*.js")) or list(root.rglob("*.ts"))
    if not has_source:
        warnings.append("No source code files (.py, .js, .ts) found in workspace")

    if snapshot:
        actual = set()
        for entry in root.rglob("*"):
            if entry.is_file():
                actual.add(str(entry.relative_to(root).as_posix()))
        snapshot_paths = {f["path"] for f in snapshot.get("files", [])}
        extra = actual - snapshot_paths
        missing = snapshot_paths - actual
        if extra:
            warnings.append(f"{len(extra)} files exist but were not in snapshot")
        if missing:
            errors.append(f"{len(missing)} files from snapshot are missing from workspace")

    return {
        "status": "invalid" if errors else ("valid" if not warnings else "valid_with_warnings"),
        "errors": errors,
        "warnings": warnings,
    }


def check_secrets_in_workspace(root: Path) -> dict:
    findings = []
    for entry in root.rglob("*"):
        if not entry.is_file():
            continue
        try:
            text = entry.read_text(encoding="utf-8", errors="ignore")
        except Exception:
            continue
        rel = str(entry.relative_to(root).as_posix())
        _, count = redact_sensitive(text)
        if count > 0:
            findings.append({"path": rel, "secrets_found": count})

    return {
        "secrets_found": len(findings),
        "findings": findings,
    }
