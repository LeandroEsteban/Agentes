from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

AGENT_SCHEMA = "webforge.agent_spec.v1"

SPECIALIZED_AGENTS: list[dict[str, Any]] = [
    {
        "agent_id": "agent.refinement",
        "name": "Refinement Agent",
        "responsibility": "Consumir catálogos normalizados, revisar findings, verificar decisiones pendientes, no inventar requisitos, entregar especificación aprobada al arquitecto",
        "inputs": ["normalization catalogs JSON", "normalization report", "normalization findings", "work order"],
        "outputs": ["refined spec", "approved findings resolution", "specification approval"],
        "allowed_tools": ["tool.read_catalog", "tool.validate_findings"],
        "forbidden_actions": ["invent_requirements", "modify_sources"],
        "entry_gate": "GATE-ARCH-001",
        "exit_gate": "specification_approved",
        "handoff_targets": ["agent.architecture"],
        "failure_policy": "stop",
        "max_attempts": 1,
    },
    {
        "agent_id": "agent.architecture",
        "name": "Architecture Agent",
        "responsibility": "Generar arquitectura, crear ADR, generar tareas, generar DAG, validar dependencias, asignar tareas a agentes, definir criterios de finalización",
        "inputs": ["refined spec", "normalization catalogs", "architecture decisions template"],
        "outputs": ["architecture.json", "decisions.json", "tasks.json", "task-dag.json", "agents.json", "contracts.json", "handoff-plan.json"],
        "allowed_tools": ["tool.generate_adr", "tool.validate_dag", "tool.validate_tasks", "tool.validate_handoffs"],
        "forbidden_actions": ["implement_code", "modify_database"],
        "entry_gate": "specification_approved",
        "exit_gate": "architecture_approved",
        "handoff_targets": ["agent.database", "agent.backend", "agent.frontend", "agent.qa_release"],
        "failure_policy": "stop",
        "max_attempts": 2,
    },
    {
        "agent_id": "agent.database",
        "name": "Database Agent",
        "responsibility": "Migraciones, 40 tablas, seeds, restricciones, índices, pruebas DB. En esta fase solo se define el contrato del agente.",
        "inputs": ["architecture.json", "tasks-db.json", "ER model catalog"],
        "outputs": ["database migrations", "seed scripts", "DB tests"],
        "allowed_tools": ["tool.generate_migration", "tool.generate_seed", "tool.validate_schema"],
        "forbidden_actions": ["modify_frontend", "deploy_to_production"],
        "entry_gate": "architecture_approved",
        "exit_gate": "database_ready",
        "handoff_targets": ["agent.backend", "agent.qa_release"],
        "failure_policy": "retry",
        "max_attempts": 3,
    },
    {
        "agent_id": "agent.backend",
        "name": "Backend Agent",
        "responsibility": "OpenAPI, endpoints, autorización, reglas, validaciones, pruebas API. En esta fase solo se define el contrato del agente.",
        "inputs": ["architecture.json", "tasks-api.json", "endpoints catalog", "business rules catalog"],
        "outputs": ["OpenAPI spec", "backend controllers", "API tests"],
        "allowed_tools": ["tool.generate_openapi", "tool.generate_controller", "tool.validate_api"],
        "forbidden_actions": ["modify_frontend", "modify_database_schema"],
        "entry_gate": "architecture_approved",
        "exit_gate": "backend_ready",
        "handoff_targets": ["agent.frontend", "agent.qa_release"],
        "failure_policy": "retry",
        "max_attempts": 3,
    },
    {
        "agent_id": "agent.frontend",
        "name": "Frontend Agent",
        "responsibility": "30 rutas, componentes, guards, conexión API, E2E. En esta fase solo se define el contrato del agente.",
        "inputs": ["architecture.json", "tasks-ui.json", "screens catalog", "endpoints catalog"],
        "outputs": ["React routes", "UI components", "E2E tests"],
        "allowed_tools": ["tool.generate_component", "tool.generate_route", "tool.validate_frontend"],
        "forbidden_actions": ["modify_database", "modify_backend_business_logic"],
        "entry_gate": "backend_ready || architecture_approved",
        "exit_gate": "frontend_ready",
        "handoff_targets": ["agent.qa_release"],
        "failure_policy": "retry",
        "max_attempts": 3,
    },
    {
        "agent_id": "agent.qa_release",
        "name": "QA / Release Agent",
        "responsibility": "Build, lint, pruebas, cobertura, promoción a QA, health check, readiness EC2. En esta fase solo se define el contrato del agente.",
        "inputs": ["architecture.json", "tasks-qa.json", "backend artifacts", "frontend artifacts"],
        "outputs": ["QA report", "coverage report", "deploy readiness", "health check"],
        "allowed_tools": ["tool.run_tests", "tool.check_coverage", "tool.validate_deploy"],
        "forbidden_actions": ["modify_source_code", "deploy_to_production", "access_credentials"],
        "entry_gate": "backend_ready && frontend_ready",
        "exit_gate": "release_approved",
        "handoff_targets": ["human_reviewer"],
        "failure_policy": "stop",
        "max_attempts": 2,
    },
]

ALL_AGENT_IDS = {a["agent_id"] for a in SPECIALIZED_AGENTS}
VALID_HANDOFF_TARGETS = ALL_AGENT_IDS | {"human_reviewer"}


def generate_agents() -> list[dict[str, Any]]:
    return [dict(a) for a in SPECIALIZED_AGENTS]


def validate_agents(agents: list[dict[str, Any]]) -> list[str]:
    errors: list[str] = []

    if not agents:
        errors.append("No agents provided")
        return errors

    seen_ids: set[str] = set()
    valid_ids = {a["agent_id"] for a in agents}
    valid_handoff_targets = valid_ids | {"human_reviewer"}

    for i, agent in enumerate(agents):
        agent_id = agent.get("agent_id", "")

        if not agent_id:
            errors.append(f"Agent at index {i} has empty agent_id")
            continue

        if agent_id in seen_ids:
            errors.append(f"Duplicate agent_id: {agent_id}")
        seen_ids.add(agent_id)

        if not agent.get("responsibility"):
            errors.append(f"{agent_id}: responsibility is empty")
        if not agent.get("entry_gate"):
            errors.append(f"{agent_id}: entry_gate is empty")
        if not agent.get("exit_gate"):
            errors.append(f"{agent_id}: exit_gate is empty")
        if not agent.get("failure_policy"):
            errors.append(f"{agent_id}: failure_policy is empty")

        handoff_targets = agent.get("handoff_targets", [])
        for target in handoff_targets:
            if target not in valid_handoff_targets:
                errors.append(f"{agent_id}: handoff_target '{target}' is not a valid agent_id or 'human_reviewer'")

        if not agent.get("allowed_tools"):
            errors.append(f"{agent_id}: allowed_tools is empty — must have at least 1 tool")

        if "forbidden_actions" not in agent:
            errors.append(f"{agent_id}: forbidden_actions is missing")

        max_attempts = agent.get("max_attempts", 0)
        if max_attempts < 1:
            errors.append(f"{agent_id}: max_attempts ({max_attempts}) must be >= 1")

    return errors


def write_agents(output_dir: Path, agents: list[dict[str, Any]]) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "agents.json"
    data = {
        "schema": AGENT_SCHEMA,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "agents": agents,
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return output_path
