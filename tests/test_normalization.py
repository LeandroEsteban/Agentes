from __future__ import annotations

import json
import tempfile
import unittest
from pathlib import Path

from webforge.normalization import normalize_siged


ROOT = Path(__file__).resolve().parents[1]


class SigedNormalizationTests(unittest.TestCase):
    def test_normalizes_actual_root_sources_and_writes_catalogs(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp) / "normalized"
            report = normalize_siged(ROOT, output)
            self.assertEqual("pass", report["status"])
            for name in ("modules", "actors", "use_cases", "workflows", "screens", "endpoints", "entities", "business_rules", "validations", "traceability"):
                self.assertTrue((output / f"{name}.json").is_file())
            screens = json.loads((output / "screens.json").read_text(encoding="utf-8"))["items"]
            self.assertEqual(30, len(screens))
            self.assertEqual(["API-040"], next(x for x in screens if x["code"] == "P-30")["relations"]["endpoints"])

    def test_reports_known_gaps_without_absolute_evidence_paths(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            output = Path(tmp)
            report = normalize_siged(ROOT, output)
            codes = {finding["category"] for finding in report["finding_items"]}
            self.assertTrue({"SOURCE_ABSOLUTE_WINDOWS_LINK", "MISSING_ADMIN_ENDPOINT", "P30_ALTERNATE_ROUTE", "BR017_ATTACHMENT_VERSION_GAP", "BR021_PREVIOUS_VERSION_GAP", "OIRS_CONTACT_MODEL_GAP"}.issubset(codes))
            for path in output.glob("*"):
                self.assertNotIn("C:\\\\Users", path.read_text(encoding="utf-8"))
