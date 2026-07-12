#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path


def version_root() -> Path:
    return Path(__file__).resolve().parents[1]


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def html_has_id(html: str, selector: str) -> bool:
    if not selector.startswith("#"):
        return False
    element_id = re.escape(selector[1:])
    return re.search(rf"\bid=[\"']{element_id}[\"']", html) is not None


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version-root", default=str(version_root()))
    parser.add_argument("--require-web", action="store_true")
    args = parser.parse_args()

    root = Path(args.version_root).resolve()
    traceability = load_json(root / "traceability" / "requirements-ledger.json")
    requirements = traceability["requirements"]
    errors: list[str] = []

    ids = [item["id"] for item in requirements]
    if len(ids) != 159:
        errors.append(f"Expected 159 requirements, got {len(ids)}")
    if len(ids) != len(set(ids)):
        errors.append("Duplicate requirement ids detected")

    for relative in traceability["implementation_files"]:
        if not (root / relative).exists():
            errors.append(f"Missing implementation file: {relative}")

    template_required = ["README.md", "AGENTS.md", "HANDOFF-REACT.md", "Intranet Agora.dc.html", "support.js"]
    for name in template_required:
        if not (root / "frontend" / "PLANTILLA_FRONTEND" / name).exists():
            errors.append(f"Missing mandatory PLANTILLA_FRONTEND file: {name}")

    html = (root / "app" / "index.html").read_text(encoding="utf-8")
    selectors = sorted({item["selector"] for item in requirements})
    for selector in selectors:
        if not html_has_id(html, selector):
            errors.append(f"Selector not present in app/index.html: {selector}")

    for item in requirements:
        if item.get("implementation_status") != "implemented":
            errors.append(f"{item['id']} not implemented")
        if not item.get("implementation_evidence"):
            errors.append(f"{item['id']} missing implementation evidence")
        if not item.get("selector"):
            errors.append(f"{item['id']} missing selector")

    web_report_path = root / "traceability" / "web-validation-report.json"
    if args.require_web:
        if not web_report_path.exists():
            errors.append("Missing web-validation-report.json")
        else:
            web = load_json(web_report_path)
            if web.get("status") != "pass":
                errors.append(f"Web validation status is {web.get('status')}")
            if web.get("validated_requirements") != 159:
                errors.append(f"Expected 159 web-validated requirements, got {web.get('validated_requirements')}")
            if web.get("validated_flows") != 26:
                errors.append(f"Expected 26 web-validated flows, got {web.get('validated_flows')}")

    report = {
        "project_id": "proyecto-uno",
        "version": "v0002",
        "required": 159,
        "implemented": len([item for item in requirements if item.get("implementation_status") == "implemented"]),
        "selectors": len(selectors),
        "web_required": args.require_web,
        "errors": errors,
        "status": "pass" if not errors else "fail",
    }
    (root / "traceability" / "static-verification-report.json").write_text(
        json.dumps(report, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
