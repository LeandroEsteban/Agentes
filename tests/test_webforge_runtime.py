from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from webforge import PRINCIPLES, WORKFLOW_PHASES, WebForgeFactory
from webforge.capabilities import FACTORY_SKILLS, validate_skill_package
from webforge.policy import MCPGateway, PolicyEngine
from webforge.principles import validate_principle_catalog
from webforge.tools import secret_scan


ROOT = Path(__file__).resolve().parents[1]


def work_order() -> dict:
    return json.loads((ROOT / "examples" / "work_order_factory.json").read_text(encoding="utf-8"))


def write_minimal_frontend_template(root: Path) -> None:
    template = root / "PLANTILLA_FRONTEND"
    template.mkdir(parents=True, exist_ok=True)
    for name in ["README.md", "AGENTS.md", "HANDOFF-REACT.md", "Intranet Agora.dc.html"]:
        (template / name).write_text(f"# {name}\n", encoding="utf-8")


def write_minimal_skill_package(root: Path) -> None:
    skill = root / "skills" / "webforge-factory"
    (skill / "agents").mkdir(parents=True, exist_ok=True)
    (skill / "scripts").mkdir(parents=True, exist_ok=True)
    (skill / "references").mkdir(parents=True, exist_ok=True)
    (skill / "SKILL.md").write_text(
        "---\nname: webforge-factory\ndescription: Minimal WEBFORGE test skill.\n---\n\n# WEBFORGE\n",
        encoding="utf-8",
    )
    (skill / "agents" / "openai.yaml").write_text("interface:\n  display_name: WEBFORGE\n", encoding="utf-8")
    (skill / "scripts" / "webforge_run.py").write_text("#!/usr/bin/env python3\n", encoding="utf-8")
    (skill / "references" / "operating-rules.md").write_text("# Rules\n", encoding="utf-8")


def isolated_factory_root(tmp: Path) -> Path:
    root = tmp / "factory"
    root.mkdir()
    write_minimal_frontend_template(root)
    write_minimal_skill_package(root)
    return root


def write_siged_sources(root: Path) -> list[Path]:
    modules = "\n".join(
        f"| M{i:02d} | Modulo {i:02d} | Objetivo funcional {i:02d} |" for i in range(1, 11)
    )
    endpoints = "\n".join(
        f"| API-{i:03d} | GET | `/api/v1/recurso-{i}` | intranet | M{((i - 1) % 10) + 1:02d} | recurso {i} |"
        for i in range(1, 41)
    )
    screens = "\n".join(
        f"| P-{i:02d} | Pantalla {i:02d} | `/ruta-{i}` | intranet | funcionario | M{((i - 1) % 10) + 1:02d} |"
        for i in range(1, 31)
    )
    tables = "\n".join(
        f"| `table_{i:02d}` | Proposito {i:02d} | `id` | - | `code`, `name` |" for i in range(1, 41)
    )
    files = {
        "Especificacion_Funcional_SIGED_Lampa.md": "# SIGED-Lampa\n\n" + modules + "\n\n### UC-01 Caso base\n",
        "Inventario_Endpoints_SIGED_Lampa.md": "# Endpoints SIGED-Lampa\n\n" + endpoints + "\n",
        "Mapa_Pantallas_Navegacion_SIGED_Lampa.md": "# Pantallas SIGED-Lampa\n\n" + screens + "\n",
        "Modelo_ER_Detallado_SIGED_Lampa.md": "# Modelo ER SIGED-Lampa\n\n" + tables + "\n",
    }
    paths = []
    for name, content in files.items():
        path = root / name
        path.write_text(content, encoding="utf-8")
        paths.append(path)
    return paths


class WebForgeRuntimeTests(unittest.TestCase):
    def test_principle_catalog_is_complete(self) -> None:
        self.assertEqual([f"P{i:02d}" for i in range(1, 13)], list(PRINCIPLES))
        self.assertEqual([], validate_principle_catalog())
        for principle in PRINCIPLES.values():
            self.assertTrue(principle.gates)
            self.assertTrue(principle.evidence)

    def test_factory_run_generates_complete_operational_report(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = isolated_factory_root(Path(tmp))
            report = WebForgeFactory(root).run(work_order(), Path(tmp) / "run", sources=[ROOT / "Diseno_detallado_fabrica_software_SDD-2.md"])
            output = Path(tmp) / "run"
            self.assertEqual("complete", report["status"])
            self.assertEqual(100, report["critical_checks_passed_pct"])
            self.assertEqual(100, report["evidence_coverage_critical_claims"])
            self.assertEqual(0, report["secrets_detected"])
            self.assertEqual(WORKFLOW_PHASES, report["workflow_phases"])
            self.assertEqual([], report["missing_final_artifacts"])
            self.assertEqual("project/webforge-factory-runtime", report["project_workspace"]["project_root"])
            self.assertFalse(report["project_workspace"]["shared_with_factory"])
            self.assertEqual("PLANTILLA_FRONTEND", report["frontend_template"]["template_name"])
            self.assertTrue(report["frontend_template"]["mandatory"])
            self.assertTrue(report["factory_skills"]["codex_skill_present"])
            self.assertGreaterEqual(len(report["factory_skills"]["skills"]), len(FACTORY_SKILLS))
            tool_ids = {tool["tool_id"] for tool in report["factory_tools"]["tools"]}
            self.assertIn("tool.validation.artifacts", tool_ids)
            self.assertIn("tool.security.secrets", tool_ids)
            self.assertIn("tool.sandbox.dev_materialize", tool_ids)
            sandbox_names = {item["name"] for item in report["project_sandboxes"]["sandboxes"]}
            self.assertEqual({"DEV", "QA"}, sandbox_names)
            for sandbox in report["project_sandboxes"]["sandboxes"]:
                self.assertEqual("PLANTILLA_FRONTEND", sandbox["frontend_template"])
                self.assertEqual("true", sandbox["frontend_template_required"])
            for pid, coverage in report["principle_coverage"].items():
                self.assertEqual("pass", coverage["status"], pid)
                self.assertTrue(coverage["gates"], pid)
            for artifact in report["final_artifacts"]:
                self.assertTrue((output / artifact).exists(), artifact)

    def test_skill_package_and_cli_catalogs_exist(self) -> None:
        self.assertEqual([], validate_skill_package(ROOT))
        skill_md = ROOT / "skills" / "webforge-factory" / "SKILL.md"
        self.assertTrue(skill_md.exists())
        self.assertNotIn("TODO", skill_md.read_text(encoding="utf-8"))

        skills = json.loads(
            subprocess.check_output(
                [sys.executable, "-m", "webforge", "skills", "--project-root", str(ROOT)],
                cwd=ROOT,
                text=True,
            )
        )
        self.assertTrue(skills["codex_skill_present"])
        self.assertIn("skill.webforge.codex", {item["skill_id"] for item in skills["skills"]})

        with tempfile.TemporaryDirectory() as tmp:
            tools = json.loads(
                subprocess.check_output(
                    [sys.executable, "-m", "webforge", "toolreg", "--output", str(Path(tmp) / "tool-preview")],
                    cwd=ROOT,
                    text=True,
                )
            )
        self.assertEqual("deny_unregistered_tools", tools["default"])
        self.assertIn("tool.policy.static", {item["tool_id"] for item in tools["tools"]})
        self.assertIn("tool.sandbox.dev_materialize", {item["tool_id"] for item in tools["tools"]})

        doctor = json.loads(
            subprocess.check_output(
                [sys.executable, "skills/webforge-factory/scripts/webforge_run.py", "doctor", "--project-root", str(ROOT)],
                cwd=ROOT,
                text=True,
            )
        )
        self.assertEqual("pass", doctor["status"])

    def test_policy_and_mcp_are_default_deny(self) -> None:
        policy = PolicyEngine({"agent.intake"})
        self.assertTrue(policy.check_agent("agent.intake").allowed)
        self.assertFalse(policy.check_agent("agent.unknown").allowed)
        self.assertFalse(policy.check_action("external_write", {"external_write": False}).allowed)
        with tempfile.TemporaryDirectory() as tmp:
            mcp = MCPGateway(Path(tmp))
            decision = mcp.invoke("server.not_allowed", "read")
            self.assertFalse(decision.allowed)
            self.assertTrue((Path(tmp) / "mcp-invocations.jsonl").exists())

    def test_repeated_runs_have_same_logical_identity(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = isolated_factory_root(Path(tmp))
            first = WebForgeFactory(root).run(work_order(), Path(tmp) / "one", sources=[ROOT / "Diseno_detallado_fabrica_software_SDD-2.md"])
            second = WebForgeFactory(root).run(work_order(), Path(tmp) / "two", sources=[ROOT / "Diseno_detallado_fabrica_software_SDD-2.md"])
            self.assertEqual(first["run_id"], second["run_id"])
            self.assertEqual(first["workflow_phases"], second["workflow_phases"])
            self.assertEqual(first["principle_coverage"], second["principle_coverage"])

    def test_project_memory_is_not_shared_with_factory(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "run"
            root = isolated_factory_root(Path(tmp))
            report = WebForgeFactory(root).run(work_order(), output, sources=[ROOT / "Diseno_detallado_fabrica_software_SDD-2.md"])
            memory_report = json.loads((output / "memory-report.json").read_text(encoding="utf-8"))
            self.assertFalse(memory_report["factory_memory_read_allowed"])
            self.assertFalse(memory_report["factory_learning_write_allowed"])
            self.assertFalse(memory_report["shared_with_factory"])
            self.assertNotIn("Keep project isolation defaults", (output / "Aprendizaje.md").read_text(encoding="utf-8"))
            project_learning = root / report["project_workspace"]["learning_root"] / "Aprendizaje.md"
            self.assertIn("Keep project isolation defaults", project_learning.read_text(encoding="utf-8"))

    def test_independent_project_sandboxes_and_incremental_version(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp) / "factory"
            tmp_root.mkdir()
            write_minimal_frontend_template(tmp_root)
            write_minimal_skill_package(tmp_root)
            wo = work_order()
            wo["project_id"] = "client-alpha"
            wo["project_version"] = "2"
            report = WebForgeFactory(tmp_root).run(
                wo,
                Path(tmp) / "run",
                sources=[ROOT / "Diseno_detallado_fabrica_software_SDD-2.md"],
            )
            self.assertEqual("complete", report["status"])
            self.assertEqual("project/client-alpha", report["project_workspace"]["project_root"])
            self.assertEqual("v0002", report["project_workspace"]["current_version"])
            sandboxes = {item["name"]: item for item in report["project_sandboxes"]["sandboxes"]}
            self.assertNotEqual(sandboxes["DEV"]["path"], sandboxes["QA"]["path"])
            self.assertNotEqual(sandboxes["DEV"]["sandbox_id"], sandboxes["QA"]["sandbox_id"])
            self.assertEqual("project/client-alpha/versions/v0002", sandboxes["DEV"]["clone_source"])
            self.assertEqual("project/client-alpha/versions/v0002", sandboxes["QA"]["clone_source"])
            for sandbox in sandboxes.values():
                self.assertEqual("false", sandbox["shared_with_factory"])
                self.assertEqual("PLANTILLA_FRONTEND", sandbox["frontend_template"])
                self.assertEqual("true", sandbox["frontend_template_required"])
                self.assertTrue((tmp_root / sandbox["path"] / "sandbox-manifest.json").exists())
                self.assertTrue((tmp_root / sandbox["path"] / "frontend-template-manifest.json").exists())

    def test_missing_frontend_template_blocks_complete(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp) / "factory"
            tmp_root.mkdir()
            report = WebForgeFactory(tmp_root).run(
                work_order(),
                Path(tmp) / "run",
                sources=[ROOT / "Diseno_detallado_fabrica_software_SDD-2.md"],
            )
            self.assertEqual("error", report["status"])
            self.assertEqual("sha256:missing", report["frontend_template"]["hash"])
            self.assertEqual("error", report["phase_status"]["intake"])

    def test_secret_scan_blocks_findings(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            secret_file = Path(tmp) / "secret.txt"
            secret_file.write_text("api_key=abcdefghijklmnop1234567890", encoding="utf-8")
            result = secret_scan([secret_file])
            self.assertEqual(1, result["blocking_findings"])
            self.assertEqual(1, result["secrets_detected"])

    def test_phase_order_reaches_implementation_after_analyze(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = isolated_factory_root(Path(tmp))
            WebForgeFactory(root).run(work_order(), Path(tmp) / "run", sources=[ROOT / "Diseno_detallado_fabrica_software_SDD-2.md"])
            lines = (Path(tmp) / "run" / "log.jsonl").read_text(encoding="utf-8").strip().splitlines()
            phases = [json.loads(line)["phase"] for line in lines]
            self.assertEqual(WORKFLOW_PHASES, phases)
            self.assertLess(phases.index("analyze"), phases.index("implement"))

    def test_nested_sources_are_loaded_into_context_pack(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp) / "factory"
            nested = tmp_root / "projects" / "uno"
            nested.mkdir(parents=True)
            write_minimal_frontend_template(tmp_root)
            write_minimal_skill_package(tmp_root)
            source = nested / "spec.md"
            source.write_text("# Nested spec\n\nRequirement from nested source.\n", encoding="utf-8")
            wo = work_order()
            wo["project_id"] = "nested-source-check"
            report = WebForgeFactory(tmp_root).run(wo, Path(tmp) / "run", sources=[source])
            context_pack = json.loads((Path(tmp) / "run" / "context-pack.json").read_text(encoding="utf-8"))
            self.assertEqual("complete", report["status"])
            self.assertEqual(1, context_pack["source_count"])
            self.assertEqual("projects/uno/spec.md", context_pack["sources"][0]["path"])

    def test_dev_materializer_writes_work_order_bundle_to_dev_sandbox(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp) / "factory"
            tmp_root.mkdir()
            write_minimal_frontend_template(tmp_root)
            write_minimal_skill_package(tmp_root)
            wo = work_order()
            wo["project_id"] = "materializer-demo"
            wo["metadata"] = {
                "implementation_bundle": [
                    {"path": "src/app.py", "content": "print('hola webforge')\n"},
                    {"path": "docs/README.md", "content": "# DEV bundle\n"},
                ]
            }
            report = WebForgeFactory(tmp_root).run(
                wo,
                Path(tmp) / "run",
                sources=[ROOT / "Diseno_detallado_fabrica_software_SDD-2.md"],
            )
            self.assertEqual("complete", report["status"])
            dev = next(item for item in report["project_sandboxes"]["sandboxes"] if item["name"] == "DEV")
            workspace = tmp_root / dev["path"] / "workspace"
            self.assertEqual("print('hola webforge')\n", (workspace / "src" / "app.py").read_text(encoding="utf-8"))
            self.assertEqual("# DEV bundle\n", (workspace / "docs" / "README.md").read_text(encoding="utf-8"))
            manifest = json.loads((Path(tmp) / "run" / "dev-materialization-manifest.json").read_text(encoding="utf-8"))
            self.assertEqual("webforge.isolation.p12_inv.v1", manifest["api"])
            self.assertEqual("pass", manifest["status"])
            self.assertEqual(2, manifest["bundle"]["file_count"])

    def test_dev_materializer_blocks_path_traversal(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp) / "factory"
            tmp_root.mkdir()
            write_minimal_frontend_template(tmp_root)
            write_minimal_skill_package(tmp_root)
            wo = work_order()
            wo["project_id"] = "materializer-block"
            wo["metadata"] = {"implementation_bundle": [{"path": "../escape.txt", "content": "no\n"}]}
            report = WebForgeFactory(tmp_root).run(
                wo,
                Path(tmp) / "run",
                sources=[ROOT / "Diseno_detallado_fabrica_software_SDD-2.md"],
            )
            self.assertEqual("error", report["status"])
            self.assertEqual("error", report["phase_status"]["implement"])
            self.assertFalse((tmp_root / "project" / "materializer-block" / "sandboxes" / "DEV" / "escape.txt").exists())

    def test_siged_sources_materialize_executable_dev_app(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            tmp_root = Path(tmp) / "factory"
            tmp_root.mkdir()
            write_minimal_frontend_template(tmp_root)
            write_minimal_skill_package(tmp_root)
            sources = write_siged_sources(Path(tmp))
            wo = work_order()
            wo["objective"] = "Construir SIGED-Lampa como aplicacion web municipal trazable."
            wo["project_id"] = "siged-lampa"
            wo["type"] = "siged_lampa_web_app"
            report = WebForgeFactory(tmp_root).run(wo, Path(tmp) / "run", sources=sources)
            self.assertEqual("complete", report["status"])
            self.assertEqual("SIGED-Lampa", report["generated_product"]["product"])
            self.assertEqual(10, report["generated_product"]["counts"]["modules"])
            self.assertEqual(40, report["generated_product"]["counts"]["endpoints"])
            self.assertEqual(30, report["generated_product"]["counts"]["screens"])
            self.assertEqual(40, report["generated_product"]["counts"]["er_tables"])
            app_root = tmp_root / "project" / "siged-lampa" / "sandboxes" / "DEV" / "workspace"
            self.assertTrue((app_root / "app" / "index.html").exists())
            self.assertTrue((app_root / "app" / "assets" / "app.js").exists())
            self.assertTrue((app_root / "app" / "data" / "traceability.json").exists())
            seed = json.loads((app_root / "data" / "seed.json").read_text(encoding="utf-8"))
            portal_ids = {item["id"] for item in seed["navigation"]["portal"]}
            portal_labels = {item["label"] for item in seed["navigation"]["portal"]}
            self.assertFalse(portal_ids & {"documents", "expedients", "users", "trace", "dashboard"})
            self.assertFalse(portal_labels & {"Documentos", "Expedientes", "Usuarios y roles", "Trazabilidad"})
            self.assertIn("access_policy", seed)
            manifest = json.loads((Path(tmp) / "run" / "dev-materialization-manifest.json").read_text(encoding="utf-8"))
            self.assertEqual("pass", manifest["status"])
            written_paths = {item["path"] for item in manifest["writes"]}
            self.assertIn("app/index.html", written_paths)
            self.assertIn("scripts/verify_siged_bundle.py", written_paths)


if __name__ == "__main__":
    unittest.main()
