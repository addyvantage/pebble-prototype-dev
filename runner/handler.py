import json
import subprocess
import time
from pathlib import Path

MAX_OUTPUT_CHARS = 20_000
DEFAULT_TIMEOUT_MS = 4_000
MIN_TIMEOUT_MS = 250
MAX_TIMEOUT_MS = 5_000
TMP_PATH = Path("/tmp/main.py")


def _trim(value: str, max_chars: int) -> str:
    if len(value) <= max_chars:
        return value
    return value[:max_chars] + "\n...[truncated]"


def _clamp_timeout(timeout_ms_raw) -> int:
    if not isinstance(timeout_ms_raw, (int, float)):
        return DEFAULT_TIMEOUT_MS
    timeout_ms = int(timeout_ms_raw)
    if timeout_ms < MIN_TIMEOUT_MS:
        return MIN_TIMEOUT_MS
    if timeout_ms > MAX_TIMEOUT_MS:
        return MAX_TIMEOUT_MS
    return timeout_ms


def _response(ok: bool, exit_code, stdout: str, stderr: str, timed_out: bool, duration_ms: int):
    return {
        "ok": ok,
        "exitCode": exit_code,
        "stdout": _trim(stdout, MAX_OUTPUT_CHARS),
        "stderr": _trim(stderr, MAX_OUTPUT_CHARS),
        "timedOut": timed_out,
        "durationMs": max(0, int(duration_ms)),
    }


def handler(event, _context):
    started_at = time.perf_counter()

    try:
        payload = event or {}
        if isinstance(payload, str):
            payload = json.loads(payload)
        elif not isinstance(payload, dict):
            payload = {}
    except Exception:
        payload = {}

    code = payload.get("code", "")
    stdin = payload.get("stdin", "")
    timeout_ms = _clamp_timeout(payload.get("timeoutMs"))

    if not isinstance(code, str) or not code.strip():
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        return _response(False, None, "", "code is required.", False, duration_ms)

    if not isinstance(stdin, str):
        stdin = ""

    try:
        TMP_PATH.write_text(code, encoding="utf-8")
    except Exception as exc:
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        return _response(False, None, "", f"Failed to write temp file: {exc}", False, duration_ms)

    try:
        completed = subprocess.run(
            ["python3", "-I", "-S", str(TMP_PATH)],
            input=stdin,
            capture_output=True,
            text=True,
            timeout=timeout_ms / 1000.0,
            check=False,
        )
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        ok = completed.returncode == 0
        return _response(
            ok,
            completed.returncode,
            completed.stdout or "",
            completed.stderr or "",
            False,
            duration_ms,
        )
    except subprocess.TimeoutExpired as exc:
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        stdout = exc.stdout if isinstance(exc.stdout, str) else ""
        stderr = exc.stderr if isinstance(exc.stderr, str) else ""
        if not stderr.strip():
            stderr = f"Execution timed out after {timeout_ms}ms."
        return _response(False, None, stdout, stderr, True, duration_ms)
    except Exception as exc:
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        return _response(False, None, "", f"Runner crashed: {exc}", False, duration_ms)
