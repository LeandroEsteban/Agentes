"""Reproducible, read-only baseline evidence for the existing SIGED prototype."""
from __future__ import annotations

import hashlib
import json
import platform
import re
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SOURCE_NAMES = (
    "Especificacion_Funcional_SIGED_Lampa.md",
    "Inventario_Endpoints_SIGED_Lampa.md",
    "Mapa_Pantallas_Navegacion_SIGED_Lampa.md",
    "Modelo_ER_Detallado_SIGED_Lampa.md",
)


def write_file_manifest(root: Path, output: Path, suffix: str) -> dict[str, Any]:
    protected = _protected_roots(root)
    files = []
    for base in protected:
        if not base.exists():
            continue
        if base.is_file():
            paths = [base]
        else:
            paths = [path for path in base.rglob("*") if path.is_file() and _included(path)]
        for path in paths:
            files.append({"path": path.relative_to(root).as_posix(), "sha256": _sha256(path), "size_bytes": path.stat().st_size})
    payload = {
        "schema_version": "webforge.baseline_files.v1",
        "generated_at": _now(),
        "roots": [path.relative_to(root).as_posix() for path in protected],
        "files": sorted(files, key=lambda item: item["path"]),
    }
    _write(output / f"baseline-files-{suffix}.json", payload)
    return payload


def write_baseline_report(root: Path, output: Path) -> dict[str, Any]:
    workspace = root / "project" / "siged-lampa" / "sandboxes" / "DEV" / "workspace"
    commands = [
        ("python -m pytest", root, [sys.executable, "-m", "pytest"]),
        ("npm.cmd run verify" if platform.system() == "Windows" else "npm run verify", workspace, ["npm.cmd" if platform.system() == "Windows" else "npm", "run", "verify"]),
        ("npm.cmd run check:backend" if platform.system() == "Windows" else "npm run check:backend", workspace, ["npm.cmd" if platform.system() == "Windows" else "npm", "run", "check:backend"]),
        ("npm.cmd run check:frontend" if platform.system() == "Windows" else "npm run check:frontend", workspace, ["npm.cmd" if platform.system() == "Windows" else "npm", "run", "check:frontend"]),
        ("docker compose config --quiet", workspace, ["docker", "compose", "config", "--quiet"]),
    ]
    results = [_run(command, directory, argv, root) for command, directory, argv in commands]
    backend = workspace / "backend" / "src" / "server.js"
    endpoint_text = (root / "Inventario_Endpoints_SIGED_Lampa.md").read_text(encoding="utf-8")
    endpoint_rows = re.findall(r"\|\s*(API-\d{3})\s*\|\s*(GET|POST|PUT|PATCH|DELETE)\s*\|\s*`([^`]+)`", endpoint_text)
    endpoint_paths = [path for _, _, path in endpoint_rows]
    backend_text = backend.read_text(encoding="utf-8") if backend.exists() else ""
    implemented = sum(1 for _, method, path in endpoint_rows if f'req.method === "{method}" && url.pathname === "{path}"' in backend_text)
    report = {
        "schema_version": "webforge.baseline.v1",
        "generated_at": _now(),
        "repository": {"source_type": "zip", "git_available": False, "git_reason": "El proyecto fue descargado desde un archivo ZIP sin metadatos Git"},
        "environment": {"platform": platform.platform(), "python": sys.version.split()[0], "node": _version(["node", "--version"]), "npm": _version(["npm.cmd" if platform.system() == "Windows" else "npm", "--version"]), "docker": _version(["docker", "--version"]), "docker_compose_available": _version(["docker", "compose", "version"]) != "not_available"},
        "tests": results,
        "siged_baseline": {
            "dev_workspace_found": workspace.is_dir(), "qa_workspace_found": (root / "project/siged-lampa/sandboxes/QA/workspace").is_dir(),
            "qa_application_found": (root / "project/siged-lampa/sandboxes/QA/workspace/package.json").is_file(), "version_v0001_found": (root / "project/siged-lampa/versions/v0001").is_dir(),
            "backend_type": "node_http" if backend.exists() else "unknown", "frontend_type": "vanilla_javascript", "persistence_mode": "memory" if "const db =" in backend_text else "unknown",
            "declared_tables": len(re.findall(r"CREATE TABLE IF NOT EXISTS", (workspace / "db/schema.sql").read_text(encoding="utf-8") if (workspace / "db/schema.sql").exists() else "")),
            "catalogued_endpoints": len(endpoint_paths), "implemented_catalogued_endpoints": implemented,
        },
        "preexisting_limitations": ["No hay medicion de cobertura configurada.", "Las verificaciones Node y Docker son sintacticas/estructurales, no pruebas funcionales."],
    }
    _write(output / "baseline-report.json", report)
    return report


def compare_manifests(before: dict[str, Any], after: dict[str, Any], output: Path) -> dict[str, Any]:
    old = {item["path"]: item for item in before["files"]}
    new = {item["path"]: item for item in after["files"]}
    added = sorted(set(new) - set(old))
    deleted = sorted(set(old) - set(new))
    modified = sorted(path for path in set(old) & set(new) if old[path]["sha256"] != new[path]["sha256"])
    report = {"schema_version": "webforge.baseline_comparison.v1", "preserved": not (added or modified or deleted), "added": added, "modified": modified, "deleted": deleted, "unexpected_changes": added + modified + deleted}
    _write(output / "baseline-comparison.json", report)
    return report


def _protected_roots(root: Path) -> list[Path]:
    return [root / "project/siged-lampa/sandboxes/DEV/workspace", root / "project/siged-lampa/sandboxes/QA/workspace", root / "project/siged-lampa/versions/v0001", *[root / name for name in SOURCE_NAMES]]


def _included(path: Path) -> bool:
    return "node_modules" not in path.parts and "__pycache__" not in path.parts and path.suffix not in {".pyc", ".log"}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return "sha256:" + digest.hexdigest()


def _run(command: str, directory: Path, argv: list[str], root: Path) -> dict[str, Any]:
    started = time.monotonic()
    try:
        completed = subprocess.run(argv, cwd=directory, text=True, capture_output=True, timeout=120, check=False)
        stdout, stderr, code = completed.stdout, completed.stderr, completed.returncode
        status = "pass" if code == 0 else "fail"
    except (OSError, subprocess.TimeoutExpired) as exc:
        stdout, stderr, code, status = "", str(exc), None, "not_available"
    passed = len(re.findall(r"(\d+) passed", stdout))
    failed = len(re.findall(r"(\d+) failed", stdout))
    skipped = len(re.findall(r"(\d+) skipped", stdout))
    return {"command": command, "working_directory": directory.relative_to(root).as_posix(), "status": status, "exit_code": code, "duration_seconds": round(time.monotonic() - started, 3), "passed": int(re.search(r"(\d+) passed", stdout).group(1)) if passed else 0, "failed": int(re.search(r"(\d+) failed", stdout).group(1)) if failed else 0, "skipped": int(re.search(r"(\d+) skipped", stdout).group(1)) if skipped else 0, "stdout_summary": _summary(stdout), "stderr_summary": _summary(stderr), "notes": ["Verificacion estructural/sintactica cuando aplique; no implica cobertura funcional." if command != "python -m pytest" else "Suite de runtime Python."]}


def _version(argv: list[str]) -> str:
    try:
        return subprocess.run(argv, text=True, capture_output=True, timeout=20, check=False).stdout.strip() or "not_available"
    except OSError:
        return "not_available"


def _summary(value: str) -> str:
    return " ".join(value.strip().split())[:600]


def _now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def _write(path: Path, value: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=True, indent=2, sort_keys=True) + "\n", encoding="utf-8")
