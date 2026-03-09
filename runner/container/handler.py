import json
import shutil
import subprocess
import time
import uuid
from pathlib import Path
from typing import Any, Dict, Tuple

MAX_OUTPUT_CHARS = 16_000
MAX_CODE_CHARS = 50_000
MAX_STDIN_CHARS = 10_000
DEFAULT_TIMEOUT_MS = 4_000
MAX_TIMEOUT_MS = 6_000
MIN_TIMEOUT_MS = 100
TMP_ROOT = Path('/tmp/pebble')
C_FUNCTION_MODE_SPLIT_MARKER = '/*__PEBBLE_C_FUNCTION_MODE_SPLIT__*/'
SUPPORTED_LANGUAGES = {'python', 'javascript', 'cpp', 'java', 'c'}


def _trim(value: str, max_chars: int) -> str:
    if len(value) <= max_chars:
        return value
    return value[:max_chars] + '\n...[truncated]'


def _clamp_timeout(timeout_ms_raw: Any) -> int:
    if not isinstance(timeout_ms_raw, (int, float)):
        return DEFAULT_TIMEOUT_MS
    timeout_ms = int(timeout_ms_raw)
    if timeout_ms < MIN_TIMEOUT_MS:
        return MIN_TIMEOUT_MS
    if timeout_ms > MAX_TIMEOUT_MS:
        return MAX_TIMEOUT_MS
    return timeout_ms


def _response(
    ok: bool,
    status: str,
    exit_code: int | None,
    stdout: str,
    stderr: str,
    timed_out: bool,
    duration_ms: int,
):
    return {
        'ok': ok,
        'status': status,
        'exitCode': exit_code,
        'stdout': _trim(stdout, MAX_OUTPUT_CHARS),
        'stderr': _trim(stderr, MAX_OUTPUT_CHARS),
        'timedOut': timed_out,
        'durationMs': max(0, int(duration_ms)),
    }


def _missing_executable_message(command: str) -> str:
    if command == 'python3':
        return "Missing executable 'python3'. Install Python 3."
    if command == 'node':
        return "Missing executable 'node'. Install Node.js."
    if command == 'g++':
        return "Missing executable 'g++'. Install g++ (build-essential / gcc-c++)."
    if command in ('javac', 'java'):
        return "Missing executable 'javac/java'. Install OpenJDK 17+ (JDK)."
    return f"Missing executable '{command}'."


def _remaining_ms(deadline: float) -> int:
    return int((deadline - time.perf_counter()) * 1000)


def _run_process(
    command: str,
    args: list[str],
    cwd: Path,
    stdin: str,
    timeout_ms: int,
) -> Tuple[int | None, str, str, bool]:
    try:
        completed = subprocess.run(
            [command, *args],
            input=stdin,
            capture_output=True,
            text=True,
            timeout=max(timeout_ms, 1) / 1000.0,
            check=False,
            cwd=str(cwd),
        )
        return completed.returncode, completed.stdout or '', completed.stderr or '', False
    except FileNotFoundError:
        return None, '', _missing_executable_message(command), False
    except subprocess.TimeoutExpired as exc:
        stdout = exc.stdout if isinstance(exc.stdout, str) else ''
        stderr = exc.stderr if isinstance(exc.stderr, str) else ''
        return None, stdout, stderr or f'Execution timed out after {timeout_ms}ms.', True
    except Exception as exc:  # pragma: no cover - defensive fallback
        return None, '', f'Runner crashed while executing {command}: {exc}', False


def _parse_payload(event: Any) -> Dict[str, Any]:
    payload = event or {}
    if isinstance(payload, str):
        try:
            payload = json.loads(payload)
        except Exception:
            payload = {}
    if isinstance(payload, dict) and isinstance(payload.get('body'), str):
        try:
            body = json.loads(payload['body'])
            if isinstance(body, dict):
                payload = body
        except Exception:
            pass
    if not isinstance(payload, dict):
        return {}
    return payload


def _normalize_language(raw_language: Any) -> str | None:
    if not isinstance(raw_language, str):
        return None

    normalized = raw_language.strip().lower()
    aliases = {
        'python3': 'python',
        'py': 'python',
        'node': 'javascript',
        'js': 'javascript',
        'cpp17': 'cpp',
        'c++17': 'cpp',
        'c++': 'cpp',
        'java17': 'java',
    }
    normalized = aliases.get(normalized, normalized)
    return normalized if normalized in SUPPORTED_LANGUAGES else None


def _run_python(run_dir: Path, code: str, stdin: str, deadline: float) -> Tuple[int | None, str, str, bool]:
    source = run_dir / 'main.py'
    source.write_text(code, encoding='utf-8')
    remaining = _remaining_ms(deadline)
    if remaining <= 0:
        return None, '', 'Execution timed out before start.', True
    return _run_process('python3', [str(source)], run_dir, stdin, remaining)


def _run_javascript(run_dir: Path, code: str, stdin: str, deadline: float) -> Tuple[int | None, str, str, bool]:
    source = run_dir / 'main.js'
    source.write_text(code, encoding='utf-8')
    remaining = _remaining_ms(deadline)
    if remaining <= 0:
        return None, '', 'Execution timed out before start.', True
    return _run_process('node', [str(source)], run_dir, stdin, remaining)


def _run_cpp(run_dir: Path, code: str, stdin: str, deadline: float) -> Tuple[int | None, str, str, bool, bool]:
    source = run_dir / 'main.cpp'
    binary = run_dir / 'main.out'
    source.write_text(code, encoding='utf-8')

    compile_remaining = _remaining_ms(deadline)
    if compile_remaining <= 0:
        return None, '', 'Execution timed out before compile.', True

    compile_exit, compile_stdout, compile_stderr, compile_timed_out = _run_process(
        'g++',
        ['-std=c++17', '-O2', str(source), '-o', str(binary)],
        run_dir,
        '',
        compile_remaining,
    )
    if compile_timed_out or compile_exit != 0:
        return compile_exit, compile_stdout, compile_stderr, compile_timed_out, False

    run_remaining = _remaining_ms(deadline)
    if run_remaining <= 0:
        return None, compile_stdout, compile_stderr or 'Execution timed out before program run.', True, True

    run_exit, run_stdout, run_stderr, run_timed_out = _run_process(
        str(binary),
        [],
        run_dir,
        stdin,
        run_remaining,
    )
    return run_exit, compile_stdout + run_stdout, compile_stderr + run_stderr, run_timed_out, True


def _run_java(run_dir: Path, code: str, stdin: str, deadline: float) -> Tuple[int | None, str, str, bool, bool]:
    source = run_dir / 'Main.java'
    source.write_text(code, encoding='utf-8')

    compile_remaining = _remaining_ms(deadline)
    if compile_remaining <= 0:
        return None, '', 'Execution timed out before compile.', True

    compile_exit, compile_stdout, compile_stderr, compile_timed_out = _run_process(
        'javac',
        [str(source)],
        run_dir,
        '',
        compile_remaining,
    )
    if compile_timed_out or compile_exit != 0:
        return compile_exit, compile_stdout, compile_stderr, compile_timed_out, False

    run_remaining = _remaining_ms(deadline)
    if run_remaining <= 0:
        return None, compile_stdout, compile_stderr or 'Execution timed out before program run.', True, True

    run_exit, run_stdout, run_stderr, run_timed_out = _run_process(
        'java',
        ['-cp', str(run_dir), 'Main'],
        run_dir,
        stdin,
        run_remaining,
    )
    return run_exit, compile_stdout + run_stdout, compile_stderr + run_stderr, run_timed_out, True


def _run_c(run_dir: Path, code: str, stdin: str, deadline: float) -> Tuple[int | None, str, str, bool, bool]:
    marker_index = code.find(C_FUNCTION_MODE_SPLIT_MARKER)
    has_split_payload = marker_index >= 0
    source = run_dir / ('user.c' if has_split_payload else 'main.c')
    harness = run_dir / 'main.c'
    binary = run_dir / ('run' if has_split_payload else 'main.out')

    if has_split_payload:
        user_code = code[:marker_index].strip()
        harness_code = code[marker_index + len(C_FUNCTION_MODE_SPLIT_MARKER):].strip()
        if not user_code or not harness_code:
            return None, '', 'Invalid C function-mode wrapper payload.', False, False
        source.write_text(f'{user_code}\n', encoding='utf-8')
        harness.write_text(f'{harness_code}\n', encoding='utf-8')
        compile_args = ['-O2', '-std=c11', '-pipe', str(source), str(harness), '-o', str(binary)]
    else:
        source.write_text(code, encoding='utf-8')
        compile_args = ['-std=gnu11', '-O2', '-Wall', '-Wextra', str(source), '-o', str(binary), '-lm']

    compile_remaining = _remaining_ms(deadline)
    if compile_remaining <= 0:
        return None, '', 'Execution timed out before compile.', True, False

    compile_exit, compile_stdout, compile_stderr, compile_timed_out = _run_process(
        'gcc',
        compile_args,
        run_dir,
        '',
        compile_remaining,
    )
    if compile_timed_out:
        return compile_exit, compile_stdout, compile_stderr, True, False
    if compile_exit != 0:
        return compile_exit, compile_stdout, compile_stderr, False, False

    run_remaining = _remaining_ms(deadline)
    if run_remaining <= 0:
        return None, compile_stdout, compile_stderr or 'Execution timed out before program run.', True, True

    run_exit, run_stdout, run_stderr, run_timed_out = _run_process(
        str(binary),
        [],
        run_dir,
        stdin,
        run_remaining,
    )
    return run_exit, compile_stdout + run_stdout, compile_stderr + run_stderr, run_timed_out, True


def handler(event, _context):
    started_at = time.perf_counter()
    payload = _parse_payload(event)

    language = payload.get('languageId') or payload.get('language')
    code = payload.get('code', '')
    stdin = payload.get('stdin', '')
    timeout_ms = _clamp_timeout(payload.get('timeoutMs'))
    normalized_language = _normalize_language(language)

    if normalized_language is None:
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        return _response(
            False,
            'validation_error',
            None,
            '',
            'language is required and must be one of: python3, javascript, cpp17, java17, c.',
            False,
            duration_ms,
        )

    if not isinstance(code, str) or not code.strip():
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        return _response(False, 'validation_error', None, '', 'code is required.', False, duration_ms)

    if len(code) > MAX_CODE_CHARS:
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        return _response(
            False,
            'validation_error',
            None,
            '',
            f'code exceeds maximum size of {MAX_CODE_CHARS} characters.',
            False,
            duration_ms,
        )

    if not isinstance(stdin, str):
        stdin = ''
    stdin = stdin[:MAX_STDIN_CHARS]

    run_dir = TMP_ROOT / str(uuid.uuid4())
    run_dir.mkdir(parents=True, exist_ok=True)

    try:
        deadline = time.perf_counter() + (timeout_ms / 1000.0)

        if normalized_language == 'python':
            exit_code, stdout, stderr, timed_out = _run_python(run_dir, code, stdin, deadline)
            status = 'timeout' if timed_out else 'ok' if exit_code == 0 else 'runtime_error'
        elif normalized_language == 'javascript':
            exit_code, stdout, stderr, timed_out = _run_javascript(run_dir, code, stdin, deadline)
            status = 'timeout' if timed_out else 'ok' if exit_code == 0 else 'runtime_error'
        elif normalized_language == 'cpp':
            exit_code, stdout, stderr, timed_out, ran_program = _run_cpp(run_dir, code, stdin, deadline)
            if timed_out:
                status = 'timeout'
            elif exit_code == 0:
                status = 'ok'
            else:
                status = 'runtime_error' if ran_program else 'compile_error'
        elif normalized_language == 'c':
            exit_code, stdout, stderr, timed_out, ran_program = _run_c(run_dir, code, stdin, deadline)
            if timed_out:
                status = 'timeout'
            elif exit_code == 0:
                status = 'ok'
            else:
                status = 'runtime_error' if ran_program else 'compile_error'
        else:
            exit_code, stdout, stderr, timed_out, ran_program = _run_java(run_dir, code, stdin, deadline)
            if timed_out:
                status = 'timeout'
            elif exit_code == 0:
                status = 'ok'
            else:
                status = 'runtime_error' if ran_program else 'compile_error'

        duration_ms = int((time.perf_counter() - started_at) * 1000)
        ok = (not timed_out) and exit_code == 0
        if timed_out and not stderr.strip():
            stderr = f'Execution timed out after {timeout_ms}ms.'

        if exit_code is None and not timed_out and stderr.startswith('Missing executable'):
            status = 'toolchain_unavailable'

        return _response(ok, status, exit_code, stdout, stderr, timed_out, duration_ms)
    except Exception as exc:  # pragma: no cover - defensive fallback
        duration_ms = int((time.perf_counter() - started_at) * 1000)
        return _response(False, 'internal_error', None, '', f'Runner crashed: {exc}', False, duration_ms)
    finally:
        shutil.rmtree(run_dir, ignore_errors=True)
