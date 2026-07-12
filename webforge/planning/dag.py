from __future__ import annotations

from pathlib import Path
import json
from typing import Any
from datetime import datetime
from collections import deque

DAG_SCHEMA = "webforge.task_dag.v1"


def _infer_edge_type(from_id: str, to_id: str) -> str:
    if from_id.startswith("TASK-DB-") and to_id.startswith("TASK-API-"):
        return "provides_schema"
    if from_id.startswith("TASK-API-") and to_id.startswith("TASK-UI-"):
        return "provides_contract"
    if from_id.startswith("TASK-UI-") and to_id.startswith("TASK-QA-"):
        return "provides_component"
    if to_id.startswith("TASK-QA-"):
        return "requires_validation"
    return "blocks"


def build_dag(tasks: list[dict]) -> dict:
    nodes = []
    edges = []

    for task in tasks:
        nodes.append({
            "task_id": task["task_id"],
            "agent_id": task["agent_id"],
            "phase": task["phase"],
            "estimated_complexity": task["estimated_complexity"],
        })

    for task in tasks:
        task_id = task["task_id"]
        deps = task.get("dependencies", [])
        for dep in deps:
            edge_type = _infer_edge_type(dep, task_id)
            edges.append({
                "from": dep,
                "to": task_id,
                "type": edge_type,
            })

    dag: dict[str, Any] = {
        "schema_version": DAG_SCHEMA,
        "project_id": "siged-lampa",
        "nodes": nodes,
        "edges": edges,
        "topological_order": [],
        "validation": {
            "acyclic": False,
            "orphan_nodes": [],
            "missing_dependencies": [],
            "invalid_agents": [],
        },
    }
    return dag


def detect_cycles(edges: list[dict], nodes: list[dict]) -> list[list[str]]:
    node_ids = {n["task_id"] for n in nodes}
    adj: dict[str, list[str]] = {nid: [] for nid in node_ids}
    for edge in edges:
        if edge["from"] in adj and edge["to"] in adj:
            adj[edge["from"]].append(edge["to"])

    WHITE, GRAY, BLACK = 0, 1, 2
    color = {nid: WHITE for nid in node_ids}
    cycles = []
    path_stack: list[str] = []

    def dfs(u: str) -> None:
        color[u] = GRAY
        path_stack.append(u)
        for v in adj.get(u, []):
            if color[v] == GRAY:
                cycle_start = path_stack.index(v)
                cycles.append(path_stack[cycle_start:])
            elif color[v] == WHITE:
                dfs(v)
        path_stack.pop()
        color[u] = BLACK

    for nid in node_ids:
        if color[nid] == WHITE:
            dfs(nid)

    return cycles


def topological_sort(edges: list[dict], node_ids: list[str]) -> list[str]:
    in_degree: dict[str, int] = {nid: 0 for nid in node_ids}
    adj: dict[str, list[str]] = {nid: [] for nid in node_ids}

    for edge in edges:
        if edge["from"] in adj and edge["to"] in adj:
            adj[edge["from"]].append(edge["to"])
            in_degree[edge["to"]] = in_degree.get(edge["to"], 0) + 1

    queue = deque([nid for nid in node_ids if in_degree.get(nid, 0) == 0])
    order: list[str] = []

    while queue:
        u = queue.popleft()
        order.append(u)
        for v in adj.get(u, []):
            in_degree[v] -= 1
            if in_degree[v] == 0:
                queue.append(v)

    return order


def validate_dag(dag: dict, valid_agent_ids: set[str]) -> dict:
    result = {k: v for k, v in dag.items()}
    nodes = result["nodes"]
    edges = result["edges"]
    node_ids = {n["task_id"] for n in nodes}
    node_ids_list = list(node_ids)

    order = topological_sort(edges, node_ids_list)
    result["topological_order"] = order

    acyclic = len(order) == len(node_ids)
    result["validation"]["acyclic"] = acyclic

    edge_node_ids = set()
    for edge in edges:
        edge_node_ids.add(edge["from"])
        edge_node_ids.add(edge["to"])
    orphan_nodes = []
    for n in nodes:
        nid = n["task_id"]
        if nid not in edge_node_ids:
            orphan_nodes.append(nid)
    result["validation"]["orphan_nodes"] = orphan_nodes

    missing = []
    for edge in edges:
        if edge["from"] not in node_ids:
            missing.append(edge["from"])
        if edge["to"] not in node_ids:
            missing.append(edge["to"])
    result["validation"]["missing_dependencies"] = list(set(missing))

    invalid_agents = []
    for n in nodes:
        if n["agent_id"] not in valid_agent_ids:
            invalid_agents.append(n["task_id"])
    result["validation"]["invalid_agents"] = invalid_agents

    return result


def write_dag(output_dir: Path, dag: dict) -> Path:
    output_dir.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"dag_{timestamp}.json"
    filepath = output_dir / filename
    filepath.write_text(json.dumps(dag, indent=2), encoding="utf-8")
    return filepath
