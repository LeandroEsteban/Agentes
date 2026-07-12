from __future__ import annotations

import hashlib
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from pathlib import Path


EXCLUDED_DIRS = {"node_modules", "__pycache__", ".git", ".venv", "venv", ".mypy_cache", ".pytest_cache", ".coverage"}
EXCLUDED_EXTS = {".pyc", ".pyo", ".log", ".tmp", ".swp", ".DS_Store"}


@dataclass
class WorkspaceSnapshot:
    schema_version: str = "webforge.workspace_snapshot.v1"
    snapshot_id: str = ""
    run_id: str = ""
    task_id: str = ""
    root: str = ""
    created_at: str = ""
    files: list[dict] = field(default_factory=list)
    archive_path: str = ""
    manifest_hash: str = ""


def _file_info(root: Path, file_path: Path) -> dict:
    rel = file_path.relative_to(root)
    sha = hashlib.sha256(file_path.read_bytes()).hexdigest()
    size = file_path.stat().st_size
    return {"path": str(rel.as_posix()), "sha256": sha, "size_bytes": size}


def _walk_excluded(root: Path, entry: Path) -> bool:
    for part in entry.relative_to(root).parts:
        if part in EXCLUDED_DIRS:
            return True
    return False


def create_snapshot(root_dir: Path, run_id: str = "", task_id: str = "") -> WorkspaceSnapshot:
    root_dir = root_dir.resolve()
    files = []
    for entry in sorted(root_dir.rglob("*")):
        if not entry.is_file():
            continue
        if entry.suffix in EXCLUDED_EXTS:
            continue
        if _walk_excluded(root_dir, entry):
            continue
        files.append(_file_info(root_dir, entry))

    manifest_hash = hashlib.sha256(
        json.dumps(files, ensure_ascii=False, sort_keys=True).encode("utf-8")
    ).hexdigest()

    snapshot_id = hashlib.sha256(
        (str(root_dir) + "_" + str(datetime.now(timezone.utc).timestamp())).encode("utf-8")
    ).hexdigest()[:16]

    return WorkspaceSnapshot(
        snapshot_id=snapshot_id,
        run_id=run_id,
        task_id=task_id,
        root=str(root_dir),
        created_at=datetime.now(timezone.utc).isoformat(),
        files=files,
        manifest_hash=manifest_hash,
    )


def snapshot_to_dict(snapshot: WorkspaceSnapshot) -> dict:
    return asdict(snapshot)


def snapshot_from_dict(data: dict) -> WorkspaceSnapshot:
    return WorkspaceSnapshot(**data)


def verify_snapshot(root_dir: Path, snapshot: WorkspaceSnapshot, strict: bool = True) -> dict:
    root_dir = root_dir.resolve()
    snapshot_files = {f["path"]: f for f in snapshot.files}
    current_files = {}

    for entry in sorted(root_dir.rglob("*")):
        if not entry.is_file():
            continue
        if entry.suffix in EXCLUDED_EXTS:
            continue
        if _walk_excluded(root_dir, entry):
            continue
        rel = str(entry.relative_to(root_dir).as_posix())
        sha = hashlib.sha256(entry.read_bytes()).hexdigest()
        size = entry.stat().st_size
        current_files[rel] = {"sha256": sha, "size_bytes": size}

    matched = []
    missing = []
    modified = []
    unexpected = []

    for rel, info in snapshot_files.items():
        if rel not in current_files:
            missing.append(rel)
        elif current_files[rel]["sha256"] != info["sha256"]:
            modified.append(rel)
        else:
            matched.append(rel)

    for rel in current_files:
        if rel not in snapshot_files:
            unexpected.append(rel)

    is_match = len(missing) == 0 and len(modified) == 0 and len(unexpected) == 0
    if is_match:
        status = "match"
    else:
        status = "mismatch"

    return {
        "matched": matched,
        "missing": missing,
        "unexpected": unexpected,
        "modified": modified,
        "status": status,
    }


def restore_snapshot(root_dir: Path, snapshot: WorkspaceSnapshot, change_log_path: Path | None = None) -> dict:
    root_dir = root_dir.resolve()
    verify_result = verify_snapshot(root_dir, snapshot, strict=False)
    needs_backup = not snapshot.archive_path or not Path(snapshot.archive_path).exists()
    actions = []

    for rel in verify_result["missing"]:
        actions.append({"action": "create", "path": rel, "source": "manifest"})
    for rel in verify_result["modified"]:
        actions.append({"action": "overwrite", "path": rel, "source": "manifest"})
    for rel in verify_result["unexpected"]:
        actions.append({"action": "delete", "path": rel})

    return {
        "status": "needs_backup" if needs_backup else "ready",
        "snapshot_id": snapshot.snapshot_id,
        "actions": actions,
        "actions_required": len(actions),
        "verify_result": verify_result,
        "change_log_path": str(change_log_path) if change_log_path else None,
    }


def write_snapshot(output_dir: Path, snapshot: WorkspaceSnapshot) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    path = output_dir / f"snapshot_{snapshot.snapshot_id}.json"
    with open(path, "w", encoding="utf-8") as f:
        json.dump(snapshot_to_dict(snapshot), f, ensure_ascii=False, indent=2, default=str)
    return path


def read_snapshot(path: Path) -> WorkspaceSnapshot:
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    return snapshot_from_dict(data)
