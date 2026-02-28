import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import {
  decodeLambdaPayload,
  normalizeRunRequest,
  normalizeRunnerResponse,
  runCodeLocally,
  type RunRequestBody,
} from '../../server/runner'

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '200kb',
    },
  },
}
const MAX_BODY_CHARS = 120_000
const UPSTREAM_TIMEOUT_MS = 20_000

function sendJson(
  res: { status: (code: number) => { json: (payload: unknown) => void }; json: (payload: unknown) => void },
  status: number,
  payload: unknown,
) {
  try {
    res.status(status).json(payload)
  } catch {
    res.json(payload)
  }
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

function getRunnerMode() {
  return process.env.PEBBLE_RUNNER_MODE === 'local' ? 'local' : 'remote'
}

async function runViaLambda(body: {
  language: 'python' | 'javascript' | 'cpp' | 'java'
  code: string
  stdin: string
  timeoutMs: number
}) {
  const awsRegion = process.env.AWS_REGION
  const runnerLambdaName = process.env.RUNNER_LAMBDA_NAME
  if (!awsRegion || !runnerLambdaName) {
    throw new Error('Missing required env vars: AWS_REGION and RUNNER_LAMBDA_NAME.')
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
        Payload: new TextEncoder().encode(JSON.stringify(body)),
      }),
    )
    console.info(
      `[api/run] lambda status=${invokeResult.StatusCode ?? 'n/a'} functionError=${invokeResult.FunctionError ?? 'none'}`,
    )

    const payloadText = decodeLambdaPayload(invokeResult.Payload)
    if (invokeResult.FunctionError) {
      throw new Error(`Runner Lambda FunctionError: ${invokeResult.FunctionError}. ${payloadText.slice(0, 300)}`)
    }

    const parsedPayload = payloadText ? (JSON.parse(payloadText) as unknown) : {}
    const normalized = normalizeRunnerResponse(parsedPayload)
    if (!normalized) {
      throw new Error('Runner Lambda returned an invalid response shape.')
    }

    return normalized
  } finally {
    client.destroy()
  }
}

async function runViaRunnerUrl(body: {
  language: 'python' | 'javascript' | 'cpp' | 'java'
  code: string
  stdin: string
  timeoutMs: number
}) {
  const runnerUrlRaw = process.env.RUNNER_URL
  if (!runnerUrlRaw) {
    throw new Error('Runner not configured. Set RUNNER_URL or AWS runner env vars.')
  }

  let runnerUrl: URL
  try {
    runnerUrl = new URL(runnerUrlRaw)
  } catch {
    throw new Error('RUNNER_URL is invalid. It must be a full URL (https://...).')
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const upstreamResponse = await fetch(runnerUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
    const upstreamText = await upstreamResponse.text().catch(() => '')
    let upstreamJson: unknown = null
    if (upstreamText) {
      try {
        upstreamJson = JSON.parse(upstreamText) as unknown
      } catch {
        upstreamJson = null
      }
    }

    const normalized = normalizeRunnerResponse(upstreamJson)
    if (!upstreamResponse.ok) {
      const snippet = upstreamText.trim().replace(/\s+/g, ' ').slice(0, 220)
      throw new Error(
        `Remote runner failed with status ${upstreamResponse.status}.${snippet ? ` Body: ${snippet}` : ''}`,
      )
    }
    if (!normalized) {
      const snippet = upstreamText.trim().replace(/\s+/g, ' ').slice(0, 220)
      throw new Error(
        `Remote runner returned invalid JSON shape.${snippet ? ` Body: ${snippet}` : ''}`,
      )
    }
    return normalized
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new Error(`Remote runner timed out after ${UPSTREAM_TIMEOUT_MS}ms.`)
    }
    throw error
  } finally {
    clearTimeout(timeout)
  }
}

function buildErrorResponse(stderr: string) {
  return {
    ok: false,
    exitCode: null,
    stdout: '',
    stderr,
    timedOut: false,
    durationMs: 0,
  }
}

function getCodeLength(body: unknown) {
  if (!body || typeof body !== 'object') {
    return 0
  }
  const code = (body as { code?: unknown }).code
  return typeof code === 'string' ? code.length : 0
}

function getBodyLength(rawBody: string) {
  return Buffer.byteLength(rawBody, 'utf8')
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
  try {
    if (req.method !== 'POST') {
      res.setHeader?.('Allow', 'POST')
      sendJson(res, 405, buildErrorResponse('Method not allowed. Use POST.'))
      return
    }

    const rawBody = await readBody(req)
    if (rawBody.length > MAX_BODY_CHARS) {
      sendJson(res, 413, buildErrorResponse('Request body too large.'))
      return
    }
    let body: RunRequestBody
    try {
      body = rawBody ? (JSON.parse(rawBody) as RunRequestBody) : {}
    } catch {
      sendJson(res, 400, buildErrorResponse('Invalid JSON body.'))
      return
    }

    const normalized = normalizeRunRequest(body)
    if (!normalized.ok) {
      sendJson(res, normalized.status, buildErrorResponse(normalized.error))
      return
    }

    const mode = getRunnerMode()
    const hasRunnerUrl = Boolean(process.env.RUNNER_URL)
    const hasLambdaConfig = Boolean(process.env.AWS_REGION && process.env.RUNNER_LAMBDA_NAME)
    console.info(
      `[api/run] request method=${req.method ?? 'unknown'} mode=${mode} lang=${normalized.value.language} codeChars=${getCodeLength(body)} bodyBytes=${getBodyLength(rawBody)} timeoutMs=${normalized.value.timeoutMs} runnerUrl=${hasRunnerUrl ? 'set' : 'unset'} lambda=${hasLambdaConfig ? 'set' : 'unset'}`,
    )

    let result
    if (mode === 'local') {
      result = await runCodeLocally(normalized.value)
    } else if (hasRunnerUrl) {
      result = await runViaRunnerUrl(normalized.value)
    } else if (hasLambdaConfig) {
      result = await runViaLambda(normalized.value)
    } else {
      const message = 'Runner not configured. Set RUNNER_URL or AWS_REGION + RUNNER_LAMBDA_NAME.'
      console.error('[api/run] misconfigured remote runner', message)
      sendJson(res, 200, buildErrorResponse(message))
      return
    }

    console.info(
      `[api/run] success lang=${normalized.value.language} ok=${result.ok} exit=${result.exitCode} timedOut=${result.timedOut} durationMs=${result.durationMs}`,
    )
    sendJson(res, 200, result)
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Runner invoke failed.'
    const stack = error instanceof Error ? error.stack ?? error.message : String(error)
    console.error('[api/run] unhandled failure', stack)
    sendJson(res, 200, buildErrorResponse(message))
  }
}
