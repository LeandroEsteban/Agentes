from __future__ import annotations

import hashlib
import json
import shutil
import tempfile
import unittest
from pathlib import Path

from webforge.cli import main
from webforge.models import WorkOrder
from webforge.normalization import normalize_siged


ROOT = Path(__file__).resolve().parents[1]
SOURCE_NAMES = (
    "Especificacion_Funcional_SIGED_Lampa.md",
    "Inventario_Endpoints_SIGED_Lampa.md",
    "Mapa_Pantallas_Navegacion_SIGED_Lampa.md",
    "Modelo_ER_Detallado_SIGED_Lampa.md",
)


def digest(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


class PhaseZeroOneSafetyTests(unittest.TestCase):
    def test_work_order_v1_defaults_remain_compatible(self) -> None:
        order = WorkOrder.from_dict({"objective": "legacy", "acceptance_criteria": ["test"]})
        self.assertEqual([], order.validate())
        self.assertEqual("webforge.work_order.v1", order.schema_version)
        self.assertEqual([], order.source_documents)

    def test_work_order_v2_rejects_unsafe_sources_and_invalid_scope(self) -> None:
        unsafe = ["C:\\secret.md", "/etc/passwd", "\\\\server\\share\\x.md", "../escape.md", ""]
        for source in unsafe:
            order = WorkOrder.from_dict({"objective": "x", "acceptance_criteria": ["x"], "source_documents": [source], "minimum_scope": {"screens": -1}})
            self.assertTrue(order.validate(), source)

    def test_normalization_only_writes_temporary_outputs_and_preserves_sources(self) -> None:
        before = {name: digest(ROOT / name) for name in SOURCE_NAMES}
        dev_before = digest(ROOT / "project/siged-lampa/sandboxes/DEV/workspace/package.json")
        with tempfile.TemporaryDirectory() as tmp:
            report = normalize_siged(ROOT, Path(tmp) / "output")
            self.assertEqual("pass", report["status"])
            self.assertTrue((Path(tmp) / "output" / "normalization-report.json").exists())
        self.assertEqual(before, {name: digest(ROOT / name) for name in SOURCE_NAMES})
        self.assertEqual(dev_before, digest(ROOT / "project/siged-lampa/sandboxes/DEV/workspace/package.json"))

    def test_cli_normalize_uses_temporary_project_root(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp) / "root"
            root.mkdir()
            for name in SOURCE_NAMES:
                shutil.copy2(ROOT / name, root / name)
            order = json.loads((ROOT / "examples/work_order_siged_lampa.json").read_text(encoding="utf-8"))
            (root / "work-order.json").write_text(json.dumps(order), encoding="utf-8")
            code = main(["normalize", "--project-root", str(root), "--work-order", str(root / "work-order.json"), "--output", str(root / "run")])
            self.assertEqual(0, code)
            self.assertTrue((root / "project/siged-lampa/spec/traceability.json").is_file())

    def test_missing_source_is_reported(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaisesRegex(ValueError, "Missing required"):
                normalize_siged(Path(tmp), Path(tmp) / "out")
