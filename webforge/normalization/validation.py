"""Integrity and cross-document checks for normalized SIGED catalogs."""
from __future__ import annotations

import re
from pathlib import Path

from .models import Catalog, Finding, Provenance


def validate(catalog: Catalog, source_texts: dict[str, str], artifact_root: Path | None = None) -> list[Finding]:
    findings: list[Finding] = []
    collections = ("modules", "actors", "use_cases", "workflows", "screens", "endpoints", "entities", "business_rules", "validations")
    for name in collections:
        seen: set[str] = set()
        for item in getattr(catalog, name):
            if not item.code or not re.match(r"^[A-Z]+-[A-Z0-9]+$|^M\d{2}$|^[a-z][a-z0-9_]*$", item.code):
                findings.append(Finding("MALFORMED_CODE", "blocking", f"Malformed {name} code: {item.code!r}", item.provenance))
            elif item.code in seen:
                findings.append(Finding("DUPLICATE_CODE", "blocking", f"Duplicate {name} code: {item.code}", item.provenance))
            seen.add(item.code)
            if name not in {"modules", "actors", "business_rules", "validations", "entities"} and item.module and item.module not in {m.code for m in catalog.modules}:
                findings.append(Finding("UNKNOWN_MODULE", "blocking", f"{item.code} references missing module {item.module}", item.provenance))
    for document, text in source_texts.items():
        if re.search(r"\[[^]]+\]\((?:<?[A-Za-z]:\\|file:///)[^)]*\)", text):
            findings.append(Finding("SOURCE_ABSOLUTE_WINDOWS_LINK", "warning", f"Source contains an absolute Windows link; output retains only relative evidence: {document}"))
    endpoint_paths = {item.attributes.get("path") for item in catalog.endpoints}
    screen_endpoint_codes = {code for screen in catalog.screens for code in screen.attributes.get("endpoints", [])}
    for endpoint in catalog.endpoints:
        if not endpoint.attributes.get("method"):
            findings.append(Finding("ENDPOINT_METHOD_MISSING", "blocking", f"{endpoint.code} has no HTTP method", endpoint.provenance))
        elif endpoint.attributes["method"].upper() not in {"GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"}:
            findings.append(Finding("ENDPOINT_METHOD_INVALID", "blocking", f"{endpoint.code} has invalid HTTP method", endpoint.provenance))
        if not endpoint.attributes.get("path"):
            findings.append(Finding("ENDPOINT_ROUTE_MISSING", "blocking", f"{endpoint.code} has no endpoint path", endpoint.provenance))
        elif endpoint.code not in screen_endpoint_codes:
            findings.append(Finding("ENDPOINT_WITHOUT_SCREEN", "warning", f"{endpoint.code} is not explicitly associated with a screen", endpoint.provenance))
    for screen_item in catalog.screens:
        route = str(screen_item.attributes.get("route", ""))
        if not route:
            findings.append(Finding("SCREEN_ROUTE_MISSING", "blocking", f"{screen_item.code} has no route", screen_item.provenance))
        elif " o " in route:
            findings.append(Finding("SCREEN_ROUTE_AMBIGUOUS", "warning", f"{screen_item.code} has unresolved alternate routes", screen_item.provenance))
        if not screen_item.attributes.get("endpoints"):
            findings.append(Finding("SCREEN_WITHOUT_ENDPOINT", "warning", f"{screen_item.code} has no explicit endpoint association", screen_item.provenance))
    for code in ("P-10", "P-11"):
        screen = next((x for x in catalog.screens if x.code == code), None)
        if screen and not screen.attributes.get("endpoints"):
            findings.append(Finding("MISSING_ADMIN_ENDPOINT", "warning", f"{code} has no concrete administrative endpoint", screen.provenance))
    screen = next((x for x in catalog.screens if x.code == "P-30"), None)
    if screen and " o " in str(screen.attributes.get("route", "")):
        findings.append(Finding("P30_ALTERNATE_ROUTE", "warning", "P-30 declares alternate routes", screen.provenance))
    attachment = next((x for x in catalog.entities if x.code == "document_attachments"), None)
    version = next((x for x in catalog.entities if x.code == "document_versions"), None)
    if attachment and "version_id" not in attachment.attributes.get("fields", []):
        findings.append(Finding("BR017_ATTACHMENT_VERSION_GAP", "warning", "BR-017 requires attachment version association, but document_attachments has no version_id", attachment.provenance))
    if version and "previous_version_id" not in version.attributes.get("fields", []):
        findings.append(Finding("BR021_PREVIOUS_VERSION_GAP", "warning", "BR-021 requires explicit previous version, but document_versions has no previous_version_id", version.provenance))
    documents = next((x for x in catalog.entities if x.code == "documents"), None)
    if documents and not any("number" in item.code and item.code != "documents" for item in catalog.entities):
        findings.append(Finding("DOCUMENT_NUMBERING_MODEL_GAP", "warning", "Document numbering rule lacks a dedicated numbering model", documents.provenance))
    oirs = next((x for x in catalog.entities if x.code == "oirs_cases"), None)
    if oirs and not any("email" in field or "contact" in field for field in oirs.attributes.get("fields", [])):
        findings.append(Finding("OIRS_CONTACT_MODEL_GAP", "warning", "Anonymous OIRS contact data is not represented on oirs_cases", oirs.provenance))
    if any("-> departments.id" in str(x.attributes.get("foreign_keys")) for x in catalog.entities if x.code == "departments"):
        findings.append(Finding("POTENTIAL_RELATIONSHIP_CYCLE", "warning", "Departments/users foreign keys can require deferred migration ordering"))
    if documents and version:
        findings.append(Finding("POTENTIAL_DOCUMENT_VERSION_CYCLE", "warning", "documents.current_version_id and document_versions.document_id require deferred migration ordering", documents.provenance))
    if artifact_root:
        if not artifact_root.exists():
            findings.append(Finding("ARTIFACT_ROOT_MISSING", "warning", "Artifact root was not found; implementation comparison skipped"))
        else:
            files = [p for p in artifact_root.rglob("*") if p.is_file()]
            implemented = "\n".join(p.read_text(encoding="utf-8", errors="ignore") for p in files)
            missing = [path for path in endpoint_paths if path and path not in implemented]
            if missing:
                findings.append(Finding("SOURCE_MATERIALIZED_DIFFERENCE", "warning", f"{len(missing)} catalog endpoint paths were not found under supplied artifact root"))
            backend = artifact_root / "backend" / "src" / "server.js"
            schema = artifact_root / "db" / "schema.sql"
            frontend = artifact_root / "frontend" / "assets" / "app.js"
            backend_text = backend.read_text(encoding="utf-8", errors="ignore") if backend.exists() else ""
            schema_text = schema.read_text(encoding="utf-8", errors="ignore") if schema.exists() else ""
            frontend_text = frontend.read_text(encoding="utf-8", errors="ignore") if frontend.exists() else ""
            implemented_count = sum(
                1
                for endpoint in catalog.endpoints
                if f'req.method === "{endpoint.attributes.get("method")}" && url.pathname === "{endpoint.attributes.get("path")}"' in backend_text
            )
            if "/api/v1/auth/citizen-login" not in backend_text:
                findings.append(Finding("API002_NOT_IMPLEMENTED", "warning", "Frontend/catalog declares API-002 but backend does not expose citizen-login"))
            if "/api/v1/public/tramites/" not in backend_text or "/requests" not in backend_text:
                findings.append(Finding("API034_ROUTE_DIFFERENCE", "warning", "API-034 documented route differs from the backend request route"))
            if implemented_count < len(catalog.endpoints):
                findings.append(Finding("PARTIAL_ENDPOINT_IMPLEMENTATION", "warning", f"Only {implemented_count} of {len(catalog.endpoints)} catalog endpoint paths are implemented by the backend"))
            generic_tables = len(re.findall(r"CREATE TABLE IF NOT EXISTS \w+ \(id BIGSERIAL PRIMARY KEY, created_at", schema_text))
            if generic_tables:
                findings.append(Finding("GENERIC_DATABASE_TABLES", "warning", f"{generic_tables} materialized tables use only generic audit columns"))
            if "const db =" in backend_text and "DATABASE_URL" not in backend_text:
                findings.append(Finding("MEMORY_PERSISTENCE_ACTIVE", "warning", "Backend persistence is in memory although PostgreSQL is declared by configuration"))
            if frontend_text and "history.pushState" in frontend_text and "/intranet/documents/:id" in frontend_text:
                findings.append(Finding("CATALOG_ROUTES_NOT_EXECUTABLE", "warning", "Frontend embeds route catalog entries but does not expose the documented routes as server routes"))
            if "new-request" in frontend_text and "/intranet/admin/procedure-types" in frontend_text:
                findings.append(Finding("SURFACE_ROUTE_GROUPING_GAP", "warning", "Generated navigation groups administrative and citizen routes together"))
    return findings
