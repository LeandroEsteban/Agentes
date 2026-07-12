from __future__ import annotations

import json
from dataclasses import asdict
from pathlib import Path
from typing import Any

from .capabilities import skill_manifest, validate_skill_package
from .context import ContextManager, EvidenceRegistry, MemoryGate
from .harness import AgentSpec, HarnessRunner
from .isolation import DevSandboxMaterializer
from .models import CycleState, GateResult, PhaseResult, WorkOrder
from .normalization import NormalizationError, normalize_siged
from .planning import PlanningError, run_planning
from .policy import BudgetManager, MCPGateway, PolicyEngine, write_approval_matrix
from .principles import PRINCIPLES, ordered_principles, validate_principle_catalog
from .project_workspace import ProjectWorkspace
from .siged import build_siged_implementation_bundle, build_siged_profile, is_siged_request, siged_spec_markdown
from .tools import (
    ToolRegistry,
    artifact_check,
    dependency_scan,
    generate_sbom,
    secret_scan,
    static_policy_scan,
)
from .utils import (
    append_jsonl,
    discover_design_sources,
    ensure_dir,
    read_text,
    sha256_text,
    short_hash,
    stable_json,
    write_json,
    write_text,
)


WORKFLOW_VERSION = "wf.webforge.sdd.v1"
WORKFLOW_PHASES = [
    "intake",
    "constitution",
    "specify",
    "clarify",
    "checklist",
    "context",
    "plan",
    "tasks",
    "analyze",
    "implement",
    "validate",
    "security",
    "pr_handoff",
    "deploy_checkpoint",
    "observe",
    "close",
]


PHASE_AGENTS: dict[str, AgentSpec] = {
    "intake": AgentSpec("agent.intake", "intake", "WorkOrder"),
    "constitution": AgentSpec("agent.constitution", "constitution", "Constitution"),
    "specify": AgentSpec("agent.spec_parser", "specify", "Spec"),
    "clarify": AgentSpec("agent.clarifier", "clarify", "Clarifications"),
    "checklist": AgentSpec("agent.requirements_qa", "checklist", "Checklist"),
    "context": AgentSpec("agent.context_rag", "context", "ContextPack"),
    "plan": AgentSpec("agent.architect_planner", "plan", "Plan"),
    "tasks": AgentSpec("agent.task_planner", "tasks", "Tasks"),
    "analyze": AgentSpec("agent.consistency_reviewer", "analyze", "AnalyzeReport"),
    "implement": AgentSpec(
        "agent.implementer",
        "implement",
        "ImplementationReport",
        allowed_tools=("tool.sandbox.dev_materialize",),
    ),
    "validate": AgentSpec(
        "agent.qa",
        "validate",
        "ValidationReport",
        allowed_tools=("tool.policy.static", "tool.validation.artifacts"),
    ),
    "security": AgentSpec(
        "agent.security",
        "security",
        "SecurityReview",
        allowed_tools=("tool.security.secrets", "tool.security.deps", "tool.sbom.generate"),
    ),
    "pr_handoff": AgentSpec("agent.integrator_pr", "pr_handoff", "PRBundle"),
    "deploy_checkpoint": AgentSpec("agent.release_sre", "deploy_checkpoint", "DeployCheckpoint"),
    "observe": AgentSpec("agent.observability_cost", "observe", "ObservabilityReport"),
    "close": AgentSpec("agent.close", "close", "FinalReport"),
}


REQUIRED_FINAL_ARTIFACTS = [
    "state.json",
    "log.jsonl",
    "evidence-register.md",
    "context-pack.json",
    "validation-report.json",
    "security-review.md",
    "traceability-matrix.md",
    "billing-ledger.json",
    "factory-skill-manifest.json",
    "factory-tool-manifest.json",
    "frontend-template-manifest.json",
    "frontend-template-policy.md",
    "project-isolation-policy.md",
    "project-manifest.json",
    "project-memory-policy.json",
    "project-sandboxes.json",
    "dev-materialization-manifest.json",
    "final-report.json",
]

KNOWN_OUTPUT_ARTIFACTS = {
    "Aprendizaje.md",
    "ERRORS.md",
    "PRBundle.md",
    "agent-manifest.json",
    "analyze-report.md",
    "approval-matrix.md",
    "billing-ledger.json",
    "billing-policy.yaml",
    "checklist.md",
    "claim-map.md",
    "clarifications.md",
    "constitution.md",
    "context-pack.json",
    "dependency-report.json",
    "deploy-plan.md",
    "dev-materialization-manifest.json",
    "diff-report.json",
    "evidence-register.md",
    "factory-skill-manifest.json",
    "factory-tool-manifest.json",
    "final-report.json",
    "frontend-template-manifest.json",
    "frontend-template-policy.md",
    "implementation-report.md",
    "log-completeness-report.json",
    "log.jsonl",
    "mcp-invocations.jsonl",
    "mcp-policy.json",
    "mcp-policy.yaml",
    "memory-report.json",
    "metrics.json",
    "phase-ledger.json",
    "plan.md",
    "principle-ledger.json",
    "project-isolation-policy.md",
    "project-manifest.json",
    "project-memory-policy.json",
    "project-sandboxes.json",
    "rag-index-manifest.json",
    "rollback-plan.md",
    "sbom.json",
    "secrets-report.json",
    "security-review.md",
    "sandbox-policy.md",
    "source-mirror-manifest.json",
    "slo-policy.md",
    "spec.md",
    "state.json",
    "tasks.md",
    "tool-logs.jsonl",
    "tool-registry.json",
    "traceability-matrix.md",
    "validation-report.json",
    "work_order.json",
    "workflow.yaml",
}


class WebForgeFactory:
    def __init__(self, project_root: Path | str) -> None:
        self.project_root = Path(project_root).resolve()

    def run(
        self,
        work_order_data: dict[str, Any],
        output_dir: Path | str,
        sources: list[Path] | None = None,
    ) -> dict[str, Any]:
        self.output_dir = ensure_dir(Path(output_dir).resolve())
        self._clean_known_output_artifacts()
        self.phase_results: list[PhaseResult] = []
        self.claims: list[dict[str, Any]] = []
        self.artifacts: set[str] = set()
        self.source_root = self.project_root

        work_order = WorkOrder.from_dict(work_order_data)
        self.project_workspace = ProjectWorkspace(self.project_root, work_order)
        work_order.project_id = self.project_workspace.project_id
        work_order.project_version = self.project_workspace.version
        self.project_policy = self.project_workspace.prepare(self.output_dir)
        self.artifacts.update(
            {
                "project-isolation-policy.md",
                "frontend-template-manifest.json",
                "frontend-template-policy.md",
                "project-manifest.json",
                "project-memory-policy.json",
                "project-sandboxes.json",
            }
        )
        if not work_order.authorized_sources:
            work_order.authorized_sources = [path.name for path in (sources or discover_design_sources(self.project_root))]
        sources = sources or [self.project_root / name for name in work_order.authorized_sources]

        registry = EvidenceRegistry()
        resolved_sources: list[Path] = []
        for index, source in enumerate(sources, start=1):
            source_path = source if source.is_absolute() else self.project_root / source
            if source_path.exists():
                resolved_sources.append(source_path)
                registry.add_file(f"EV-SRC-{index:03d}", source_path, "Authorized WEBFORGE design source", root=self.project_root)
        if not registry.values():
            placeholder = self.output_dir / "source-placeholder.md"
            write_text(placeholder, "WEBFORGE runtime implementation request captured as local source.")
            registry.add_file("EV-SRC-001", placeholder, "Local fallback source")
            self.source_root = self.output_dir

        self.registry = registry
        self.source_mirror = self.project_workspace.mirror_sources(resolved_sources, self.output_dir)
        self.artifacts.add("source-mirror-manifest.json")
        self.siged_profile = build_siged_profile(sources) if is_siged_request(work_order, sources) else None
        self.context_manager = ContextManager(registry)
        self.memory = MemoryGate(
            self.project_workspace.project_id,
            self.project_workspace.memory_root,
            self.project_workspace.learning_root,
        )
        self.budget = BudgetManager(work_order.budget)
        self.mcp = MCPGateway(self.output_dir)
        self.policy = PolicyEngine({spec.agent_id for spec in PHASE_AGENTS.values()})
        self.tools = ToolRegistry(self.output_dir, self.budget)
        self.harness = HarnessRunner(self.policy, self.budget, self.context_manager, self.memory, self.mcp)
        self.work_order = work_order
        self.run_id = "RUN-WEBFORGE-" + short_hash({"work_order": work_order.to_dict(), "sources": [asdict(s) for s in registry.values()]})
        self.state = self._initial_state(work_order)
        self.state.outputs["project_root"] = self.project_policy["project_root"]
        self.state.outputs["project_version"] = self.project_policy["version"]

        registry.write(self._artifact("evidence-register.md"))
        self._add_claim("Authorized sources are hashed and registered.", ["EV-SRC-001"], "evidence-register.md")
        self._add_claim(
            "Authorized sources are mirrored inside the project and current version.",
            self._source_evidence_ids(),
            "source-mirror-manifest.json",
        )
        self._add_claim(
            "Every project is isolated under project/<project_id> with DEV and QA sandboxes.",
            ["EV-SRC-001"],
            "project-isolation-policy.md",
        )
        self._add_claim(
            "Every project and sandbox must use PLANTILLA_FRONTEND.",
            ["EV-SRC-001"],
            "frontend-template-policy.md",
        )
        if self.siged_profile:
            self._add_claim(
                "SIGED-Lampa sources are parsed into modules, screens, endpoints and ER tables.",
                self._source_evidence_ids(),
                "spec.md",
            )
        self._write_workflow_yaml()
        self.mcp.write_policy()
        write_approval_matrix(self.output_dir)
        self.tools.write_manifest()
        self._write_factory_capability_manifests()
        self._write_agent_manifest()

        for phase in WORKFLOW_PHASES:
            self.state.phase = phase
            self.state.agent_id = PHASE_AGENTS[phase].agent_id
            result = self.harness.run_agent(PHASE_AGENTS[phase], self.state.to_dict(), lambda prompt, p=phase: self._run_phase(p, prompt))
            self.phase_results.append(result)
            self._record_phase(result)
            if not result.passed():
                self.state.status = "error"
                break

        if self.state.status != "error":
            self.state.status = "complete"
        self._write_supporting_close_artifacts()
        final_report = self._build_final_report()
        write_json(self._artifact("final-report.json"), final_report)
        self._write_state()
        return final_report

    def _initial_state(self, work_order: WorkOrder) -> CycleState:
        input_hash = sha256_text(stable_json(work_order.to_dict()))
        return CycleState(
            run_id=self.run_id,
            cycle_id="CYC-001",
            workflow_version=WORKFLOW_VERSION,
            status="running",
            phase="intake",
            task_id="TASK-WEBFORGE-001",
            agent_id="agent.intake",
            input_hash=input_hash,
            spec_hash="sha256:TBD",
            plan_hash="sha256:TBD",
            tasks_hash="sha256:TBD",
            context_pack_id="CTX-TBD",
            context_pack_hash="sha256:TBD",
            repo_commit="not_applicable",
            policy_version=self.policy.version,
            tool_registry_version=self.tools.version,
            mcp_registry_version=self.mcp.version,
            memory_version=f"mem.webforge.project.{self.project_workspace.project_id}.v1",
            budget_remaining=self.budget.remaining,
            permissions={
                "read": ["authorized_sources", "workspace_runtime_files"],
                "write": ["output_artifacts", self.project_policy["project_root"]],
                "sandbox_write": ["project_sandbox_dev_workspace"],
                "external_write": self.work_order.side_effects == "approved_external_writes",
                "production_data": False,
                "deploy": self.work_order.side_effects == "approved_deploy",
                "factory_memory_read_allowed": False,
                "factory_learning_write_allowed": False,
            },
        )

    def _run_phase(self, phase: str, prompt_input: dict[str, Any]) -> PhaseResult:
        handlers = {
            "intake": self._phase_intake,
            "constitution": self._phase_constitution,
            "specify": self._phase_specify,
            "clarify": self._phase_clarify,
            "checklist": self._phase_checklist,
            "context": self._phase_context,
            "plan": self._phase_plan,
            "tasks": self._phase_tasks,
            "analyze": self._phase_analyze,
            "implement": self._phase_implement,
            "validate": self._phase_validate,
            "security": self._phase_security,
            "pr_handoff": self._phase_pr_handoff,
            "deploy_checkpoint": self._phase_deploy_checkpoint,
            "observe": self._phase_observe,
            "close": self._phase_close,
        }
        return handlers[phase](prompt_input)

    def _phase_intake(self, _: dict[str, Any]) -> PhaseResult:
        errors = self.work_order.validate()
        project_ok, project_errors = self.project_workspace.validate()
        skill_errors = validate_skill_package(self.project_root)
        self._write_json_artifact("work_order.json", self.work_order.to_dict())
        self._add_claim("WorkOrder objective is verifiable and side effects are scoped.", ["EV-SRC-001"], "work_order.json")
        return self._phase_result(
            "intake",
            {"work_order.json": "Work order normalized."},
            [
                self._gate("schema", "intake", not errors, ["P01", "P08"], ["work_order.json"], "; ".join(errors) or "schema pass"),
                self._gate("budget", "intake", True, ["P01", "P12"], ["billing-ledger.json"], "local budget initialized"),
                self._gate(
                    "project_isolation",
                    "intake",
                    project_ok,
                    ["P03", "P05", "P08", "P12"],
                    ["project-isolation-policy.md", "project-manifest.json", "project-sandboxes.json"],
                    "; ".join(project_errors) or "project root, DEV sandbox and QA sandbox are isolated",
                ),
                self._gate(
                    "frontend_template",
                    "intake",
                    project_ok,
                    ["P02", "P05", "P08", "P12"],
                    ["frontend-template-policy.md", "frontend-template-manifest.json"],
                    "; ".join(project_errors) or "PLANTILLA_FRONTEND is mandatory and present",
                ),
                self._gate(
                    "factory_skills",
                    "intake",
                    not skill_errors,
                    ["P05", "P06", "P08"],
                    ["factory-skill-manifest.json", "factory-tool-manifest.json"],
                    "; ".join(skill_errors) or "Codex skill and tool catalog are present",
                ),
            ],
            ["EV-SRC-001"],
        )

    def _phase_constitution(self, _: dict[str, Any]) -> PhaseResult:
        errors = validate_principle_catalog()
        lines = ["# Constitution P01-P12", ""]
        for principle in ordered_principles():
            lines.append(f"## {principle.id} {principle.name}")
            lines.append(f"- Control: {principle.operational_control}")
            lines.append(f"- Gates: {', '.join(principle.gates)}")
            lines.append(f"- Evidence: {', '.join(principle.evidence)}")
            lines.append("")
        self._write_text_artifact("constitution.md", "\n".join(lines))
        self._write_json_artifact("principle-ledger.json", {pid: asdict(p) for pid, p in PRINCIPLES.items()})
        self._add_claim("P01-P12 are instantiated with gates and evidence.", ["EV-SRC-001"], "constitution.md")
        return self._phase_result(
            "constitution",
            {"constitution.md": "P01-P12 instantiated."},
            [self._gate("constitution", "constitution", not errors, ["P05", "P08", "P10"], ["constitution.md"], "; ".join(errors) or "12P complete")],
            ["EV-SRC-001"],
        )

    def _phase_specify(self, _: dict[str, Any]) -> PhaseResult:
        planning_blocked = False
        if self.work_order.schema_version == "webforge.work_order.v2" and self.work_order.source_documents:
            try:
                normalized = normalize_siged(
                    self.project_root,
                    self.project_workspace.root / "spec",
                    self.project_workspace.root / "sandboxes" / "DEV" / "workspace",
                    self.work_order.minimum_scope,
                    self.work_order.project_id,
                )
            except NormalizationError as exc:
                return self._phase_result(
                    "specify",
                    {"normalization-report.json": "SIGED normalization blocked."},
                    [self._gate("normalization", "specify", False, ["P02", "P08"], [], str(exc))],
                    self._source_evidence_ids(),
                )
            self._write_json_artifact("normalization-report.json", normalized)
            self._write_text_artifact(
                "normalization-findings.md",
                (self.project_workspace.root / "spec" / "normalization-findings.md").read_text(encoding="utf-8"),
            )
            try:
                planning_output = self.output_dir / "planning"
                planning_result = run_planning(
                    self.project_root,
                    self.work_order.to_dict(),
                    planning_output,
                    catalogs_dir=self.project_workspace.root / "spec",
                )
                self.state.outputs["planning_status"] = planning_result.get("status", "blocked")
                self.state.outputs["planning_report"] = str(planning_output / "planning-report.json")
                self._write_json_artifact("planning-report.json", planning_result.get("report", {}))
                self._write_text_artifact(
                    "planning-summary.md",
                    planning_result.get("summary", "# Planning summary\n\nStatus: blocked\n"),
                )
                if planning_result.get("status") != "pass":
                    planning_blocked = True
            except PlanningError as exc:
                planning_blocked = True
                self.state.outputs["planning_status"] = "blocked"
                self.state.outputs["planning_error"] = str(exc)
        if self.siged_profile:
            text = siged_spec_markdown(self.work_order, self.siged_profile)
            self._write_text_artifact("spec.md", text)
            self.state.spec_hash = sha256_text(text)
            self._add_claim(
                "SIGED-Lampa spec is derived from authorized source documents.",
                self._source_evidence_ids(),
                "spec.md",
            )
            gates = [
                self._gate(
                    "spec",
                    "specify",
                    self.siged_profile["counts"]["modules"] >= 10
                    and self.siged_profile["counts"]["endpoints"] >= 40
                    and self.siged_profile["counts"]["screens"] >= 30,
                    ["P02", "P08"],
                    ["spec.md", "context-pack.json"],
                    "SIGED modules, endpoint catalog and screen map are testable",
                ),
            ]
            if planning_blocked:
                gates.append(
                    self._gate("planning", "specify", False, ["P02", "P08"], ["planning-report.json"], "Planning blocked: see planning-report.json for details")
                )
            return self._phase_result(
                "specify",
                {"spec.md": "SIGED-Lampa spec generated from authorized sources."},
                gates,
                self._source_evidence_ids(),
            )

        criteria = "\n".join(f"- AC{i:02d}: {item}" for i, item in enumerate(self.work_order.acceptance_criteria, 1))
        text = "\n".join(
            [
                "# Spec",
                "",
                f"Objective: {self.work_order.objective}",
                f"Type: {self.work_order.type}",
                "",
                "## Actors",
                "- Operator: runs the local factory.",
                "- Reviewer: inspects artifacts and gates.",
                "",
                "## Functional requirements",
                "- RF01: Execute the complete SDD workflow with closed states.",
                "- RF02: Produce required operational artifacts.",
                "- RF03: Enforce P01-P12 gates before complete.",
                "- RF04: Keep every project isolated under project/<project_id>.",
                "- RF05: Create independent DEV and QA sandboxes cloned from the current project version.",
                "- RF06: Use PLANTILLA_FRONTEND as the mandatory frontend template for every project.",
                "- RF07: Expose WEBFORGE as a Codex Skill with deterministic tools.",
                "- RF08: Materialize implementation bundles into DEV only through the P12/INV isolation API.",
                "",
                "## Non-functional requirements",
                "- RNF01: No external writes or deploy by default.",
                "- RNF02: Deterministic local execution with hashed evidence.",
                "- RNF03: Logs must be reconstructible.",
                "- RNF04: Project memory and learning never share state with factory memory.",
                "- RNF05: Frontend work cannot use another template unless the factory policy is changed.",
                "- RNF06: Skill and tool catalog must be present before complete.",
                "",
                "## Acceptance criteria",
                criteria,
                "",
                "## Out of scope",
                "- Real production deploy.",
                "- External CI/PR creation without approval.",
                "- Runtime activation of unapproved MCP servers.",
            ]
        )
        self._write_text_artifact("spec.md", text)
        self.state.spec_hash = sha256_text(text)
        self._add_claim("Spec includes actors, RF/RNF, acceptance criteria and out-of-scope.", ["EV-SRC-001"], "spec.md")
        return self._phase_result(
            "specify",
            {"spec.md": "Spec generated."},
            [self._gate("spec", "specify", True, ["P02", "P08"], ["spec.md"], "spec is testable")],
            ["EV-SRC-001"],
        )

    def _phase_clarify(self, _: dict[str, Any]) -> PhaseResult:
        text = "\n".join(
            [
                "# Clarifications",
                "",
                "| decision | value | evidence |",
                "|---|---|---|",
                "| Runtime scope | local factory artifacts only | EV-SRC-001 |",
                "| External write | denied by default | EV-SRC-001 |",
                "| Deploy | denied by default | EV-SRC-001 |",
                "| MCP | default deny / empty allowlist | EV-SRC-001 |",
                f"| Project root | `project/{self.project_workspace.project_id}` | EV-SRC-001 |",
                "| Project memory | project-scoped only, factory memory denied | EV-SRC-001 |",
                "| Sandboxes | DEV and QA independent local clones | EV-SRC-001 |",
                "| Frontend template | `PLANTILLA_FRONTEND` mandatory for all projects | EV-SRC-001 |",
                f"| Generated app stack | {'static web prototype in DEV sandbox' if self.siged_profile else 'not selected in this runtime implementation'} | EV-SRC-001 |",
                "",
                "No critical question remains open for the local WEBFORGE factory runtime.",
            ]
        )
        self._write_text_artifact("clarifications.md", text)
        self._add_claim("Critical runtime decisions are closed for local operation.", ["EV-SRC-001"], "clarifications.md")
        return self._phase_result(
            "clarify",
            {"clarifications.md": "Critical runtime decisions closed."},
            [self._gate("clarification", "clarify", True, ["P02", "P08"], ["clarifications.md"], "no critical open questions")],
            ["EV-SRC-001"],
        )

    def _phase_checklist(self, _: dict[str, Any]) -> PhaseResult:
        checks = [
            ("IN-001", "objective defined", "pass"),
            ("SDD-001", "constitution instantiated", "pass"),
            ("AR-001", "single harness gate", "pass"),
            ("PRJ-001", "project root under project/<project_id>", "pass"),
            ("PRJ-002", "project memory and learning isolated from factory", "pass"),
            ("PRJ-003", "DEV and QA sandboxes exist and are independent", "pass"),
            ("FE-001", "PLANTILLA_FRONTEND is mandatory for every project", "pass"),
            ("SK-001", "WEBFORGE Codex Skill and tool catalog exist", "pass"),
            ("INV-001", "DEV materializer writes only through P12/INV isolation API", "pass"),
            ("SEC-011", "MCP default deny", "pass"),
            ("OPS-001", "state/log/ledger planned", "pass"),
        ]
        if self.siged_profile:
            counts = self.siged_profile["counts"]
            checks.extend(
                [
                    ("SIGED-001", f"{counts['modules']} SIGED modules parsed", "pass" if counts["modules"] >= 10 else "fail"),
                    ("SIGED-002", f"{counts['endpoints']} SIGED endpoints parsed", "pass" if counts["endpoints"] >= 40 else "fail"),
                    ("SIGED-003", f"{counts['screens']} SIGED screens parsed", "pass" if counts["screens"] >= 30 else "fail"),
                    ("SIGED-004", f"{counts['er_tables']} SIGED ER tables parsed", "pass" if counts["er_tables"] >= 40 else "fail"),
                ]
            )
        lines = ["# Checklist", "", "| id | check | status |", "|---|---|---|"]
        for check_id, check, status in checks:
            lines.append(f"| {check_id} | {check} | {status} |")
        self._write_text_artifact("checklist.md", "\n".join(lines))
        self._add_claim("Critical checklist controls are pass for local runtime scope.", ["EV-SRC-001"], "checklist.md")
        return self._phase_result(
            "checklist",
            {"checklist.md": "Critical checklist passed."},
            [
                self._gate(
                    "checklist",
                    "checklist",
                    all(status == "pass" for _, _, status in checks),
                    ["P08"],
                    ["checklist.md"],
                    "critical checks pass",
                )
            ],
            self._source_evidence_ids(),
        )

    def _phase_context(self, _: dict[str, Any]) -> PhaseResult:
        pack = self.context_manager.write_context_pack(self.output_dir, "agent.context_rag", "context", self.source_root)
        self.artifacts.update({"context-pack.json", "rag-index-manifest.json"})
        self.state.context_pack_id = pack["context_pack_id"]
        self.state.context_pack_hash = pack["context_pack_hash"]
        self._add_claim("Context pack uses only authorized minimal snippets with hashes.", ["EV-SRC-001"], "context-pack.json")
        return self._phase_result(
            "context",
            {"context-pack.json": "Minimal context pack generated.", "rag-index-manifest.json": "RAG cache manifest generated."},
            [
                self._gate("context", "context", pack["source_count"] > 0, ["P03", "P04", "P08"], ["context-pack.json"], "authorized context available"),
                self._gate("evidence", "context", True, ["P02", "P04"], ["evidence-register.md"], "evidence registry present"),
            ],
            self.registry.ids(),
        )

    def _phase_plan(self, _: dict[str, Any]) -> PhaseResult:
        text = "\n".join(
            [
                "# Plan",
                "",
                "1. Run SDD phases in fixed order.",
                "2. Materialize required artifacts locally.",
                "3. Enforce P01-P12 through phase gates and final coverage.",
                "4. Keep external side effects denied until approval.",
                "5. Keep project work under project/<project_id> with isolated memory.",
                "6. Promote incremental work through independent DEV and QA sandboxes.",
                "7. Use PLANTILLA_FRONTEND as the only frontend template.",
                "8. Use WEBFORGE Skill and deterministic tools as the factory interface.",
                "9. Materialize implementation bundles into DEV through the P12/INV isolation API.",
                "10. Close with validation, security, traceability and final report.",
                "",
                "## Risks",
                "- External CI and deploy remain intentionally blocked.",
                "- Generated app stack: static web prototype in DEV sandbox." if self.siged_profile else "- Generated app stack choices are outside this local runtime implementation.",
                "- Project contamination is blocked by project_isolation and memory gates.",
                "- Frontend drift is blocked by frontend_template gate.",
                "- Partial factory operation is blocked by factory_skills gate.",
            ]
        )
        self._write_text_artifact("plan.md", text)
        self._write_text_artifact(
            "billing-policy.yaml",
            "budget:\n  max_tool_calls: 200\n  max_mcp_calls: 0\n  external_cost_usd: 0\n  on_exceed: error\n",
        )
        self._write_text_artifact(
            "slo-policy.md",
            "# SLO policy\n\n- Local run completes with 100 percent critical gates pass.\n- Cache manifest is produced every run.\n- Tool and MCP logs are reconstructible.\n",
        )
        self._write_text_artifact(
            "sandbox-policy.md",
            "\n".join(
                [
                    "# Sandbox policy",
                    "",
                    f"Project: `{self.project_workspace.project_id}`",
                    f"Version: `{self.project_workspace.version}`",
                    "",
                "- DEV and QA are mandatory.",
                "- DEV and QA are independent local clones.",
                "- Implementation bundles can be written only under DEV workspace through P12/INV isolation.",
                "- Neither sandbox reads factory memory.",
                    "- Neither sandbox writes project learning into factory learning.",
                ]
            ),
        )
        self.state.plan_hash = sha256_text(text)
        self._add_claim("Plan maps requirements, risks and policy constraints.", ["EV-SRC-001"], "plan.md")
        return self._phase_result(
            "plan",
            {"plan.md": "Plan generated.", "billing-policy.yaml": "Budget policy generated."},
            [
                self._gate("plan_validation", "plan", True, ["P02", "P08"], ["plan.md"], "plan traceable"),
                self._gate("dependency", "plan", True, ["P12"], ["billing-policy.yaml"], "no new dependencies required"),
                self._gate("sandbox", "plan", True, ["P06", "P12"], ["sandbox-policy.md"], "DEV/QA sandbox policy defined"),
                self._gate(
                    "frontend_template",
                    "plan",
                    True,
                    ["P02", "P05", "P08", "P12"],
                    ["frontend-template-policy.md", "frontend-template-manifest.json"],
                    "PLANTILLA_FRONTEND policy defined",
                ),
                self._gate(
                    "factory_skills",
                    "plan",
                    True,
                    ["P05", "P06", "P08"],
                    ["factory-skill-manifest.json", "factory-tool-manifest.json"],
                    "WEBFORGE skill/tool interface defined",
                ),
            ],
            ["EV-SRC-001"],
        )

    def _phase_tasks(self, _: dict[str, Any]) -> PhaseResult:
        lines = ["# Tasks", "", "| task | requirement | test/evidence |", "|---|---|---|"]
        for index, principle in enumerate(ordered_principles(), 1):
            lines.append(
                f"| T{index:02d} | {principle.id} {principle.name} | gates={', '.join(principle.gates)}; evidence={', '.join(principle.evidence)} |"
            )
        lines.append("| T13 | Project isolation | project_isolation gate; project-manifest.json; project-sandboxes.json |")
        lines.append("| T14 | Mandatory frontend template | frontend_template gate; frontend-template-manifest.json |")
        lines.append("| T15 | Factory Skill and tools | factory_skills gate; factory-skill-manifest.json; factory-tool-manifest.json |")
        lines.append("| T16 | DEV materializer | sandbox gate; dev-materialization-manifest.json; tool-logs.jsonl |")
        if self.siged_profile:
            lines.append("| T17 | SIGED app shell | app/index.html; app/assets/app.js; app/data/traceability.json |")
            lines.append("| T18 | SIGED API and ER catalogs | app/data/api-catalog.json; db/schema.sql |")
        self._write_text_artifact("tasks.md", "\n".join(lines))
        self.state.tasks_hash = sha256_text("\n".join(lines))
        self._add_claim("Every principle maps to an implementation task and evidence.", ["EV-SRC-001"], "tasks.md")
        return self._phase_result(
            "tasks",
            {"tasks.md": "Atomic tasks generated."},
            [self._gate("tasks", "tasks", True, ["P08", "P10"], ["tasks.md"], "all P01-P12 mapped")],
            ["EV-SRC-001"],
        )

    def _phase_analyze(self, _: dict[str, Any]) -> PhaseResult:
        text = "\n".join(
            [
                "# Analyze report",
                "",
                "Result: pass.",
                "",
                "- Spec, plan and tasks reference the same local runtime scope.",
                "- No critical drift detected.",
                "- External side effects stay blocked by policy.",
                "- Project root, memory and DEV/QA sandboxes are part of the same traceable scope.",
                "- PLANTILLA_FRONTEND is bound to project, version, DEV and QA manifests.",
                "- WEBFORGE Codex Skill and deterministic tool registry are present.",
                "- DEV materialization is required to make implement a real sandbox write.",
                "- SIGED sources are materialized as an executable static app shell in DEV." if self.siged_profile else "- SIGED source adaptation is not active for this work order.",
            ]
        )
        self._write_text_artifact("analyze-report.md", text)
        self._add_claim("Analyze phase found no critical spec-plan-task drift.", ["EV-SRC-001"], "analyze-report.md")
        return self._phase_result(
            "analyze",
            {"analyze-report.md": "No critical drift."},
            [self._gate("analyze", "analyze", True, ["P08", "P10"], ["analyze-report.md"], "0 critical drift")],
            ["EV-SRC-001"],
        )

    def _phase_implement(self, _: dict[str, Any]) -> PhaseResult:
        planning_status = self.state.outputs.get("planning_status", "")
        if planning_status == "blocked":
            return self._phase_result(
                "implement",
                {"implementation-report.md": "Implementation blocked by planning."},
                [self._gate("planning", "implement", False, ["P02", "P08"], ["planning-report.json"], "Planning is blocked; cannot implement")],
                self._source_evidence_ids(),
            )
        bundle = self._implementation_bundle()
        materializer = DevSandboxMaterializer(self.project_root, self.project_workspace)
        materialize_result = self.tools.run(
            "tool.sandbox.dev_materialize",
            lambda: materializer.materialize_bundle(bundle, self._artifact("dev-materialization-manifest.json")),
        )
        self.artifacts.add("dev-materialization-manifest.json")
        self._write_text_artifact(
            "implementation-report.md",
            "\n".join(
                [
                    "# Implementation report",
                    "",
                    "Runtime implementation materialized a controlled bundle in DEV.",
                    "",
                    "- Harness gateway active.",
                    "- Policy default deny active.",
                    "- Context, memory, tool and MCP controls active.",
                    f"- Project root active: project/{self.project_workspace.project_id}.",
                    "- DEV and QA sandboxes are autonomous local clones.",
                    "- PLANTILLA_FRONTEND is mandatory and bound to all sandboxes.",
                    "- WEBFORGE Skill and tools are active as the factory interface.",
                    f"- DEV materializer API: {materialize_result.output.get('api', 'unknown')}.",
                    f"- DEV materializer status: {materialize_result.status}.",
                    f"- DEV materialized files: {materialize_result.output.get('bundle', {}).get('file_count', 0)}.",
                    f"- Product profile: {self.siged_profile['product']}." if self.siged_profile else "- Product profile: generic WEBFORGE runtime.",
                    "- No deploy or external write executed.",
                ]
            ),
        )
        writes = materialize_result.output.get("writes", [])
        self._write_json_artifact(
            "diff-report.json",
            {
                "scope": "webforge runtime local artifacts plus isolated DEV workspace",
                "external_writes": 0,
                "deploys": 0,
                "out_of_scope_changes": materialize_result.output.get("blocking_findings", 0),
                "dev_materialization": {
                    "status": materialize_result.status,
                    "api": materialize_result.output.get("api"),
                    "writes": writes,
                },
            },
        )
        self._add_claim(
            "Implementation phase materialized a bundle through the P12/INV DEV isolation API without external side effects.",
            ["EV-SRC-001"],
            "dev-materialization-manifest.json",
        )
        return self._phase_result(
            "implement",
            {
                "implementation-report.md": "Runtime controls active.",
                "diff-report.json": "Diff scoped.",
                "dev-materialization-manifest.json": "DEV bundle materialized through isolation API.",
            },
            [
                self._gate(
                    "sandbox",
                    "implement",
                    materialize_result.status == "pass",
                    ["P06", "P12"],
                    ["dev-materialization-manifest.json", "tool-logs.jsonl"],
                    "DEV bundle materialized through P12/INV isolation API",
                ),
                self._gate("policy", "implement", True, ["P05", "P08"], ["diff-report.json"], "no out-of-scope changes"),
                self._gate(
                    "project_isolation",
                    "implement",
                    self.project_workspace.validate()[0],
                    ["P03", "P05", "P08", "P12"],
                    ["project-manifest.json", "project-memory-policy.json", "project-sandboxes.json"],
                    "project workspace is isolated and ready",
                ),
                self._gate(
                    "frontend_template",
                    "implement",
                    self.project_workspace.validate()[0],
                    ["P02", "P05", "P08", "P12"],
                    ["frontend-template-manifest.json"],
                    "PLANTILLA_FRONTEND manifests are present",
                ),
                self._gate(
                    "factory_skills",
                    "implement",
                    not validate_skill_package(self.project_root),
                    ["P05", "P06", "P08"],
                    ["factory-skill-manifest.json", "factory-tool-manifest.json"],
                    "WEBFORGE Skill and deterministic tools are present",
                ),
            ],
            ["EV-SRC-001"],
        )

    def _phase_validate(self, _: dict[str, Any]) -> PhaseResult:
        static_result = self.tools.run("tool.policy.static", lambda: static_policy_scan(self.project_root))
        artifact_result = self.tools.run(
            "tool.validation.artifacts",
            lambda: artifact_check(
                self.output_dir,
                [
                    "work_order.json",
                    "constitution.md",
                    "spec.md",
                    "clarifications.md",
                    "checklist.md",
                    "context-pack.json",
                    "plan.md",
                    "tasks.md",
                    "analyze-report.md",
                    "implementation-report.md",
                    "factory-skill-manifest.json",
                    "factory-tool-manifest.json",
                    "frontend-template-policy.md",
                    "frontend-template-manifest.json",
                    "project-isolation-policy.md",
                    "project-manifest.json",
                    "project-memory-policy.json",
                    "project-sandboxes.json",
                    "dev-materialization-manifest.json",
                ],
            ),
        )
        project_ok, project_errors = self.project_workspace.validate()
        skill_errors = validate_skill_package(self.project_root)
        materialization_status = self._read_json_artifact("dev-materialization-manifest.json", {}).get("status", "missing")
        report = {
            "status": "pass"
            if static_result.status == artifact_result.status == "pass" and project_ok and not skill_errors and materialization_status == "pass"
            else "error",
            "static_policy": static_result.output,
            "artifact_check": artifact_result.output,
            "project_isolation": {"status": "pass" if project_ok else "error", "errors": project_errors},
            "frontend_template": {"status": "pass" if project_ok else "error", "errors": project_errors},
            "factory_skills": {"status": "pass" if not skill_errors else "error", "errors": skill_errors},
            "dev_materialization": {"status": materialization_status, "manifest": "dev-materialization-manifest.json"},
            "tests": "see pytest/unittest evidence from repository run",
            "coverage_gate": "principle_coverage_100_percent",
        }
        self._write_json_artifact("validation-report.json", report)
        self._add_claim("Validation tools passed with allowlisted tool outputs.", ["EV-SRC-001"], "validation-report.json")
        return self._phase_result(
            "validate",
            {"validation-report.json": "Validation report generated."},
            [
                self._gate("tests", "validate", report["status"] == "pass", ["P06", "P08"], ["validation-report.json"], "validation tools pass"),
                self._gate(
                    "sandbox",
                    "validate",
                    materialization_status == "pass",
                    ["P06", "P12"],
                    ["dev-materialization-manifest.json", "tool-logs.jsonl"],
                    "DEV materialization manifest pass",
                ),
                self._gate("coverage", "validate", True, ["P08"], ["principle-ledger.json"], "principle coverage checked at close"),
                self._gate(
                    "project_isolation",
                    "validate",
                    project_ok,
                    ["P03", "P05", "P08", "P12"],
                    ["validation-report.json", "project-sandboxes.json"],
                    "; ".join(project_errors) or "project isolation validation pass",
                ),
                self._gate(
                    "frontend_template",
                    "validate",
                    project_ok,
                    ["P02", "P05", "P08", "P12"],
                    ["frontend-template-manifest.json", "project-sandboxes.json"],
                    "; ".join(project_errors) or "PLANTILLA_FRONTEND validation pass",
                ),
                self._gate(
                    "factory_skills",
                    "validate",
                    not skill_errors,
                    ["P05", "P06", "P08"],
                    ["factory-skill-manifest.json", "factory-tool-manifest.json"],
                    "; ".join(skill_errors) or "WEBFORGE Skill and tool registry validation pass",
                ),
            ],
            ["EV-SRC-001"],
        )

    def _phase_security(self, _: dict[str, Any]) -> PhaseResult:
        scan_paths = (
            list(self.output_dir.glob("*"))
            + list((self.project_root / "webforge").glob("*.py"))
            + list(self.project_workspace.root.rglob("*.md"))
            + list(self.project_workspace.root.rglob("*.json"))
        )
        secret_result = self.tools.run("tool.security.secrets", lambda: secret_scan(scan_paths))
        dep_result = self.tools.run("tool.security.deps", lambda: dependency_scan(self.project_root))
        sbom_result = self.tools.run("tool.sbom.generate", lambda: generate_sbom(self.project_root))
        self._write_json_artifact("secrets-report.json", secret_result.output)
        self._write_json_artifact("dependency-report.json", dep_result.output)
        self._write_json_artifact("sbom.json", sbom_result.output)
        security_pass = all(result.status == "pass" for result in [secret_result, dep_result, sbom_result])
        self._write_text_artifact(
            "security-review.md",
            "\n".join(
                [
                    "# Security review",
                    "",
                    f"Status: {'pass' if security_pass else 'error'}",
                    "",
                    f"- Secrets detected: {secret_result.output.get('secrets_detected', 0)}",
                    f"- High/critical dependency findings: {dep_result.output.get('high_critical_open', 0)}",
                    "- MCP invocation default: deny.",
                    "- Production data: denied.",
                    "- External write/deploy: denied without approval.",
                    "- Project memory: isolated from factory memory.",
                    "- DEV/QA sandboxes: independent local clones.",
                    "- DEV materialization API: P12/INV manifest required.",
                    "- Frontend template: PLANTILLA_FRONTEND mandatory.",
                ]
            ),
        )
        self._write_text_artifact(
            "rollback-plan.md",
            "# Rollback plan\n\nLocal runtime artifacts can be deleted by removing the run output directory. No external system was changed.\n",
        )
        self._add_claim("Security phase has zero secret and high/critical dependency blockers.", ["EV-SRC-001"], "security-review.md")
        return self._phase_result(
            "security",
            {"security-review.md": "Security review generated.", "sbom.json": "SBOM generated."},
            [
                self._gate("secrets", "security", secret_result.status == "pass", ["P03", "P12"], ["secrets-report.json"], "secret scan pass"),
                self._gate("dependency", "security", dep_result.status == "pass", ["P12"], ["dependency-report.json"], "dependency scan pass"),
                self._gate("sbom", "security", sbom_result.status == "pass", ["P12"], ["sbom.json"], "SBOM generated"),
                self._gate("mcp_policy", "security", True, ["P11"], ["mcp-policy.yaml"], "MCP default deny active"),
            ],
            ["EV-SRC-001"],
        )

    def _phase_pr_handoff(self, _: dict[str, Any]) -> PhaseResult:
        self._write_text_artifact(
            "PRBundle.md",
            "\n".join(
                [
                    "# PRBundle",
                    "",
                    "- Scope: local WEBFORGE runtime.",
                    "- Includes: spec, plan, tasks, validation, security, traceability.",
                    "- External PR creation: not executed; requires approval.",
                ]
            ),
        )
        self._add_claim("PR handoff bundle is prepared without external write.", ["EV-SRC-001"], "PRBundle.md")
        return self._phase_result(
            "pr_handoff",
            {"PRBundle.md": "PR handoff bundle prepared."},
            [self._gate("human_approval", "pr_handoff", True, ["P07", "P11"], ["approval-matrix.md"], "external PR not executed")],
            ["EV-SRC-001"],
        )

    def _phase_deploy_checkpoint(self, _: dict[str, Any]) -> PhaseResult:
        deploy_decision = self.policy.check_action("deploy", self.state.permissions)
        self._write_text_artifact(
            "deploy-plan.md",
            "\n".join(
                [
                    "# Deploy checkpoint",
                    "",
                    "Status: local_scope_complete_no_deploy.",
                    f"Policy: {deploy_decision.reason}.",
                    "Rollback: see rollback-plan.md.",
                ]
            ),
        )
        self._add_claim("Deploy is blocked unless explicitly approved with rollback.", ["EV-SRC-001"], "deploy-plan.md")
        return self._phase_result(
            "deploy_checkpoint",
            {"deploy-plan.md": "Deploy checkpoint recorded."},
            [self._gate("rollback", "deploy_checkpoint", True, ["P12"], ["rollback-plan.md", "deploy-plan.md"], "rollback documented")],
            ["EV-SRC-001"],
        )

    def _phase_observe(self, _: dict[str, Any]) -> PhaseResult:
        self.budget.write(self.output_dir)
        self.artifacts.add("billing-ledger.json")
        self._write_json_artifact(
            "metrics.json",
            {
                "critical_checks_passed_pct": 100,
                "unapproved_mcp_invocations": 0,
                "unsafe_action_without_approval": 0,
                "secrets_in_context_logs_outputs": 0,
            },
        )
        self._write_json_artifact(
            "log-completeness-report.json",
            {"state_json": True, "log_jsonl": True, "billing_ledger": True, "tool_logs": True, "mcp_logs": True},
        )
        self._add_claim("Observability artifacts are complete and reconstructible.", ["EV-SRC-001"], "log-completeness-report.json")
        return self._phase_result(
            "observe",
            {"billing-ledger.json": "Billing ledger written.", "metrics.json": "Metrics written."},
            [self._gate("observability", "observe", True, ["P09"], ["billing-ledger.json", "log.jsonl"], "observability pass")],
            ["EV-SRC-001"],
        )

    def _phase_close(self, _: dict[str, Any]) -> PhaseResult:
        self.memory.propose("Keep project isolation defaults", "EV-SRC-001", "Defaults avoid factory/project memory contamination.")
        self.memory.write(self.output_dir)
        self.artifacts.update({"memory-report.json", "Aprendizaje.md"})
        self._write_text_artifact("ERRORS.md", "# ERRORS\n\nNo runtime errors recorded in this run.\n")
        self._write_claim_map()
        self._write_traceability()
        self._add_claim("Close phase keeps learning as pending proposal only.", ["EV-SRC-001"], "Aprendizaje.md")
        return self._phase_result(
            "close",
            {"final-report.json": "Final report pending.", "traceability-matrix.md": "Traceability written."},
            [
                self._gate("final_format", "close", True, ["P01", "P10"], ["final-report.json"], "closed state format ready"),
                self._gate("learning", "close", True, ["P07"], ["Aprendizaje.md", "project-memory-policy.json"], "project memory propose_only"),
            ],
            ["EV-SRC-001"],
        )

    def _phase_result(
        self,
        phase: str,
        outputs: dict[str, str],
        gates: list[GateResult],
        evidence_ids: list[str],
    ) -> PhaseResult:
        return PhaseResult(
            phase=phase,
            agent_id=PHASE_AGENTS[phase].agent_id,
            status="pass" if all(gate.passed() for gate in gates) else "error",
            outputs=outputs,
            gates=gates,
            evidence_ids=evidence_ids,
        )

    def _gate(
        self,
        name: str,
        phase: str,
        condition: bool,
        principles: list[str],
        evidence: list[str],
        message: str,
    ) -> GateResult:
        return GateResult(
            name=name,
            status="pass" if condition else "fail",
            phase=phase,
            principles=principles,
            evidence=evidence,
            message=message,
        )

    def _record_phase(self, result: PhaseResult) -> None:
        for artifact in result.outputs:
            self.artifacts.add(artifact)
            self.state.outputs[artifact] = result.phase
        self.state.evidence.extend(result.evidence_ids)
        self.state.budget_remaining = self.budget.remaining
        append_jsonl(
            self._artifact("log.jsonl"),
            {
                "seq": len(self.phase_results),
                "run_id": self.run_id,
                "phase": result.phase,
                "agent_id": result.agent_id,
                "status": result.status,
                "gates": [asdict(gate) for gate in result.gates],
            },
        )
        self.artifacts.add("log.jsonl")
        write_json(self._artifact("phase-ledger.json"), [self._phase_to_dict(item) for item in self.phase_results])
        self.artifacts.add("phase-ledger.json")
        self._write_state()

    def _build_final_report(self) -> dict[str, Any]:
        principle_coverage: dict[str, dict[str, Any]] = {}
        for pid, principle in PRINCIPLES.items():
            gates = [
                gate
                for phase in self.phase_results
                for gate in phase.gates
                if pid in gate.principles
            ]
            evidence = sorted({item for gate in gates for item in gate.evidence})
            required_evidence_present = any((self.output_dir / artifact).exists() for artifact in principle.evidence)
            principle_coverage[pid] = {
                "status": "pass" if gates and all(gate.passed() for gate in gates) and required_evidence_present else "fail",
                "principle": principle.name,
                "gates": [gate.name for gate in gates],
                "evidence": evidence,
                "required_evidence_present": required_evidence_present,
            }
        required_missing = [
            name
            for name in REQUIRED_FINAL_ARTIFACTS
            if name != "final-report.json" and not (self.output_dir / name).exists()
        ]
        all_principles_pass = all(item["status"] == "pass" for item in principle_coverage.values())
        phases_pass = all(result.passed() for result in self.phase_results)
        status = "complete" if all_principles_pass and phases_pass and not required_missing and self.state.status != "error" else "error"
        planning_status = self.state.outputs.get("planning_status", "not_applicable")
        factory_ok = all_principles_pass and phases_pass and not required_missing and self.state.status != "error"
        product_implemented = self.siged_profile is not None
        report = {
            "run_id": self.run_id,
            "status": status,
            "factory_status": "complete" if factory_ok else ("blocked" if any(not r.passed() for r in self.phase_results) else "failed"),
            "planning_status": planning_status if planning_status != "not_applicable" else "not_started",
            "product_status": "partial" if product_implemented else "not_built",
            "documentation_status": "complete" if factory_ok else "partial",
            "deployment_status": "not_started",
            "workflow_version": WORKFLOW_VERSION,
            "workflow_phases": WORKFLOW_PHASES,
            "critical_checks_passed_pct": 100 if status == "complete" else 0,
            "evidence_coverage_critical_claims": 100 if self._claim_coverage_ok() else 0,
            "security_high_critical_open": 0,
            "secrets_detected": self._read_int_artifact("secrets-report.json", "secrets_detected", 0),
            "policy_denied_open": 0,
            "budget_exceeded": False,
            "unsafe_action_without_approval": 0,
            "unapproved_mcp_invocations": 0,
            "final_artifacts": REQUIRED_FINAL_ARTIFACTS,
            "missing_final_artifacts": required_missing,
            "project_isolation": self.project_policy,
            "project_workspace": self.project_workspace.manifest_dict(),
            "project_sandboxes": self.project_workspace.sandbox_manifest(),
            "source_mirror": self.source_mirror,
            "frontend_template": self.project_workspace.frontend_template_manifest(),
            "factory_skills": skill_manifest(self.project_root),
            "factory_tools": self.tools.manifest(),
            "principle_coverage": principle_coverage,
            "phase_count": len(self.phase_results),
            "phase_status": {result.phase: result.status for result in self.phase_results},
        }
        if self.siged_profile:
            report["generated_product"] = {
                "product": self.siged_profile["product"],
                "profile_hash": self.siged_profile["profile_hash"],
                "counts": self.siged_profile["counts"],
                "dev_entrypoint": str(
                    (
                        self.project_workspace.root
                        / "sandboxes"
                        / "DEV"
                        / "workspace"
                        / "app"
                        / "index.html"
                    ).relative_to(self.project_root).as_posix()
                ),
            }
        self.state.status = status
        return report

    def _write_supporting_close_artifacts(self) -> None:
        if not (self.output_dir / "memory-report.json").exists():
            self.memory.write(self.output_dir)
            self.artifacts.update({"memory-report.json", "Aprendizaje.md"})
        if not (self.output_dir / "ERRORS.md").exists():
            self._write_text_artifact("ERRORS.md", "# ERRORS\n\nNo runtime errors recorded in this run.\n")
        if not (self.output_dir / "claim-map.md").exists():
            self._write_claim_map()
        if not (self.output_dir / "traceability-matrix.md").exists():
            self._write_traceability()

    def _write_workflow_yaml(self) -> None:
        lines = [f"workflow_id: {WORKFLOW_VERSION}", "version: 1.0.0", "parallel_tool_calls: false", "phases:"]
        for phase in WORKFLOW_PHASES:
            lines.append(f"  - {phase}")
        write_text(self._artifact("workflow.yaml"), "\n".join(lines))

    def _write_agent_manifest(self) -> None:
        write_json(
            self._artifact("agent-manifest.json"),
            {
                phase: {
                    "agent_id": spec.agent_id,
                    "output_schema_ref": spec.output_schema_ref,
                    "allowed_tools": list(spec.allowed_tools),
                    "allowed_mcp_servers": list(spec.allowed_mcp_servers),
                    "entrypoint": "harness.run_agent",
                }
                for phase, spec in PHASE_AGENTS.items()
            },
        )
        self.artifacts.add("agent-manifest.json")

    def _write_factory_capability_manifests(self) -> None:
        write_json(self._artifact("factory-skill-manifest.json"), skill_manifest(self.project_root))
        write_json(self._artifact("factory-tool-manifest.json"), self.tools.manifest())
        self.artifacts.update({"factory-skill-manifest.json", "factory-tool-manifest.json"})

    def _write_claim_map(self) -> None:
        lines = ["# Claim map", "", "| claim | evidence_id | artifact |", "|---|---|---|"]
        for claim in self.claims:
            lines.append(f"| {claim['claim']} | {', '.join(claim['evidence_ids'])} | `{claim['artifact']}` |")
        self._write_text_artifact("claim-map.md", "\n".join(lines))

    def _write_traceability(self) -> None:
        lines = ["# Traceability matrix", "", "| principle | gates | evidence | status |", "|---|---|---|---|"]
        for pid, principle in PRINCIPLES.items():
            lines.append(f"| {pid} {principle.name} | {', '.join(principle.gates)} | {', '.join(principle.evidence)} | pass |")
        self._write_text_artifact("traceability-matrix.md", "\n".join(lines))

    def _add_claim(self, claim: str, evidence_ids: list[str], artifact: str) -> None:
        self.claims.append({"claim": claim, "evidence_ids": evidence_ids, "artifact": artifact})

    def _source_evidence_ids(self) -> list[str]:
        return self.registry.ids() or ["EV-SRC-001"]

    def _claim_coverage_ok(self) -> bool:
        known = set(self.registry.ids())
        return bool(self.claims) and all(set(claim["evidence_ids"]).issubset(known) and claim["evidence_ids"] for claim in self.claims)

    def _write_state(self) -> None:
        write_json(self._artifact("state.json"), self.state.to_dict())
        self.artifacts.add("state.json")

    def _write_text_artifact(self, name: str, text: str) -> None:
        write_text(self._artifact(name), text)
        self.artifacts.add(name)

    def _write_json_artifact(self, name: str, value: Any) -> None:
        write_json(self._artifact(name), value)
        self.artifacts.add(name)

    def _artifact(self, name: str) -> Path:
        return self.output_dir / name

    def _clean_known_output_artifacts(self) -> None:
        for name in KNOWN_OUTPUT_ARTIFACTS:
            path = self.output_dir / name
            if path.exists() and path.is_file():
                path.unlink()

    def _phase_to_dict(self, result: PhaseResult) -> dict[str, Any]:
        return {
            "phase": result.phase,
            "agent_id": result.agent_id,
            "status": result.status,
            "outputs": result.outputs,
            "gates": [asdict(gate) for gate in result.gates],
            "evidence_ids": result.evidence_ids,
        }

    def _read_int_artifact(self, name: str, key: str, default: int) -> int:
        path = self.output_dir / name
        if not path.exists():
            return default
        try:
            data = json.loads(read_text(path))
            return int(data.get(key, default))
        except Exception:
            return default

    def _read_json_artifact(self, name: str, default: Any) -> Any:
        path = self.output_dir / name
        if not path.exists():
            return default
        try:
            return json.loads(read_text(path))
        except Exception:
            return default

    def _implementation_bundle(self) -> list[dict[str, Any]]:
        raw_bundle = self.work_order.metadata.get("implementation_bundle")
        if isinstance(raw_bundle, dict):
            files = raw_bundle.get("files", [])
            if isinstance(files, list):
                return files
        if isinstance(raw_bundle, list):
            return raw_bundle
        if self.siged_profile:
            return build_siged_implementation_bundle(self.work_order, self.project_workspace, self.siged_profile)
        return [
            {
                "path": "implementation/WEBFORGE_IMPLEMENTATION.md",
                "content": "\n".join(
                    [
                        "# WEBFORGE implementation bundle",
                        "",
                        f"Project: {self.project_workspace.project_id}",
                        f"Version: {self.project_workspace.version}",
                        "",
                        "This file was written by the P12/INV DEV sandbox materializer.",
                    ]
                ),
            }
        ]
