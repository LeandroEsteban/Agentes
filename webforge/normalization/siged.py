"""Normalizer for the four authoritative root SIGED Markdown documents."""
from __future__ import annotations

import re
from hashlib import sha256
from pathlib import Path

from .markdown import clean, relative_document, section_at, sections, tables
from .models import Catalog, CatalogItem, Finding, Provenance
from .reporting import write_outputs
from .validation import validate


SOURCE_NAMES = (
    "Especificacion_Funcional_SIGED_Lampa.md",
    "Mapa_Pantallas_Navegacion_SIGED_Lampa.md",
    "Inventario_Endpoints_SIGED_Lampa.md",
    "Modelo_ER_Detallado_SIGED_Lampa.md",
)


class NormalizationError(ValueError):
    """Raised when required sources cannot be read or catalog integrity fails."""


def normalize_siged(
    source_root: str | Path,
    output_dir: str | Path,
    artifact_root: str | Path | None = None,
    minimum_scope: dict[str, int] | None = None,
    project_id: str = "siged-lampa",
) -> dict:
    """Parse root SIGED sources, write catalogs to ``output_dir``, and return its report.

    The function intentionally does not invoke the WEBFORGE CLI or WorkOrder machinery.
    """
    root = Path(source_root)
    paths = [root / name for name in SOURCE_NAMES]
    missing = [path.name for path in paths if not path.is_file()]
    if missing:
        raise NormalizationError("Missing required SIGED sources: " + ", ".join(missing))
    texts = {relative_document(path, root): path.read_text(encoding="utf-8") for path in paths}
    catalog = _parse(paths, root)
    findings = validate(catalog, texts, Path(artifact_root) if artifact_root else None)
    findings.extend(_minimum_scope_findings(catalog, minimum_scope or {}))
    report = write_outputs(catalog, findings, Path(output_dir), project_id, minimum_scope or {})
    if report["findings"]["blocking"]:
        raise NormalizationError(f"Normalization failed with {report['blocking_findings']} blocking finding(s)")
    return report


def _parse(paths: list[Path], root: Path) -> Catalog:
    documents = {path.name: path for path in paths}
    functional = _document(documents[SOURCE_NAMES[0]], root)
    screens_doc = _document(documents[SOURCE_NAMES[1]], root)
    endpoints_doc = _document(documents[SOURCE_NAMES[2]], root)
    entities_doc = _document(documents[SOURCE_NAMES[3]], root)
    product = {
        "name": "SIGED-Lampa",
        "version": "v0.1",
        "source_documents": [relative_document(p, root) for p in paths],
        "source_hashes": {
            relative_document(path, root): "sha256:" + sha256(path.read_bytes()).hexdigest() for path in paths
        },
    }
    catalog = Catalog(product=product)
    catalog.modules = _table_items(functional, "Codigo", "Modulo", "M", "module")
    catalog.workflows = _table_items(functional, "Codigo", "Flujo", "FF-", "workflow", module_column="Modulo")
    catalog.screens = _table_items(screens_doc, "Codigo", "Pantalla", "P-", "screen", module_column="Modulo")
    catalog.endpoints = _table_items(endpoints_doc, "Codigo", "Endpoint", "API-", "endpoint", module_column="Modulo")
    catalog.entities = _entity_items(entities_doc)
    catalog.actors = _heading_items(functional, r"^\s*-\s+`(ACT-[A-Z]+)`\s+(.+)$", "actor")
    catalog.use_cases = _use_cases(functional)
    catalog.business_rules = _heading_items(functional, r"^\s*-\s+`(BR-\d+)`\s+(.+)$", "business_rule")
    catalog.validations = _heading_items(functional, r"^\s*-\s+`(VAL-\d+)`\s+(.+)$", "validation")
    _enrich_screens(catalog.screens, screens_doc)
    catalog.traceability = _traceability(catalog)
    return catalog


def _document(path: Path, root: Path) -> dict:
    lines = path.read_text(encoding="utf-8").splitlines()
    return {"path": relative_document(path, root), "lines": lines, "sections": sections(lines)}


def _provenance(doc: dict, line: int, end: int | None = None) -> Provenance:
    return Provenance(doc["path"], line, end or line, section_at(doc["sections"], line))


def _table_items(doc: dict, code_header: str, name_header: str, prefix: str, kind: str, module_column: str | None = None) -> list[CatalogItem]:
    result = []
    for line, headers, values in tables(doc["lines"]):
        if code_header not in headers or name_header not in headers:
            continue
        row = dict(zip(headers, values))
        code = clean(row.get(code_header, ""))
        if not code.startswith(prefix):
            continue
        attrs = {key.lower().replace(" ", "_"): clean(value) for key, value in row.items() if key not in {code_header, name_header, module_column}}
        if kind == "endpoint":
            attrs["method"] = clean(row.get("Metodo", ""))
            attrs["path"] = clean(row.get("Endpoint", ""))
            attrs["auth"] = clean(row.get("Auth", ""))
        if kind == "screen":
            attrs["route"] = clean(row.get("Ruta sugerida", ""))
            attrs["zone"] = clean(row.get("Zona", ""))
            attrs["actor"] = clean(row.get("Actor principal", ""))
        result.append(CatalogItem(code, clean(row[name_header]), clean(row.get(module_column, "")) or None, attrs, _provenance(doc, line)))
    return result


def _entity_items(doc: dict) -> list[CatalogItem]:
    result = []
    for line, headers, values in tables(doc["lines"]):
        if "Tabla" not in headers or "Campos clave recomendados" not in headers:
            continue
        row = dict(zip(headers, values))
        code = clean(row["Tabla"])
        if not re.match(r"^[a-z][a-z0-9_]*$", code):
            continue
        fields = [clean(x) for x in row["Campos clave recomendados"].split(",") if clean(x) and clean(x) != "-"]
        result.append(CatalogItem(code, clean(row.get("Proposito", code)), None, {"primary_key": clean(row.get("PK", "")), "foreign_keys": clean(row.get("FKs principales", "")), "fields": fields}, _provenance(doc, line)))
    return result


def _heading_items(doc: dict, pattern: str, kind: str) -> list[CatalogItem]:
    result = []
    for line, value in enumerate(doc["lines"], 1):
        match = re.match(pattern, value)
        if match:
            result.append(CatalogItem(match.group(1), match.group(2).strip(), None, {"kind": kind}, _provenance(doc, line)))
    return result


def _use_cases(doc: dict) -> list[CatalogItem]:
    result = []
    for line, value in enumerate(doc["lines"], 1):
        match = re.match(r"^###\s+(UC-\d+)\s+(.+)$", value)
        if not match:
            continue
        next_heading = next((n for n in range(line, len(doc["lines"])) if doc["lines"][n].startswith("### ")), len(doc["lines"]))
        body = "\n".join(doc["lines"][line:next_heading])
        actor = re.search(r"-\s*Actor principal:\s*(.+)", body)
        result.append(CatalogItem(match.group(1), match.group(2), None, {"actor": actor.group(1).strip() if actor else None}, _provenance(doc, line, next_heading)))
    return result


def _enrich_screens(screens: list[CatalogItem], doc: dict) -> None:
    endpoint_map: dict[str, list[str]] = {}
    for line, headers, values in tables(doc["lines"]):
        if "Codigo" in headers and "Endpoints dominantes" in headers:
            row = dict(zip(headers, values))
            endpoint_map[clean(row["Codigo"])] = re.findall(r"API-\d+", row["Endpoints dominantes"])
    for screen in screens:
        screen.attributes["endpoints"] = endpoint_map.get(screen.code, [])


def _traceability(catalog: Catalog) -> list[dict]:
    rows = []
    for screen in catalog.screens:
        for endpoint in screen.attributes.get("endpoints", []):
            rows.append({"source_code": screen.code, "target_code": endpoint, "relation_type": "uses_endpoint", "confidence": "explicit", "derivation_rule": "Mapa de Pantallas: Endpoints dominantes", "evidence": [screen.provenance.__dict__]})
    for workflow in catalog.workflows:
        for screen in catalog.screens:
            if workflow.module and workflow.module == screen.module:
                rows.append({"source_code": workflow.code, "target_code": screen.code, "relation_type": "same_module", "confidence": "derived", "derivation_rule": "Workflow y pantalla comparten modulo explicitamente documentado", "evidence": [workflow.provenance.__dict__, screen.provenance.__dict__]})
    return rows


def _minimum_scope_findings(catalog: Catalog, minimum_scope: dict[str, int]) -> list[Finding]:
    values = {
        "use_cases": len(catalog.use_cases), "workflows": len(catalog.workflows), "tables": len(catalog.entities),
        "endpoints": len(catalog.endpoints), "screens": len(catalog.screens), "business_rules": len(catalog.business_rules), "validations": len(catalog.validations),
    }
    findings = []
    for key, expected in minimum_scope.items():
        if key in values and values[key] < expected:
            findings.append(Finding("MINIMUM_SCOPE_NOT_MET", "blocking", f"{key} requires {expected}, parsed {values[key]}"))
    return findings
