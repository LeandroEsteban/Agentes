"""Small Markdown helpers for the constrained SIGED source documents."""
from __future__ import annotations

import re
from pathlib import Path


def relative_document(path: Path, source_root: Path | None) -> str:
    if source_root:
        try:
            return path.resolve().relative_to(source_root.resolve()).as_posix()
        except ValueError:
            pass
    return path.name


def sections(lines: list[str]) -> list[tuple[int, str]]:
    current = "Document"
    result = [(1, current)]
    for number, line in enumerate(lines, 1):
        match = re.match(r"^(#{1,6})\s+(.+)$", line)
        if match:
            current = match.group(2).strip()
            result.append((number, current))
    return result


def section_at(index: list[tuple[int, str]], line: int) -> str:
    return next((title for start, title in reversed(index) if start <= line), "Document")


def tables(lines: list[str]):
    """Yield (line, headers, values) for simple pipe tables, skipping separators."""
    for index, line in enumerate(lines):
        if not line.lstrip().startswith("|") or index + 1 >= len(lines):
            continue
        separator = lines[index + 1].strip()
        if not re.match(r"^\|?\s*:?-{3,}", separator):
            continue
        headers = _cells(line)
        row = index + 2
        while row < len(lines) and lines[row].lstrip().startswith("|"):
            values = _cells(lines[row])
            if len(values) == len(headers):
                yield row + 1, headers, values
            row += 1


def _cells(line: str) -> list[str]:
    return [cell.strip() for cell in line.strip().strip("|").split("|")]


def clean(value: str) -> str:
    return value.strip().strip("`")
