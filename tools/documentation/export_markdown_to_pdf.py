#!/usr/bin/env python3
"""Render the three delivery Markdown files as PDFs with local Edge.

No network access or third-party Python package is required. Temporary HTML is
created outside the repository and removed after Edge has produced each PDF.
"""
from __future__ import annotations

import html
import re
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DELIVERY = ROOT / "docs" / "ENTREGA_FINAL"
EDGE = Path(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe")
SOURCES = (
    "01_Documentacion_Proyecto_SIGED_Lampa.md",
    "01_Matriz_Cumplimiento_Rubrica.md",
    "01_Inventario_Evidencias.md",
)

CSS = """
@page { size: A4; margin: 15mm 12mm 14mm; }
body { color: #172033; font: 10pt/1.4 Arial, sans-serif; }
h1 { color: #12355b; font-size: 23pt; margin: 0 0 10pt; }
h2 { color: #12355b; border-bottom: 1px solid #c9d7e6; font-size: 16pt; margin-top: 22pt; padding-bottom: 3pt; }
h3 { color: #1f5f8b; font-size: 12pt; margin-top: 16pt; }
p { margin: 5pt 0; }
table { border-collapse: collapse; font-size: 7.2pt; margin: 8pt 0 13pt; width: 100%; }
thead { display: table-header-group; background: #e9f0f7; }
tr { break-inside: avoid; }
th, td { border: 0.5pt solid #9aaebe; padding: 3pt; text-align: left; vertical-align: top; }
th { color: #12355b; }
code { background: #f1f4f7; font-family: Consolas, monospace; font-size: 8.3pt; padding: 1pt 2pt; }
pre { background: #f1f4f7; border-left: 3pt solid #4e81ab; font: 7.8pt/1.25 Consolas, monospace; overflow-wrap: anywhere; padding: 7pt; white-space: pre-wrap; }
ul, ol { margin: 4pt 0 7pt 18pt; padding-left: 10pt; }
a { color: #1f5f8b; text-decoration: none; }
hr { border: 0; border-top: 1pt solid #c9d7e6; margin: 15pt 0; }
"""


def inline(text: str) -> str:
    value = html.escape(text.strip())
    value = re.sub(r"`([^`]+)`", r"<code>\1</code>", value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"\[([^]]+)\]\(([^)]+)\)", r'<a href="\2">\1</a>', value)
    return value


def split_row(line: str) -> list[str]:
    cells = re.split(r"(?<!\\)\|", line.strip())
    if cells and not cells[0]:
        cells = cells[1:]
    if cells and not cells[-1]:
        cells = cells[:-1]
    return [cell.replace("\\|", "|").strip() for cell in cells]


def is_separator(line: str) -> bool:
    return bool(re.fullmatch(r"\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?\s*", line))


def markdown_to_html(markdown: str, title: str) -> str:
    lines = markdown.splitlines()
    blocks: list[str] = []
    index = 0
    while index < len(lines):
        line = lines[index]
        if not line.strip():
            index += 1
            continue
        if line.startswith("```"):
            code: list[str] = []
            index += 1
            while index < len(lines) and not lines[index].startswith("```"):
                code.append(lines[index])
                index += 1
            blocks.append(f"<pre>{html.escape(chr(10).join(code))}</pre>")
            index += 1
            continue
        if line.startswith("|") and index + 1 < len(lines) and is_separator(lines[index + 1]):
            header = split_row(line)
            index += 2
            rows: list[list[str]] = []
            while index < len(lines) and lines[index].startswith("|"):
                rows.append(split_row(lines[index]))
                index += 1
            head = "".join(f"<th>{inline(item)}</th>" for item in header)
            body = "".join("<tr>" + "".join(f"<td>{inline(item)}</td>" for item in row) + "</tr>" for row in rows)
            blocks.append(f"<table><thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>")
            continue
        match = re.match(r"^(#{1,3})\s+(.+)$", line)
        if match:
            level = len(match.group(1))
            blocks.append(f"<h{level}>{inline(match.group(2))}</h{level}>")
            index += 1
            continue
        if line == "---":
            blocks.append("<hr>")
            index += 1
            continue
        if re.match(r"^[-*]\s+", line):
            items: list[str] = []
            while index < len(lines) and re.match(r"^[-*]\s+", lines[index]):
                items.append(re.sub(r"^[-*]\s+", "", lines[index]))
                index += 1
            blocks.append("<ul>" + "".join(f"<li>{inline(item)}</li>" for item in items) + "</ul>")
            continue
        if re.match(r"^\d+\.\s+", line):
            items = []
            while index < len(lines) and re.match(r"^\d+\.\s+", lines[index]):
                items.append(re.sub(r"^\d+\.\s+", "", lines[index]))
                index += 1
            blocks.append("<ol>" + "".join(f"<li>{inline(item)}</li>" for item in items) + "</ol>")
            continue
        paragraph = [line]
        index += 1
        while index < len(lines) and lines[index].strip() and not lines[index].startswith(("#", "|", "```")):
            if lines[index] == "---" or re.match(r"^(?:[-*]|\d+\.)\s+", lines[index]):
                break
            paragraph.append(lines[index])
            index += 1
        blocks.append(f"<p>{inline(' '.join(paragraph))}</p>")
    return f"<!doctype html><html><head><meta charset='utf-8'><title>{html.escape(title)}</title><style>{CSS}</style></head><body>{''.join(blocks)}</body></html>"


def main() -> None:
    if not EDGE.is_file():
        raise SystemExit(f"Microsoft Edge was not found: {EDGE}")
    for source_name in SOURCES:
        source = DELIVERY / source_name
        output = source.with_suffix(".pdf")
        with tempfile.TemporaryDirectory(prefix="siged-pdf-") as temporary:
            html_path = Path(temporary) / source.with_suffix(".html").name
            html_path.write_text(markdown_to_html(source.read_text(encoding="utf-8"), source.stem), encoding="utf-8")
            subprocess.run([
                str(EDGE), "--headless", "--disable-gpu", "--no-pdf-header-footer",
                f"--print-to-pdf={output}", "--allow-file-access-from-files", html_path.as_uri(),
            ], check=True, timeout=120)
        if not output.is_file() or output.stat().st_size < 1024:
            raise SystemExit(f"PDF was not generated correctly: {output}")
        print(f"{output.relative_to(ROOT)} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
