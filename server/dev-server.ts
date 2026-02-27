import dotenv from 'dotenv'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import { randomUUID } from 'node:crypto'
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { spawn } from 'node:child_process'
import express, { type NextFunction, type Request, type Response } from 'express'
import pebbleHandler from '../api/pebble.ts'

dotenv.config({ path: '.env.local' })

type PebbleReq = Parameters<typeof pebbleHandler>[0]
type PebbleRes = Parameters<typeof pebbleHandler>[1]
type PythonRunRequestBody = {
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

const app = express()
const TMP_DIR = path.resolve(process.cwd(), '.pebble_tmp')
const MAX_OUTPUT_CHARS = 20_000
const CODE_MAX_CHARS = 50_000
const STDIN_MAX_CHARS = 10_000
const DEFAULT_TIMEOUT_MS = 4_000
const MIN_TIMEOUT_MS = 250
const MAX_TIMEOUT_MS = 5_000

function trimText(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value
  }
  return `${value.slice(0, maxChars)}\n...[truncated]`
}

function createTempPythonPath() {
  return path.join(TMP_DIR, `run-${Date.now()}-${randomUUID()}.py`)
}

function parseNumber(value: unknown, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback
  }
  return value
}

function normalizeTimeout(timeoutMs: unknown) {
  const rounded = Math.round(parseNumber(timeoutMs, DEFAULT_TIMEOUT_MS))
  return Math.max(MIN_TIMEOUT_MS, Math.min(MAX_TIMEOUT_MS, rounded))
}

function trimRequestValue(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value
  }
  return value.slice(0, maxChars)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeRunnerResponse(payload: unknown): RunnerResponse | null {
  if (!isRecord(payload)) {
    return null
  }

  const rawBody = payload.body
  if (typeof rawBody === 'string') {
    try {
      const parsed = JSON.parse(rawBody) as unknown
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

function decodePayload(payload: Uint8Array | undefined) {
  if (!payload) {
    return ''
  }
  return new TextDecoder().decode(payload)
}

async function runPythonLocally(code: string, stdin: string, timeoutMs: number) {
  const startedAt = Date.now()
  const tempFilePath = createTempPythonPath()

  await fs.mkdir(TMP_DIR, { recursive: true })
  await fs.writeFile(tempFilePath, code, 'utf8')

  let stdout = ''
  let stderr = ''
  let timedOut = false
  let settled = false
  let timeoutHandle: NodeJS.Timeout | null = null
  const child = spawn('python3', [tempFilePath], {
    stdio: ['pipe', 'pipe', 'pipe'],
  })

  const cleanupTempFile = async () => {
    await fs.unlink(tempFilePath).catch(() => undefined)
  }

  return await new Promise<RunnerResponse>((resolve) => {
    const finalize = async (exitCode: number | null) => {
      if (settled) {
        return
      }
      settled = true
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle)
        timeoutHandle = null
      }

      await cleanupTempFile()

      const durationMs = Date.now() - startedAt
      const normalizedStderr =
        timedOut && !stderr.trim() ? `Execution timed out after ${timeoutMs}ms.` : stderr
      const ok = !timedOut && exitCode === 0

      resolve({
        ok,
        exitCode,
        stdout,
        stderr: normalizedStderr,
        timedOut,
        durationMs,
      })
    }

    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => {
      stdout = trimText(`${stdout}${chunk}`, MAX_OUTPUT_CHARS)
    })
    child.stderr.on('data', (chunk: string) => {
      stderr = trimText(`${stderr}${chunk}`, MAX_OUTPUT_CHARS)
    })

    child.on('error', async (error) => {
      stderr = trimText(`${stderr}${error.message}`, MAX_OUTPUT_CHARS)
      await finalize(null)
    })

    child.on('close', async (code) => {
      await finalize(code)
    })

    timeoutHandle = setTimeout(() => {
      timedOut = true
      child.kill('SIGKILL')
    }, timeoutMs)

    if (stdin) {
      child.stdin.write(stdin)
    }
    child.stdin.end()
  })
}

async function runPythonViaLambda(code: string, stdin: string, timeoutMs: number) {
  const awsRegion = process.env.AWS_REGION
  const runnerLambdaName = process.env.RUNNER_LAMBDA_NAME
  if (!awsRegion || !runnerLambdaName) {
    throw new Error('Remote runner requires AWS_REGION and RUNNER_LAMBDA_NAME.')
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
    throw new Error('Set both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or neither.')
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
      throw new Error(`Runner Lambda error: ${invokeResult.FunctionError}. ${payloadText.slice(0, 400)}`)
    }

    const parsed = payloadText ? (JSON.parse(payloadText) as unknown) : {}
    const normalized = normalizeRunnerResponse(parsed)
    if (!normalized) {
      throw new Error('Runner Lambda returned an invalid response shape.')
    }
    return normalized
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Unknown runner invoke failure.'
    throw new Error(message)
  } finally {
    client.destroy()
  }
}

app.use(express.json({ limit: '1mb' }))

app.use((req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now()
  res.on('finish', () => {
    console.log(`[dev-api] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`)
  })
  next()
})

app.all('/api/pebble', async (req: Request, res: Response) => {
  try {
    await pebbleHandler(req as unknown as PebbleReq, res as unknown as PebbleRes)
  } catch (error) {
    const stack = error instanceof Error ? error.stack ?? error.message : String(error)
    console.error('[dev-api] unhandled crash in /api/pebble', stack)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Dev server crashed.' })
    }
  }
})

app.post('/api/run/python', async (req: Request, res: Response) => {
  const body = (req.body ?? {}) as PythonRunRequestBody
  const code = typeof body.code === 'string' ? trimRequestValue(body.code, CODE_MAX_CHARS) : ''
  const stdin = typeof body.stdin === 'string' ? trimRequestValue(body.stdin, STDIN_MAX_CHARS) : ''
  const timeoutMs = normalizeTimeout(body.timeoutMs)
  const remoteRunnerEnabled = process.env.PEBBLE_RUNNER_REMOTE === '1'

  if (!code.trim()) {
    res.status(400).json({ error: 'code is required' })
    return
  }

  try {
    const result = remoteRunnerEnabled
      ? await runPythonViaLambda(code, stdin, timeoutMs)
      : await runPythonLocally(code, stdin, timeoutMs)
    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Python runner failed.'
    res.status(502).json({ error: message })
  }
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`Pebble backend running at http://localhost:${port}`)
})
