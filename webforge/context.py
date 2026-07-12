from __future__ import annotations

from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any

from .models import EvidenceSource
from .utils import read_text, redact_secrets, sha256_text, stable_json, write_json, write_text


@dataclass
class ContextSnippet:
    evidence_id: str
    path: str
    sha256: str
    snippet: str
    redactions: int


class EvidenceRegistry:
    def __init__(self) -> None:
        self._sources: dict[str, EvidenceSource] = {}

    def add_file(self, evidence_id: str, path: Path, summary: str, root: Path | None = None) -> EvidenceSource:
        source = EvidenceSource.from_path(evidence_id, path, summary, root=root)
        self._sources[source.evidence_id] = source
        return source

    def values(self) -> list[EvidenceSource]:
        return list(self._sources.values())

    def ids(self) -> list[str]:
        return list(self._sources)

    def write(self, path: Path) -> None:
        lines = ["# Evidence register", ""]
        lines.append("| evidence_id | source | sha256 | summary |")
        lines.append("|---|---|---|---|")
        for source in self.values():
            lines.append(f"| {source.evidence_id} | `{source.path}` | `{source.sha256}` | {source.summary} |")
        write_text(path, "\n".join(lines))


class ContextManager:
    def __init__(self, registry: EvidenceRegistry) -> None:
        self.registry = registry

    def build_minimal_context(self, agent_id: str, phase: str, source_root: Path) -> dict[str, Any]:
        snippets: list[ContextSnippet] = []
        for source in self.registry.values():
            source_path_value = Path(source.path)
            source_path = source_path_value if source_path_value.is_absolute() else source_root / source_path_value
            if not source_path.exists():
                continue
            text = read_text(source_path, max_chars=1200)
            redacted, redactions = redact_secrets(text)
            snippets.append(
                ContextSnippet(
                    evidence_id=source.evidence_id,
                    path=source.path,
                    sha256=source.sha256,
                    snippet=redacted[:600],
                    redactions=redactions,
                )
            )
        pack = {
            "context_pack_id": f"CTX-{phase.upper()}",
            "agent_id": agent_id,
            "phase": phase,
            "mode": "minimal_snippets_only",
            "sources": [asdict(snippet) for snippet in snippets],
            "source_count": len(snippets),
        }
        pack["context_pack_hash"] = sha256_text(stable_json(pack))
        return pack

    def write_context_pack(self, output_dir: Path, agent_id: str, phase: str, source_root: Path) -> dict[str, Any]:
        pack = self.build_minimal_context(agent_id, phase, source_root)
        write_json(output_dir / "context-pack.json", pack)
        manifest = {
            "index_id": "rag-index.webforge.local.v1",
            "cache_key": pack["context_pack_hash"],
            "retrieval": "authorized_sources_minimal_snippets",
            "corpus_loaded_fully": False,
            "source_count": pack["source_count"],
        }
        write_json(output_dir / "rag-index-manifest.json", manifest)
        return pack


class MemoryGate:
    def __init__(self, project_id: str, project_memory_root: Path, project_learning_root: Path) -> None:
        self.project_id = project_id
        self.project_memory_root = project_memory_root
        self.project_learning_root = project_learning_root
        self.proposals: list[dict[str, Any]] = []

    def read_filtered(self, agent_id: str, phase: str) -> dict[str, Any]:
        return {
            "agent_id": agent_id,
            "phase": phase,
            "project_id": self.project_id,
            "persistent_memory": "project_scoped_propose_only",
            "project_memory_root": str(self.project_memory_root),
            "factory_memory_read_allowed": False,
            "factory_learning_write_allowed": False,
            "shared_with_factory": False,
            "trusted_items": [],
            "tainted_items": [],
        }

    def propose(self, title: str, evidence_id: str, reason: str) -> None:
        self.proposals.append(
            {
                "title": title,
                "evidence_id": evidence_id,
                "reason": reason,
                "status": "pending_human_approval",
                "scope": "project_only",
                "ttl": "TBD",
                "rollback": "delete proposal before activation",
            }
        )

    def write(self, output_dir: Path) -> None:
        write_json(
            output_dir / "memory-report.json",
            {
                "project_id": self.project_id,
                "persistent_memory_mode": "project_scoped_propose_only",
                "factory_memory_read_allowed": False,
                "factory_learning_write_allowed": False,
                "shared_with_factory": False,
                "project_memory_root": str(self.project_memory_root),
                "project_learning_root": str(self.project_learning_root),
                "activated_items": [],
                "project_proposals_count": len(self.proposals),
                "tainted_items": [],
            },
        )
        lines = ["# Aprendizaje", "", "Modo persistente: project_scoped_propose_only.", ""]
        lines.append("Este artefacto de corrida no almacena aprendizaje del proyecto.")
        lines.append(f"Proyecto: {self.project_id}")
        lines.append(f"Ruta de aprendizaje del proyecto: `{self.project_learning_root}`")
        write_text(output_dir / "Aprendizaje.md", "\n".join(lines))

        project_lines = ["# Aprendizaje", "", f"Proyecto: {self.project_id}", "Scope: project_only.", ""]
        if not self.proposals:
            project_lines.append("No hay aprendizajes activados automaticamente.")
        else:
            for proposal in self.proposals:
                project_lines.append(f"- {proposal['title']} ({proposal['status']}) evidence_id={proposal['evidence_id']}")
        write_text(self.project_learning_root / "Aprendizaje.md", "\n".join(project_lines))
        write_json(
            self.project_memory_root / "memory-report.json",
            {
                "project_id": self.project_id,
                "persistent_memory_mode": "project_scoped_propose_only",
                "shared_with_factory": False,
                "activated_items": [],
                "proposals": self.proposals,
                "tainted_items": [],
            },
        )
