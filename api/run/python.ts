import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

type RunPythonRequestBody = {
  code?: unknown
  stdin?: unknown
  timeoutMs?: unknown
}

type RunnerResponse = {
  ok: boolean
  exitCode: number | null
  stdout: string
  stderr: string
  timedOut: boolean
  durationMs: number
}

const CODE_MAX_CHARS = 50_000
const STDIN_MAX_CHARS = 10_000
const DEFAULT_TIMEOUT_MS = 4_000
const MIN_TIMEOUT_MS = 250
const MAX_TIMEOUT_MS = 5_000

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseNumber(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return value
}

function clampNumber(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function trimValue(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value
  }
  return value.slice(0, maxChars)
}

function sendJson(
  res: { status: (code: number) => { json: (payload: unknown) => void }; json: (payload: unknown) => void },
  status: number,
  payload: unknown,
) {
  res.status(status).json(payload)
}

async function readBody(req: { body?: unknown; on?: (event: string, cb: (chunk: Buffer) => void) => void }) {
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      return req.body
    }
    try {
      return JSON.stringify(req.body)
    } catch {
      return ''
    }
  }

  if (typeof req.on !== 'function') {
    return ''
  }

  return await new Promise<string>((resolve) => {
    const chunks: Buffer[] = []
    req.on?.('data', (chunk: Buffer) => {
      chunks.push(chunk)
    })
    req.on?.('end', () => {
      resolve(Buffer.concat(chunks).toString('utf8'))
    })
    req.on?.('error', () => {
      resolve('')
    })
  })
}

function decodePayload(payload: Uint8Array | undefined) {
  if (!payload) {
    return ''
  }
  return new TextDecoder().decode(payload)
}

function normalizeRunnerResponse(payload: unknown): RunnerResponse | null {
  if (!isRecord(payload)) {
    return null
  }

  const rawBody = payload.body
  if (typeof rawBody === 'string') {
    try {
      const parsedBody = JSON.parse(rawBody) as unknown
      return normalizeRunnerResponse(parsedBody)
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

  if (typeof ok !== 'boolean') {
    return null
  }

  if (!(typeof exitCode === 'number' || exitCode === null)) {
    return null
  }

  if (typeof stdout !== 'string' || typeof stderr !== 'string' || typeof timedOut !== 'boolean') {
    return null
  }

  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs)) {
    return null
  }

  return {
    ok,
    exitCode,
    stdout,
    stderr,
    timedOut,
    durationMs: Math.max(0, Math.round(durationMs)),
  }
}

export default async function handler(
  req: {
    method?: string
    body?: unknown
    on?: (event: string, cb: (chunk: Buffer) => void) => void
  },
  res: {
    status: (code: number) => { json: (payload: unknown) => void }
    json: (payload: unknown) => void
    setHeader?: (name: string, value: string) => void
  },
) {
  if (req.method !== 'POST') {
    res.setHeader?.('Allow', 'POST')
    sendJson(res, 405, { error: 'Method not allowed. Use POST.' })
    return
  }

  if (process.env.PEBBLE_RUNNER_MODE === 'local') {
    sendJson(res, 501, { error: 'PEBBLE_RUNNER_MODE=local is not supported in deployed /api routes.' })
    return
  }

  const awsRegion = process.env.AWS_REGION
  const runnerLambdaName = process.env.RUNNER_LAMBDA_NAME
  if (!awsRegion || !runnerLambdaName) {
    sendJson(res, 500, { error: 'Missing required env vars: AWS_REGION and RUNNER_LAMBDA_NAME.' })
    return
  }

  const rawBody = await readBody(req)
  let body: RunPythonRequestBody
  try {
    body = rawBody ? (JSON.parse(rawBody) as RunPythonRequestBody) : {}
  } catch {
    sendJson(res, 400, { error: 'Invalid JSON body.' })
    return
  }

  const code = typeof body.code === 'string' ? trimValue(body.code, CODE_MAX_CHARS) : ''
  const stdin = typeof body.stdin === 'string' ? trimValue(body.stdin, STDIN_MAX_CHARS) : ''
  const timeoutMs = clampNumber(
    Math.round(parseNumber(body.timeoutMs, DEFAULT_TIMEOUT_MS)),
    MIN_TIMEOUT_MS,
    MAX_TIMEOUT_MS,
  )

  if (!code.trim()) {
    sendJson(res, 400, { error: 'code is required.' })
    return
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    sendJson(res, 500, { error: 'Set both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or neither.' })
    return
  }

  const client = accessKeyId && secretAccessKey
    ? new LambdaClient({
        region: awsRegion,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : new LambdaClient({ region: awsRegion })

  try {
    const invokeResult = await client.send(
      new InvokeCommand({
        FunctionName: runnerLambdaName,
        InvocationType: 'RequestResponse',
        Payload: new TextEncoder().encode(
          JSON.stringify({
            code,
            stdin,
            timeoutMs,
          }),
        ),
      }),
    )

    const payloadText = decodePayload(invokeResult.Payload)
    if (invokeResult.FunctionError) {
      const snippet = payloadText.slice(0, 500)
      sendJson(res, 502, { error: `Runner Lambda returned FunctionError: ${invokeResult.FunctionError}. ${snippet}` })
      return
    }

    let parsed: unknown = {}
    if (payloadText) {
      try {
        parsed = JSON.parse(payloadText) as unknown
      } catch {
        sendJson(res, 502, { error: `Runner Lambda returned non-JSON payload: ${payloadText.slice(0, 500)}` })
        return
      }
    }

    const normalized = normalizeRunnerResponse(parsed)
    if (!normalized) {
      sendJson(res, 502, { error: 'Runner Lambda response did not match expected shape.' })
      return
    }

    sendJson(res, 200, normalized)
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Runner invoke failed.'
    sendJson(res, 502, { error: message })
  } finally {
    client.destroy()
  }
}
