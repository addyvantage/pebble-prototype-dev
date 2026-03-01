export const SUPPORTED_LANGUAGES = ['python', 'javascript', 'cpp', 'java'] as const

export type RunLanguage = (typeof SUPPORTED_LANGUAGES)[number]

export type RunRequestBody = {
  language?: unknown
  code?: unknown
  stdin?: unknown
  timeoutMs?: unknown
}

export type NormalizedRunRequest = {
  language: RunLanguage
  code: string
  stdin: string
  timeoutMs: number
}

export type RunnerStatus =
  | 'ok'
  | 'compile_error'
  | 'runtime_error'
  | 'timeout'
  | 'internal_error'
  | 'toolchain_unavailable'
  | 'validation_error'

export type RunnerResponse = {
  ok: boolean
  status: RunnerStatus
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

const MAX_CODE_CHARS = 50_000
const DEFAULT_TIMEOUT_MS = 4_000
const MAX_TIMEOUT_MS = 6_000
const MIN_TIMEOUT_MS = 100
const MAX_STDIN_CHARS = 10_000

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function parseFiniteNumber(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return value
}

function isRunLanguage(value: unknown): value is RunLanguage {
  return typeof value === 'string' && SUPPORTED_LANGUAGES.includes(value as RunLanguage)
}

export function normalizeRunRequest(body: RunRequestBody):
  | { ok: true; value: NormalizedRunRequest }
  | { ok: false; status: number; error: string } {
  if (!isRunLanguage(body.language)) {
    return {
      ok: false,
      status: 400,
      error: `language is required and must be one of: ${SUPPORTED_LANGUAGES.join(', ')}.`,
    }
  }

  if (typeof body.code !== 'string' || !body.code.trim()) {
    return {
      ok: false,
      status: 400,
      error: 'code is required.',
    }
  }

  if (body.code.length > MAX_CODE_CHARS) {
    return {
      ok: false,
      status: 400,
      error: `code exceeds maximum size of ${MAX_CODE_CHARS} characters.`,
    }
  }

  const stdinRaw = typeof body.stdin === 'string' ? body.stdin : ''
  const timeoutMs = clamp(
    Math.round(parseFiniteNumber(body.timeoutMs, DEFAULT_TIMEOUT_MS)),
    MIN_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  )

  return {
    ok: true,
    value: {
      language: body.language,
      code: body.code,
      stdin: stdinRaw.slice(0, MAX_STDIN_CHARS),
      timeoutMs,
    },
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizeRunnerResponse(payload: unknown): RunnerResponse | null {
  if (!isRecord(payload)) {
    return null
  }

  const wrappedBody = payload.body
  if (typeof wrappedBody === 'string') {
    try {
      const parsed = JSON.parse(wrappedBody) as unknown
      return normalizeRunnerResponse(parsed)
    } catch {
      return null
    }
  }

  const ok = payload.ok
  const exitCode = payload.exitCode
  const stdout = payload.stdout
  const stderr = payload.stderr
  const timedOut = payload.timedOut
  const durationMs = payload.durationMs
  const status = payload.status

  if (typeof ok !== 'boolean') {
    return null
  }
  if (!(typeof exitCode === 'number' || exitCode === null)) {
    return null
  }
  if (typeof stdout !== 'string' || typeof stderr !== 'string') {
    return null
  }
  if (typeof timedOut !== 'boolean') {
    return null
  }
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) {
    return null
  }

  const normalizedStatus: RunnerStatus =
    typeof status === 'string' && isRunnerStatus(status)
      ? status
      : timedOut
        ? 'timeout'
        : ok
          ? 'ok'
          : 'runtime_error'

  return {
    ok,
    status: normalizedStatus,
    exitCode,
    stdout,
    stderr,
    timedOut,
    durationMs,
  }
}

function isRunnerStatus(value: string): value is RunnerStatus {
  return (
    value === 'ok'
    || value === 'compile_error'
    || value === 'runtime_error'
    || value === 'timeout'
    || value === 'internal_error'
    || value === 'toolchain_unavailable'
    || value === 'validation_error'
  )
}

export function decodeLambdaPayload(payload: Uint8Array | undefined) {
  if (!payload) {
    return ''
  }
  return new TextDecoder().decode(payload)
}
