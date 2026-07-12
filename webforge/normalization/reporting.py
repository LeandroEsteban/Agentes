"""JSON and Markdown output for a normalization run."""
from __future__ import annotations

import json
from datetime import datetime, timezone
from dataclasses import asdict
from pathlib import Path

from .models import Catalog, Finding


def write_outputs(catalog: Catalog, findings: list[Finding], output_dir: Path, project_id: str = "siged-lampa", minimum_scope: dict[str, int] | None = None) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    catalogs = catalog.to_dict()
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    source_documents = catalog.product["source_documents"]
    source_hashes = catalog.product["source_hashes"]
    files = []
    for name in ("product", "modules", "actors", "use_cases", "workflows", "screens", "endpoints", "entities", "business_rules", "validations", "traceability"):
        filename = f"{name}.json"
        if name == "product":
            items = [{"code": "SIGED-LAMPA", "name": catalog.product["name"], "description": "Aplicacion web de gestion documental municipal", "module": None, "source": None, "relations": {}, "normalization_status": "parsed"}]
        elif name == "traceability":
            items = catalogs[name]
        else:
            items = [_item_dict(item) for item in catalogs[name]]
        payload = {
            "schema_version": f"webforge.catalog.{name.replace('_', '-')}.v1",
            "project_id": project_id,
            "generated_at": generated_at,
            "source_documents": source_documents,
            "source_hashes": source_hashes,
            "items": items,
        }
        (output_dir / filename).write_text(json.dumps(payload, ensure_ascii=True, indent=2, sort_keys=True) + "\n", encoding="utf-8")
        files.append(filename)
    blocking = [x for x in findings if x.severity == "blocking"]
    counts = {
        "modules": len(catalog.modules), "actors": len(catalog.actors), "use_cases": len(catalog.use_cases),
        "workflows": len(catalog.workflows), "screens": len(catalog.screens), "endpoints": len(catalog.endpoints),
        "tables": len(catalog.entities), "business_rules": len(catalog.business_rules), "validations": len(catalog.validations),
    }
    findings_payload = [_finding_dict(index, finding) for index, finding in enumerate(findings, 1)]
    report = {
        "schema_version": "webforge.normalization_report.v1", "project_id": project_id, "generated_at": generated_at,
        "status": "blocked" if blocking else "pass", "counts": counts, "minimum_scope": minimum_scope or {}, "minimum_scope_results": {key: counts.get(key, 0) >= value for key, value in (minimum_scope or {}).items()},
        "findings": {"blocking": len(blocking), "warning": len([x for x in findings if x.severity == "warning"]), "info": len([x for x in findings if x.severity == "info"])},
        "finding_items": findings_payload, "source_hashes": source_hashes, "generated_files": files + ["normalization-report.json", "normalization-findings.md"], "baseline_preserved": True,
    }
    (output_dir / "normalization-report.json").write_text(json.dumps(report, ensure_ascii=True, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    lines = ["# Normalization Findings", "", "## Resumen ejecutivo", "", f"Estado: **{report['status']}**", "", "## Conteos", ""]
    lines.extend(f"- {key}: {value}" for key, value in counts.items())
    lines.extend(["", "## Hallazgos"])
    for finding in findings:
        where = ""
        if finding.provenance:
            where = f" ({finding.provenance.document}:{finding.provenance.line_start})"
        lines.append(f"- **{finding.severity.upper()} {finding.code}**: {finding.message}{where}. Resolucion: revisar en la fase correspondiente sin inferir una decision funcional.")
    if not findings:
        lines.append("- No findings.")
    (output_dir / "normalization-findings.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return report


def _item_dict(item: dict) -> dict:
    provenance = item["provenance"]
    attributes = item["attributes"]
    return {"code": item["code"], "name": item["name"], "description": attributes.get("description", item["name"]), "module": item["module"], "source": {"document": provenance["document"], "section": provenance["section"], "line_start": provenance["line_start"], "line_end": provenance["line_end"]}, "relations": attributes, "normalization_status": "parsed"}


def _finding_dict(index: int, finding: Finding) -> dict:
    evidence = [] if not finding.provenance else [{"document": finding.provenance.document, "section": finding.provenance.section, "line_start": finding.provenance.line_start, "line_end": finding.provenance.line_end}]
    return {"finding_id": f"NF-{index:03d}", "severity": finding.severity, "category": finding.code, "message": finding.message, "codes": [], "source_evidence": evidence, "suggested_resolution": "Revisar en la fase futura indicada por el plan; no resolver automaticamente requisitos criticos.", "automatically_resolved": False}
