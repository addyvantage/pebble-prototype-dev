type RunLanguage = 'python' | 'javascript' | 'cpp' | 'java' | 'c'
export type RunStatus =
  | 'ok'
  | 'compile_error'
  | 'runtime_error'
  | 'timeout'
  | 'internal_error'
  | 'toolchain_unavailable'
  | 'validation_error'

export type RunRequestPayload = {
  language: RunLanguage
  code: string
  stdin?: string
  timeoutMs?: number
}

export type RunApiResponse = {
  ok: boolean
  status: RunStatus
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

const DEFAULT_TIMEOUT_MS = 15_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeRunResponse(payload: unknown): RunApiResponse {
  if (!isRecord(payload)) {
    return {
      ok: false,
      status: 'internal_error',
      exitCode: null,
      stdout: '',
      stderr: 'Runner returned an invalid response.',
      timedOut: false,
      durationMs: 0,
    }
  }

  const statusValue = payload.status
  const status: RunStatus = typeof statusValue === 'string' && isRunStatus(statusValue)
    ? statusValue
    : payload.timedOut === true
      ? 'timeout'
      : payload.ok === true
        ? 'ok'
        : 'runtime_error'

  return {
    ok: payload.ok === true,
    status,
    exitCode: typeof payload.exitCode === 'number' || payload.exitCode === null ? payload.exitCode : null,
    stdout: typeof payload.stdout === 'string' ? payload.stdout : '',
    stderr: typeof payload.stderr === 'string' ? payload.stderr : '',
    timedOut: payload.timedOut === true,
    durationMs: typeof payload.durationMs === 'number' ? payload.durationMs : 0,
  }
}

function isRunStatus(value: string): value is RunStatus {
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

type ParsedRunResponse = {
  json: unknown
  rawText: string
}

async function parseResponseSafely(response: Response): Promise<ParsedRunResponse> {
  const text = await response.text().catch(() => '')
  if (!text) {
    return {
      json: null,
      rawText: '',
    }
  }
  try {
    return {
      json: JSON.parse(text) as unknown,
      rawText: text,
    }
  } catch {
    return {
      json: null,
      rawText: text,
    }
  }
}

function compactTextSnippet(rawText: string) {
  const snippet = rawText.trim().replace(/\s+/g, ' ')
  if (!snippet) {
    return ''
  }
  return snippet.slice(0, 280)
}

export async function requestRunApi(
  payload: RunRequestPayload,
  options?: { requestTimeoutMs?: number },
): Promise<RunApiResponse> {
  const controller = new AbortController()
  const timeout = setTimeout(
    () => controller.abort(),
    Math.max(1_000, options?.requestTimeoutMs ?? DEFAULT_TIMEOUT_MS),
  )

  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...payload,
        language: payload.language === 'c' ? 'cpp' : payload.language,
      }),
      signal: controller.signal,
    })

    const parsed = await parseResponseSafely(response)
    const normalized = normalizeRunResponse(parsed.json)
    if (!response.ok) {
      const textSnippet = compactTextSnippet(parsed.rawText)
      const message =
        normalized.stderr.trim() ||
        `Runner request failed with status ${response.status}.${textSnippet ? ` ${textSnippet}` : ''}`
      return {
        ...normalized,
        ok: false,
        status: normalized.status === 'ok' ? 'internal_error' : normalized.status,
        stderr: message,
      }
    }

    if (import.meta.env.DEV && parsed.rawText) {
      console.debug('[runApi] /api/run response', {
        status: response.status,
        ok: normalized.ok,
        stderr: normalized.stderr,
        preview: compactTextSnippet(parsed.rawText),
      })
    }

    return normalized
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      return {
        ok: false,
        status: 'timeout',
        exitCode: null,
        stdout: '',
        stderr: 'Runner request timed out while waiting for /api/run.',
        timedOut: true,
        durationMs: 0,
      }
    }

    return {
      ok: false,
      status: 'internal_error',
      exitCode: null,
      stdout: '',
      stderr: 'Failed to reach /api/run. Check network or Vercel function logs.',
      timedOut: false,
      durationMs: 0,
    }
  } finally {
    clearTimeout(timeout)
  }
}
