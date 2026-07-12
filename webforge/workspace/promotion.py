from __future__ import annotations

import shutil
from dataclasses import dataclass, field
from pathlib import Path

from .snapshots import WorkspaceSnapshot, create_snapshot, snapshot_to_dict, EXCLUDED_DIRS, EXCLUDED_EXTS


@dataclass
class PromotionRequest:
    schema_version: str = "webforge.promotion_request.v1"
    promotion_id: str = ""
    run_id: str = ""
    source: str = ""
    destination: str = ""
    version: str = ""
    change_set_id: str = ""
    handoff_id: str = ""
    required_validations: list[str] = field(default_factory=list)
    status: str = "pending"


@dataclass
class PromotionResult:
    schema_version: str = "webforge.promotion_result.v1"
    promotion_id: str = ""
    status: str = "blocked"
    source_snapshot_id: str = ""
    dest_snapshot_before_id: str = ""
    files_promoted: int = 0
    validation_results: list[dict] = field(default_factory=list)
    manifest: dict = field(default_factory=dict)
    handoff_accepted: bool = False


def _should_copy(entry: Path, source: Path) -> bool:
    for part in entry.relative_to(source).parts:
        if part in EXCLUDED_DIRS:
            return False
    if entry.suffix in EXCLUDED_EXTS:
        return False
    return True


def _copy_tree(source: Path, dest: Path) -> int:
    count = 0
    dest.mkdir(parents=True, exist_ok=True)
    for entry in source.rglob("*"):
        rel = entry.relative_to(source)
        target = dest / rel
        if entry.is_dir():
            target.mkdir(parents=True, exist_ok=True)
        elif entry.is_file():
            if not _should_copy(entry, source):
                continue
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(entry, target)
            count += 1
    return count


def clone_version_to_dev(
    version_dir: Path,
    dev_dir: Path,
    require_approval_if_not_empty: bool = True,
    approved: bool = False,
) -> dict:
    dev_dir = dev_dir.resolve()
    version_dir = version_dir.resolve()

    if not dev_dir.exists():
        return {"status": "blocked", "reason": f"dev directory {dev_dir} does not exist"}

    if any(dev_dir.iterdir()):
        if require_approval_if_not_empty and not approved:
            return {"status": "blocked", "reason": "destination not empty requires approval"}

    if not version_dir.exists():
        return {"status": "blocked", "reason": f"version directory {version_dir} does not exist"}

    source_snapshot = create_snapshot(dev_dir) if any(dev_dir.iterdir()) else None
    files_copied = _copy_tree(version_dir, dev_dir)
    dest_snapshot = create_snapshot(dev_dir)

    return {
        "status": "success",
        "files_copied": files_copied,
        "source_snapshot": snapshot_to_dict(source_snapshot) if source_snapshot else None,
        "dest_snapshot": snapshot_to_dict(dest_snapshot),
    }


def promote_dev_to_qa(
    dev_dir: Path,
    qa_dir: Path,
    change_set_id: str = "",
    handoff_id: str = "",
    validations_passed: bool = True,
    handoff_accepted: bool = False,
) -> dict:
    dev_dir = dev_dir.resolve()
    qa_dir = qa_dir.resolve()

    if not dev_dir.exists() or not any(dev_dir.iterdir()):
        return {"status": "blocked", "reason": "dev directory does not exist or is empty"}

    if not change_set_id:
        return {"status": "blocked", "reason": "no change set"}

    if not validations_passed:
        return {"status": "blocked", "reason": "validations not passed"}

    qa_dir.mkdir(parents=True, exist_ok=True)

    dest_snapshot_before = create_snapshot(qa_dir) if any(qa_dir.iterdir()) else WorkspaceSnapshot()
    files_promoted = _copy_tree(dev_dir, qa_dir)
    dest_snapshot_after = create_snapshot(qa_dir)

    manifest = {
        "source": str(dev_dir),
        "destination": str(qa_dir),
        "files_promoted": files_promoted,
        "change_set_id": change_set_id,
        "handoff_id": handoff_id,
        "dest_snapshot_before_id": dest_snapshot_before.snapshot_id,
        "dest_snapshot_after_id": dest_snapshot_after.snapshot_id,
    }

    return {
        "status": "success",
        "files_promoted": files_promoted,
        "dest_snapshot_before_id": dest_snapshot_before.snapshot_id,
        "dest_snapshot_after_id": dest_snapshot_after.snapshot_id,
        "dest_snapshot_before": snapshot_to_dict(dest_snapshot_before),
        "dest_snapshot_after": snapshot_to_dict(dest_snapshot_after),
        "manifest": manifest,
    }
