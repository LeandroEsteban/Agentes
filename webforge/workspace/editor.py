from __future__ import annotations

from pathlib import Path

from .changes import WorkspaceChange, _generate_change_id, _now_utc
from ..execution.permissions import resolve_authorized_path
from ..execution.filesystem import create_file, replace_file, patch_file, delete_file, move_file, create_directory


def get_prohibited_write_roots(project_root: Path) -> list[Path]:
    return [
        project_root / "versions" / "v0001",
        project_root / "Especificacion_Funcional_SIGED_Lampa.md",
        project_root / "Inventario_Endpoints_SIGED_Lampa.md",
        project_root / "Mapa_Pantallas_Navegacion_SIGED_Lampa.md",
        project_root / "Modelo_ER_Detallado_SIGED_Lampa.md",
        project_root / "project" / "siged-lampa" / "sandboxes" / "QA" / "workspace",
    ]


def edit_workspace(
    root: Path,
    operation: str,
    path: str,
    content: str = "",
    old_content: str = "",
    new_content: str = "",
    destination: str = "",
    authorized_root: Path | None = None,
    agent_id: str = "",
    task_id: str = "",
    run_id: str = "",
    cycle_id: str = "",
) -> dict:
    root = root.resolve()
    auth_root = (authorized_root or root).resolve()

    input_path = Path(path)
    if input_path.is_absolute():
        try:
            input_path.relative_to(auth_root)
        except ValueError:
            return {"error": f"Absolute path {path} is outside authorized root {auth_root}", "blocked": True}
        target = input_path
    else:
        target = root / path

    resolved_target = target.resolve()

    if operation in ("create", "replace", "patch", "delete", "move", "mkdir"):
        prohibited = get_prohibited_write_roots(root)
        for p in prohibited:
            try:
                resolved_target.relative_to(p.resolve())
                return {"error": f"Path {path} is in a prohibited write root: {p}", "blocked": True}
            except ValueError:
                continue

    change_id = _generate_change_id()
    rel_path = str(resolved_target.relative_to(root)) if resolved_target != root else path

    change = WorkspaceChange(
        change_id=change_id,
        run_id=run_id,
        cycle_id=cycle_id,
        task_id=task_id,
        agent_id=agent_id,
        operation=operation,
        path=rel_path,
        destination=destination,
        timestamp=_now_utc(),
    )

    _rel = target.relative_to(auth_root) if target.is_absolute() else path

    op_map = {
        "create": lambda: create_file(root, path, content),
        "replace": lambda: replace_file(root, path, old_content, new_content),
        "patch": lambda: patch_file(root, path, old_content, new_content),
        "delete": lambda: delete_file(root, path),
        "move": lambda: move_file(root, path, destination),
        "mkdir": lambda: create_directory(root, path),
    }

    fn = op_map.get(operation)
    if fn is None:
        return {"error": f"Unknown operation: {operation}", "blocked": True}

    result = fn()
    if result.get("error"):
        return result

    result["change_id"] = change_id
    result["operation"] = operation
    result["path"] = rel_path
    return result
