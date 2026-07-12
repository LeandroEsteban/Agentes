from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read_json(path: str) -> dict:
    return json.loads((ROOT / path).read_text(encoding="utf-8"))


def main() -> int:
    seed = read_json("data/seed.json")
    api = read_json("data/api-catalog.json")
    trace = read_json("data/traceability.json")
    portal_nav = seed.get("navigation", {}).get("portal", [])
    intranet_nav = seed.get("navigation", {}).get("intranet", [])
    portal_ids = {item.get("id") for item in portal_nav}
    portal_labels = {item.get("label") for item in portal_nav}
    checks = {
        "backend_entry": (ROOT / "backend" / "server.js").exists(),
        "backend_src": (ROOT / "backend" / "src" / "server.js").exists(),
        "frontend_entry": (ROOT / "frontend" / "index.html").exists(),
        "frontend_app": (ROOT / "frontend" / "assets" / "app.js").exists(),
        "frontend_src": (ROOT / "frontend" / "src" / "app.js").exists(),
        "login_endpoint": "/api/v1/auth/login" in (ROOT / "backend" / "src" / "server.js").read_text(encoding="utf-8"),
        "docker_compose": (ROOT / "docker-compose.yml").exists(),
        "migration": (ROOT / "db" / "migrations" / "001_initial.sql").exists(),
        "seed_sql": (ROOT / "db" / "seeds" / "001_demo.sql").exists(),
        "sources_present": (ROOT / "sources").exists() and any((ROOT / "sources").glob("*.md")),
        "backlog_present": (ROOT / "tasks" / "product-backlog.json").exists(),
        "navigation_contract": bool(portal_nav) and bool(intranet_nav),
        "access_policy_contract": "access_policy" in seed and "surfaces" in seed["access_policy"],
        "portal_blocks_internal_view_ids": not (portal_ids & {"documents", "expedients", "users", "trace", "dashboard"}),
        "portal_blocks_internal_labels": not (portal_labels & {"Documentos", "Expedientes", "Usuarios y roles", "Trazabilidad"}),
        "modules>=10": len(seed["modules"]) >= 10,
        "screens>=30": len(seed["screens"]) >= 30,
        "endpoints>=40": len(api["endpoints"]) >= 40,
        "er_tables>=40": len(seed["er_tables"]) >= 40,
        "source_docs>=4": len(trace["source_docs"]) >= 4,
    }
    failed = [name for name, ok in checks.items() if not ok]
    print(json.dumps({"status": "pass" if not failed else "error", "failed": failed, "checks": checks}, indent=2, sort_keys=True))
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
