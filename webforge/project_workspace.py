from __future__ import annotations

import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from .models import WorkOrder
from .utils import ensure_dir, sha256_file, sha256_text, stable_json, write_json, write_text


PROJECT_ROOT_NAME = "project"
SANDBOXES = ("DEV", "QA")
FRONTEND_TEMPLATE_NAME = "PLANTILLA_FRONTEND"
FRONTEND_TEMPLATE_REQUIRED_FILES = (
    "README.md",
    "AGENTS.md",
    "HANDOFF-REACT.md",
    "Intranet Agora.dc.html",
)


def sanitize_project_id(value: str) -> str:
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", value.strip().lower()).strip("-._")
    return cleaned[:80] or "default-project"


def normalize_version(value: str) -> str:
    raw = value.strip().lower()
    if not raw:
        return "v0001"
    if re.fullmatch(r"v[0-9]{4}", raw):
        return raw
    if re.fullmatch(r"[0-9]+", raw):
        return f"v{int(raw):04d}"
    cleaned = re.sub(r"[^a-zA-Z0-9._-]+", "-", raw).strip("-._")
    return cleaned or "v0001"


@dataclass(frozen=True)
class SandboxInfo:
    name: str
    sandbox_id: str
    path: Path
    clone_source: Path
    version: str
    memory_path: Path
    learning_path: Path
    frontend_template_source: Path
    frontend_template_hash: str

    def to_dict(self, root: Path) -> dict[str, str]:
        return {
            "name": self.name,
            "sandbox_id": self.sandbox_id,
            "path": self.path.relative_to(root).as_posix(),
            "clone_source": self.clone_source.relative_to(root).as_posix(),
            "version": self.version,
            "memory_path": self.memory_path.relative_to(root).as_posix(),
            "learning_path": self.learning_path.relative_to(root).as_posix(),
            "frontend_template": FRONTEND_TEMPLATE_NAME,
            "frontend_template_source": self.frontend_template_source.relative_to(root).as_posix(),
            "frontend_template_hash": self.frontend_template_hash,
            "frontend_template_required": "true",
            "autonomous": "true",
            "shared_with_factory": "false",
        }


class ProjectWorkspace:
    def __init__(self, factory_root: Path, work_order: WorkOrder) -> None:
        self.factory_root = factory_root.resolve()
        objective_slug = sanitize_project_id(work_order.objective.split(".")[0])
        self.project_id = sanitize_project_id(work_order.project_id or objective_slug)
        self.version = normalize_version(work_order.project_version)
        self.frontend_template_root = self.factory_root / FRONTEND_TEMPLATE_NAME
        self.frontend_template_hash = self._frontend_template_hash()
        self.root = self.factory_root / PROJECT_ROOT_NAME / self.project_id
        self.version_root = self.root / "versions" / self.version
        self.memory_root = self.root / "memory"
        self.learning_root = self.root / "learning"
        self.sandbox_root = self.root / "sandboxes"
        self.sandboxes = [
            SandboxInfo(
                name=name,
                sandbox_id=f"{self.project_id}-{name.lower()}-{self.version}",
                path=self.sandbox_root / name,
                clone_source=self.version_root,
                version=self.version,
                memory_path=self.sandbox_root / name / "memory",
                learning_path=self.sandbox_root / name / "learning",
                frontend_template_source=self.frontend_template_root,
                frontend_template_hash=self.frontend_template_hash,
            )
            for name in SANDBOXES
        ]

    def prepare(self, output_dir: Path) -> dict[str, Any]:
        for path in [self.root, self.version_root, self.memory_root, self.learning_root, self.sandbox_root]:
            ensure_dir(path)
        self._write_root_policy()
        self._write_version_manifest()
        for sandbox in self.sandboxes:
            self._prepare_sandbox(sandbox)
        policy = self.policy_dict()
        write_json(output_dir / "project-manifest.json", self.manifest_dict())
        write_json(output_dir / "project-sandboxes.json", self.sandbox_manifest())
        write_json(output_dir / "project-memory-policy.json", self.memory_policy_dict())
        write_json(output_dir / "frontend-template-manifest.json", self.frontend_template_manifest())
        write_text(output_dir / "project-isolation-policy.md", self.policy_markdown())
        write_text(output_dir / "frontend-template-policy.md", self.frontend_template_policy_markdown())
        return policy

    def mirror_sources(self, sources: list[Path], output_dir: Path) -> dict[str, Any]:
        project_sources_root = ensure_dir(self.root / "sources")
        version_sources_root = ensure_dir(self.version_root / "sources")
        mirrored: list[dict[str, str]] = []
        for source in sources:
            if not source.exists() or not source.is_file():
                continue
            target_project = project_sources_root / source.name
            target_version = version_sources_root / source.name
            content = source.read_text(encoding="utf-8", errors="replace")
            write_text(target_project, content)
            write_text(target_version, content)
            mirrored.append(
                {
                    "source_name": source.name,
                    "original_path": source.as_posix(),
                    "project_copy": target_project.relative_to(self.factory_root).as_posix(),
                    "version_copy": target_version.relative_to(self.factory_root).as_posix(),
                    "sha256": sha256_file(source),
                }
            )
        manifest = {
            "policy_id": "webforge.source_mirror.v1",
            "project_id": self.project_id,
            "version": self.version,
            "source_count": len(mirrored),
            "sources": mirrored,
        }
        write_json(project_sources_root / "sources-manifest.json", manifest)
        write_json(version_sources_root / "sources-manifest.json", manifest)
        write_json(output_dir / "source-mirror-manifest.json", manifest)
        return manifest

    def policy_dict(self) -> dict[str, Any]:
        return {
            "policy_id": "webforge.project_isolation.v1",
            "project_root_name": PROJECT_ROOT_NAME,
            "project_id": self.project_id,
            "project_root": self.root.relative_to(self.factory_root).as_posix(),
            "version": self.version,
            "rules": {
                "all_project_work_must_stay_under_project_root": True,
                "factory_memory_read_allowed": False,
                "factory_learning_write_allowed": False,
                "project_memory_shared_with_factory": False,
                "sandbox_dev_required": True,
                "sandbox_qa_required": True,
                "sandbox_dev_and_qa_must_be_independent": True,
                "sandbox_clone_source": self.version_root.relative_to(self.factory_root).as_posix(),
                "incremental_versions_root": (self.root / "versions").relative_to(self.factory_root).as_posix(),
                "frontend_template_required": True,
                "frontend_template_name": FRONTEND_TEMPLATE_NAME,
                "frontend_template_source": self.frontend_template_root.relative_to(self.factory_root).as_posix(),
                "frontend_template_hash": self.frontend_template_hash,
            },
        }

    def manifest_dict(self) -> dict[str, Any]:
        return {
            "project_id": self.project_id,
            "project_root": self.root.relative_to(self.factory_root).as_posix(),
            "current_version": self.version,
            "memory_root": self.memory_root.relative_to(self.factory_root).as_posix(),
            "learning_root": self.learning_root.relative_to(self.factory_root).as_posix(),
            "versions_root": (self.root / "versions").relative_to(self.factory_root).as_posix(),
            "sandboxes_root": self.sandbox_root.relative_to(self.factory_root).as_posix(),
            "frontend_template": self.frontend_template_manifest(),
            "shared_with_factory": False,
        }

    def frontend_template_manifest(self) -> dict[str, Any]:
        return {
            "template_name": FRONTEND_TEMPLATE_NAME,
            "mandatory": True,
            "source": self.frontend_template_root.relative_to(self.factory_root).as_posix(),
            "hash": self.frontend_template_hash,
            "required_files": list(FRONTEND_TEMPLATE_REQUIRED_FILES),
            "applies_to": "all_projects_all_versions_all_sandboxes",
        }

    def sandbox_manifest(self) -> dict[str, Any]:
        return {
            "project_id": self.project_id,
            "current_version": self.version,
            "clone_source_hash": sha256_text(stable_json({"project_id": self.project_id, "version": self.version})),
            "sandboxes": [sandbox.to_dict(self.factory_root) for sandbox in self.sandboxes],
        }

    def memory_policy_dict(self) -> dict[str, Any]:
        return {
            "project_id": self.project_id,
            "mode": "project_scoped_propose_only",
            "factory_memory_read_allowed": False,
            "factory_learning_write_allowed": False,
            "shared_with_factory": False,
            "project_memory_root": self.memory_root.relative_to(self.factory_root).as_posix(),
            "project_learning_root": self.learning_root.relative_to(self.factory_root).as_posix(),
            "sandbox_memory_roots": {
                sandbox.name: sandbox.memory_path.relative_to(self.factory_root).as_posix() for sandbox in self.sandboxes
            },
        }

    def validate(self) -> tuple[bool, list[str]]:
        errors: list[str] = []
        if self.root.parent.name != PROJECT_ROOT_NAME:
            errors.append("project root must be under project/<project_id>")
        if not self.frontend_template_root.exists():
            errors.append(f"missing required {FRONTEND_TEMPLATE_NAME}")
        for required_file in FRONTEND_TEMPLATE_REQUIRED_FILES:
            if not (self.frontend_template_root / required_file).exists():
                errors.append(f"missing {FRONTEND_TEMPLATE_NAME}/{required_file}")
        for required in [self.root, self.version_root, self.memory_root, self.learning_root]:
            if not required.exists():
                errors.append(f"missing {required}")
        if not (self.root / "frontend-template-manifest.json").exists():
            errors.append("missing project frontend-template-manifest.json")
        if not (self.version_root / "frontend" / "PLANTILLA_FRONTEND.md").exists():
            errors.append("missing version frontend template binding")
        sandbox_paths = [sandbox.path for sandbox in self.sandboxes]
        if len(set(sandbox_paths)) != len(SANDBOXES):
            errors.append("DEV and QA sandbox paths must be different")
        for sandbox in self.sandboxes:
            if not sandbox.path.exists():
                errors.append(f"missing sandbox {sandbox.name}")
            if not sandbox.memory_path.exists():
                errors.append(f"missing sandbox memory {sandbox.name}")
            if not sandbox.learning_path.exists():
                errors.append(f"missing sandbox learning {sandbox.name}")
            if not (sandbox.path / "frontend-template-manifest.json").exists():
                errors.append(f"missing sandbox frontend template manifest {sandbox.name}")
            if not (sandbox.path / "workspace" / "PLANTILLA_FRONTEND.md").exists():
                errors.append(f"missing sandbox frontend template binding {sandbox.name}")
            if sandbox.path == self.root or sandbox.path == self.version_root:
                errors.append(f"sandbox {sandbox.name} is not isolated from project root/version")
        return not errors, errors

    def policy_markdown(self) -> str:
        return "\n".join(
            [
                "# Project isolation policy",
                "",
                "Esta politica es obligatoria para todos los proyectos WEBFORGE.",
                "",
                "- Todo proyecto vive bajo `project/<project_id>/`.",
                "- Ningun proyecto lee memoria ni aprendizaje persistente de la fabrica.",
                "- Ningun aprendizaje de proyecto se escribe en la memoria de la fabrica.",
                "- Cada proyecto tiene `sandboxes/DEV` y `sandboxes/QA` autonomos.",
                "- DEV y QA son clones independientes de `versions/<version>`.",
                "- Todo proyecto y sandbox usa obligatoriamente `PLANTILLA_FRONTEND`.",
                "- Las pruebas incrementales salen de versiones `v0001`, `v0002`, ... dentro del proyecto.",
                "- Si falta DEV, QA, memoria aislada, version o `PLANTILLA_FRONTEND`, el gate falla.",
            ]
        )

    def frontend_template_policy_markdown(self) -> str:
        return "\n".join(
            [
                "# Frontend template policy",
                "",
                f"`{FRONTEND_TEMPLATE_NAME}` es obligatoria para todos los proyectos WEBFORGE.",
                "",
                "- Ningun proyecto puede crear frontend desde una plantilla distinta.",
                "- Todo sandbox DEV y QA debe declarar la misma plantilla y hash.",
                "- Las versiones incrementales deben clonar desde `versions/<version>` manteniendo esta plantilla.",
                "- Si falta la plantilla, sus archivos requeridos o sus manifiestos, el gate `frontend_template` falla.",
            ]
        )

    def _write_root_policy(self) -> None:
        write_text(self.factory_root / PROJECT_ROOT_NAME / "README.md", self.policy_markdown())
        write_json(self.root / "project-manifest.json", self.manifest_dict())
        write_json(self.root / "project-memory-policy.json", self.memory_policy_dict())
        write_json(self.root / "frontend-template-manifest.json", self.frontend_template_manifest())

    def _write_version_manifest(self) -> None:
        write_json(
            self.version_root / "version-manifest.json",
            {
                "project_id": self.project_id,
                "version": self.version,
                "purpose": "immutable clone source for DEV and QA sandboxes",
                "shared_with_factory": False,
            },
        )
        write_text(
            self.version_root / "README.md",
            f"# {self.project_id} {self.version}\n\nFuente local para clonar DEV y QA sin compartir memoria con la fabrica.\n",
        )
        ensure_dir(self.version_root / "frontend")
        write_text(
            self.version_root / "frontend" / "PLANTILLA_FRONTEND.md",
            "\n".join(
                [
                    "# PLANTILLA_FRONTEND",
                    "",
                    "Frontend obligatorio para esta version.",
                    f"Source: `{self.frontend_template_root.relative_to(self.factory_root)}`",
                    f"Hash: `{self.frontend_template_hash}`",
                ]
            ),
        )
        write_json(self.version_root / "frontend" / "frontend-template-manifest.json", self.frontend_template_manifest())

    def _prepare_sandbox(self, sandbox: SandboxInfo) -> None:
        for path in [sandbox.path, sandbox.memory_path, sandbox.learning_path, sandbox.path / "workspace"]:
            ensure_dir(path)
        manifest = sandbox.to_dict(self.factory_root)
        manifest["clone_mode"] = "independent_local_clone"
        manifest["factory_memory_read_allowed"] = "false"
        manifest["factory_learning_write_allowed"] = "false"
        write_json(sandbox.path / "sandbox-manifest.json", manifest)
        write_json(sandbox.path / "frontend-template-manifest.json", self.frontend_template_manifest())
        write_text(
            sandbox.path / "workspace" / "README.md",
            f"# {sandbox.name} sandbox\n\nClone autonomo de `{self.project_id}` `{self.version}`.\n",
        )
        write_text(
            sandbox.path / "workspace" / "PLANTILLA_FRONTEND.md",
            "\n".join(
                [
                    "# PLANTILLA_FRONTEND",
                    "",
                    f"Sandbox: {sandbox.name}",
                    "Uso: obligatorio.",
                    f"Source: `{self.frontend_template_root.relative_to(self.factory_root)}`",
                    f"Hash: `{self.frontend_template_hash}`",
                ]
            ),
        )
        write_text(
            sandbox.memory_path / "README.md",
            f"# {sandbox.name} memory\n\nMemoria privada del sandbox. No se comparte con la fabrica ni con otros proyectos.\n",
        )
        write_text(
            sandbox.learning_path / "Aprendizaje.md",
            f"# Aprendizaje {sandbox.name}\n\nAprendizaje privado del sandbox. Estado inicial limpio.\n",
        )

    def _frontend_template_hash(self) -> str:
        if not self.frontend_template_root.exists():
            return "sha256:missing"
        items: list[dict[str, str]] = []
        for path in sorted(self.frontend_template_root.rglob("*")):
            if path.is_dir() or path.name == ".DS_Store":
                continue
            rel = str(path.relative_to(self.frontend_template_root))
            items.append({"path": rel, "hash": sha256_file(path)})
        return sha256_text(stable_json(items))
