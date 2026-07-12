from __future__ import annotations

from typing import Any


def build_siged_task_backlog(profile: dict[str, Any]) -> list[dict[str, Any]]:
    tasks: list[dict[str, Any]] = []
    screen_by_module = _group(profile["screens"], "module")
    endpoint_by_module = _group(profile["endpoints"], "module")

    for module in profile["modules"]:
        code = module["code"]
        tasks.append(
            {
                "id": f"TASK-{code}",
                "type": "module",
                "module": code,
                "title": f"Implementar {module['name']}",
                "source": "Especificacion_Funcional_SIGED_Lampa.md",
                "description": module["objective"],
                "screens": [item["code"] for item in screen_by_module.get(code, [])],
                "endpoints": [item["code"] for item in endpoint_by_module.get(code, [])],
                "acceptance": [
                    "La UI permite ejecutar el flujo principal del modulo.",
                    "El backend expone endpoints trazados al inventario.",
                    "Los estados se reflejan en auditoria y reportes.",
                ],
            }
        )

    for screen in profile["screens"]:
        tasks.append(
            {
                "id": f"TASK-{screen['code']}",
                "type": "screen",
                "module": screen["module"],
                "title": f"Construir pantalla {screen['name']}",
                "source": "Mapa_Pantallas_Navegacion_SIGED_Lampa.md",
                "route": screen["route"],
                "actor": screen["actor"],
                "acceptance": [
                    "La pantalla respeta ruta, actor y zona definidos.",
                    "La pantalla no aparece antes de autenticacion si pertenece a intranet o portal privado.",
                ],
            }
        )

    for endpoint in profile["endpoints"]:
        tasks.append(
            {
                "id": f"TASK-{endpoint['code']}",
                "type": "endpoint",
                "module": endpoint["module"],
                "title": f"{endpoint['method']} {endpoint['path']}",
                "source": "Inventario_Endpoints_SIGED_Lampa.md",
                "auth": endpoint["auth"],
                "resource": endpoint["resource"],
                "acceptance": [
                    "El endpoint responde con formato JSON estandar.",
                    "El endpoint aplica autenticacion/autorizacion segun contrato.",
                ],
            }
        )

    for table in profile["er_tables"]:
        tasks.append(
            {
                "id": f"TASK-DB-{table['name']}",
                "type": "database",
                "title": f"Modelar tabla {table['name']}",
                "source": "Modelo_ER_Detallado_SIGED_Lampa.md",
                "purpose": table["purpose"],
                "pk": table["pk"],
                "fks": table["fks"],
                "key_fields": table["key_fields"],
                "acceptance": [
                    "La migracion crea tabla, llaves y restricciones minimas.",
                    "El seed o pruebas cubren al menos un caso operativo de la tabla.",
                ],
            }
        )

    return tasks


def task_backlog_markdown(tasks: list[dict[str, Any]]) -> str:
    lines = [
        "# SIGED task backlog",
        "",
        "Este backlog es derivado por la fabrica desde las fuentes autorizadas SIGED.",
        "",
        "| task | tipo | modulo | titulo | fuente |",
        "|---|---|---|---|---|",
    ]
    for task in tasks:
        lines.append(
            f"| {task['id']} | {task['type']} | {task.get('module', '-')} | {task['title']} | {task['source']} |"
        )
    return "\n".join(lines)


def _group(items: list[dict[str, str]], key: str) -> dict[str, list[dict[str, str]]]:
    grouped: dict[str, list[dict[str, str]]] = {}
    for item in items:
        grouped.setdefault(item.get(key, ""), []).append(item)
    return grouped
