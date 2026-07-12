#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


EXPECTED = {
    "screens": 40,
    "use_cases": 46,
    "business_rules": 100,
    "validations": 200,
    "endpoints": 130,
    "permissions": 40,
    "states": 9,
    "non_functional": 10,
    "module_acceptance": 10,
}


def version_root() -> Path:
    return Path(__file__).resolve().parents[1]


def load_json(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--version-root", default=str(version_root()))
    parser.add_argument("--require-web", action="store_true")
    args = parser.parse_args()

    root = Path(args.version_root).resolve()
    traceability = load_json(root / "traceability" / "requirements-ledger.json")
    api = load_json(root / "app" / "data" / "api-catalog.json")
    requirements = traceability["requirements"]
    errors: list[str] = []

    for key, expected in EXPECTED.items():
        actual = traceability["summary"].get(key)
        if actual != expected:
            errors.append(f"Expected {key}={expected}, got {actual}")

    ids = [item["id"] for item in requirements]
    if len(ids) != len(set(ids)):
        errors.append("Duplicate requirement ids detected")
    if len(ids) != traceability["summary"]["requirements"]:
        errors.append("Summary requirement count mismatch")

    if api.get("endpoint_count") != 130 or len(api.get("endpoints", [])) != 130:
        errors.append("API endpoint catalog must contain 130 endpoints")
    for endpoint in api.get("endpoints", []):
        if not endpoint["path"].startswith("/api/v1"):
            errors.append(f"Endpoint outside /api/v1: {endpoint['path']}")
        if endpoint["method"] not in {"GET", "POST", "PATCH", "PUT", "DELETE"}:
            errors.append(f"Unsupported method: {endpoint['method']}")

    for relative in traceability["implementation_files"]:
        if not (root / relative).exists():
            errors.append(f"Missing implementation file: {relative}")

    for name in ["README.md", "AGENTS.md", "HANDOFF-REACT.md", "Intranet Agora.dc.html", "support.js"]:
        if not (root / "frontend" / "PLANTILLA_FRONTEND" / name).exists():
            errors.append(f"Missing mandatory PLANTILLA_FRONTEND file: {name}")

    for item in requirements:
        if item.get("implementation_status") != "implemented":
            errors.append(f"{item['id']} not implemented")
        if not item.get("selector"):
            errors.append(f"{item['id']} missing selector")
        if not item.get("implementation_evidence"):
            errors.append(f"{item['id']} missing implementation evidence")

    web_report_path = root / "traceability" / "web-validation-report.json"
    if args.require_web:
        if not web_report_path.exists():
            errors.append("Missing web-validation-report.json")
        else:
            web = load_json(web_report_path)
            if web.get("status") != "pass":
                errors.append(f"Web validation status is {web.get('status')}")
            if web.get("validated_requirements") != len(requirements):
                errors.append(f"Expected {len(requirements)} web-validated requirements, got {web.get('validated_requirements')}")
            if web.get("validated_screens") != 40:
                errors.append(f"Expected 40 screens validated, got {web.get('validated_screens')}")
            if web.get("validated_endpoints") != 130:
                errors.append(f"Expected 130 endpoints validated, got {web.get('validated_endpoints')}")

    report = {
        "project_id": "proyecto-dos",
        "version": "v0001",
        "required": len(requirements),
        "implemented": len([item for item in requirements if item.get("implementation_status") == "implemented"]),
        "web_required": args.require_web,
        "errors": errors,
        "status": "pass" if not errors else "fail",
    }
    (root / "traceability" / "static-verification-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if not errors else 1


if __name__ == "__main__":
    raise SystemExit(main())
