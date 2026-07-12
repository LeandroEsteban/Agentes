from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any
from dataclasses import dataclass, field


@dataclass
class RefinementInput:
    source_documents: list[str]
    work_order: dict
    normalization_report: dict
    catalogs: dict[str, Any]


@dataclass
class RefinementOutput:
    approved: bool
    findings_resolved: list[str]
    rejected_findings: list[str]


@dataclass
class ArchitectureInput:
    refinement_output: dict
    catalogs: dict[str, Any]
    work_order: dict


@dataclass
class ArchitectureOutput:
    decisions: list[dict]
    architecture: dict
    tasks: list[dict]
    dag: dict
    agents: list[dict]
    contracts: dict
    handoffs: list[dict]


@dataclass
class DatabaseTaskInput:
    architecture: dict
    er_catalog: dict
    tasks: list[dict]


@dataclass
class DatabaseTaskOutput:
    migrations: list[str]
    seeds: list[str]
    db_tests: list[str]


@dataclass
class BackendTaskInput:
    architecture: dict
    endpoints_catalog: dict
    business_rules_catalog: dict
    tasks: list[dict]


@dataclass
class BackendTaskOutput:
    openapi_spec: str
    controllers: list[str]
    api_tests: list[str]


@dataclass
class FrontendTaskInput:
    architecture: dict
    screens_catalog: dict
    endpoints_catalog: dict
    tasks: list[dict]


@dataclass
class FrontendTaskOutput:
    routes: list[str]
    components: list[str]
    e2e_tests: list[str]


@dataclass
class QATaskInput:
    architecture: dict
    backend_artifacts: list[str]
    frontend_artifacts: list[str]


@dataclass
class QATaskOutput:
    qa_report: str
    coverage_report: str
    deploy_readiness: dict


@dataclass
class HandoffEnvelope:
    schema_version: str = "webforge.handoff.v1"
    handoff_id: str = ""
    run_id: str = ""
    cycle_id: str = ""
    task_id: str = ""
    from_agent: str = ""
    to_agent: str = ""
    input_hashes: dict = field(default_factory=dict)
    artifacts: list[str] = field(default_factory=list)
    required_gates: list[str] = field(default_factory=list)
    status: str = "proposed"
    rejection_reasons: list[str] = field(default_factory=list)
    created_at: str = ""


CONTRACT_SCHEMAS: list[dict] = [
    {
        "name": "RefinementInput",
        "fields": [
            {"name": "source_documents", "type": "list[str]", "required": True, "description": "Source documents to refine"},
            {"name": "work_order", "type": "dict", "required": True, "description": "Work order details"},
            {"name": "normalization_report", "type": "dict", "required": True, "description": "Normalization report data"},
            {"name": "catalogs", "type": "dict[str, Any]", "required": True, "description": "Reference catalogs"},
        ],
    },
    {
        "name": "RefinementOutput",
        "fields": [
            {"name": "approved", "type": "bool", "required": True, "description": "Whether refinement was approved"},
            {"name": "findings_resolved", "type": "list[str]", "required": True, "description": "List of resolved findings"},
            {"name": "rejected_findings", "type": "list[str]", "required": True, "description": "List of rejected findings"},
        ],
    },
    {
        "name": "ArchitectureInput",
        "fields": [
            {"name": "refinement_output", "type": "dict", "required": True, "description": "Output from refinement stage"},
            {"name": "catalogs", "type": "dict[str, Any]", "required": True, "description": "Architecture catalogs"},
            {"name": "work_order", "type": "dict", "required": True, "description": "Work order details"},
        ],
    },
    {
        "name": "ArchitectureOutput",
        "fields": [
            {"name": "decisions", "type": "list[dict]", "required": True, "description": "Architectural decisions made"},
            {"name": "architecture", "type": "dict", "required": True, "description": "Final architecture definition"},
            {"name": "tasks", "type": "list[dict]", "required": True, "description": "Generated tasks"},
            {"name": "dag", "type": "dict", "required": True, "description": "DAG representation of pipeline"},
            {"name": "agents", "type": "list[dict]", "required": True, "description": "Agent definitions"},
            {"name": "contracts", "type": "dict", "required": True, "description": "Contract definitions"},
            {"name": "handoffs", "type": "list[dict]", "required": True, "description": "Handoff definitions"},
        ],
    },
    {
        "name": "DatabaseTaskInput",
        "fields": [
            {"name": "architecture", "type": "dict", "required": True, "description": "Architecture definition"},
            {"name": "er_catalog", "type": "dict", "required": True, "description": "Entity-relationship catalog"},
            {"name": "tasks", "type": "list[dict]", "required": True, "description": "Database tasks to execute"},
        ],
    },
    {
        "name": "DatabaseTaskOutput",
        "fields": [
            {"name": "migrations", "type": "list[str]", "required": True, "description": "Generated migration files"},
            {"name": "seeds", "type": "list[str]", "required": True, "description": "Generated seed files"},
            {"name": "db_tests", "type": "list[str]", "required": True, "description": "Database test files"},
        ],
    },
    {
        "name": "BackendTaskInput",
        "fields": [
            {"name": "architecture", "type": "dict", "required": True, "description": "Architecture definition"},
            {"name": "endpoints_catalog", "type": "dict", "required": True, "description": "API endpoints catalog"},
            {"name": "business_rules_catalog", "type": "dict", "required": True, "description": "Business rules catalog"},
            {"name": "tasks", "type": "list[dict]", "required": True, "description": "Backend tasks to execute"},
        ],
    },
    {
        "name": "BackendTaskOutput",
        "fields": [
            {"name": "openapi_spec", "type": "str", "required": True, "description": "OpenAPI specification string"},
            {"name": "controllers", "type": "list[str]", "required": True, "description": "Generated controller files"},
            {"name": "api_tests", "type": "list[str]", "required": True, "description": "API test files"},
        ],
    },
    {
        "name": "FrontendTaskInput",
        "fields": [
            {"name": "architecture", "type": "dict", "required": True, "description": "Architecture definition"},
            {"name": "screens_catalog", "type": "dict", "required": True, "description": "UI screens catalog"},
            {"name": "endpoints_catalog", "type": "dict", "required": True, "description": "API endpoints catalog"},
            {"name": "tasks", "type": "list[dict]", "required": True, "description": "Frontend tasks to execute"},
        ],
    },
    {
        "name": "FrontendTaskOutput",
        "fields": [
            {"name": "routes", "type": "list[str]", "required": True, "description": "Generated route files"},
            {"name": "components", "type": "list[str]", "required": True, "description": "Generated component files"},
            {"name": "e2e_tests", "type": "list[str]", "required": True, "description": "End-to-end test files"},
        ],
    },
    {
        "name": "QATaskInput",
        "fields": [
            {"name": "architecture", "type": "dict", "required": True, "description": "Architecture definition"},
            {"name": "backend_artifacts", "type": "list[str]", "required": True, "description": "Backend artifact paths"},
            {"name": "frontend_artifacts", "type": "list[str]", "required": True, "description": "Frontend artifact paths"},
        ],
    },
    {
        "name": "QATaskOutput",
        "fields": [
            {"name": "qa_report", "type": "str", "required": True, "description": "QA report string"},
            {"name": "coverage_report", "type": "str", "required": True, "description": "Coverage report string"},
            {"name": "deploy_readiness", "type": "dict", "required": True, "description": "Deployment readiness assessment"},
        ],
    },
    {
        "name": "HandoffEnvelope",
        "fields": [
            {"name": "schema_version", "type": "str", "required": False, "description": "Schema version identifier"},
            {"name": "handoff_id", "type": "str", "required": False, "description": "Unique handoff identifier"},
            {"name": "run_id", "type": "str", "required": False, "description": "Run identifier"},
            {"name": "cycle_id", "type": "str", "required": False, "description": "Cycle identifier"},
            {"name": "task_id", "type": "str", "required": False, "description": "Task identifier"},
            {"name": "from_agent", "type": "str", "required": False, "description": "Source agent name"},
            {"name": "to_agent", "type": "str", "required": False, "description": "Target agent name"},
            {"name": "input_hashes", "type": "dict", "required": False, "description": "Hashes of input data"},
            {"name": "artifacts", "type": "list[str]", "required": False, "description": "List of artifact paths"},
            {"name": "required_gates", "type": "list[str]", "required": False, "description": "Required gate checks"},
            {"name": "status", "type": "str", "required": False, "description": "Handoff status"},
            {"name": "rejection_reasons", "type": "list[str]", "required": False, "description": "Rejection reasons"},
            {"name": "created_at", "type": "str", "required": False, "description": "Creation timestamp"},
        ],
    },
]


def validate_handoff_envelope(envelope: dict) -> list[str]:
    errors: list[str] = []

    if not envelope.get("handoff_id"):
        errors.append("handoff_id is required and must be non-empty")

    if not envelope.get("from_agent"):
        errors.append("from_agent is required and must be non-empty")

    if not envelope.get("to_agent"):
        errors.append("to_agent is required and must be non-empty")

    status = envelope.get("status", "")
    valid_statuses = {"proposed", "accepted", "rejected"}
    if status not in valid_statuses:
        errors.append(f"status must be one of {', '.join(sorted(valid_statuses))}, got '{status}'")

    artifacts = envelope.get("artifacts")
    if artifacts is not None and not isinstance(artifacts, list):
        errors.append("artifacts must be a list")

    required_gates = envelope.get("required_gates")
    if required_gates is not None and not isinstance(required_gates, list):
        errors.append("required_gates must be a list")

    if status == "rejected":
        rejection_reasons = envelope.get("rejection_reasons", [])
        if not isinstance(rejection_reasons, list) or len(rejection_reasons) == 0:
            errors.append("rejection_reasons must be a non-empty list when status is 'rejected'")

    return errors


def validate_contract(contract_name: str, data: dict) -> list[str]:
    errors: list[str] = []

    if contract_name == "RefinementInput":
        source_docs = data.get("source_documents")
        if not source_docs or not isinstance(source_docs, list) or len(source_docs) == 0:
            errors.append("RefinementInput.source_documents must be a non-empty list")

    elif contract_name == "ArchitectureOutput":
        decisions = data.get("decisions")
        if decisions is None or not isinstance(decisions, list):
            errors.append("ArchitectureOutput.decisions must be a list")

        tasks = data.get("tasks")
        if tasks is None or not isinstance(tasks, list):
            errors.append("ArchitectureOutput.tasks must be a list")

    for schema in CONTRACT_SCHEMAS:
        if schema["name"] == contract_name:
            for field_info in schema["fields"]:
                if field_info["required"]:
                    if field_info["name"] not in data:
                        errors.append(f"{contract_name}.{field_info['name']} is required but missing")
            break
    else:
        errors.append(f"Unknown contract: {contract_name}")

    return errors


def write_contracts(output_dir: Path) -> Path:
    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "contracts.json"

    schemas = []
    for schema in CONTRACT_SCHEMAS:
        properties = {}
        required_fields = []
        for field_info in schema["fields"]:
            properties[field_info["name"]] = {
                "type": field_info["type"],
                "description": field_info["description"],
            }
            if field_info["required"]:
                required_fields.append(field_info["name"])

        json_schema = {
            "title": schema["name"],
            "type": "object",
            "properties": properties,
        }
        if required_fields:
            json_schema["required"] = required_fields

        schemas.append(json_schema)

    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(schemas, f, indent=2)

    return output_path


def contracts_to_dict() -> dict:
    result = {}
    for schema in CONTRACT_SCHEMAS:
        result[schema["name"]] = {
            "name": schema["name"],
            "fields": [
                {
                    "name": f["name"],
                    "type": f["type"],
                    "required": f["required"],
                    "description": f["description"],
                }
                for f in schema["fields"]
            ],
        }
    return result
