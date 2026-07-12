from __future__ import annotations

import json
from dataclasses import asdict, dataclass, field
from pathlib import Path


@dataclass
class ArchitectureDecision:
    decision_id: str
    title: str
    status: str
    context: str
    decision: str
    alternatives: list[str] = field(default_factory=list)
    consequences: list[str] = field(default_factory=list)
    affected_codes: list[str] = field(default_factory=list)
    source_findings: list[str] = field(default_factory=list)
    implementation_phase: str = ""
    requires_human_approval: bool = False


DECISION_DEFINITIONS: dict[str, dict] = {
    "ADR-001": {
        "title": "Ruta canónica de notificaciones",
        "status": "accepted",
        "context": "P-30 declares alternate routes /notifications or /intranet/notifications",
        "decision": "Use /intranet/notifications for internal users, /portal/notifications for authenticated citizens",
        "alternatives": ["Single route /notifications for all", "Keep both routes as declared"],
        "consequences": [
            "Frontend must implement two distinct route entries",
            "Backend API-040 must serve both surfaces",
            "Navigation menus must differentiate by actor",
        ],
        "affected_codes": ["P-30", "API-040", "M10"],
        "source_findings": ["SCREEN_ROUTE_AMBIGUOUS", "P30_ALTERNATE_ROUTE"],
        "implementation_phase": "Incremento D",
        "requires_human_approval": False,
    },
    "ADR-002": {
        "title": "Administración de tipos de trámite",
        "status": "accepted",
        "context": "P-10 has no concrete administrative endpoint association",
        "decision": "Add GET/POST/PUT /api/v1/admin/procedure-types endpoints",
        "alternatives": ["Embed CRUD in existing document-types endpoint"],
        "consequences": [
            "3 new endpoints added beyond the original 40",
            "Frontend P-10 screen connects to these endpoints",
        ],
        "affected_codes": ["P-10", "M02"],
        "source_findings": ["MISSING_ADMIN_ENDPOINT", "SCREEN_WITHOUT_ENDPOINT"],
        "implementation_phase": "Incremento D",
        "requires_human_approval": False,
    },
    "ADR-003": {
        "title": "Administración de entidades externas",
        "status": "accepted",
        "context": "P-11 has no concrete administrative endpoint association",
        "decision": "Add GET/POST/PUT /api/v1/admin/external-entities endpoints",
        "alternatives": ["Manage external entities through generic admin endpoint"],
        "consequences": [
            "3 new endpoints added beyond the original 40",
            "Frontend P-11 screen connects to these endpoints",
        ],
        "affected_codes": ["P-11", "M02"],
        "source_findings": ["MISSING_ADMIN_ENDPOINT", "SCREEN_WITHOUT_ENDPOINT"],
        "implementation_phase": "Incremento D",
        "requires_human_approval": False,
    },
    "ADR-004": {
        "title": "Login ciudadano",
        "status": "accepted",
        "context": "API-002 (/api/v1/auth/citizen-login) documented but not implemented; frontend declares it",
        "decision": "Keep POST /api/v1/auth/citizen-login as mandatory endpoint; implement as academic simulation initially",
        "alternatives": [
            "Merge with internal login using role parameter",
            "Remove citizen-login and use only internal login",
        ],
        "consequences": [
            "Separate auth flow for citizens",
            "Must differentiate from internal login in backend",
            "Simulation acceptable for v0002",
        ],
        "affected_codes": ["API-002", "P-02", "M01"],
        "source_findings": ["API002_NOT_IMPLEMENTED"],
        "implementation_phase": "Incremento A",
        "requires_human_approval": False,
    },
    "ADR-005": {
        "title": "Creación de solicitud ciudadana",
        "status": "accepted",
        "context": "API-034 documented as POST /api/v1/public/tramites/{id}/requests; backend implements POST /api/v1/citizen/requests",
        "decision": "Define POST /api/v1/public/tramites/{id}/requests as canonical contract; register POST /api/v1/citizen/requests as legacy compatibility endpoint",
        "alternatives": [
            "Accept citizen/requests as canonical",
            "Remove public/tramites variant",
        ],
        "consequences": [
            "Backend must implement both during migration",
            "Frontend P-25 must use canonical route",
            "Legacy endpoint can be deprecated in v0003",
        ],
        "affected_codes": ["API-034", "P-25", "M07"],
        "source_findings": ["API034_ROUTE_DIFFERENCE"],
        "implementation_phase": "Incremento D",
        "requires_human_approval": False,
    },
    "ADR-006": {
        "title": "Anexos asociados a versiones",
        "status": "accepted",
        "context": "BR-017 requires attachment version association; document_attachments lacks version_id",
        "decision": "Add document_version_id (nullable FK to document_versions) to document_attachments",
        "alternatives": [
            "Keep attachments at document level only",
            "Add separate attachment_version table",
        ],
        "consequences": [
            "Schema migration required for document_attachments",
            "New attachments must include version_id",
            "Null allowed for legacy migration",
        ],
        "affected_codes": ["BR-017", "document_attachments", "API-019"],
        "source_findings": ["BR017_ATTACHMENT_VERSION_GAP"],
        "implementation_phase": "Incremento B",
        "requires_human_approval": False,
    },
    "ADR-007": {
        "title": "Referencia a versión anterior",
        "status": "accepted",
        "context": "BR-021 requires explicit previous version reference; document_versions has no previous_version_id",
        "decision": "Add previous_version_id (nullable self-referencing FK) to document_versions",
        "alternatives": [
            "Use created_at ordering to determine previous version",
            "Add sequence number instead of FK",
        ],
        "consequences": [
            "Schema migration required",
            "First version has null previous_version_id",
            "Enables version chain traversal",
        ],
        "affected_codes": ["BR-021", "document_versions", "API-020"],
        "source_findings": ["BR021_PREVIOUS_VERSION_GAP"],
        "implementation_phase": "Incremento B",
        "requires_human_approval": False,
    },
    "ADR-008": {
        "title": "Numeración documental",
        "status": "accepted",
        "context": "Document numbering rule lacks dedicated model",
        "decision": "Add UNIQUE(document_type_id, document_number) constraint; numbering managed by service layer with sequence per document type",
        "alternatives": [
            "Global auto-increment across all types",
            "UUID-based numbering",
        ],
        "consequences": [
            "Unique constraint required at DB level",
            "Service must generate next number per type",
            "Migration needed for existing documents",
        ],
        "affected_codes": ["documents", "M03"],
        "source_findings": ["DOCUMENT_NUMBERING_MODEL_GAP"],
        "implementation_phase": "Incremento B",
        "requires_human_approval": False,
    },
    "ADR-009": {
        "title": "OIRS anónima",
        "status": "accepted",
        "context": "Anonymous OIRS contact data not represented on oirs_cases",
        "decision": "Add contact_name, contact_email, contact_phone, contact_consent (nullable) to oirs_cases; enforce name + (email or phone) + consent for anonymous submissions",
        "alternatives": [
            "Require registration for all OIRS",
            "Keep OIRS authentication-only",
        ],
        "consequences": [
            "Schema migration needed for oirs_cases",
            "Validation service must check anonymous vs authenticated",
            "Frontend P-27 must show/hide contact fields based on auth status",
        ],
        "affected_codes": ["oirs_cases", "API-037", "P-27", "M08"],
        "source_findings": ["OIRS_CONTACT_MODEL_GAP"],
        "implementation_phase": "Incremento D",
        "requires_human_approval": False,
    },
    "ADR-010": {
        "title": "Relación circular usuarios-departamentos",
        "status": "accepted",
        "context": "Departments/users foreign keys require deferred migration ordering",
        "decision": "Create departments without manager; create users with department_id; add manager_user_id via migration; keep both FK nullable during bootstrap",
        "alternatives": [
            "Single migration with circular FK deferred",
            "Remove manager from departments",
        ],
        "consequences": [
            "Three-step migration required",
            "Service layer must validate manager belongs to department",
            "Bootstrap script needed for initial data",
        ],
        "affected_codes": ["departments", "users", "M02"],
        "source_findings": ["POTENTIAL_RELATIONSHIP_CYCLE"],
        "implementation_phase": "Incremento A",
        "requires_human_approval": False,
    },
    "ADR-011": {
        "title": "Relación circular documentos-versiones",
        "status": "accepted",
        "context": "documents.current_version_id and document_versions.document_id require deferred migration ordering",
        "decision": "Create documents without current_version_id; create document_versions; add current_version_id FK via migration",
        "alternatives": [
            "Single migration with deferred FK",
            "Derive current version from MAX(version_number)",
        ],
        "consequences": [
            "Three-step migration required",
            "Document service must update current_version_id on each version creation",
            "Query performance better with explicit FK",
        ],
        "affected_codes": ["documents", "document_versions", "M03"],
        "source_findings": ["POTENTIAL_DOCUMENT_VERSION_CYCLE"],
        "implementation_phase": "Incremento B",
        "requires_human_approval": False,
    },
    "ADR-012": {
        "title": "Cantidad de actores",
        "status": "accepted",
        "context": "Normalizer found 9 actors; previous expectation was 8",
        "decision": "Keep 9 actors. ACT-007 appears twice in source (as two separate table rows) with distinct descriptions; both are valid entries.",
        "alternatives": [
            "Merge into 8 by deduplication",
            "Reduce to 7 by combining visitor and citizen",
        ],
        "consequences": [
            "Actor count is 9, not 8",
            "WorkOrder minimum_scope may need updating in future",
            "Traceability must reference all 9",
        ],
        "affected_codes": ["actors"],
        "source_findings": [],
        "implementation_phase": "base",
        "requires_human_approval": False,
    },
    "ADR-013": {
        "title": "Frontend objetivo",
        "status": "accepted",
        "context": "Current frontend is vanilla JavaScript served by Node HTTP",
        "decision": "Keep vanilla JS as baseline compatibility for v0001; define React as target architecture for v0002; do not implement React in this phase",
        "alternatives": [
            "Rewrite immediately in React",
            "Keep vanilla JS permanently",
        ],
        "consequences": [
            "Frontend must remain functional during transition",
            "React implementation is planned but not executed",
            "Current frontend remains the executable baseline",
        ],
        "affected_codes": ["frontend"],
        "source_findings": ["CATALOG_ROUTES_NOT_EXECUTABLE", "SURFACE_ROUTE_GROUPING_GAP"],
        "implementation_phase": "base",
        "requires_human_approval": False,
    },
    "ADR-014": {
        "title": "Persistencia",
        "status": "accepted",
        "context": "Backend uses in-memory storage; PostgreSQL is declared but not used",
        "decision": "Keep memory as v0001 compatibility; define PostgreSQL as mandatory persistence for QA and v0002 target",
        "alternatives": [
            "Migrate immediately to PostgreSQL",
            "Use SQLite as intermediate",
        ],
        "consequences": [
            "Backend must support both persistence modes during migration",
            "PostgreSQL migration is planned but not executed in this phase",
            "Current in-memory backend remains the executable baseline",
        ],
        "affected_codes": ["backend", "database"],
        "source_findings": ["MEMORY_PERSISTENCE_ACTIVE", "GENERIC_DATABASE_TABLES"],
        "implementation_phase": "base",
        "requires_human_approval": False,
    },
    "ADR-015": {
        "title": "Autenticación e integraciones externas",
        "status": "accepted",
        "context": "Institutional auth, Clave Unica, FirmaGob, SII are referenced but not implemented",
        "decision": "Define all external integrations as academic simulations; do not present as production integrations",
        "alternatives": [
            "Implement real integration",
            "Remove references entirely",
        ],
        "consequences": [
            "Auth flows are simulated with test credentials",
            "No real external API calls are made",
            "Documentation must clearly label simulations",
        ],
        "affected_codes": ["M01", "auth"],
        "source_findings": [],
        "implementation_phase": "base",
        "requires_human_approval": True,
    },
    "ADR-016": {
        "title": "Conteo de endpoints",
        "status": "accepted",
        "context": "Original catalog has 40 endpoints; ADR-002 and ADR-003 add 6 more",
        "decision": "Target contract may exceed 40 endpoints. Track 40 original + additional + legacy + technical endpoints separately.",
        "alternatives": [
            "Force exactly 40 endpoints",
            "Remove ADR-002/003 endpoints",
        ],
        "consequences": [
            "Endpoint count in planning report > 40",
            "Technical endpoints (health, metrics) are not counted in functional total",
            "Traceability must differentiate original vs added",
        ],
        "affected_codes": ["endpoints"],
        "source_findings": ["PARTIAL_ENDPOINT_IMPLEMENTATION"],
        "implementation_phase": "base",
        "requires_human_approval": False,
    },
}

REQUIRED_ADR_IDS = sorted(DECISION_DEFINITIONS.keys())


def generate_decisions(
    project_root: Path,
    work_order: dict,
    catalogs: dict,
    findings: list,
) -> list[ArchitectureDecision]:
    decisions: list[ArchitectureDecision] = []
    for adr_id, defn in DECISION_DEFINITIONS.items():
        decisions.append(
            ArchitectureDecision(
                decision_id=adr_id,
                title=defn["title"],
                status=defn["status"],
                context=defn["context"],
                decision=defn["decision"],
                alternatives=list(defn.get("alternatives", [])),
                consequences=list(defn.get("consequences", [])),
                affected_codes=list(defn.get("affected_codes", [])),
                source_findings=list(defn.get("source_findings", [])),
                implementation_phase=defn.get("implementation_phase", ""),
                requires_human_approval=bool(defn.get("requires_human_approval", False)),
            )
        )
    return decisions


def validate_decisions(
    decisions: list[ArchitectureDecision],
    check_blocking: bool = True,
) -> list[str]:
    errors: list[str] = []

    if not decisions:
        errors.append("No decisions provided")
        return errors

    seen_ids: set[str] = set()
    ids_found: set[str] = set()

    for i, d in enumerate(decisions):
        if not d.decision_id:
            errors.append(f"Decision at index {i} has empty decision_id")
            continue

        if d.decision_id in seen_ids:
            errors.append(f"Duplicate decision_id: {d.decision_id}")
        seen_ids.add(d.decision_id)
        ids_found.add(d.decision_id)

        if not d.context:
            errors.append(f"{d.decision_id}: context is empty")
        if not d.decision:
            errors.append(f"{d.decision_id}: decision is empty")
        if not d.consequences:
            errors.append(f"{d.decision_id}: consequences is empty")

    missing = set(REQUIRED_ADR_IDS) - ids_found
    for adr_id in sorted(missing):
        errors.append(f"Missing required ADR: {adr_id}")

    if check_blocking:
        for d in decisions:
            if d.status == "proposed" and d.decision_id != "ADR-015":
                errors.append(
                    f"{d.decision_id}: blocking check failed — status is 'proposed'"
                )

    return errors


def decisions_to_dict(decisions: list[ArchitectureDecision]) -> list[dict]:
    return [asdict(d) for d in decisions]


def write_decisions(
    output_dir: Path,
    decisions: list[ArchitectureDecision],
) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    file_path = output_dir / "decisions.json"
    data = decisions_to_dict(decisions)
    file_path.write_text(
        json.dumps(data, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )
    return file_path
