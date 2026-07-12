from __future__ import annotations

import subprocess
import time
from datetime import datetime, timezone
from pathlib import Path

from .permissions import check_executable_allowed, has_shell_operators


def run_process(
    executable: str,
    args: list[str],
    working_directory: Path | str,
    timeout: int = 30,
    max_stdout: int = 1048576,
    max_stderr: int = 1048576,
    env: dict | None = None,
) -> dict:
    allowed, reason = check_executable_allowed(executable)
    if not allowed:
        return {
            "status": "blocked",
            "exit_code": None,
            "stdout": "",
            "stderr": reason,
            "stdout_truncated": False,
            "stderr_truncated": False,
            "duration_ms": 0,
            "error": reason,
        }

    has_op, op_reason = has_shell_operators(args)
    if has_op:
        return {
            "status": "blocked",
            "exit_code": None,
            "stdout": "",
            "stderr": op_reason,
            "stdout_truncated": False,
            "stderr_truncated": False,
            "duration_ms": 0,
            "error": op_reason,
        }

    cwd = Path(working_directory).resolve()
    start = time.monotonic()
    try:
        proc = subprocess.run(
            [executable] + args,
            cwd=cwd,
            capture_output=True,
            text=True,
            timeout=timeout,
            env=env,
            shell=False,
        )
        duration_ms = int((time.monotonic() - start) * 1000)

        stdout = proc.stdout or ""
        stderr = proc.stderr or ""
        stdout_truncated = len(stdout) > max_stdout
        stderr_truncated = len(stderr) > max_stderr

        if stdout_truncated:
            stdout = stdout[:max_stdout]
        if stderr_truncated:
            stderr = stderr[:max_stderr]

        return {
            "status": "success" if proc.returncode == 0 else "failed",
            "exit_code": proc.returncode,
            "stdout": stdout,
            "stderr": stderr,
            "stdout_truncated": stdout_truncated,
            "stderr_truncated": stderr_truncated,
            "duration_ms": duration_ms,
            "error": "",
        }
    except subprocess.TimeoutExpired:
        duration_ms = int((time.monotonic() - start) * 1000)
        return {
            "status": "timeout",
            "exit_code": None,
            "stdout": "",
            "stderr": f"Process timed out after {timeout}s",
            "stdout_truncated": False,
            "stderr_truncated": False,
            "duration_ms": duration_ms,
            "error": f"timed out after {timeout}s",
        }
    except FileNotFoundError:
        duration_ms = int((time.monotonic() - start) * 1000)
        return {
            "status": "failed",
            "exit_code": None,
            "stdout": "",
            "stderr": f"Executable '{executable}' not found",
            "stdout_truncated": False,
            "stderr_truncated": False,
            "duration_ms": duration_ms,
            "error": f"executable '{executable}' not found",
        }
    except Exception as e:
        duration_ms = int((time.monotonic() - start) * 1000)
        return {
            "status": "failed",
            "exit_code": None,
            "stdout": "",
            "stderr": str(e),
            "stdout_truncated": False,
            "stderr_truncated": False,
            "duration_ms": duration_ms,
            "error": str(e),
        }
