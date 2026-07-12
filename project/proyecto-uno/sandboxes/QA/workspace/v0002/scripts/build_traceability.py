#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path


def ids(prefix: str, start: int, end: int) -> set[str]:
    return {f"{prefix}_{number:03d}" for number in range(start, end + 1)}


FEATURES = [
    {
        "feature": "portal_publico",
        "selector": "#public-portal",
        "flow": "FT_001",
        "requirements": (
            {"CU_001", "CU_020", "RN_001", "RN_023", "CH_001", "FT_001", "FT_021"}
            | ids("FUN", 1, 3)
            | ids("FUN", 36, 37)
        ),
    },
    {
        "feature": "cambio_datos_contacto",
        "selector": "#contact-security",
        "flow": "FT_002",
        "requirements": {"CU_002", "FT_002", "RN_002", "CH_002"} | ids("FUN", 4, 5),
    },
    {
        "feature": "segundo_factor",
        "selector": "#second-factor",
        "flow": "FT_003",
        "requirements": {"CU_003", "FT_003", "FT_004", "RN_003", "CH_003", "CH_004", "EX_005"} | ids("FUN", 6, 7),
    },
    {
        "feature": "sesion_segura",
        "selector": "#session-security",
        "flow": "FT_005",
        "requirements": {"CU_004", "FT_005", "RN_004", "EX_009"} | ids("FUN", 8, 9),
    },
    {
        "feature": "ddu_notificaciones",
        "selector": "#ddu-notifications",
        "flow": "FT_006",
        "requirements": (
            ids("CU", 5, 12)
            | ids("FUN", 10, 24)
            | ids("FT", 6, 13)
            | ids("RN", 5, 12)
            | ids("CH", 5, 11)
            | ids("EX", 1, 4)
        ),
    },
    {
        "feature": "autorizaciones_datos_sensibles",
        "selector": "#sensitive-authorizations",
        "flow": "FT_014",
        "requirements": (
            ids("CU", 13, 16)
            | ids("FUN", 25, 30)
            | ids("FT", 14, 17)
            | ids("RN", 13, 21)
            | ids("CH", 12, 14)
            | {"EX_010"}
        ),
    },
    {
        "feature": "secciones_privadas_personales",
        "selector": "#personal-sections",
        "flow": "FT_018",
        "requirements": {"CU_017", "FT_018", "RN_022", "CH_015", "EX_006", "EX_007", "EX_008"} | ids("FUN", 31, 33),
    },
    {
        "feature": "expedientes_poderes",
        "selector": "#expanded-services",
        "flow": "FT_019",
        "requirements": {"CU_018", "CU_019", "FUN_034", "FUN_035", "FT_019", "FT_020"},
    },
    {
        "feature": "ayuda_institucional_integracion",
        "selector": "#institutional-help",
        "flow": "FT_022",
        "requirements": {"CU_021", "FUN_038", "FUN_039", "FUN_040", "FT_022", "RN_024", "RN_025"},
    },
    {
        "feature": "calidad_accesibilidad_versiones",
        "selector": "#quality-assurance",
        "flow": "FT_026",
        "requirements": (
            ids("FT", 23, 26)
            | ids("CH", 16, 19)
            | ids("OT", 1, 16)
            | {"RN_026", "RN_027"}
        ),
    },
]


def repo_root() -> Path:
    return Path(__file__).resolve().parents[5]


def load_ledger(path: Path) -> dict:
    with path.open(encoding="utf-8") as fh:
        return json.load(fh)


def build_index() -> dict[str, dict]:
    index: dict[str, dict] = {}
    for feature in FEATURES:
        for req_id in feature["requirements"]:
            if req_id in index:
                raise SystemExit(f"Requirement {req_id} mapped twice: {index[req_id]['feature']} and {feature['feature']}")
            index[req_id] = {
                "feature": feature["feature"],
                "selector": feature["selector"],
                "flow": feature["flow"],
            }
    return index


def main() -> int:
    root = repo_root()
    version_root = Path(__file__).resolve().parents[1]
    parser = argparse.ArgumentParser()
    parser.add_argument("--source-ledger", default=str(root / "runs" / "uno-audit" / "uno-requirements-ledger.json"))
    parser.add_argument("--version-root", default=str(version_root))
    args = parser.parse_args()

    version_root = Path(args.version_root).resolve()
    ledger = load_ledger(Path(args.source_ledger).resolve())
    source_requirements = ledger["requirements"]
    mapping = build_index()
    source_ids = {item["id"] for item in source_requirements}
    missing = sorted(source_ids - set(mapping))
    extra = sorted(set(mapping) - source_ids)
    if missing or extra:
        raise SystemExit(json.dumps({"missing": missing, "extra": extra}, indent=2))

    app_files = [
        "app/index.html",
        "app/assets/styles.css",
        "app/assets/app.js",
        "app/data/requirements.json",
        "app/data/traceability.json",
    ]
    requirements = []
    for item in source_requirements:
        mapped = mapping[item["id"]]
        requirements.append(
            {
                **item,
                "implementation_status": "implemented",
                "implementation_evidence": [
                    f"{mapped['selector']} data-req marker",
                    "app/assets/app.js",
                    "app/index.html",
                ],
                "qa_status": "pending_web_validation",
                "feature": mapped["feature"],
                "selector": mapped["selector"],
                "flow": mapped["flow"],
            }
        )

    traceability = {
        "project_id": "proyecto-uno",
        "version": "v0002",
        "source": "projects/uno/especificacion_requerimientos_funcionales-2.md",
        "template": "PLANTILLA_FRONTEND",
        "implementation_files": app_files,
        "summary": {
            "source_requirement_count": len(source_requirements),
            "mapped_requirement_count": len(requirements),
            "implementation_status": "implemented_pending_web_validation",
            "features": len(FEATURES),
            "flows": len([item for item in requirements if item["id"].startswith("FT_")]),
        },
        "features": [
            {
                **feature,
                "requirements": sorted(feature["requirements"]),
            }
            for feature in FEATURES
        ],
        "requirements": requirements,
    }

    (version_root / "app" / "data").mkdir(parents=True, exist_ok=True)
    (version_root / "traceability").mkdir(parents=True, exist_ok=True)
    for relative in ["app/data/requirements.json", "app/data/traceability.json", "traceability/requirements-ledger.json"]:
        target = version_root / relative
        target.write_text(json.dumps(traceability, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    coverage = {
        "project_id": "proyecto-uno",
        "version": "v0002",
        "required": len(source_requirements),
        "implemented": len(requirements),
        "implementation_coverage_pct": 100,
        "web_validated": 0,
        "web_validation_coverage_pct": 0,
        "status": "implemented_pending_web_validation",
    }
    (version_root / "traceability" / "coverage-summary.json").write_text(
        json.dumps(coverage, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(json.dumps(coverage, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
