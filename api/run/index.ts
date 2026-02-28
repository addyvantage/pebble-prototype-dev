import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import {
  decodeLambdaPayload,
  normalizeRunRequest,
  normalizeRunnerResponse,
  runCodeLocally,
  type RunRequestBody,
} from '../../server/runner.ts'

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
    sendJson(res, 405, {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: 'Method not allowed. Use POST.',
      timedOut: false,
      durationMs: 0,
    })
    return
  }

  const rawBody = await readBody(req)
  let body: RunRequestBody
  try {
    body = rawBody ? (JSON.parse(rawBody) as RunRequestBody) : {}
  } catch {
    sendJson(res, 400, {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: 'Invalid JSON body.',
      timedOut: false,
      durationMs: 0,
    })
    return
  }

  const normalized = normalizeRunRequest(body)
  if (!normalized.ok) {
    sendJson(res, normalized.status, {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: normalized.error,
      timedOut: false,
      durationMs: 0,
    })
    return
  }

  try {
    const mode = getRunnerMode()
    const result = mode === 'local'
      ? await runCodeLocally(normalized.value)
      : await runViaLambda(normalized.value)

    sendJson(res, 200, result)
  } catch (error) {
    const message = error instanceof Error ? `${error.name}: ${error.message}` : 'Runner invoke failed.'
    sendJson(res, 502, {
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: message,
      timedOut: false,
      durationMs: 0,
    })
  }
}
