import dotenv from 'dotenv'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import express, { type NextFunction, type Request, type Response } from 'express'
import { EventEmitter } from 'events'
import pebbleHandler from '../api/pebble.ts'
import {
  decodeLambdaPayload,
  normalizeRunRequest,
  normalizeRunnerResponse,
  type RunRequestBody,
} from './runnerShared.ts'
import { runCodeLocally } from './runnerLocal.ts'
import { enforceSafety } from './safety/policy.ts'
import { getSafetyMode } from './safety/guardrails.ts'
import { redactForLog } from './safety/redact.ts'
import { tracerMiddleware } from './observability/tracer.ts'
import { metricsStore } from './observability/metricsStore.ts'

dotenv.config({ path: '.env.local' })

// ── Phase 4: Local SSE Mock ───────────────────────────────────────────────
export const liveEvents = new EventEmitter()

type PebbleReq = Parameters<typeof pebbleHandler>[0]
type PebbleRes = Parameters<typeof pebbleHandler>[1]

const app = express()
app.use(express.json())

// ── Phase 8: Observability middleware ──────────────────────────────────
app.use(tracerMiddleware)

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
      status: 'validation_error',
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

// ── Health check (must be first — used by smoke tests and startup probes) ────
app.get('/api/health', (_req: Request, res: Response) => {
  res.status(200).json({ ok: true, ts: new Date().toISOString(), port: Number(process.env.PORT ?? 3001) })
})

app.all('/api/pebble', async (req: Request, res: Response) => {
  try {
    // Intercept res.json to apply safety layer before sending to client
    const originalJson = res.json.bind(res)
    res.json = function (body: unknown) {
      if (body && typeof body === 'object' && 'text' in (body as Record<string, unknown>)) {
        const payload = body as { text?: string }
        if (typeof payload.text === 'string' && payload.text.trim()) {
          // Extract tier from the request body if available
          const reqBody = req.body as { context?: { helpTier?: number } } | undefined
          const tier = ([1, 2, 3] as const).includes(reqBody?.context?.helpTier as 1 | 2 | 3)
            ? (reqBody!.context!.helpTier as 1 | 2 | 3)
            : 1

          const safetyResult = enforceSafety({
            text: payload.text,
            tier,
            mode: getSafetyMode(),
          })

          const safePayload: Record<string, unknown> = {
            text: safetyResult.text,
          }
          if (safetyResult.flags.length > 0) {
            safePayload.safetyFlags = safetyResult.flags
          }
          if (safetyResult.blockedReason) {
            safePayload.blockedReason = safetyResult.blockedReason
          }
          return originalJson(safePayload)
        }
      }
      return originalJson(body)
    }

    await pebbleHandler(req as unknown as PebbleReq, res as unknown as PebbleRes)
  } catch (error) {
    const stack = error instanceof Error ? error.stack ?? error.message : String(error)
    console.error('[dev-api] unhandled crash in /api/pebble', redactForLog(stack))
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
      status: 'validation_error',
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
      status: 'internal_error',
      exitCode: null,
      stdout: '',
      stderr: message,
      timedOut: false,
      durationMs: 0,
    })
  }
})

// ── Phase 4: Offline SSE route ─────────────────────────────────────────────
app.get('/api/live-events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()

  const listener = (data: any) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`)
  }

  liveEvents.on('update', listener)
  req.on('close', () => {
    liveEvents.off('update', listener)
  })
})

app.post('/api/telemetry', async (req: Request, res: Response) => {
  const payload = req.body
  const awsRegion = process.env.AWS_REGION
  const ingestEventsLambda = process.env.INGEST_EVENTS_LAMBDA_NAME

  // ── Phase 4: Emit local live events ───────────────────────────────────────
  if (payload.events && Array.isArray(payload.events)) {
    for (const event of payload.events) {
      if (event.eventName === 'run.completed' || event.eventName === 'submit.completed') {
        const isSubmit = event.eventName === 'submit.completed'
        const success = event.success || event.accepted

        const update = {
          userId: event.userId || event.sessionId || 'anonymous',
          timestamp: new Date().toISOString(),
          recoveryEffectiveness: success ? 92.5 + Math.random() * 5 : 80.0 + Math.random() * 10,
          timeToRecover: success ? 45.0 + Math.random() * 30 : 150.0 + Math.random() * 60,
          autonomyDelta: success ? 1.5 : -0.5,
          guidanceRelianceDelta: success ? -0.5 : 0.2,
          breakpointIncrement: !success && !isSubmit ? 1 : 0,
          streakDelta: success && isSubmit ? 1 : 0,
        }

        // Slight delay to simulate lambda execution
        setTimeout(() => liveEvents.emit('update', update), 800)
      }
    }
  }

  if (!awsRegion || !ingestEventsLambda) {
    if (payload.events && Array.isArray(payload.events)) {
      console.log(`[dev-api] Ignored ${payload.events.length} telemetry events (local offline mode)`)
    }
    res.status(200).json({ ok: true, offline: true })
    return
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY

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
        FunctionName: ingestEventsLambda,
        InvocationType: 'Event', // Fast async invoke to not block client
        Payload: new TextEncoder().encode(JSON.stringify(payload)),
      }),
    )

    if (invokeResult.FunctionError) {
      console.error('[dev-api] Lambda telemetry error:', invokeResult.FunctionError)
    }
    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[dev-api] Failed to invoke telemetry lambda', err)
    res.status(502).json({ error: 'Failed to push events' })
  } finally {
    client.destroy()
  }
})

app.get('/api/flags', async (_req: Request, res: Response) => {
  res.status(200).json({
    agenticCoachEnabled: true,
    guardrailsEnabled: false,
    tier3FullSolutionAllowed: false,
    livePresenceEnabled: false,
    insightsAthenaEnabled: false,
    pdfExportEnabled: false,
    opsAdminPageEnabled: false,
  })
})

// ── Phase 2: Agentic Coach endpoint ─────────────────────────────────────────
import { runAgentLoop } from './pebbleAgent/agent.ts'
import type { AgentRequest } from './pebbleAgent/types.ts'

app.post('/api/pebble-agent', async (req: Request, res: Response) => {
  try {
    const body = req.body as Partial<AgentRequest> | undefined
    if (!body || typeof body.question !== 'string' || !body.question.trim()) {
      res.status(400).json({ error: 'Field "question" is required.' })
      return
    }

    const tier = ([1, 2, 3] as const).includes(body.tier as 1 | 2 | 3) ? body.tier as 1 | 2 | 3 : 1

    const agentReq: AgentRequest = {
      tier,
      question: body.question.trim(),
      codeExcerpt: typeof body.codeExcerpt === 'string' ? body.codeExcerpt.slice(0, 3000) : '',
      language: typeof body.language === 'string' ? body.language : 'python',
      runStatus: typeof body.runStatus === 'string' ? body.runStatus : '',
      runMessage: typeof body.runMessage === 'string' ? body.runMessage.slice(0, 500) : '',
      failingSummary: typeof body.failingSummary === 'string' ? body.failingSummary.slice(0, 500) : '',
      unitTitle: typeof body.unitTitle === 'string' ? body.unitTitle : '',
      unitConcept: typeof body.unitConcept === 'string' ? body.unitConcept : '',
      struggleContext: {
        runFailStreak: Number(body.struggleContext?.runFailStreak) || 0,
        timeStuckSeconds: Number(body.struggleContext?.timeStuckSeconds) || 0,
        lastErrorType: typeof body.struggleContext?.lastErrorType === 'string' ? body.struggleContext.lastErrorType : null,
        level: Number(body.struggleContext?.level) || 0,
      },
    }

    // Never log code or secrets
    console.log(`[pebble-agent] tier=${tier} question="${redactForLog(agentReq.question.slice(0, 60))}"`)
    const result = await runAgentLoop(agentReq)

    // Apply safety layer to agent response
    const safetyResult = enforceSafety({
      text: result.reasoning_brief || '',
      tier,
      mode: getSafetyMode(),
      json: {
        hints: result.hints || [],
        steps: result.steps || [],
        patch_suggestion: result.patch_suggestion ?? null,
        reasoning_brief: result.reasoning_brief || '',
      },
    })

    // Merge safety results back into agent response
    const safeResult = {
      ...result,
      reasoning_brief: safetyResult.json?.reasoning_brief ?? result.reasoning_brief,
      hints: safetyResult.json?.hints ?? result.hints,
      steps: safetyResult.json?.steps ?? result.steps,
      patch_suggestion: safetyResult.json?.patch_suggestion ?? result.patch_suggestion,
      safety_flags: [...(result.safety_flags || []), ...safetyResult.flags],
    }

    // If safety blocked, override the response
    if (!safetyResult.allowed) {
      safeResult.reasoning_brief = safetyResult.text
      safeResult.hints = ['Try rephrasing your question for a helpful answer.']
      safeResult.steps = []
      safeResult.patch_suggestion = null
    }

    res.status(200).json(safeResult)
  } catch (err) {
    console.error('[pebble-agent] Unexpected error:', err)
    res.status(500).json({ error: 'Agent request failed.' })
  }
})

// ── Auth middleware ─────────────────────────────────────────────────────────
const PROFILES_TABLE = process.env.PROFILES_TABLE_NAME || 'pebble-profiles'
// Must be set explicitly — the real bucket name includes account+region (e.g. pebble-avatars-123456789012-ap-south-1).
// When unset, the presign endpoint falls back to the offline dev stub so the UI still works locally.
const AVATARS_BUCKET = process.env.AVATARS_BUCKET_NAME ?? ''
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim()).filter(Boolean)

function extractUserId(req: Request): { userId: string; email: string } | null {
  // In production, we'd validate the JWT against Cognito JWKS.
  // For dev simplicity, we trust the token payload or accept X-Dev-User-Id.
  const authHeader = req.headers.authorization
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token === 'dev-guest-token') {
      return { userId: 'dev-guest', email: 'guest@pebble.dev' }
    }
    try {
      // Decode JWT payload (not verifying signature in dev; prod should use JWKS)
      const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString())
      return { userId: payload.sub, email: payload.email || payload['cognito:username'] || '' }
    } catch {
      return null
    }
  }
  const devUserId = req.headers['x-dev-user-id'] as string | undefined
  if (devUserId && process.env.NODE_ENV !== 'production') {
    return { userId: devUserId, email: `${devUserId}@dev.local` }
  }
  return null
}

// ── Profile routes ──────────────────────────────────────────────────────────
// In-memory store for dev mode (no real DynamoDB)
const devProfiles = new Map<string, Record<string, unknown>>()

app.get('/api/profile', async (req: Request, res: Response) => {
  const identity = extractUserId(req)
  if (!identity) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const awsRegion = process.env.AWS_REGION

  if (!awsRegion) {
    // Dev mode: return from memory or defaults
    const stored = devProfiles.get(identity.userId)
    res.status(200).json(stored ?? {
      userId: identity.userId,
      username: identity.email.split('@')[0],
      email: identity.email,
      bio: '',
      avatarUrl: null,
      avatarKey: null,
      role: ADMIN_EMAILS.includes(identity.email) ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
    return
  }

  // AWS mode: read from DynamoDB
  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb')
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
    const result = await client.send(new GetCommand({
      TableName: PROFILES_TABLE,
      Key: { userId: identity.userId },
    }))
    let item = result.Item
    if (!item) {
      // Auto-create on first access
      item = {
        userId: identity.userId,
        username: identity.email.split('@')[0],
        email: identity.email,
        bio: '',
        avatarUrl: null,
        avatarKey: null,
        role: ADMIN_EMAILS.includes(identity.email) ? 'admin' : 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const { PutCommand } = await import('@aws-sdk/lib-dynamodb')
      await client.send(new PutCommand({ TableName: PROFILES_TABLE, Item: item }))
    }
    // Generate a short-lived presigned GET URL if an avatar key is stored
    if (item.avatarKey) {
      try {
        const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
        const s3 = new S3Client({ region: awsRegion })
        item = {
          ...item,
          avatarUrl: await getSignedUrl(s3, new GetObjectCommand({ Bucket: AVATARS_BUCKET, Key: item.avatarKey as string }), { expiresIn: 3600 }),
        }
      } catch {
        // Non-fatal: avatar URL generation failed, return without it
      }
    }
    res.status(200).json(item)
  } catch (err) {
    console.error('[dev-api] Failed to fetch profile from DynamoDB, using in-memory fallback:', err)
    const stored = devProfiles.get(identity.userId)
    res.status(200).json(stored ?? {
      userId: identity.userId,
      username: identity.email.split('@')[0],
      email: identity.email,
      bio: '',
      avatarUrl: null,
      avatarKey: null,
      role: ADMIN_EMAILS.includes(identity.email) ? 'admin' : 'user',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    })
  }
})

app.put('/api/profile', async (req: Request, res: Response) => {
  const identity = extractUserId(req)
  if (!identity) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { username, bio, avatarKey } = req.body

  // Validate
  if (username !== undefined) {
    if (typeof username !== 'string' || username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
      res.status(400).json({ error: 'Username must be 3–20 chars, alphanumeric + underscore' })
      return
    }
  }
  if (bio !== undefined && (typeof bio !== 'string' || bio.length > 160)) {
    res.status(400).json({ error: 'Bio must be 160 chars or less' })
    return
  }

  const awsRegion = process.env.AWS_REGION
  const now = new Date().toISOString()

  if (!awsRegion) {
    // Dev mode: store in memory
    const existing = devProfiles.get(identity.userId) ?? {
      userId: identity.userId,
      email: identity.email,
      role: ADMIN_EMAILS.includes(identity.email) ? 'admin' : 'user',
      createdAt: now,
    }
    const updated = {
      ...existing,
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio }),
      ...(avatarKey !== undefined && { avatarKey }),
      updatedAt: now,
    }
    devProfiles.set(identity.userId, updated)
    res.status(200).json(updated)
    return
  }

  // AWS mode
  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, UpdateCommand } = await import('@aws-sdk/lib-dynamodb')
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))

    const expressionParts: string[] = ['#updatedAt = :updatedAt']
    const names: Record<string, string> = { '#updatedAt': 'updatedAt' }
    const values: Record<string, unknown> = { ':updatedAt': now }

    if (username !== undefined) {
      expressionParts.push('#username = :username')
      names['#username'] = 'username'
      values[':username'] = username
    }
    if (bio !== undefined) {
      expressionParts.push('#bio = :bio')
      names['#bio'] = 'bio'
      values[':bio'] = bio
    }
    if (avatarKey !== undefined) {
      expressionParts.push('#avatarKey = :avatarKey')
      names['#avatarKey'] = 'avatarKey'
      values[':avatarKey'] = avatarKey
    }

    await client.send(new UpdateCommand({
      TableName: PROFILES_TABLE,
      Key: { userId: identity.userId },
      UpdateExpression: `SET ${expressionParts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
    }))

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[dev-api] Failed to update profile in DynamoDB, using in-memory fallback:', err)
    const existing = devProfiles.get(identity.userId) ?? {
      userId: identity.userId,
      email: identity.email,
      role: ADMIN_EMAILS.includes(identity.email) ? 'admin' : 'user',
      createdAt: now,
    }
    const updated = {
      ...existing,
      ...(username !== undefined && { username }),
      ...(bio !== undefined && { bio }),
      ...(avatarKey !== undefined && { avatarKey }),
      updatedAt: now,
    }
    devProfiles.set(identity.userId, updated)
    res.status(200).json({ ok: true })
  }
})

app.post('/api/avatar/presign', async (req: Request, res: Response) => {
  const identity = extractUserId(req)
  if (!identity) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { contentType, fileExtension } = req.body
  const ext = (fileExtension || 'jpg').replace(/^\./, '')
  const key = `avatars/${identity.userId}/${Date.now()}.${ext}`

  const awsRegion = process.env.AWS_REGION

  // Use offline stub when either AWS_REGION or AVATARS_BUCKET_NAME is not configured.
  // This avoids signing presigned URLs against a non-existent / wrong bucket (which
  // surfaces as a CORS error in the browser because S3 returns a no-CORS 403/404).
  if (!awsRegion || !AVATARS_BUCKET) {
    if (awsRegion && !AVATARS_BUCKET) {
      console.warn(
        '[dev-api] AVATARS_BUCKET_NAME is not set — falling back to offline avatar stub.\n' +
        '         Set AVATARS_BUCKET_NAME to the CDK output AvatarsBucketName, e.g.:\n' +
        '           AVATARS_BUCKET_NAME=pebble-avatars-<account>-<region>'
      )
    } else {
      console.log(`[dev-api] AWS not configured — using offline avatar stub for key: ${key}`)
    }
    res.status(200).json({ uploadUrl: '/api/dev-upload-stub', key })
    return
  }

  try {
    const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    const s3 = new S3Client({ region: awsRegion })
    // Note: ContentType is intentionally NOT included in PutObjectCommand.
    // Including it locks the signature to that exact value; if the browser sends
    // a slightly different Content-Type header the upload gets a 403 SignatureDoesNotMatch.
    // The client still sends Content-Type on the PUT (S3 stores it), but it is not
    // part of the signature check. The contentType param is kept for future use.
    void contentType
    const command = new PutObjectCommand({
      Bucket: AVATARS_BUCKET,
      Key: key,
    })
    const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 })
    res.status(200).json({ uploadUrl, key })
  } catch (err) {
    console.error('[dev-api] Failed to generate presigned URL:', err)
    res.status(500).json({ error: 'Failed to generate upload URL' })
  }
})

// ── Dev avatar upload stub (offline / no-S3 mode) ────────────────────────────
// Accepts the PUT that ProfilePage sends after receiving the fake presigned URL.
// Must be under /api/ so the Vite proxy forwards it — an absolute localhost:3001
// URL would be cross-origin from localhost:5173 and get blocked by the browser.
app.put('/api/dev-upload-stub', (_req: Request, res: Response) => {
  res.status(200).send()
})

// ── Phase 5: Cohort Analytics (Athena + S3 + Glue) ─────────────────────────
app.get('/api/analytics/cohort', async (req: Request, res: Response) => {
  const mockData = {
    avgRecoveryTime: { Easy: 24, Medium: 45, Hard: 120 },
    autonomyRate: { python: 85, javascript: 72, cpp: 40, java: 60 },
    breakpointsPerCohort: { Beginner: 5, Intermediate: 2, Advanced: 0 }
  }

  const awsRegion = process.env.AWS_REGION
  // Require an explicitly configured EVENT_LAKE_BUCKET to run Athena path
  const eventLakeBucket = process.env.EVENT_LAKE_BUCKET

  if (!awsRegion || !eventLakeBucket) {
    console.log('[dev-api] Serving mock cohort analytics (offline fallback)')
    setTimeout(() => res.status(200).json({ ok: true, offline: true, data: mockData }), 800)
    return
  }

  try {
    const { AthenaClient, StartQueryExecutionCommand, GetQueryExecutionCommand, GetQueryResultsCommand } = await import('@aws-sdk/client-athena')
    const client = new AthenaClient({ region: awsRegion })
    const dbName = `pebble_analytics_${process.env.PEBBLE_ENV === 'prod' ? 'prod' : 'dev'}`
    const outputLocation = `s3://${eventLakeBucket}/athena-results/`

    const queries = {
      avgRecoveryTime: `SELECT difficulty, AVG(recovery_time_ms) as avg_ms FROM pebble_events WHERE event_type = 'submit.completed' GROUP BY difficulty`,
      autonomyRate: `SELECT language, CAST(SUM(CASE WHEN tier_used IN ('T1', 'T2') THEN 1 ELSE 0 END) AS DOUBLE) / COUNT(*) * 100 AS autonomy_pct FROM pebble_events GROUP BY language`,
      breakpoints: `SELECT CASE WHEN struggle_score > 70 THEN 'Beginner' WHEN struggle_score > 30 THEN 'Intermediate' ELSE 'Advanced' END AS cohort, COUNT(*) as cnt FROM pebble_events WHERE event_type = 'run.completed' GROUP BY 1`
    }

    const executeAndFetch = async (sql: string) => {
      const startRes = await client.send(new StartQueryExecutionCommand({
        QueryString: sql,
        QueryExecutionContext: { Database: dbName },
        ResultConfiguration: { OutputLocation: outputLocation },
      }))
      const qid = startRes.QueryExecutionId
      if (!qid) throw new Error('No execution ID')

      while (true) {
        const statusRes = await client.send(new GetQueryExecutionCommand({ QueryExecutionId: qid }))
        const state = statusRes.QueryExecution?.Status?.State
        if (state === 'SUCCEEDED') break
        if (state === 'FAILED' || state === 'CANCELLED') {
          throw new Error(`Athena query failed: ${statusRes.QueryExecution?.Status?.StateChangeReason}`)
        }
        await new Promise(r => setTimeout(r, 500))
      }

      const results = await client.send(new GetQueryResultsCommand({ QueryExecutionId: qid }))
      return results.ResultSet?.Rows || []
    }

    const [recRows, autoRows, bpRows] = await Promise.all([
      executeAndFetch(queries.avgRecoveryTime),
      executeAndFetch(queries.autonomyRate),
      executeAndFetch(queries.breakpoints),
    ])

    const data: any = { avgRecoveryTime: {}, autonomyRate: {}, breakpointsPerCohort: {} }

    // First row is headers natively in Athena GetQueryResults
    for (let i = 1; i < recRows.length; i++) {
      const diff = recRows[i]?.Data?.[0]?.VarCharValue
      const avgMs = recRows[i]?.Data?.[1]?.VarCharValue
      if (diff && avgMs) data.avgRecoveryTime[diff] = Math.round(parseFloat(avgMs) / 1000)
    }

    for (let i = 1; i < autoRows.length; i++) {
      const lang = autoRows[i]?.Data?.[0]?.VarCharValue
      const pct = autoRows[i]?.Data?.[1]?.VarCharValue
      if (lang && pct) data.autonomyRate[lang] = Math.round(parseFloat(pct))
    }

    for (let i = 1; i < bpRows.length; i++) {
      const cohort = bpRows[i]?.Data?.[0]?.VarCharValue
      const cnt = bpRows[i]?.Data?.[1]?.VarCharValue
      if (cohort && cnt) data.breakpointsPerCohort[cohort] = parseInt(cnt, 10)
    }

    res.status(200).json({ ok: true, offline: false, data })
  } catch (err) {
    console.error('[dev-api] Athena query failed, falling back to mock data:', err)
    res.status(200).json({ ok: true, offline: true, fallback: true, data: mockData })
  }
})

// ── Phase 6: Learning Journey APIs ────────────────────────────────────────────
const PHASE_LABELS: Record<string, string> = {
  START_SESSION: 'Session Starting',
  WARM_UP: 'Warm-Up',
  PRACTICE_BLOCK: 'Practice Block',
  CHALLENGE_PROBLEM: 'Challenge',
  RECOVERY_PHASE: 'Recovery',
  REFLECTION: 'Reflection',
  COMPLETE: 'Journey Complete',
}
const PHASE_ORDER = ['START_SESSION', 'WARM_UP', 'PRACTICE_BLOCK', 'CHALLENGE_PROBLEM', 'RECOVERY_PHASE', 'REFLECTION', 'COMPLETE']

// In-memory store for offline dev
const devJourneys = new Map<string, Record<string, unknown>>()

const mockJourneyState = (userId: string) => {
  const stored = devJourneys.get(userId)
  const currentPhase = (stored?.currentPhase as string) ?? 'PRACTICE_BLOCK'
  const phaseIdx = PHASE_ORDER.indexOf(currentPhase)
  const nextPhase = phaseIdx >= 0 && phaseIdx < PHASE_ORDER.length - 1 ? PHASE_ORDER[phaseIdx + 1] : 'COMPLETE'
  return {
    currentPhase,
    currentPhaseLabel: PHASE_LABELS[currentPhase] ?? currentPhase,
    nextPhase,
    nextPhaseLabel: PHASE_LABELS[nextPhase] ?? nextPhase,
    journeyConfidence: (stored?.journeyConfidence as number) ?? 72,
    recommendedNextDifficulty: (stored?.recommendedNextDifficulty as string) ?? 'Medium',
    autonomyScore: (stored?.autonomyScore as number) ?? 60,
    streakImpact: (stored?.streakImpact as number) ?? 0,
    lastProblemId: stored?.lastProblemId ?? null,
  }
}

app.get('/api/journey/current', async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'anonymous'
  const awsRegion = process.env.AWS_REGION
  const journeysTable = process.env.JOURNEYS_TABLE_NAME

  if (!awsRegion || !journeysTable) {
    return res.status(200).json({ ok: true, offline: true, data: mockJourneyState(userId) })
  }

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb')
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
    const result = await ddb.send(new GetCommand({
      TableName: journeysTable,
      Key: { userId, journeyId: 'default' },
    }))
    if (!result.Item) {
      return res.status(200).json({ ok: true, offline: false, data: mockJourneyState(userId) })
    }
    const item = result.Item
    const currentPhase = (item.currentPhase as string) ?? 'PRACTICE_BLOCK'
    const phaseIdx = PHASE_ORDER.indexOf(currentPhase)
    const nextPhase = phaseIdx >= 0 && phaseIdx < PHASE_ORDER.length - 1 ? PHASE_ORDER[phaseIdx + 1] : 'COMPLETE'
    return res.status(200).json({
      ok: true,
      offline: false,
      data: {
        currentPhase,
        currentPhaseLabel: PHASE_LABELS[currentPhase] ?? currentPhase,
        nextPhase,
        nextPhaseLabel: PHASE_LABELS[nextPhase] ?? nextPhase,
        journeyConfidence: item.journeyConfidence ?? 72,
        recommendedNextDifficulty: item.recommendedNextDifficulty ?? 'Medium',
        autonomyScore: item.autonomyScore ?? 60,
        streakImpact: item.streakImpact ?? 0,
        lastProblemId: item.lastProblemId ?? null,
      },
    })
  } catch (err) {
    console.error('[journey] Failed to fetch journey state:', err)
    return res.status(200).json({ ok: true, offline: true, data: mockJourneyState(userId) })
  }
})

app.post('/api/journey/update', async (req: Request, res: Response) => {
  const { userId = 'anonymous', recoveryTimeMs = 120000, struggleScore = 50, autonomyDelta = 0, problemId } = req.body || {}
  const awsRegion = process.env.AWS_REGION
  const stateMachineArn = process.env.JOURNEY_STATE_MACHINE_ARN

  // Local mode: update in-memory store
  if (!awsRegion || !stateMachineArn) {
    const existing = devJourneys.get(userId) ?? {}
    const currentPhase = (existing.currentPhase as string) ?? 'WARM_UP'
    const prevAutonomy = (existing.autonomyScore as number) ?? 60
    const newAutonomy = Math.min(100, Math.max(0, prevAutonomy + autonomyDelta))

    // Advance phase heuristic
    const phaseIdx = PHASE_ORDER.indexOf(currentPhase)
    const shouldAdvance = newAutonomy >= 60 && struggleScore < 50
    const nextPhase = shouldAdvance && phaseIdx < PHASE_ORDER.length - 1 ? PHASE_ORDER[phaseIdx + 1] : currentPhase

    const updated = {
      ...existing,
      currentPhase: nextPhase,
      autonomyScore: newAutonomy,
      journeyConfidence: Math.min(100, Math.round(newAutonomy * 0.6 + (100 - struggleScore) * 0.4)),
      recommendedNextDifficulty: newAutonomy >= 80 && struggleScore < 30 ? 'Hard'
        : newAutonomy >= 50 && struggleScore < 60 ? 'Medium' : 'Easy',
      lastProblemId: problemId ?? existing.lastProblemId,
      streakImpact: shouldAdvance ? 1 : 0,
    }
    devJourneys.set(userId, updated)
    return res.status(200).json({ ok: true, offline: true, data: updated })
  }

  // AWS mode: start a Step Functions Express execution
  try {
    const { SFNClient, StartExecutionCommand } = await import('@aws-sdk/client-sfn')
    const sfn = new SFNClient({ region: awsRegion })
    const existing = devJourneys.get(userId) ?? {}
    await sfn.send(new StartExecutionCommand({
      stateMachineArn,
      name: `journey-${userId}-${Date.now()}`,
      input: JSON.stringify({
        userId,
        journeyId: 'default',
        problemId: problemId ?? null,
        recoveryTimeMs,
        struggleScore,
        autonomyScore: Math.min(100, Math.max(0, ((existing.autonomyScore as number) ?? 60) + autonomyDelta)),
        currentPhase: (existing.currentPhase as string) ?? 'WARM_UP',
      }),
    }))
    return res.status(200).json({ ok: true, offline: false })
  } catch (err) {
    console.error('[journey] Failed to trigger state machine:', err)
    return res.status(200).json({ ok: true, offline: true, fallback: true })
  }
})



// ── Phase 8: Admin Ops Metrics ─────────────────────────────────────────────────
const ADMIN_TOKEN = process.env.ADMIN_OPS_TOKEN ?? 'dev-admin'

app.get('/api/admin/ops-metrics', (req: Request, res: Response) => {
  const token = req.headers['x-admin-token']
  if (token !== ADMIN_TOKEN) {
    return res.status(403).json({ error: 'Forbidden' })
  }
  const snapshot = metricsStore.getOpsSnapshot()
  return res.status(200).json({ ok: true, data: snapshot })
})

// ── Phase 7: PDF Recovery Report ──────────────────────────────────────────────

import { buildRecoveryReport } from './reports/buildRecoveryReport.ts'
import { generateReportPdf } from './reports/pdfGenerator.ts'
import { buildSnapshot } from './snapshots/createSnapshot.ts'
import { mkdirSync, writeFileSync } from 'fs'
import { join } from 'path'

// In-memory snapshot store for offline dev
const devSnapshots = new Map<string, Record<string, unknown>>()

app.post('/api/report/recovery', async (req: Request, res: Response) => {
  const { problemId = 'unknown', userId = 'anonymous', sessionId = 'local' } = req.body || {}

  try {
    // Build the report from an empty event array (real events would come from DDB rollup)
    // In a real deployment the Lambda would query the pebble-events-rollup table
    const mockEvents = [
      { eventName: 'run.completed', timestamp: new Date().toISOString(), runtimeMs: 3200, errorType: 'wrong_answer' },
      { eventName: 'run.completed', timestamp: new Date().toISOString(), runtimeMs: 2100, errorType: 'wrong_answer' },
      { eventName: 'submit.completed', timestamp: new Date().toISOString(), runtimeMs: 1400, accepted: true, tierUsed: 'T2' },
    ]

    const report = buildRecoveryReport(userId, sessionId, problemId, mockEvents)
    const pdfBuffer = await generateReportPdf(report)

    const awsRegion = process.env.AWS_REGION
    const reportsBucket = process.env.REPORTS_BUCKET_NAME

    if (awsRegion && reportsBucket) {
      try {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
        const s3 = new S3Client({ region: awsRegion })
        const key = `pebble-session-reports/${userId}/${sessionId}.pdf`
        await s3.send(new PutObjectCommand({
          Bucket: reportsBucket,
          Key: key,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
        }))
        const reportUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: reportsBucket, Key: key }), { expiresIn: 3600 })
        return res.status(200).json({ ok: true, reportUrl, expiresIn: 3600 })
      } catch (s3Err) {
        console.error('[report] S3 upload failed, falling back to local', s3Err)
      }
    }

    // Local fallback: write PDF to /tmp/reports/
    const tmpDir = join('/tmp', 'pebble-reports')
    mkdirSync(tmpDir, { recursive: true })
    const ts = Date.now()
    const filename = `${userId}_${sessionId}_${ts}.pdf`
    const filepath = join(tmpDir, filename)
    writeFileSync(filepath, pdfBuffer)

    console.log(`[report] PDF saved locally: ${filepath}`)
    return res.status(200).json({
      ok: true,
      reportUrl: `http://localhost:${process.env.PORT ?? 3001}/api/report/download/${filename}`,
      expiresIn: 3600,
      _local: true,
    })
  } catch (err) {
    console.error('[report] Failed to generate report:', err)
    return res.status(500).json({ error: 'Report generation failed' })
  }
})

// Serve local PDF files
app.get('/api/report/download/:filename', (req: Request, res: Response) => {
  const filename = String(req.params.filename ?? '')
  // Only allow simple alphanum + underscore + hyphen + dot filenames
  if (!/^[\w\-.]+\.pdf$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' })
  }
  const filepath = join('/tmp', 'pebble-reports', filename)
  res.setHeader('Content-Type', 'application/pdf')
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
  res.setHeader('Cache-Control', 'no-store')
  return res.sendFile(filepath, (err) => {
    if (err && !res.headersSent) {
      res.status(404).json({ error: 'Report file not found', filename })
    }
  })
})

// ── Phase 7: Session Snapshots ─────────────────────────────────────────────────
app.post('/api/session/snapshot', async (req: Request, res: Response) => {
  const { problemId, finalCode, language, status, runtimeMs = 0, recoveryTimeMs = 0, userId = 'anonymous' } = req.body || {}

  if (!problemId || typeof finalCode !== 'string') {
    return res.status(400).json({ error: 'problemId and finalCode are required' })
  }

  // Use the frontend origin (Vite dev server) for the share URL, not the Express host.
  // With changeOrigin:true in the Vite proxy, req.get('host') is localhost:3001 (Express),
  // but the React app lives at FRONTEND_ORIGIN (defaults to localhost:5173).
  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'
  const snapshot = buildSnapshot({ problemId, finalCode, language, status, runtimeMs, recoveryTimeMs, userId }, frontendOrigin)

  const awsRegion = process.env.AWS_REGION
  const snapshotsTable = process.env.SNAPSHOTS_TABLE_NAME

  if (awsRegion && snapshotsTable) {
    try {
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
      const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb')
      const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
      await ddb.send(new PutCommand({
        TableName: snapshotsTable,
        Item: {
          ...snapshot,
          ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
        },
      }))
      return res.status(200).json({ ok: true, snapshotId: snapshot.snapshotId, shareUrl: snapshot.shareUrl })
    } catch (ddbErr) {
      console.error('[snapshot] DDB write failed, falling back to memory:', ddbErr)
    }
  }

  // Local fallback: in-memory store
  devSnapshots.set(snapshot.snapshotId, snapshot as unknown as Record<string, unknown>)
  return res.status(200).json({ ok: true, snapshotId: snapshot.snapshotId, shareUrl: snapshot.shareUrl, _local: true })
})

app.get('/api/session/snapshot/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id ?? '')
  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return res.status(400).json({ error: 'Invalid snapshot ID' })
  }

  const awsRegion = process.env.AWS_REGION
  const snapshotsTable = process.env.SNAPSHOTS_TABLE_NAME

  if (awsRegion && snapshotsTable) {
    try {
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
      const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb')
      const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
      const result = await ddb.send(new GetCommand({ TableName: snapshotsTable, Key: { snapshotId: id } }))
      if (result.Item) return res.status(200).json({ ok: true, snapshot: result.Item })
    } catch (err) {
      console.error('[snapshot] DDB read failed:', err)
    }
  }

  const local = devSnapshots.get(id)
  if (local) return res.status(200).json({ ok: true, snapshot: local })
  return res.status(404).json({ error: 'Snapshot not found' })
})

// ── Phase 9: Streak Risk Predictor (SageMaker) ────────────────────────────────

import { computeRisk } from './phase9/sagemakerClient.ts'
import type { RiskFeatures, RiskResult } from './phase9/riskFeatures.ts'
import { buildRecapScript, isScriptSafe } from './phase9/recapBuilder.ts'
import type { RecapSummary } from './phase9/recapBuilder.ts'
import { generateRecapAudio } from './phase9/pollyClient.ts'
import { mkdirSync as _mkdirSync9, writeFileSync as _writeFileSync9 } from 'fs'
import { join as _join9 } from 'path'

const RISK_TABLE = process.env.RISK_PREDICTIONS_TABLE_NAME || 'PebbleRiskPredictions-dev'
const RECAPS_TABLE = process.env.WEEKLY_RECAPS_TABLE_NAME || 'PebbleWeeklyRecaps-dev'
const RECAP_AUDIO_BUCKET = process.env.RECAP_AUDIO_BUCKET_NAME || ''

// In-memory stores for offline dev
const devRiskStore = new Map<string, RiskResult & { weekStart: string; userId: string }>()
const devRecapStore = new Map<string, { script: string; audioUrl?: string; generatedAt: string; weekStart: string; userId: string }>()

function currentWeekStart(): string {
  const now = new Date()
  const dayOfWeek = now.getUTCDay() // 0 = Sunday
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7))
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function validateRiskFeatures(body: unknown): RiskFeatures | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const num = (k: string, fallback = 0) =>
    typeof b[k] === 'number' ? (b[k] as number) : fallback
  const trend = b.trendDirection
  if (trend !== 'improving' && trend !== 'stable' && trend !== 'worsening') return null
  return {
    streakDays: num('streakDays'),
    daysActiveLast7: num('daysActiveLast7'),
    avgRecoveryTimeMsLast7: num('avgRecoveryTimeMsLast7'),
    guidanceRelianceLast7: Math.min(1, Math.max(0, num('guidanceRelianceLast7'))),
    autonomyRateLast7: Math.min(1, Math.max(0, num('autonomyRateLast7'))),
    breakpointsLast7: num('breakpointsLast7'),
    solvesLast7: num('solvesLast7'),
    lateNightSessionsLast7: num('lateNightSessionsLast7'),
    trendDirection: trend,
  }
}

// GET /api/risk/current — returns latest stored risk result for user
app.get('/api/risk/current', async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'anonymous'
  const awsRegion = process.env.AWS_REGION

  if (!awsRegion) {
    const stored = devRiskStore.get(userId)
    if (!stored) {
      return res.status(200).json({ ok: true, offline: true, data: null })
    }
    const { userId: _u, ...rest } = stored
    return res.status(200).json({ ok: true, offline: true, data: rest })
  }

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb')
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
    const result = await ddb.send(new QueryCommand({
      TableName: RISK_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false,
      Limit: 1,
    }))
    const item = result.Items?.[0]
    return res.status(200).json({ ok: true, offline: false, data: item ?? null })
  } catch (err) {
    console.error('[risk] DDB read failed:', err instanceof Error ? err.message : '')
    const stored = devRiskStore.get(userId)
    if (stored) {
      const { userId: _u, ...rest } = stored
      return res.status(200).json({ ok: true, offline: true, fallback: true, data: rest })
    }
    return res.status(200).json({ ok: true, offline: true, data: null })
  }
})

// POST /api/risk/recompute — computes features and runs risk model
app.post('/api/risk/recompute', async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'anonymous'

  const rawFeatures = (req.body as Record<string, unknown>)?.features
  const features = validateRiskFeatures(rawFeatures)
  if (!features) {
    return res.status(400).json({ error: 'Invalid or missing features payload' })
  }

  console.log(`[risk] Recomputing for userId="${userId}" streakDays=${features.streakDays} mode=${process.env.RISK_MODE ?? 'auto'}`)

  let result: RiskResult
  try {
    result = await computeRisk(features)
  } catch (err) {
    console.error('[risk] computeRisk failed unexpectedly:', err instanceof Error ? err.message : '')
    return res.status(500).json({ error: 'Risk computation failed' })
  }

  const weekStart = currentWeekStart()
  const awsRegion = process.env.AWS_REGION

  if (!awsRegion) {
    devRiskStore.set(userId, { ...result, weekStart, userId })
    return res.status(200).json({ ok: true, offline: true, data: result })
  }

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb')
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
    await ddb.send(new PutCommand({
      TableName: RISK_TABLE,
      Item: {
        userId,
        weekStart,
        ...result,
        ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
    }))
    return res.status(200).json({ ok: true, offline: false, data: result })
  } catch (err) {
    console.error('[risk] DDB write failed:', err instanceof Error ? err.message : '')
    devRiskStore.set(userId, { ...result, weekStart, userId })
    return res.status(200).json({ ok: true, offline: true, fallback: true, data: result })
  }
})

// ── Phase 9: Weekly Growth Ledger Narrator (Polly) ────────────────────────────

function validateRecapSummary(body: unknown): RecapSummary | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const num = (k: string, fallback = 0) =>
    typeof b[k] === 'number' ? (b[k] as number) : fallback
  const trend = b.trendDirection
  if (trend !== 'improving' && trend !== 'stable' && trend !== 'worsening') return null
  const struggle = typeof b.biggestStruggle === 'string' ? b.biggestStruggle : null
  return {
    solvesLast7: num('solvesLast7'),
    daysActiveLast7: num('daysActiveLast7'),
    streakDays: num('streakDays'),
    biggestStruggle: struggle,
    trendDirection: trend,
    language: typeof b.language === 'string' ? b.language.slice(0, 20) : 'python',
  }
}

// POST /api/growth/weekly-recap — generate and store a weekly recap
app.post('/api/growth/weekly-recap', async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'anonymous'

  const rawSummary = (req.body as Record<string, unknown>)?.summary
  const summary = validateRecapSummary(rawSummary)
  if (!summary) {
    return res.status(400).json({ error: 'Invalid or missing summary payload' })
  }

  console.log(`[recap] Generating for userId="${userId}" mode=${process.env.RECAP_MODE ?? 'auto'}`)

  const script = buildRecapScript(summary)
  if (!isScriptSafe(script)) {
    console.error('[recap] Script failed safety check — blocked')
    return res.status(400).json({ error: 'Recap script failed safety check' })
  }

  const weekStart = currentWeekStart()
  const generatedAt = new Date().toISOString()
  let audioUrl: string | undefined

  // Try Polly
  const { audioBuffer } = await generateRecapAudio(script)

  if (audioBuffer) {
    const awsRegion = process.env.AWS_REGION
    const audioKey = `recaps/${userId}/${weekStart}.mp3`

    if (awsRegion && RECAP_AUDIO_BUCKET) {
      try {
        const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3')
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
        const s3 = new S3Client({ region: awsRegion })
        await s3.send(new PutObjectCommand({
          Bucket: RECAP_AUDIO_BUCKET,
          Key: audioKey,
          Body: audioBuffer,
          ContentType: 'audio/mpeg',
        }))
        const { GetObjectCommand } = await import('@aws-sdk/client-s3')
        audioUrl = await getSignedUrl(s3, new GetObjectCommand({ Bucket: RECAP_AUDIO_BUCKET, Key: audioKey }), { expiresIn: 3600 })
        s3.destroy()
      } catch (s3Err) {
        console.error('[recap] S3 upload failed, saving locally:', s3Err instanceof Error ? s3Err.message : '')
      }
    }

    // Local fallback: write to /tmp
    if (!audioUrl) {
      try {
        const tmpDir = _join9('/tmp', 'pebble-recaps')
        _mkdirSync9(tmpDir, { recursive: true })
        const filename = `${userId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${weekStart}.mp3`
        _writeFileSync9(_join9(tmpDir, filename), audioBuffer)
        const port = Number(process.env.PORT ?? 3001)
        audioUrl = `http://localhost:${port}/api/growth/recap/audio/${filename}`
        console.log(`[recap] Audio saved locally: /tmp/pebble-recaps/${filename}`)
      } catch (fsErr) {
        console.error('[recap] Local audio save failed:', fsErr instanceof Error ? fsErr.message : '')
      }
    }
  }

  const recapData = { script, audioUrl, generatedAt, weekStart }
  const awsRegion = process.env.AWS_REGION

  if (!awsRegion) {
    devRecapStore.set(userId, { ...recapData, userId })
    return res.status(200).json({ ok: true, offline: true, data: recapData })
  }

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb')
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
    await ddb.send(new PutCommand({
      TableName: RECAPS_TABLE,
      Item: {
        userId,
        weekStart,
        script,
        s3Key: audioUrl ? `recaps/${userId}/${weekStart}.mp3` : undefined,
        generatedAt,
        ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
    }))
    return res.status(200).json({ ok: true, offline: false, data: recapData })
  } catch (err) {
    console.error('[recap] DDB write failed:', err instanceof Error ? err.message : '')
    devRecapStore.set(userId, { ...recapData, userId })
    return res.status(200).json({ ok: true, offline: true, fallback: true, data: recapData })
  }
})

// GET /api/growth/weekly-recap/latest — fetch most recent recap
app.get('/api/growth/weekly-recap/latest', async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'anonymous'
  const awsRegion = process.env.AWS_REGION

  if (!awsRegion) {
    const stored = devRecapStore.get(userId)
    if (!stored) return res.status(200).json({ ok: true, offline: true, data: null })
    const { userId: _u, ...rest } = stored
    return res.status(200).json({ ok: true, offline: true, data: rest })
  }

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, QueryCommand } = await import('@aws-sdk/lib-dynamodb')
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
    const result = await ddb.send(new QueryCommand({
      TableName: RECAPS_TABLE,
      KeyConditionExpression: 'userId = :uid',
      ExpressionAttributeValues: { ':uid': userId },
      ScanIndexForward: false,
      Limit: 1,
    }))
    const item = result.Items?.[0]
    return res.status(200).json({ ok: true, offline: false, data: item ?? null })
  } catch (err) {
    console.error('[recap] DDB read failed:', err instanceof Error ? err.message : '')
    const stored = devRecapStore.get(userId)
    if (stored) {
      const { userId: _u, ...rest } = stored
      return res.status(200).json({ ok: true, offline: true, fallback: true, data: rest })
    }
    return res.status(200).json({ ok: true, offline: true, data: null })
  }
})

// Serve local recap audio files
app.get('/api/growth/recap/audio/:filename', (req: Request, res: Response) => {
  const filename = String(req.params.filename ?? '')
  if (!/^[\w\-.]+\.mp3$/.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' })
  }
  const filepath = _join9('/tmp', 'pebble-recaps', filename)
  res.setHeader('Content-Type', 'audio/mpeg')
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`)
  return res.sendFile(filepath)
})

const port = Number(process.env.PORT ?? 3001)

app.listen(port, () => {
  console.log(`Pebble backend running at http://localhost:${port}`)
})
