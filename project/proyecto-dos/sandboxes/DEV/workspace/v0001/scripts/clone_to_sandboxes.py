#!/usr/bin/env python3
from __future__ import annotations

import json
import shutil
from pathlib import Path


VERSION_ROOT = Path(__file__).resolve().parents[1]
PROJECT_ROOT = VERSION_ROOT.parents[1]


def copy_version(sandbox: str) -> dict:
    target = PROJECT_ROOT / "sandboxes" / sandbox / "workspace" / "v0001"
    if target.exists():
        shutil.rmtree(target)
    shutil.copytree(
        VERSION_ROOT,
        target,
        ignore=shutil.ignore_patterns("node_modules", ".DS_Store", "__pycache__"),
    )
    manifest = {
        "sandbox": sandbox,
        "source": str(VERSION_ROOT.relative_to(PROJECT_ROOT.parents[1])),
        "target": str(target.relative_to(PROJECT_ROOT.parents[1])),
        "clone_mode": "independent_local_clone",
        "shared_with_factory": False,
        "version": "v0001",
    }
    (target / "sandbox-clone-manifest.json").write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return manifest


def main() -> int:
    manifests = [copy_version("DEV"), copy_version("QA")]
    out = VERSION_ROOT / "traceability" / "sandbox-clone-report.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps({"status": "pass", "sandboxes": manifests}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"status": "pass", "sandboxes": manifests}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
