from __future__ import annotations

import re
from pathlib import Path


PROHIBITED_ROOTS: list[str] = []

SENSITIVE_FILES: tuple[re.Pattern, ...] = (
    re.compile(r"\.env$"),
    re.compile(r"\.env\..+"),
    re.compile(r"\.pem$"),
    re.compile(r"\.key$"),
    re.compile(r"\.p12$"),
    re.compile(r"\.pfx$"),
    re.compile(r"id_rsa$"),
    re.compile(r"id_ed25519$"),
    re.compile(r"^credentials"),
    re.compile(r"^secrets"),
)

SECRET_PATTERNS: tuple[re.Pattern, ...] = (
    re.compile(r"(?i)(api[_-]?key|token|secret|password|passwd)\s*[:=]\s*['\"]?([A-Za-z0-9_\-]{12,})"),
    re.compile(r"sk-[A-Za-z0-9]{20,}"),
    re.compile(r"ghp_[A-Za-z0-9]{20,}"),
    re.compile(r"AKIA[0-9A-Z]{16}"),
    re.compile(r"(?i)(authorization|set-cookie)\s*[:=]\s*\S+"),
    re.compile(r"(?i)(connection\s*string)\s*[:=]\s*['\"]?\S+"),
)

ALLOWED_EXECUTABLES: set[str] = {
    "python", "python.exe", "python3",
    "node", "node.exe",
    "npm", "npm.cmd",
    "npx", "npx.cmd",
    "pytest", "pytest.exe",
    "docker", "docker.exe",
    "docker-compose", "docker-compose.exe",
}

BLOCKED_COMMANDS: set[str] = {
    "powershell", "powershell.exe", "pwsh", "pwsh.exe",
    "cmd", "cmd.exe",
    "bash", "sh", "zsh",
    "curl", "wget",
    "ssh", "scp", "sftp",
    "rm", "del", "rd", "rmdir",
    "chmod", "chown",
    "apt", "apt-get", "yum", "dnf", "brew",
    "sudo", "su",
}


def resolve_authorized_path(root: Path, candidate: str | Path, operation: str = "read") -> Path:
    root = root.resolve()
    p = Path(candidate)
    if p.is_absolute():
        cand = p
    else:
        cand = root / p
    resolved = cand.resolve()
    try:
        resolved.relative_to(root)
    except ValueError:
        raise ValueError(f"Path {resolved} is outside root {root}")
    if resolved != cand.resolve() and resolved != cand:
        raise ValueError(f"Symlink escape detected for {candidate}")
    if operation == "write":
        for prohibited in PROHIBITED_ROOTS:
            try:
                resolved.relative_to(Path(prohibited).resolve())
                raise ValueError(f"Writing to prohibited root {prohibited} is not allowed")
            except ValueError:
                if prohibited in resolved.parents:
                    raise ValueError(f"Writing to prohibited root {prohibited} is not allowed")
    for pattern in SENSITIVE_FILES:
        if pattern.search(resolved.name):
            raise ValueError(f"Access to sensitive file {resolved} is not allowed")
    return resolved


def check_executable_allowed(exe_name: str) -> tuple[bool, str]:
    normalized = exe_name.strip().lower()
    if normalized in BLOCKED_COMMANDS:
        return False, f"Command '{exe_name}' is blocked"
    if normalized in ALLOWED_EXECUTABLES:
        return True, ""
    if "/" in normalized or "\\" in normalized:
        stem = Path(normalized).stem.lower()
        if stem in ALLOWED_EXECUTABLES or stem in {e.split(".")[0].lower() for e in ALLOWED_EXECUTABLES}:
            return True, ""
    return False, f"Executable '{exe_name}' is not in the allowed list"


def redact_sensitive(text: str) -> tuple[str, int]:
    count = 0
    redacted = text
    for pattern in SECRET_PATTERNS:
        redacted, n = pattern.subn("[REDACTED]", redacted)
        count += n
    return redacted, count


def has_shell_operators(args: list[str]) -> tuple[bool, str]:
    operators = {
        "|": "pipe operator",
        ">": "redirect output",
        "<": "redirect input",
        "&&": "command chaining",
        "||": "OR chaining",
        ";": "command separator",
    }
    for arg in args:
        for op, desc in operators.items():
            if op in arg:
                return True, f"shell operator '{op}' ({desc}) found in argument"
    for arg in args:
        if "`" in arg or "$(" in arg:
            return True, f"shell sub-command operator found in argument"
    return False, ""
