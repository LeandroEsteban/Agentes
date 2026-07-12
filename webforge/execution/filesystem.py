from __future__ import annotations

import hashlib
from pathlib import Path

from .permissions import resolve_authorized_path


def _sha256(content: str) -> str:
    return hashlib.sha256(content.encode("utf-8")).hexdigest()


def _safe(fn):
    def wrapper(*args, **kwargs):
        try:
            return fn(*args, **kwargs)
        except ValueError as e:
            return {"error": str(e), "blocked": True}
    return wrapper


@_safe
def read_file(root: Path, path: str | Path, max_chars: int | None = None) -> dict:
    resolved = resolve_authorized_path(root, path, "read")
    content = resolved.read_text(encoding="utf-8")
    if max_chars is not None and len(content) > max_chars:
        content = content[:max_chars]
    return {
        "content": content,
        "sha256": _sha256(content),
        "size_bytes": len(content.encode("utf-8")),
        "path": str(resolved),
    }


@_safe
def list_files(root: Path, directory: str | Path, pattern: str = "*") -> dict:
    resolved = resolve_authorized_path(root, directory, "read")
    files = []
    for entry in sorted(resolved.glob(pattern)):
        info = {
            "path": str(entry),
            "is_dir": entry.is_dir(),
        }
        if entry.is_file():
            content = entry.read_bytes()
            info["sha256"] = hashlib.sha256(content).hexdigest()
            info["size_bytes"] = len(content)
        else:
            info["sha256"] = ""
            info["size_bytes"] = 0
        files.append(info)
    return {"files": files, "count": len(files)}


@_safe
def search_files(root: Path, directory: str | Path, pattern: str = "**/*") -> dict:
    resolved = resolve_authorized_path(root, directory, "read")
    files = []
    for entry in sorted(resolved.glob(pattern)):
        info = {
            "path": str(entry),
            "is_dir": entry.is_dir(),
        }
        if entry.is_file():
            content = entry.read_bytes()
            info["sha256"] = hashlib.sha256(content).hexdigest()
            info["size_bytes"] = len(content)
        else:
            info["sha256"] = ""
            info["size_bytes"] = 0
        files.append(info)
    return {"files": files, "count": len(files)}


@_safe
def create_file(root: Path, path: str | Path, content: str) -> dict:
    resolved = resolve_authorized_path(root, path, "write")
    resolved.parent.mkdir(parents=True, exist_ok=True)
    resolved.write_text(content, encoding="utf-8")
    return {
        "path": str(resolved),
        "sha256": _sha256(content),
        "size_bytes": len(content.encode("utf-8")),
    }


@_safe
def replace_file(root: Path, path: str | Path, old_content: str, new_content: str) -> dict:
    resolved = resolve_authorized_path(root, path, "write")
    current = resolved.read_text(encoding="utf-8")
    before_sha = _sha256(current)
    count = current.count(old_content)
    if count == 0:
        raise ValueError(f"old_content not found in {resolved}")
    updated = current.replace(old_content, new_content, 1)
    resolved.write_text(updated, encoding="utf-8")
    after_sha = _sha256(updated)
    return {
        "path": str(resolved),
        "before_sha256": before_sha,
        "after_sha256": after_sha,
        "matches_found": 1,
    }


@_safe
def patch_file(root: Path, path: str | Path, old_content: str, new_content: str) -> dict:
    resolved = resolve_authorized_path(root, path, "write")
    current = resolved.read_text(encoding="utf-8")
    before_sha = _sha256(current)
    count = current.count(old_content)
    if count == 0:
        raise ValueError(f"old_content not found in {resolved}")
    if count > 1:
        raise ValueError(f"Ambiguous patch: old_content found {count} times in {resolved}")
    updated = current.replace(old_content, new_content)
    resolved.write_text(updated, encoding="utf-8")
    after_sha = _sha256(updated)
    return {
        "path": str(resolved),
        "before_sha256": before_sha,
        "after_sha256": after_sha,
        "matches_found": count,
    }


@_safe
def delete_file(root: Path, path: str | Path) -> dict:
    resolved = resolve_authorized_path(root, path, "write")
    sha_before = _sha256(resolved.read_text(encoding="utf-8"))
    resolved.unlink()
    return {
        "path": str(resolved),
        "sha256_before": sha_before,
    }


@_safe
def move_file(root: Path, source: str | Path, destination: str | Path) -> dict:
    src = resolve_authorized_path(root, source, "read")
    dst = resolve_authorized_path(root, destination, "write")
    sha = _sha256(src.read_text(encoding="utf-8"))
    dst.parent.mkdir(parents=True, exist_ok=True)
    src.rename(dst)
    return {
        "source": str(src),
        "destination": str(dst),
        "sha256": sha,
    }


@_safe
def create_directory(root: Path, path: str | Path) -> dict:
    resolved = resolve_authorized_path(root, path, "write")
    resolved.mkdir(parents=True, exist_ok=True)
    return {"path": str(resolved)}
