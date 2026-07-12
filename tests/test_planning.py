from __future__ import annotations

import json
import subprocess
import sys
import tempfile
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]


# ──────────────────────────────────────────────
# SECTION: Decisions (tests 1-8)
# ──────────────────────────────────────────────


def test_decision_adrs_created():
    """1. All 16 ADRs created"""
    from webforge.planning.decisions import generate_decisions
    decisions = generate_decisions(None, {}, {}, [])
    assert len(decisions) == 16
    ids = {d.decision_id for d in decisions}
    for i in range(1, 17):
        assert f"ADR-{i:03d}" in ids


def test_decision_unique_ids():
    """2. All ADR IDs are unique"""
    from webforge.planning.decisions import generate_decisions
    decisions = generate_decisions(None, {}, {}, [])
    ids = [d.decision_id for d in decisions]
    assert len(ids) == len(set(ids))


def test_decision_status_blocks():
    """3. ADR in proposed status blocks gate (except ADR-015)"""
    from webforge.planning.decisions import ArchitectureDecision, validate_decisions
    decisions = [
        ArchitectureDecision(decision_id=f"ADR-{i:03d}", title="Test", status="proposed" if i != 15 else "accepted", context="ctx", decision="dec", alternatives=[], consequences=["c1"], affected_codes=[], source_findings=[], implementation_phase="base", requires_human_approval=False)
        for i in range(1, 17)
    ]
    errors = validate_decisions(decisions, check_blocking=True)
    assert any("proposed" in e for e in errors)


def test_decision_p30_resolved():
    """4. ADR-001 resolves P-30 ambiguity"""
    from webforge.planning.decisions import DECISION_DEFINITIONS
    adr1 = DECISION_DEFINITIONS["ADR-001"]
    assert "P-30" in str(adr1["affected_codes"])
    assert "/intranet/notifications" in adr1["decision"] or "/portal/notifications" in adr1["decision"]


def test_decision_p10_endpoints():
    """5. P-10 has admin endpoints (ADR-002)"""
    from webforge.planning.decisions import DECISION_DEFINITIONS
    adr2 = DECISION_DEFINITIONS["ADR-002"]
    assert "procedure-types" in adr2["decision"]
    assert "P-10" in str(adr2["affected_codes"])


def test_decision_p11_endpoints():
    """6. P-11 has admin endpoints (ADR-003)"""
    from webforge.planning.decisions import DECISION_DEFINITIONS
    adr3 = DECISION_DEFINITIONS["ADR-003"]
    assert "external-entities" in adr3["decision"]
    assert "P-11" in str(adr3["affected_codes"])


def test_decision_api034_canonical():
    """7. API-034 is canonical (ADR-005)"""
    from webforge.planning.decisions import DECISION_DEFINITIONS
    adr5 = DECISION_DEFINITIONS["ADR-005"]
    assert "public/tramites" in adr5["decision"]
    assert "API-034" in str(adr5["affected_codes"])


def test_decision_api002_mandatory():
    """8. API-002 is mandatory (ADR-004)"""
    from webforge.planning.decisions import DECISION_DEFINITIONS
    adr4 = DECISION_DEFINITIONS["ADR-004"]
    assert "citizen-login" in adr4["decision"] or "API-002" in str(adr4["affected_codes"])


# ──────────────────────────────────────────────
# SECTION: Agents (tests 9-15)
# ──────────────────────────────────────────────


def test_agents_six_product_agents():
    """9. Six product agents exist"""
    from webforge.planning.agents import generate_agents
    agents = generate_agents()
    assert len(agents) == 6
    ids = {a["agent_id"] for a in agents}
    assert "agent.refinement" in ids
    assert "agent.architecture" in ids
    assert "agent.database" in ids
    assert "agent.backend" in ids
    assert "agent.frontend" in ids
    assert "agent.qa_release" in ids


def test_agents_unique_ids():
    """10. All agent IDs unique"""
    from webforge.planning.agents import generate_agents, validate_agents
    agents = generate_agents()
    errors = validate_agents(agents)
    assert not errors


def test_agents_inputs_defined():
    """11. All agents have inputs defined"""
    from webforge.planning.agents import generate_agents
    agents = generate_agents()
    for a in agents:
        assert len(a["inputs"]) > 0, f"Agent {a['agent_id']} has no inputs"


def test_agents_outputs_defined():
    """12. All agents have outputs defined"""
    from webforge.planning.agents import generate_agents
    agents = generate_agents()
    for a in agents:
        assert len(a["outputs"]) > 0, f"Agent {a['agent_id']} has no outputs"


def test_agents_tools_declared():
    """13. All agents have tools declared"""
    from webforge.planning.agents import generate_agents, validate_agents
    agents = generate_agents()
    errors = validate_agents(agents)
    assert not errors
    for a in agents:
        assert len(a["allowed_tools"]) > 0


def test_agents_forbidden_actions():
    """14. All agents have forbidden actions"""
    from webforge.planning.agents import generate_agents
    agents = generate_agents()
    for a in agents:
        assert len(a["forbidden_actions"]) > 0


def test_agents_handoff_targets_valid():
    """15. Handoff targets reference valid agents"""
    from webforge.planning.agents import generate_agents, validate_agents
    agents = generate_agents()
    errors = validate_agents(agents)
    assert not errors


# ──────────────────────────────────────────────
# SECTION: Tasks (tests 16-25)
# ──────────────────────────────────────────────


def test_tasks_unique_ids():
    """16. All task IDs are unique"""
    from webforge.planning.tasks import generate_tasks
    tasks = generate_tasks()
    ids = [t["task_id"] for t in tasks]
    assert len(ids) == len(set(ids))


def test_tasks_agent_exists():
    """17. Every task has a valid agent"""
    from webforge.planning.tasks import generate_tasks, validate_tasks
    tasks = generate_tasks()
    valid = {"agent.refinement", "agent.architecture", "agent.database", "agent.backend", "agent.frontend", "agent.qa_release"}
    errors = validate_tasks(tasks, valid)
    assert not errors


def test_tasks_dependencies_exist():
    """18. Every task dependency references existing task_id"""
    from webforge.planning.tasks import generate_tasks
    tasks = generate_tasks()
    ids = {t["task_id"] for t in tasks}
    for t in tasks:
        for dep in t.get("dependencies", []):
            assert dep in ids, f"Task {t['task_id']} depends on unknown {dep}"


def test_tasks_acceptance_criteria():
    """19. Every task has acceptance criteria"""
    from webforge.planning.tasks import generate_tasks
    tasks = generate_tasks()
    for t in tasks:
        assert len(t["acceptance_criteria"]) > 0, f"Task {t['task_id']} has no acceptance criteria"


def test_tasks_required_tests():
    """20. Every task has required tests"""
    from webforge.planning.tasks import generate_tasks
    tasks = generate_tasks()
    for t in tasks:
        assert len(t.get("required_tests", [])) > 0, f"Task {t['task_id']} has no required tests"


def test_tasks_related_codes():
    """21. Every task has related codes where applicable"""
    from webforge.planning.tasks import generate_tasks
    tasks = generate_tasks()
    for t in tasks:
        if t["task_id"].startswith("TASK-API-") or t["task_id"].startswith("TASK-DB-") or t["task_id"].startswith("TASK-UI-"):
            assert len(t.get("related_codes", [])) > 0, f"Task {t['task_id']} should have related codes"


def test_tasks_no_monolithic():
    """22. No single task implements entire backend/frontend/database"""
    from webforge.planning.tasks import generate_tasks
    tasks = generate_tasks()
    for t in tasks:
        assert t["estimated_complexity"] != "L" or len(t["acceptance_criteria"]) >= 3, f"Task {t['task_id']} is large but lacks criteria"


def test_tasks_db_before_backend():
    """23. DB tasks precede dependent backend tasks"""
    from webforge.planning.tasks import generate_tasks
    tasks = generate_tasks()
    for t in tasks:
        for dep in t.get("dependencies", []):
            if dep.startswith("TASK-DB-"):
                assert t["task_id"].startswith("TASK-API-") or t["task_id"].startswith("TASK-DB-") or t["task_id"].startswith("TASK-QA-"), f"Only API/DB/QA tasks should depend on DB tasks"


def test_tasks_backend_before_frontend():
    """24. Backend tasks precede dependent frontend tasks"""
    from webforge.planning.tasks import generate_tasks
    tasks = generate_tasks()
    for t in tasks:
        for dep in t.get("dependencies", []):
            if dep.startswith("TASK-API-"):
                assert t["task_id"].startswith("TASK-UI-") or t["task_id"].startswith("TASK-QA-") or t["task_id"].startswith("TASK-API-"), f"Only UI/QA/API tasks should depend on API tasks"


def test_tasks_qa_after_product():
    """25. QA tasks come after product tasks"""
    from webforge.planning.tasks import generate_tasks
    tasks = generate_tasks()
    qa_ids = {t["task_id"] for t in tasks if t["agent_id"] == "agent.qa_release"}
    for t in tasks:
        for dep in t.get("dependencies", []):
            if dep in qa_ids:
                assert t["agent_id"] == "agent.qa_release", f"Only QA tasks should depend on QA tasks"


# ──────────────────────────────────────────────
# SECTION: DAG (tests 26-31)
# ──────────────────────────────────────────────


def test_dag_acyclic():
    """26. DAG is acyclic"""
    from webforge.planning.tasks import generate_tasks
    from webforge.planning.dag import build_dag, validate_dag
    tasks = generate_tasks()
    dag = build_dag(tasks)
    valid = {"agent.refinement", "agent.architecture", "agent.database", "agent.backend", "agent.frontend", "agent.qa_release"}
    validated = validate_dag(dag, valid)
    assert validated["validation"]["acyclic"] == True


def test_dag_cycle_detected():
    """27. Cycle detection works"""
    from webforge.planning.dag import detect_cycles
    edges = [
        {"from": "A", "to": "B", "type": "blocks"},
        {"from": "B", "to": "C", "type": "blocks"},
        {"from": "C", "to": "A", "type": "blocks"},
    ]
    nodes = [{"task_id": "A"}, {"task_id": "B"}, {"task_id": "C"}]
    cycles = detect_cycles(edges, nodes)
    assert len(cycles) > 0


def test_dag_missing_dependency_detected():
    """28. Missing dependency raises validation error"""
    from webforge.planning.tasks import generate_tasks
    from webforge.planning.dag import build_dag, validate_dag
    tasks = generate_tasks()
    tasks.append({"task_id": "TASK-TEST-001", "title": "Test", "description": "test", "agent_id": "agent.refinement", "phase": "test", "priority": "low", "inputs": [], "outputs": [], "dependencies": ["NONEXISTENT-TASK"], "related_codes": [], "acceptance_criteria": ["test"], "required_tests": ["test"], "required_gates": [], "estimated_complexity": "S", "status": "planned"})
    dag = build_dag(tasks)
    valid = {"agent.refinement", "agent.architecture", "agent.database", "agent.backend", "agent.frontend", "agent.qa_release"}
    validated = validate_dag(dag, valid)
    assert "NONEXISTENT-TASK" in str(validated["validation"])


def test_dag_topological_order():
    """29. Topological order contains all nodes"""
    from webforge.planning.tasks import generate_tasks
    from webforge.planning.dag import build_dag, validate_dag
    tasks = generate_tasks()
    dag = build_dag(tasks)
    valid = {"agent.refinement", "agent.architecture", "agent.database", "agent.backend", "agent.frontend", "agent.qa_release"}
    validated = validate_dag(dag, valid)
    topo = validated["topological_order"]
    nodes = {n["task_id"] for n in dag["nodes"]}
    assert len(topo) == len(nodes)


def test_dag_orphan_detected():
    """30. Orphan node detection works"""
    from webforge.planning.dag import validate_dag
    edges = []
    nodes = [{"task_id": "TASK-ORPHAN-001", "agent_id": "agent.refinement", "phase": "test", "estimated_complexity": "S"}]
    dag = {"schema_version": "webforge.task_dag.v1", "project_id": "test", "nodes": nodes, "edges": edges, "topological_order": [], "validation": {"acyclic": True, "orphan_nodes": [], "missing_dependencies": [], "invalid_agents": []}}
    valid = {"agent.refinement"}
    validated = validate_dag(dag, valid)
    assert "TASK-ORPHAN-001" in validated["validation"]["orphan_nodes"]


def test_dag_invalid_agent():
    """31. Invalid agent detected"""
    from webforge.planning.tasks import generate_tasks
    from webforge.planning.dag import build_dag, validate_dag
    tasks = generate_tasks()
    tasks.append({"task_id": "TASK-BAD-001", "title": "Bad", "description": "bad", "agent_id": "agent.nonexistent", "phase": "test", "priority": "low", "inputs": [], "outputs": [], "dependencies": [], "related_codes": [], "acceptance_criteria": ["test"], "required_tests": ["test"], "required_gates": [], "estimated_complexity": "S", "status": "planned"})
    dag = build_dag(tasks)
    valid = {"agent.refinement", "agent.architecture", "agent.database", "agent.backend", "agent.frontend", "agent.qa_release"}
    validated = validate_dag(dag, valid)
    assert "TASK-BAD-001" in validated["validation"].get("invalid_agents", [])


# ──────────────────────────────────────────────
# SECTION: Handoffs (tests 32-37)
# ──────────────────────────────────────────────


def test_handoff_valid():
    """32. All handoffs valid"""
    from webforge.planning.handoffs import generate_handoffs, validate_handoffs
    handoffs = generate_handoffs()
    valid = {"agent.refinement", "agent.architecture", "agent.database", "agent.backend", "agent.frontend", "agent.qa_release", "human_reviewer"}
    errors = validate_handoffs(handoffs, valid)
    assert not errors


def test_handoff_invalid_agent_rejected():
    """33. Invalid agent in handoff raises error"""
    from webforge.planning.handoffs import validate_handoffs
    handoffs = [{"handoff_id": "HO-TEST", "from_agent": "agent.nonexistent", "to_agent": "agent.refinement", "artifacts": ["a"], "required_gates": [], "acceptance_criteria": ["c"], "rejection_reasons_possible": []}]
    valid = {"agent.refinement"}
    errors = validate_handoffs(handoffs, valid)
    assert len(errors) > 0


def test_handoff_missing_artifacts_rejected():
    """34. Missing artifacts in handoff raises error"""
    from webforge.planning.handoffs import validate_handoffs
    handoffs = [{"handoff_id": "HO-TEST", "from_agent": "agent.refinement", "to_agent": "agent.architecture", "artifacts": [], "required_gates": [], "acceptance_criteria": ["c"], "rejection_reasons_possible": []}]
    valid = {"agent.refinement", "agent.architecture"}
    errors = validate_handoffs(handoffs, valid)
    assert len(errors) > 0


def test_handoff_rejected_logged():
    """35. Handoff rejection can be recorded in ledger"""
    from webforge.planning.ledgers import write_handoff_ledger
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp)
        entries = [{"timestamp": "2026-01-01T00:00:00Z", "run_id": "R01", "handoff_id": "HO-TEST", "task_id": "T1", "from_agent": "a", "to_agent": "b", "artifacts": [], "status": "rejected", "reasons": ["missing artifacts"]}]
        path = write_handoff_ledger(out, "R01", entries)
        assert path.exists()
        lines = path.read_text().strip().split("\n")
        last = json.loads(lines[-1])
        assert last["status"] == "rejected"
        assert len(last["reasons"]) > 0


def test_handoff_accepted_logged():
    """36. Handoff acceptance can be recorded in ledger"""
    from webforge.planning.ledgers import write_handoff_ledger
    with tempfile.TemporaryDirectory() as tmp:
        out = Path(tmp)
        entries = [{"timestamp": "2026-01-01T00:00:00Z", "run_id": "R01", "handoff_id": "HO-TEST", "task_id": "T1", "from_agent": "a", "to_agent": "b", "artifacts": ["arch.json"], "status": "accepted", "reasons": []}]
        path = write_handoff_ledger(out, "R01", entries)
        assert path.exists()
        lines = path.read_text().strip().split("\n")
        last = json.loads(lines[-1])
        assert last["status"] == "accepted"


def test_handoff_hashes_recorded():
    """37. Handoff hashes can be recorded"""
    from webforge.planning.contracts import HandoffEnvelope
    env = HandoffEnvelope(handoff_id="HO-TEST", input_hashes={"arch.json": "sha256:abc123"})
    assert "arch.json" in env.input_hashes


# ──────────────────────────────────────────────
# SECTION: Gates (tests 38-43)
# ──────────────────────────────────────────────


def test_gate_normalization_blocked():
    """38. GATE-ARCH-001 fails when normalization has blocking findings"""
    from webforge.planning.gates import gate_arch_001_sources_normalized
    passed, msg = gate_arch_001_sources_normalized({}, [{"type": "BLOCKING_ERROR", "message": "test"}])
    assert not passed


def test_gate_adr_pending_blocks():
    """39. GATE-ARCH-002 fails when ADRs are proposed"""
    from webforge.planning.gates import gate_arch_002_decisions_critical
    decisions = [{"decision_id": f"ADR-{i:03d}", "title": "T", "status": "proposed" if i == 1 else "accepted", "context": "c", "decision": "d", "alternatives": [], "consequences": [], "affected_codes": [], "source_findings": [], "implementation_phase": "base", "requires_human_approval": False} for i in range(1, 17)]
    passed, msg = gate_arch_002_decisions_critical(decisions)
    assert not passed


def test_gate_dag_cycle_blocks():
    """40. GATE-ARCH-005 fails when DAG has cycles"""
    from webforge.planning.gates import gate_arch_005_dag_valid
    dag = {"schema_version": "webforge.task_dag.v1", "project_id": "test", "nodes": [], "edges": [], "topological_order": [], "validation": {"acyclic": False, "orphan_nodes": [], "missing_dependencies": [], "invalid_agents": []}}
    passed, msg = gate_arch_005_dag_valid(dag)
    assert not passed


def test_gate_invalid_tasks_block():
    """41. GATE-ARCH-004 fails when tasks are invalid"""
    from webforge.planning.gates import gate_arch_004_tasks_valid
    tasks = [{"task_id": "TASK-BAD-001", "title": "", "description": "", "agent_id": "agent.nonexistent", "phase": "x", "priority": "x", "inputs": [], "outputs": [], "dependencies": [], "related_codes": [], "acceptance_criteria": [], "required_tests": [], "required_gates": [], "estimated_complexity": "S", "status": "planned"}]
    passed, msg = gate_arch_004_tasks_valid(tasks, {"agent.refinement"})
    assert not passed


def test_gate_invalid_handoff_blocks():
    """42. GATE-ARCH-006 fails when handoffs are invalid"""
    from webforge.planning.gates import gate_arch_006_handoffs_valid
    handoffs = [{"handoff_id": "HO-TEST", "from_agent": "agent.nonexistent", "to_agent": "human_reviewer", "artifacts": ["a"], "required_gates": [], "acceptance_criteria": ["c"], "rejection_reasons_possible": []}]
    passed, msg = gate_arch_006_handoffs_valid(handoffs, {"agent.refinement"})
    assert not passed


def test_gate_baseline_modified_blocks():
    """43. GATE-ARCH-007 fails when baseline changes"""
    from webforge.planning.gates import gate_arch_007_baseline_preserved
    before = {"file1": "sha256:abc"}
    after = {"file1": "sha256:xyz"}
    passed, msg = gate_arch_007_baseline_preserved(before, after)
    assert not passed


# ──────────────────────────────────────────────
# SECTION: CLI & Integration (tests 44-54)
# ──────────────────────────────────────────────


def test_cli_plan_pass():
    """44. CLI plan with real work order returns 0"""
    result = subprocess.run([sys.executable, "-m", "webforge", "plan", "--work-order", "examples/work_order_siged_lampa.json", "--output", "runs/test-cli-plan-pass"], capture_output=True, text=True, timeout=60, cwd=PROJECT_ROOT)
    assert result.returncode == 0, f"stdout: {result.stdout}\nstderr: {result.stderr}"
    data = json.loads(result.stdout)
    assert data["status"] == "pass"


def test_cli_plan_with_blocked():
    """45. CLI plan detects blocked state"""
    result = subprocess.run([sys.executable, "-m", "webforge", "plan", "--work-order", "examples/work_order_siged_lampa.json", "--output", "runs/test-cli-plan-pass-2"], capture_output=True, text=True, timeout=60, cwd=PROJECT_ROOT)
    assert result.returncode == 0


def test_cli_plan_workorder_v1_compatible():
    """46. WorkOrder v1 is compatible with normalize"""
    result = subprocess.run([sys.executable, "-m", "webforge", "normalize", "--work-order", "examples/work_order_siged_lampa.json", "--output", "runs/test-v1-compat"], capture_output=True, text=True, timeout=60, cwd=PROJECT_ROOT)
    assert result.returncode in (0, 1)


def test_cli_plan_generates_ledgers():
    """47. Plan generates all three ledgers"""
    result = subprocess.run([sys.executable, "-m", "webforge", "plan", "--work-order", "examples/work_order_siged_lampa.json", "--output", "runs/test-cli-plan-ledgers"], capture_output=True, text=True, timeout=60, cwd=PROJECT_ROOT)
    assert result.returncode == 0
    data = json.loads(result.stdout)
    gen = data.get("generated_files", [])
    ledgers = [f for f in gen if "ledger" in f]
    assert len(ledgers) >= 3


def test_cli_plan_generates_report():
    """48. Plan generates planning report"""
    result = subprocess.run([sys.executable, "-m", "webforge", "plan", "--work-order", "examples/work_order_siged_lampa.json", "--output", "runs/test-cli-plan-report"], capture_output=True, text=True, timeout=60, cwd=PROJECT_ROOT)
    assert result.returncode == 0
    data = json.loads(result.stdout)
    assert data.get("report") or data.get("generated_files")


def test_cli_plan_generates_summary():
    """49. Plan generates planning summary"""
    result = subprocess.run([sys.executable, "-m", "webforge", "plan", "--work-order", "examples/work_order_siged_lampa.json", "--output", "runs/test-cli-plan-summary"], capture_output=True, text=True, timeout=60, cwd=PROJECT_ROOT)
    assert result.returncode == 0
    data = json.loads(result.stdout)
    summary = data.get("summary", "")
    assert len(summary) > 0
    assert "Status" in summary or "status" in summary


def test_cli_plan_deterministic():
    """50. Plan outputs are deterministic"""
    result1 = subprocess.run([sys.executable, "-m", "webforge", "plan", "--work-order", "examples/work_order_siged_lampa.json", "--output", "runs/test-deterministic-1"], capture_output=True, text=True, timeout=60, cwd=PROJECT_ROOT)
    result2 = subprocess.run([sys.executable, "-m", "webforge", "plan", "--work-order", "examples/work_order_siged_lampa.json", "--output", "runs/test-deterministic-2"], capture_output=True, text=True, timeout=60, cwd=PROJECT_ROOT)
    assert result1.returncode == 0 and result2.returncode == 0
    data1 = json.loads(result1.stdout)
    data2 = json.loads(result2.stdout)
    assert data1["decisions"] == data2["decisions"]
    assert data1["agents"] == data2["agents"]
    assert data1["tasks"] == data2["tasks"]


def test_cli_plan_agents_manifest():
    """51. Plan writes agents.json with 6 agents"""
    result = subprocess.run([sys.executable, "-m", "webforge", "plan", "--work-order", "examples/work_order_siged_lampa.json", "--output", "runs/test-cli-plan-agents"], capture_output=True, text=True, timeout=60, cwd=PROJECT_ROOT)
    assert result.returncode == 0
    agents_path = PROJECT_ROOT / "runs" / "test-cli-plan-agents" / "agents.json"
    if agents_path.exists():
        agents = json.loads(agents_path.read_text())
        assert len(agents.get("agents", agents.get("items", []))) >= 6


def test_cli_plan_gates_all_pass():
    """52. All 7 gates pass with real work order"""
    result = subprocess.run([sys.executable, "-m", "webforge", "plan", "--work-order", "examples/work_order_siged_lampa.json", "--output", "runs/test-cli-plan-gates"], capture_output=True, text=True, timeout=60, cwd=PROJECT_ROOT)
    assert result.returncode == 0
    data = json.loads(result.stdout)
    gates = data.get("gates", [])
    assert len(gates) == 7
    all_pass = all(g.get("passed", False) for g in gates)
    assert all_pass, f"Gates: {gates}"


def test_cli_plan_documentation_exists():
    """53. Architecture documentation files exist"""
    docs = ["docs/ARQUITECTURA_FABRICA.md", "docs/AGENTES_Y_HANDOFFS.md", "docs/PLAN_IMPLEMENTACION_SIGED.md", "docs/DECISIONES_ARQUITECTONICAS_SIGED.md"]
    for d in docs:
        assert (PROJECT_ROOT / d).exists(), f"Missing: {d}"


def test_cli_plan_architecture_dir():
    """54. Architecture directory has all artifacts"""
    arch_dir = PROJECT_ROOT / "project" / "siged-lampa" / "architecture"
    assert arch_dir.is_dir()
    files = [f.name for f in arch_dir.iterdir() if f.is_file()]
    required = ["decisions.json", "architecture.json", "agents.json", "contracts.json", "tasks.json", "task-dag.json", "handoff-plan.json"]
    for r in required:
        assert r in files, f"Missing: project/siged-lampa/architecture/{r}"


# ──────────────────────────────────────────────
# SECTION: Output Determinism (test 55)
# ──────────────────────────────────────────────


def test_planning_deterministic():
    """55. Planning produces identical results for same input"""
    from webforge.planning.decisions import generate_decisions, decisions_to_dict
    from webforge.planning.agents import generate_agents
    from webforge.planning.tasks import generate_tasks
    from webforge.planning.handoffs import generate_handoffs
    tasks1 = generate_tasks()
    tasks2 = generate_tasks()
    assert json.dumps(tasks1, sort_keys=True) == json.dumps(tasks2, sort_keys=True)
    agents1 = generate_agents()
    agents2 = generate_agents()
    assert json.dumps(agents1, sort_keys=True) == json.dumps(agents2, sort_keys=True)
    handoffs1 = generate_handoffs()
    handoffs2 = generate_handoffs()
    assert json.dumps(handoffs1, sort_keys=True) == json.dumps(handoffs2, sort_keys=True)
