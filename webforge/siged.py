from __future__ import annotations

import json
import re
from pathlib import Path
from typing import Any

from .models import WorkOrder
from .project_workspace import ProjectWorkspace
from .siged_templates import (
    _app_js,
    _backend_data_js,
    _backend_server_js,
    _backend_src_server_js,
    _docker_compose_yml,
    _dockerfile,
    _env_example,
    _frontend_src_app_js,
    _implementation_plan,
    _index_html,
    _package_json,
    _schema_sql,
    _seed_sql,
    _styles_css,
    _verify_script,
)
from .siged_tasks import build_siged_task_backlog, task_backlog_markdown
from .utils import read_text, sha256_text, stable_json


SIGED_SOURCE_NAMES = {
    "Especificacion_Funcional_SIGED_Lampa.md",
    "Inventario_Endpoints_SIGED_Lampa.md",
    "Mapa_Pantallas_Navegacion_SIGED_Lampa.md",
    "Modelo_ER_Detallado_SIGED_Lampa.md",
}


def is_siged_request(work_order: WorkOrder, sources: list[Path]) -> bool:
    haystack = " ".join(
        [
            work_order.objective,
            work_order.project_id,
            work_order.type,
            str(work_order.metadata.get("product", "")),
            *[source.name for source in sources],
        ]
    ).lower()
    return "siged" in haystack or "lampa" in haystack


def build_siged_profile(sources: list[Path]) -> dict[str, Any]:
    source_docs = []
    source_files = []
    texts: dict[str, str] = {}
    for source in sources:
        if not source.exists() or source.suffix.lower() != ".md":
            continue
        text = read_text(source)
        texts[source.name] = text
        source_files.append({"name": source.name, "content": text})
        source_docs.append(
            {
                "name": source.name,
                "path": source.as_posix(),
                "sha256": sha256_text(text),
                "lines": len(text.splitlines()),
            }
        )

    combined = "\n".join(texts.values())
    modules = _parse_modules(combined)
    endpoints = _parse_endpoints(texts.get("Inventario_Endpoints_SIGED_Lampa.md", combined))
    screens = _parse_screens(texts.get("Mapa_Pantallas_Navegacion_SIGED_Lampa.md", combined))
    tables = _parse_er_tables(texts.get("Modelo_ER_Detallado_SIGED_Lampa.md", combined))
    use_cases = _parse_use_cases(texts.get("Especificacion_Funcional_SIGED_Lampa.md", combined))

    if not modules:
        modules = _fallback_modules()
    if not endpoints:
        endpoints = _fallback_endpoints()
    if not screens:
        screens = _fallback_screens()
    navigation = _derive_navigation(modules, screens, endpoints)

    profile = {
        "product": "SIGED-Lampa",
        "version": "v0.1",
        "status": "ready_for_local_factory_run",
        "source_docs": source_docs,
        "source_files": source_files,
        "counts": {
            "source_docs": len(source_docs),
            "modules": len(modules),
            "use_cases": len(use_cases),
            "endpoints": len(endpoints),
            "screens": len(screens),
            "er_tables": len(tables),
        },
        "modules": modules,
        "use_cases": use_cases,
        "endpoints": endpoints,
        "screens": screens,
        "er_tables": tables,
        "navigation": navigation,
        "access_policy": _derive_access_policy(navigation),
        "critical_flows": [
            {
                "id": "FLOW-DOC",
                "name": "Flujo documental interno",
                "screens": ["P-01", "P-05", "P-12", "P-13", "P-14", "P-16", "P-17", "P-18"],
            },
            {
                "id": "FLOW-EXP",
                "name": "Consulta de expediente",
                "screens": ["P-05", "P-19", "P-20", "P-14"],
            },
            {
                "id": "FLOW-COR",
                "name": "Correspondencia municipal",
                "screens": ["P-05", "P-21", "P-22", "P-14"],
            },
            {
                "id": "FLOW-CIU",
                "name": "Tramite ciudadano",
                "screens": ["P-23", "P-24", "P-02", "P-25", "P-26"],
            },
            {
                "id": "FLOW-OIRS",
                "name": "Ingreso y gestion OIRS",
                "screens": ["P-23", "P-27", "P-28"],
            },
        ],
    }
    profile["profile_hash"] = sha256_text(stable_json(profile))
    return profile


def siged_spec_markdown(work_order: WorkOrder, profile: dict[str, Any]) -> str:
    counts = profile["counts"]
    lines = [
        "# Spec",
        "",
        f"Product: {profile['product']}",
        f"Objective: {work_order.objective}",
        f"Type: {work_order.type}",
        f"Version: {profile['version']}",
        "",
        "## Source coverage",
        "",
        f"- Authorized source docs: {counts['source_docs']}",
        f"- Modules: {counts['modules']}",
        f"- Use cases: {counts['use_cases']}",
        f"- Endpoints: {counts['endpoints']}",
        f"- Screens: {counts['screens']}",
        f"- ER tables: {counts['er_tables']}",
        "",
        "## Actors",
        "",
        "- ACT-ADM Administrador del sistema",
        "- ACT-FUN Funcionario municipal",
        "- ACT-OPA Oficina de partes",
        "- ACT-REV Revisor o jefatura",
        "- ACT-OIR Operador OIRS",
        "- ACT-REP Analista de reportes",
        "- ACT-CIU Ciudadano autenticado",
        "- ACT-VIS Ciudadano visitante",
        "- ACT-EXT Entidad externa receptora",
        "",
        "## Functional modules",
        "",
        "| code | module | objective |",
        "|---|---|---|",
    ]
    for module in profile["modules"]:
        lines.append(f"| {module['code']} | {module['name']} | {module['objective']} |")

    lines.extend(
        [
            "",
            "## Acceptance criteria",
            "",
        ]
    )
    for index, item in enumerate(work_order.acceptance_criteria, 1):
        lines.append(f"- AC{index:02d}: {item}")
    lines.extend(
        [
            "",
            "## Implementation target",
            "",
            "- Build a local full-stack web prototype in the isolated DEV sandbox.",
            "- Include a frontend, a backend API, intranet, citizen portal, route catalog, API catalog, ER catalog and traceability views.",
            "- Keep full factory evidence in run artifacts and app-level evidence in DEV workspace data files.",
            "- No external write, deploy, real authentication, real signature, real Clave Unica or production data.",
        ]
    )
    return "\n".join(lines)


def build_siged_implementation_bundle(
    work_order: WorkOrder,
    project_workspace: ProjectWorkspace,
    profile: dict[str, Any],
) -> list[dict[str, Any]]:
    seed = _seed_data(work_order, project_workspace, profile)
    api_catalog = {"product": profile["product"], "endpoints": profile["endpoints"]}
    traceability = _traceability_data(profile)
    task_backlog = build_siged_task_backlog(profile)
    source_bundle = [
        {"path": f"sources/{item['name']}", "content": item["content"]}
        for item in profile.get("source_files", [])
    ]
    return [
        {"path": "README.md", "content": _app_readme(project_workspace, profile)},
        {"path": "package.json", "content": _package_json()},
        {"path": ".env.example", "content": _env_example()},
        {"path": "Dockerfile", "content": _dockerfile()},
        {"path": "docker-compose.yml", "content": _docker_compose_yml()},
        {"path": "backend/server.js", "content": _backend_server_js(seed, api_catalog, traceability)},
        {"path": "backend/src/server.js", "content": _backend_src_server_js()},
        {"path": "backend/src/data.js", "content": _backend_data_js(seed, api_catalog, traceability)},
        {"path": "data/seed.json", "content": json.dumps(seed, ensure_ascii=True, indent=2, sort_keys=True)},
        {
            "path": "data/api-catalog.json",
            "content": json.dumps(api_catalog, ensure_ascii=True, indent=2, sort_keys=True),
        },
        {
            "path": "data/traceability.json",
            "content": json.dumps(traceability, ensure_ascii=True, indent=2, sort_keys=True),
        },
        {
            "path": "tasks/product-backlog.json",
            "content": json.dumps(task_backlog, ensure_ascii=True, indent=2, sort_keys=True),
        },
        {"path": "tasks/implementation-tasks.md", "content": task_backlog_markdown(task_backlog)},
        {"path": "frontend/index.html", "content": _index_html(profile)},
        {"path": "frontend/src/app.js", "content": _frontend_src_app_js(seed, api_catalog, traceability)},
        {"path": "frontend/assets/styles.css", "content": _styles_css()},
        {"path": "frontend/assets/app.js", "content": _app_js(seed, api_catalog, traceability)},
        {"path": "app/index.html", "content": _index_html(profile)},
        {"path": "app/assets/styles.css", "content": _styles_css()},
        {"path": "app/assets/app.js", "content": _app_js(seed, api_catalog, traceability)},
        {"path": "app/data/seed.json", "content": json.dumps(seed, ensure_ascii=True, indent=2, sort_keys=True)},
        {
            "path": "app/data/api-catalog.json",
            "content": json.dumps(api_catalog, ensure_ascii=True, indent=2, sort_keys=True),
        },
        {
            "path": "app/data/traceability.json",
            "content": json.dumps(traceability, ensure_ascii=True, indent=2, sort_keys=True),
        },
        {"path": "db/schema.sql", "content": _schema_sql(profile)},
        {"path": "db/migrations/001_initial.sql", "content": _schema_sql(profile)},
        {"path": "db/seeds/001_demo.sql", "content": _seed_sql()},
        {"path": "docs/SIGED_IMPLEMENTATION_PLAN.md", "content": _implementation_plan(profile)},
        {"path": "scripts/verify_siged_bundle.py", "content": _verify_script()},
    ] + source_bundle


def _parse_modules(text: str) -> list[dict[str, str]]:
    modules = []
    for cells in _table_rows(text):
        if len(cells) >= 3 and re.fullmatch(r"M\d{2}", cells[0]):
            modules.append({"code": cells[0], "name": cells[1], "objective": cells[2]})
    return _unique_by(modules, "code")


def _parse_endpoints(text: str) -> list[dict[str, str]]:
    endpoints = []
    for cells in _table_rows(text):
        if len(cells) >= 6 and re.fullmatch(r"API-\d{3}", cells[0]):
            endpoints.append(
                {
                    "code": cells[0],
                    "method": cells[1],
                    "path": _strip_code(cells[2]),
                    "auth": cells[3],
                    "module": cells[4],
                    "resource": cells[5],
                }
            )
    return _unique_by(endpoints, "code")


def _parse_screens(text: str) -> list[dict[str, str]]:
    screens = []
    for cells in _table_rows(text):
        if len(cells) >= 6 and re.fullmatch(r"P-\d{2}", cells[0]):
            screens.append(
                {
                    "code": cells[0],
                    "name": cells[1],
                    "route": _strip_code(cells[2]),
                    "zone": cells[3],
                    "actor": cells[4],
                    "module": cells[5],
                }
            )
    return _unique_by(screens, "code")


def _parse_er_tables(text: str) -> list[dict[str, str]]:
    tables = []
    for cells in _table_rows(text):
        if len(cells) >= 5 and cells[0].startswith("`") and cells[0].endswith("`"):
            name = _strip_code(cells[0])
            if name and name != "Tabla":
                tables.append(
                    {
                        "name": name,
                        "purpose": cells[1],
                        "pk": _strip_code(cells[2]),
                        "fks": cells[3],
                        "key_fields": cells[4],
                    }
                )
    return _unique_by(tables, "name")


def _parse_use_cases(text: str) -> list[dict[str, str]]:
    use_cases = []
    for match in re.finditer(r"^###\s+(UC-\d{2})\s+(.+)$", text, flags=re.MULTILINE):
        use_cases.append({"code": match.group(1), "name": match.group(2).strip()})
    return _unique_by(use_cases, "code")


def _table_rows(text: str) -> list[list[str]]:
    rows = []
    for line in text.splitlines():
        value = line.strip()
        if not value.startswith("|") or not value.endswith("|"):
            continue
        cells = [cell.strip() for cell in value.strip("|").split("|")]
        if all(set(cell) <= {"-", ":"} for cell in cells):
            continue
        rows.append(cells)
    return rows


def _strip_code(value: str) -> str:
    return value.strip().strip("`")


def _unique_by(items: list[dict[str, str]], key: str) -> list[dict[str, str]]:
    seen = set()
    unique = []
    for item in items:
        value = item[key]
        if value in seen:
            continue
        seen.add(value)
        unique.append(item)
    return unique


def _derive_navigation(
    modules: list[dict[str, str]],
    screens: list[dict[str, str]],
    endpoints: list[dict[str, str]],
) -> dict[str, Any]:
    module_names = {module["code"]: module["name"] for module in modules}
    endpoint_by_module: dict[str, list[str]] = {}
    for endpoint in endpoints:
        endpoint_by_module.setdefault(endpoint.get("module", ""), []).append(endpoint["code"])

    groups: dict[str, dict[str, Any]] = {}
    for screen in screens:
        surface = _screen_surface(screen)
        view_id, label, kind = _screen_view(screen, surface, module_names)
        key = f"{surface}:{view_id}"
        item = groups.setdefault(
            key,
            {
                "id": view_id,
                "label": label,
                "surface": surface,
                "kind": kind,
                "module": screen.get("module", ""),
                "route": screen.get("route", ""),
                "source_screens": [],
                "endpoint_codes": [],
                "allowed_roles": _allowed_roles(surface, screen.get("actor", "")),
            },
        )
        item["source_screens"].append(
            {
                "code": screen["code"],
                "name": screen["name"],
                "route": screen["route"],
                "actor": screen["actor"],
                "module": screen["module"],
            }
        )
        for code in endpoint_by_module.get(screen.get("module", ""), []):
            if code not in item["endpoint_codes"]:
                item["endpoint_codes"].append(code)

    items = list(groups.values())
    if not any(item["surface"] == "intranet" and item["id"] == "dashboard" for item in items):
        items.insert(0, _system_nav_item("dashboard", "Inicio", "intranet", "dashboard", ["ADMIN", "FUNC", "OF_PARTES", "REVISOR", "OIRS", "REPORTES"]))
    if not any(item["surface"] == "portal" and item["id"] == "portal-home" for item in items):
        items.append(_system_nav_item("portal-home", "Inicio", "portal", "portal-home", ["CIUDADANO"]))
    if not any(item["surface"] == "portal" and item["id"] == "requests" for item in items):
        items.append(_system_nav_item("requests", "Mis solicitudes", "portal", "requests", ["CIUDADANO"]))
    if not any(item["surface"] == "portal" and item["id"] == "new-request" for item in items):
        items.append(_system_nav_item("new-request", "Nuevo tramite", "portal", "request-form", ["CIUDADANO"]))
    if not any(item["surface"] == "portal" and item["id"] == "profile" for item in items):
        items.append(_system_nav_item("profile", "Mi perfil", "portal", "profile", ["CIUDADANO"]))

    ordered = sorted(items, key=lambda item: (_surface_order(item["surface"]), _nav_order(item["id"]), item["label"]))
    portal_forbidden = {"documents", "expedients", "users", "trace", "dashboard"}
    return {
        "intranet": [item for item in ordered if item["surface"] == "intranet"],
        "portal": [item for item in ordered if item["surface"] == "portal" and item["id"] not in portal_forbidden],
        "all": ordered,
    }


def _derive_access_policy(navigation: dict[str, Any]) -> dict[str, Any]:
    portal_ids = [item["id"] for item in navigation["portal"]]
    intranet_ids = [item["id"] for item in navigation["intranet"]]
    return {
        "surfaces": {
            "portal": {
                "allowed_view_ids": portal_ids,
                "forbidden_view_ids": [item for item in intranet_ids if item not in portal_ids],
                "default_view": portal_ids[0] if portal_ids else "portal-home",
            },
            "intranet": {
                "allowed_view_ids": intranet_ids,
                "forbidden_view_ids": [],
                "default_view": "dashboard" if "dashboard" in intranet_ids else (intranet_ids[0] if intranet_ids else "dashboard"),
            },
        },
        "rules": [
            "La navegacion visible se deriva del Mapa_Pantallas_Navegacion_SIGED_Lampa.md.",
            "Un usuario de portal no puede ver vistas de superficie intranet.",
            "Las vistas no permitidas vuelven a la vista por defecto de su superficie.",
        ],
    }


def _screen_surface(screen: dict[str, str]) -> str:
    text = _norm(" ".join([screen.get("zone", ""), screen.get("actor", ""), screen.get("route", ""), screen.get("name", "")]))
    if any(token in text for token in ["portal", "ciudadano", "public", "visitante", "tramite"]):
        return "portal"
    return "intranet"


def _screen_view(screen: dict[str, str], surface: str, module_names: dict[str, str]) -> tuple[str, str, str]:
    text = _norm(" ".join([screen.get("name", ""), screen.get("route", ""), screen.get("module", ""), module_names.get(screen.get("module", ""), "")]))
    if surface == "portal":
        if any(token in text for token in ["perfil", "cuenta"]):
            return "profile", "Mi perfil", "profile"
        if any(token in text for token in ["seguimiento", "mis solicitudes", "consulta", "estado"]):
            return "requests", "Mis solicitudes", "requests"
        if any(token in text for token in ["ingreso", "formulario", "tramite", "oirs", "solicitud"]):
            return "new-request", "Nuevo tramite", "request-form"
        return "portal-home", "Inicio", "portal-home"

    if any(token in text for token in ["document"]):
        return "documents", "Documentos", "documents"
    if any(token in text for token in ["expedient"]):
        return "expedients", "Expedientes", "expedients"
    if any(token in text for token in ["oirs", "solicitud", "correspond"]):
        return "requests", "Solicitudes", "requests"
    if any(token in text for token in ["usuario", "rol", "perfil", "admin"]):
        return "users", "Usuarios y roles", "users"
    if any(token in text for token in ["trazabilidad", "auditoria", "api", "modelo"]):
        return "trace", "Trazabilidad", "trace"
    if any(token in text for token in ["reporte", "dashboard", "indicador", "inicio"]):
        return "dashboard", "Inicio", "dashboard"

    module = screen.get("module", "")
    label = module_names.get(module, screen.get("name", module or "Modulo")).strip()
    view_id = f"module-{module.lower()}" if module else _slug(screen.get("name", "modulo"))
    return view_id, label, "module"


def _allowed_roles(surface: str, actor: str) -> list[str]:
    if surface == "portal":
        return ["CIUDADANO"]
    text = _norm(actor)
    roles = []
    if any(token in text for token in ["admin", "sistema"]):
        roles.append("ADMIN")
    if any(token in text for token in ["partes"]):
        roles.append("OF_PARTES")
    if any(token in text for token in ["revisor", "jefatura"]):
        roles.append("REVISOR")
    if "oirs" in text:
        roles.append("OIRS")
    if any(token in text for token in ["report", "analista"]):
        roles.append("REPORTES")
    if not roles:
        roles.extend(["ADMIN", "FUNC"])
    return sorted(set(roles))


def _system_nav_item(view_id: str, label: str, surface: str, kind: str, roles: list[str]) -> dict[str, Any]:
    return {
        "id": view_id,
        "label": label,
        "surface": surface,
        "kind": kind,
        "module": "",
        "route": f"/{surface}" if view_id in {"dashboard", "portal-home"} else f"/{surface}/{view_id}",
        "source_screens": [],
        "endpoint_codes": [],
        "allowed_roles": roles,
    }


def _surface_order(surface: str) -> int:
    return 0 if surface == "intranet" else 1


def _nav_order(view_id: str) -> int:
    order = {
        "dashboard": 0,
        "portal-home": 0,
        "documents": 10,
        "expedients": 20,
        "requests": 30,
        "new-request": 40,
        "users": 80,
        "profile": 85,
        "trace": 90,
    }
    return order.get(view_id, 50)


def _slug(value: str) -> str:
    text = _norm(value)
    return re.sub(r"[^a-z0-9]+", "-", text).strip("-") or "vista"


def _norm(value: str) -> str:
    return (
        value.lower()
        .replace("á", "a")
        .replace("é", "e")
        .replace("í", "i")
        .replace("ó", "o")
        .replace("ú", "u")
        .replace("ñ", "n")
    )


def _seed_data(work_order: WorkOrder, project_workspace: ProjectWorkspace, profile: dict[str, Any]) -> dict[str, Any]:
    return {
        "product": profile["product"],
        "objective": work_order.objective,
        "project_id": project_workspace.project_id,
        "version": project_workspace.version,
        "counts": profile["counts"],
        "modules": profile["modules"],
        "screens": profile["screens"],
        "er_tables": profile["er_tables"],
        "critical_flows": profile["critical_flows"],
        "navigation": profile["navigation"],
        "access_policy": profile["access_policy"],
        "demo": {
            "roles": [
                {"code": "ADMIN", "name": "Administrador", "surface": "intranet"},
                {"code": "FUNC", "name": "Funcionario municipal", "surface": "intranet"},
                {"code": "OF_PARTES", "name": "Oficina de partes", "surface": "intranet"},
                {"code": "REVISOR", "name": "Revisor o jefatura", "surface": "intranet"},
                {"code": "OIRS", "name": "Operador OIRS", "surface": "intranet"},
                {"code": "REPORTES", "name": "Analista de reportes", "surface": "intranet"},
                {"code": "CIUDADANO", "name": "Usuario ciudadano", "surface": "portal"},
            ],
            "users": [
                {
                    "username": "admin.lampa",
                    "full_name": "Marcela Torres",
                    "email": "admin@lampa.cl",
                    "role": "ADMIN",
                    "surface": "intranet",
                    "department": "Administracion Municipal",
                },
                {
                    "username": "funcionario.dom",
                    "full_name": "Luis Perez",
                    "email": "lperez@lampa.cl",
                    "role": "FUNC",
                    "surface": "intranet",
                    "department": "Direccion de Obras",
                },
                {
                    "username": "partes",
                    "full_name": "Ana Rojas",
                    "email": "partes@lampa.cl",
                    "role": "OF_PARTES",
                    "surface": "intranet",
                    "department": "Oficina de Partes",
                },
                {
                    "username": "revisor.secmun",
                    "full_name": "Roberto Silva",
                    "email": "rsilva@lampa.cl",
                    "role": "REVISOR",
                    "surface": "intranet",
                    "department": "Secretaria Municipal",
                },
                {
                    "username": "oirs.operador",
                    "full_name": "Carolina Soto",
                    "email": "csoto@lampa.cl",
                    "role": "OIRS",
                    "surface": "intranet",
                    "department": "OIRS",
                },
                {
                    "username": "vecino.demo",
                    "full_name": "Vecino Demo",
                    "email": "vecino@correo.cl",
                    "role": "CIUDADANO",
                    "surface": "portal",
                    "department": "Portal ciudadano",
                },
            ],
            "documents": [
                {"folio": "DOC-2026-0001", "title": "Decreto alcaldicio", "status": "En revision", "owner": "Secretaria Municipal"},
                {"folio": "DOC-2026-0002", "title": "Memo Direccion Obras", "status": "Borrador", "owner": "DOM"},
                {"folio": "DOC-2026-0003", "title": "Respuesta OIRS", "status": "Firmado", "owner": "OIRS"},
            ],
            "requests": [
                {"tracking": "TR-2026-00044", "subject": "Certificado de residencia", "status": "Ingresada"},
                {"tracking": "OIRS-2026-00112", "subject": "Consulta retiro de escombros", "status": "Asignada"},
            ],
            "kpis": [
                {"label": "Documentos activos", "value": 184, "trend": "+12 esta semana"},
                {"label": "Revisiones pendientes", "value": 27, "trend": "8 vencen hoy"},
                {"label": "Solicitudes ciudadanas", "value": 63, "trend": "91% dentro de SLA"},
                {"label": "Trazas auditadas", "value": 1240, "trend": "100% con evidencia"},
            ],
        },
    }


def _traceability_data(profile: dict[str, Any]) -> dict[str, Any]:
    screen_by_module: dict[str, list[str]] = {}
    endpoint_by_module: dict[str, list[str]] = {}
    for screen in profile["screens"]:
        screen_by_module.setdefault(screen["module"], []).append(screen["code"])
    for endpoint in profile["endpoints"]:
        endpoint_by_module.setdefault(endpoint["module"], []).append(endpoint["code"])
    return {
        "product": profile["product"],
        "profile_hash": profile["profile_hash"],
        "source_docs": profile["source_docs"],
        "module_trace": [
            {
                "module": module["code"],
                "name": module["name"],
                "screens": screen_by_module.get(module["code"], []),
                "endpoints": endpoint_by_module.get(module["code"], []),
            }
            for module in profile["modules"]
        ],
        "factory_gates": ["P01-P12", "project_isolation", "frontend_template", "sandbox", "security", "traceability"],
    }


def _app_readme(project_workspace: ProjectWorkspace, profile: dict[str, Any]) -> str:
    return "\n".join(
        [
            "# SIGED-Lampa DEV workspace",
            "",
            "Este paquete fue materializado por WEBFORGE dentro del sandbox DEV aislado.",
            "",
            f"- Proyecto: `{project_workspace.project_id}`",
            f"- Version: `{project_workspace.version}`",
            f"- Producto: `{profile['product']}`",
            "- Backend: `backend/server.js`",
            "- Frontend: `frontend/index.html`",
            "- Entrada compatible por archivo: `app/index.html`",
            "- Ejecucion local full stack: `npm start`",
            "- Verificacion local: `python scripts/verify_siged_bundle.py`",
            "",
            "No contiene credenciales reales, datos productivos ni integraciones externas activas. Las claves demo deben reemplazarse antes de produccion.",
        ]
    )


def _fallback_modules() -> list[dict[str, str]]:
    return [
        {"code": "M01", "name": "Autenticacion, perfiles y autorizacion", "objective": "Gestionar acceso, roles y permisos"},
        {"code": "M02", "name": "Administracion organizacional", "objective": "Gestionar usuarios, departamentos y parametros"},
        {"code": "M03", "name": "Gestion documental", "objective": "Crear, versionar y archivar documentos"},
        {"code": "M04", "name": "Revision, visto bueno y firma", "objective": "Orquestar revision y firma simulada"},
        {"code": "M05", "name": "Expedientes y trazabilidad", "objective": "Agrupar documentos y eventos"},
        {"code": "M06", "name": "Correspondencia", "objective": "Registrar, derivar y responder correspondencia"},
        {"code": "M07", "name": "Portal ciudadano", "objective": "Publicar tramites y seguimiento"},
        {"code": "M08", "name": "OIRS digital", "objective": "Gestionar solicitudes ciudadanas"},
        {"code": "M09", "name": "Reportabilidad", "objective": "Exponer dashboards y exportaciones"},
        {"code": "M10", "name": "Notificaciones", "objective": "Emitir alertas internas y ciudadanas"},
    ]


def _fallback_endpoints() -> list[dict[str, str]]:
    return [
        {"code": f"API-{index:03d}", "method": "GET", "path": f"/api/v1/scaffold/{index}", "auth": "intranet", "module": f"M{((index - 1) % 10) + 1:02d}", "resource": "scaffold"}
        for index in range(1, 41)
    ]


def _fallback_screens() -> list[dict[str, str]]:
    return [
        {"code": f"P-{index:02d}", "name": f"Pantalla {index:02d}", "route": f"/scaffold/{index}", "zone": "intranet", "actor": "funcionario", "module": f"M{((index - 1) % 10) + 1:02d}"}
        for index in range(1, 31)
    ]
