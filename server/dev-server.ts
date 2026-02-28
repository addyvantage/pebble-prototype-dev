import dotenv from 'dotenv'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import express, { type NextFunction, type Request, type Response } from 'express'
import pebbleHandler from '../api/pebble.ts'
import {
  decodeLambdaPayload,
  normalizeRunRequest,
  normalizeRunnerResponse,
  runCodeLocally,
  type RunRequestBody,
} from './runner.ts'

dotenv.config({ path: '.env.local' })

type PebbleReq = Parameters<typeof pebbleHandler>[0]
type PebbleRes = Parameters<typeof pebbleHandler>[1]

const app = express()

function getRunnerMode() {
  const mode = process.env.PEBBLE_RUNNER_MODE
  return mode === 'remote' ? 'remote' : 'local'
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
        Payload: new TextEncoder().encode(JSON.stringify(body)),
      }),
    )

    const payloadText = decodeLambdaPayload(invokeResult.Payload)
    if (invokeResult.FunctionError) {
      throw new Error(`Runner Lambda error: ${invokeResult.FunctionError}. ${payloadText.slice(0, 300)}`)
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

app.use(express.json({ limit: '1mb' }))

app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof SyntaxError && 'body' in error) {
    res.status(400).json({
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: 'Invalid JSON body.',
      timedOut: false,
      durationMs: 0,
    })
    return
  }
  next(error)
})

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

app.post('/api/run', async (req: Request, res: Response) => {
  const normalized = normalizeRunRequest((req.body ?? {}) as RunRequestBody)
  if (!normalized.ok) {
    res.status(normalized.status).json({
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: normalized.error,
      timedOut: false,
      durationMs: 0,
    })
    return
  }

  const mode = getRunnerMode()

  try {
    const result = mode === 'remote'
      ? await runViaLambda(normalized.value)
      : await runCodeLocally(normalized.value)

    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Runner invoke failed.'
    res.status(502).json({
      ok: false,
      exitCode: null,
      stdout: '',
      stderr: message,
      timedOut: false,
      durationMs: 0,
    })
  }
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`Pebble backend running at http://localhost:${port}`)
})
