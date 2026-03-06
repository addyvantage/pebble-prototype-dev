import dotenv from 'dotenv'
import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'
import express, { type NextFunction, type Request, type Response } from 'express'
import { EventEmitter } from 'events'
import { createHmac } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { promises as fsp } from 'node:fs'
import pebbleHandler from '../api/pebble.ts'
import {
  decodeLambdaPayload,
  normalizeRunRequest,
  normalizeRunnerResponse,
  type RunLanguage,
  type RunnerResponse,
  type RunRequestBody,
} from './runnerShared.ts'
import { runCodeLocally } from './runnerLocal.ts'
import { enforceSafety } from './safety/policy.ts'
import { getSafetyMode } from './safety/guardrails.ts'
import { redactForLog } from './safety/redact.ts'
import { tracerMiddleware } from './observability/tracer.ts'
import { metricsStore } from './observability/metricsStore.ts'
import { toLegacyCodeLanguageId } from '../shared/languageRegistry.ts'

dotenv.config({ path: '.env.local' })

// ── Phase 4: Local SSE Mock ───────────────────────────────────────────────
export const liveEvents = new EventEmitter()

type PebbleReq = Parameters<typeof pebbleHandler>[0]
type PebbleRes = Parameters<typeof pebbleHandler>[1]

const app = express()
app.use(express.json())
const UPSTREAM_TIMEOUT_MS = 20_000

// ── Phase 8: Observability middleware ──────────────────────────────────
app.use(tracerMiddleware)

type RunnerMode = 'auto' | 'local' | 'remote'

function getRunnerMode(): RunnerMode {
  const mode = process.env.PEBBLE_RUNNER_MODE
  if (mode === 'local' || mode === 'remote') {
    return mode
  }
  return 'auto'
}

function hasRemoteRunnerConfig() {
  return Boolean(process.env.RUNNER_URL || (process.env.AWS_REGION && process.env.RUNNER_LAMBDA_NAME))
}

function shouldFallbackToLocal(result: RunnerResponse) {
  return (
    result.status === 'toolchain_unavailable'
    || result.status === 'internal_error'
    || result.status === 'validation_error'
  )
}

function inferRunnerErrorStatus(message: string): RunnerResponse['status'] {
  const text = message.toLowerCase()
  const toolchainSignals = [
    'runner not configured',
    'missing required env vars',
    'remote runner requires',
    'remote runner failed',
    'remote runner timed out',
    'runner lambda',
    'unsupported language',
    'python-only',
    'returned html instead of json',
    'failed to reach /api/run',
    'toolchain unavailable',
  ]
  return toolchainSignals.some((signal) => text.includes(signal))
    ? 'toolchain_unavailable'
    : 'internal_error'
}

async function runViaLambda(body: {
  language: RunLanguage
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
    const legacyLanguage = toLegacyCodeLanguageId(body.language)
    const invokePayload = {
      ...body,
      language: legacyLanguage,
      languageId: body.language,
    }

    const invokeResult = await client.send(
      new InvokeCommand({
        FunctionName: runnerLambdaName,
        InvocationType: 'RequestResponse',
        Payload: new TextEncoder().encode(JSON.stringify(invokePayload)),
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

async function runViaRunnerUrl(body: {
  language: RunLanguage
  code: string
  stdin: string
  timeoutMs: number
}) {
  const runnerUrlRaw = process.env.RUNNER_URL
  if (!runnerUrlRaw) {
    throw new Error('RUNNER_URL is not configured.')
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
      throw new Error(`Remote runner returned invalid JSON shape.${snippet ? ` Body: ${snippet}` : ''}`)
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
  const hasRemote = hasRemoteRunnerConfig()

  try {
    let result: RunnerResponse
    const useRemoteFirst = mode === 'remote' || (mode === 'auto' && hasRemote)

    if (!useRemoteFirst) {
      result = await runCodeLocally(normalized.value)
    } else {
      try {
        result = process.env.RUNNER_URL
          ? await runViaRunnerUrl(normalized.value)
          : await runViaLambda(normalized.value)
      } catch (error) {
        if (mode === 'remote') {
          throw error
        }
        const message = error instanceof Error ? error.message : 'Remote runner failed.'
        console.warn(`[dev-api] remote runner failed; falling back to local. reason=${message}`)
        result = await runCodeLocally(normalized.value)
      }

      if (mode === 'auto' && shouldFallbackToLocal(result)) {
        console.warn(`[dev-api] remote runner returned ${result.status}; retrying locally.`)
        result = await runCodeLocally(normalized.value)
      }
    }

    res.status(200).json(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Runner invoke failed.'
    res.status(502).json({
      ok: false,
      status: inferRunnerErrorStatus(message),
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
      executionMode: body.executionMode === 'function' ? 'function' : 'stdio',
      requiredSignature:
        typeof body.requiredSignature === 'string' && body.requiredSignature.trim().length > 0
          ? body.requiredSignature.trim().slice(0, 180)
          : undefined,
      detectedSignature:
        typeof body.detectedSignature === 'string' && body.detectedSignature.trim().length > 0
          ? body.detectedSignature.trim().slice(0, 180)
          : undefined,
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
const DEV_UPLOADS_ROOT = path.resolve(process.cwd(), 'server/uploads')
const DEV_AVATARS_ROOT = path.join(DEV_UPLOADS_ROOT, 'avatars')
const DEV_PROFILES_PATH = path.join(DEV_UPLOADS_ROOT, 'profiles.json')
const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
const USERNAME_COOLDOWN_DAYS = 30
const USERNAME_CLAIM_PREFIX = 'UNAME#'
const COGNITO_CLIENT_ID =
  process.env.COGNITO_CLIENT_ID ??
  process.env.VITE_COGNITO_CLIENT_ID ??
  ''
const COGNITO_USER_POOL_ID =
  process.env.COGNITO_USER_POOL_ID ??
  process.env.VITE_COGNITO_USER_POOL_ID ??
  ''
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET ?? ''

fs.mkdirSync(DEV_AVATARS_ROOT, { recursive: true })

type DevProfileRecord = Record<string, unknown>

function loadDevProfiles(): Map<string, DevProfileRecord> {
  try {
    if (!fs.existsSync(DEV_PROFILES_PATH)) {
      return new Map()
    }
    const raw = fs.readFileSync(DEV_PROFILES_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Record<string, DevProfileRecord>
    return new Map(Object.entries(parsed))
  } catch (err) {
    console.warn('[dev-api] Failed to load persisted dev profiles, starting empty store.', err)
    return new Map()
  }
}

async function persistDevProfiles(store: Map<string, DevProfileRecord>) {
  const payload = JSON.stringify(Object.fromEntries(store.entries()), null, 2)
  await fsp.mkdir(path.dirname(DEV_PROFILES_PATH), { recursive: true })
  await fsp.writeFile(DEV_PROFILES_PATH, payload, 'utf8')
}

function getDefaultProfile(
  identity: { userId: string; email: string; preferredUsername?: string; name?: string },
  nowIso: string,
): DevProfileRecord {
  const fallbackNameRaw =
    identity.preferredUsername
      || (identity.email ? identity.email.split('@')[0] : '')
      || ''
  const fallbackName = USERNAME_REGEX.test(fallbackNameRaw) ? fallbackNameRaw : ''
  return {
    userId: identity.userId,
    displayName: identity.name ?? fallbackName,
    username: fallbackName,
    usernameLower: fallbackName ? fallbackName.toLowerCase() : '',
    usernameSetAt: null,
    lastUsernameChangeAt: null,
    email: identity.email,
    bio: '',
    avatarKey: null,
    avatarUpdatedAt: null,
    role: ADMIN_EMAILS.includes(identity.email) ? 'admin' : 'user',
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

function usernameClaimKey(usernameLower: string) {
  return `${USERNAME_CLAIM_PREFIX}${usernameLower}`
}

function normalizeUsername(username: unknown) {
  if (typeof username !== 'string') return null
  const trimmed = username.trim()
  if (!USERNAME_REGEX.test(trimmed)) return null
  return trimmed
}

function normalizeEmail(email: unknown) {
  if (typeof email !== 'string') return ''
  return email.trim().toLowerCase()
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function getPasswordPolicyError(password: unknown) {
  if (typeof password !== 'string' || !password) {
    return 'Password is required'
  }
  if (password.length < 8) {
    return 'Password must be at least 8 characters'
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must include a lowercase letter'
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must include an uppercase letter'
  }
  if (!/[0-9]/.test(password)) {
    return 'Password must include a number'
  }
  return undefined
}

function getNextUsernameChangeAt(profile: DevProfileRecord) {
  const base = (profile.lastUsernameChangeAt ?? profile.usernameSetAt) as string | null | undefined
  if (!base) return null
  const changedAt = Date.parse(base)
  if (Number.isNaN(changedAt)) return null
  return changedAt + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
}

function getRemainingCooldownDays(profile: DevProfileRecord, nowMs = Date.now()) {
  const next = getNextUsernameChangeAt(profile)
  if (!next || next <= nowMs) return 0
  return Math.ceil((next - nowMs) / (24 * 60 * 60 * 1000))
}

function findDevProfileByUsernameLower(usernameLower: string) {
  const claim = devProfiles.get(usernameClaimKey(usernameLower))
  if (claim && typeof claim.ownerUserId === 'string') {
    const ownerProfile = devProfiles.get(claim.ownerUserId)
    if (ownerProfile) return { ownerUserId: claim.ownerUserId, profile: ownerProfile }
  }
  for (const [key, value] of devProfiles.entries()) {
    if (key.startsWith(USERNAME_CLAIM_PREFIX)) continue
    const lower = typeof value.usernameLower === 'string'
      ? value.usernameLower
      : typeof value.username === 'string'
        ? value.username.toLowerCase()
        : ''
    if (lower === usernameLower) {
      return { ownerUserId: key, profile: value }
    }
  }
  return null
}

async function lookupUsernameAvailabilityDev(normalized: string) {
  const usernameLower = normalized.toLowerCase()
  const awsRegion = process.env.AWS_REGION

  if (!awsRegion) {
    const exists = Boolean(findDevProfileByUsernameLower(usernameLower))
    return { available: !exists, ...(exists ? { reason: 'taken' as const } : {}) }
  }

  let ddbError: unknown = null
  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb')
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
    const claim = await client.send(
      new GetCommand({
        TableName: PROFILES_TABLE,
        Key: { userId: usernameClaimKey(usernameLower) },
      }),
    )
    if (claim.Item) {
      return { available: false, reason: 'taken' as const }
    }
  } catch (err) {
    ddbError = err
  }

  if (COGNITO_USER_POOL_ID) {
    try {
      const { CognitoIdentityProviderClient, ListUsersCommand } = await import('@aws-sdk/client-cognito-identity-provider')
      const cognito = new CognitoIdentityProviderClient({ region: awsRegion })
      const filterValue = normalized.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const result = await cognito.send(new ListUsersCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Limit: 1,
        Filter: `preferred_username = "${filterValue}"`,
      }))

      if ((result.Users?.length ?? 0) > 0) {
        return { available: false, reason: 'taken' as const }
      }

      return { available: true }
    } catch (err) {
      if (!ddbError) {
        ddbError = err
      }
    }
  }

  if (ddbError) {
    throw ddbError
  }

  return { available: true }
}

async function claimDevUsername(
  username: string,
  ownerUserId: string,
  ownerEmail: string,
  nowIso: string,
  previousUsernameLower?: string,
) {
  const usernameLower = username.toLowerCase()
  const existing = findDevProfileByUsernameLower(usernameLower)
  if (existing && existing.ownerUserId !== ownerUserId) {
    return { ok: false as const, error: 'Username is already taken' }
  }
  devProfiles.set(usernameClaimKey(usernameLower), {
    userId: usernameClaimKey(usernameLower),
    entityType: 'username_claim',
    usernameLower,
    username,
    ownerUserId,
    ownerEmail,
    updatedAt: nowIso,
  })
  if (previousUsernameLower && previousUsernameLower !== usernameLower) {
    devProfiles.delete(usernameClaimKey(previousUsernameLower))
  }
  await persistDevProfiles(devProfiles)
  return { ok: true as const }
}

function toUploadRelativeKey(key: string) {
  const cleaned = key.replace(/^\/+/, '')
  if (!cleaned.startsWith('avatars/')) {
    return null
  }
  const root = path.resolve(DEV_UPLOADS_ROOT)
  const resolved = path.resolve(DEV_UPLOADS_ROOT, cleaned)
  if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
    return null
  }
  return cleaned
}

function decodeJwtSegment(segment: string) {
  const normalized = segment.replace(/-/g, '+').replace(/_/g, '/')
  const padded = normalized + '='.repeat((4 - (normalized.length % 4 || 4)) % 4)
  return Buffer.from(padded, 'base64').toString()
}

function createSecretHash(username: string) {
  if (!COGNITO_CLIENT_SECRET || !COGNITO_CLIENT_ID) {
    return undefined
  }
  return createHmac('sha256', COGNITO_CLIENT_SECRET)
    .update(`${username}${COGNITO_CLIENT_ID}`)
    .digest('base64')
}

function resolveCognitoRegion() {
  if (process.env.AWS_REGION) {
    return process.env.AWS_REGION
  }
  const match = COGNITO_USER_POOL_ID.match(/^([a-z]{2}-[a-z]+-\d+)_/)
  return match?.[1]
}

function extractUserId(req: Request): { userId: string; email: string; preferredUsername?: string; name?: string } | null {
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
      const [, payloadSegment] = token.split('.')
      if (!payloadSegment) {
        return null
      }
      const payload = JSON.parse(decodeJwtSegment(payloadSegment)) as Record<string, string>
      if (typeof payload.sub !== 'string' || !payload.sub) {
        return null
      }
      return {
        userId: payload.sub,
        email: payload.email || payload['cognito:username'] || '',
        preferredUsername: payload.preferred_username || payload['cognito:username'],
        name: payload.name || payload.nickname || payload.preferred_username,
      }
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
// Local store for dev mode (no DynamoDB/S3): profiles persisted to JSON + avatars persisted on disk.
const devProfiles = loadDevProfiles()

app.use('/uploads', express.static(DEV_UPLOADS_ROOT, { fallthrough: true }))

app.get(['/api/username/available', '/api/auth/username-available'], async (req: Request, res: Response) => {
  const normalized = normalizeUsername(req.query.username)
  if (!normalized) {
    res.status(200).json({ available: false, reason: 'invalid' })
    return
  }

  try {
    const result = await lookupUsernameAvailabilityDev(normalized)
    res.status(200).json(result)
  } catch (err) {
    console.error('[dev-api] username availability lookup failed:', err)
    res.status(500).json({
      available: false,
      reason: 'error',
      error: 'Failed to check username availability',
    })
  }
})

app.get('/api/profile', async (req: Request, res: Response) => {
  const identity = extractUserId(req)
  if (!identity) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const awsRegion = process.env.AWS_REGION
  const nowIso = new Date().toISOString()

  if (!awsRegion) {
    const stored = devProfiles.get(identity.userId) ?? getDefaultProfile(identity, nowIso)
    const hydrated = {
      ...stored,
      displayName:
        typeof stored.displayName === 'string' && stored.displayName.trim()
          ? stored.displayName
          : typeof stored.username === 'string' && stored.username.trim()
            ? stored.username
            : identity.name || identity.preferredUsername || identity.email.split('@')[0] || 'Guest',
    }
    res.status(200).json(hydrated)
    return
  }

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, PutCommand } = await import('@aws-sdk/lib-dynamodb')
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
    const result = await client.send(
      new GetCommand({
        TableName: PROFILES_TABLE,
        Key: { userId: identity.userId },
      }),
    )
    let item = result.Item
    if (!item) {
      item = getDefaultProfile(identity, nowIso)
      await client.send(new PutCommand({ TableName: PROFILES_TABLE, Item: item }))
    }
    const hydrated = {
      ...item,
      displayName:
        typeof item.displayName === 'string' && item.displayName.trim()
          ? item.displayName
          : typeof item.username === 'string' && item.username.trim()
            ? item.username
            : identity.name || identity.preferredUsername || identity.email.split('@')[0] || 'Guest',
    }
    res.status(200).json(hydrated)
  } catch (err) {
    console.error('[dev-api] Failed to fetch profile from DynamoDB, using in-memory fallback:', err)
    const stored = devProfiles.get(identity.userId) ?? getDefaultProfile(identity, nowIso)
    res.status(200).json(stored)
  }
})

app.put('/api/profile', async (req: Request, res: Response) => {
  const identity = extractUserId(req)
  if (!identity) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const { username, bio, avatarKey } = req.body as {
    username?: unknown
    displayName?: unknown
    bio?: unknown
    avatarKey?: unknown
  }
  const displayName = typeof (req.body as { displayName?: unknown }).displayName === 'string'
    ? (req.body as { displayName?: string }).displayName?.trim()
    : undefined

  if (username !== undefined) {
    res.status(400).json({ error: 'Username updates require POST /api/profile/username' })
    return
  }
  if (displayName !== undefined && displayName.length > 48) {
    res.status(400).json({ error: 'Display name must be 48 chars or less' })
    return
  }
  if (bio !== undefined && (typeof bio !== 'string' || bio.length > 160)) {
    res.status(400).json({ error: 'Bio must be 160 chars or less' })
    return
  }
  if (avatarKey !== undefined && avatarKey !== null && typeof avatarKey !== 'string') {
    res.status(400).json({ error: 'Invalid avatar key' })
    return
  }

  const awsRegion = process.env.AWS_REGION
  const now = new Date().toISOString()

  if (!awsRegion) {
    const existing = devProfiles.get(identity.userId) ?? getDefaultProfile(identity, now)
    const updated = {
      ...existing,
      ...(displayName !== undefined ? { displayName } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(avatarKey !== undefined ? { avatarKey } : {}),
      ...(avatarKey !== undefined ? { avatarUpdatedAt: now } : {}),
      updatedAt: now,
    }
    devProfiles.set(identity.userId, updated)
    await persistDevProfiles(devProfiles)
    res.status(200).json(updated)
    return
  }

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, UpdateCommand } = await import('@aws-sdk/lib-dynamodb')
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))

    const expressionParts: string[] = ['#updatedAt = :updatedAt']
    const names: Record<string, string> = { '#updatedAt': 'updatedAt' }
    const values: Record<string, unknown> = { ':updatedAt': now }

    if (bio !== undefined) {
      expressionParts.push('#bio = :bio')
      names['#bio'] = 'bio'
      values[':bio'] = bio
    }
    if (displayName !== undefined) {
      expressionParts.push('#displayName = :displayName')
      names['#displayName'] = 'displayName'
      values[':displayName'] = displayName
    }
    if (avatarKey !== undefined) {
      expressionParts.push('#avatarKey = :avatarKey')
      names['#avatarKey'] = 'avatarKey'
      values[':avatarKey'] = avatarKey
      expressionParts.push('#avatarUpdatedAt = :avatarUpdatedAt')
      names['#avatarUpdatedAt'] = 'avatarUpdatedAt'
      values[':avatarUpdatedAt'] = now
    }

    await client.send(
      new UpdateCommand({
        TableName: PROFILES_TABLE,
        Key: { userId: identity.userId },
        UpdateExpression: `SET ${expressionParts.join(', ')}`,
        ExpressionAttributeNames: names,
        ExpressionAttributeValues: values,
      }),
    )

    res.status(200).json({ ok: true })
  } catch (err) {
    console.error('[dev-api] Failed to update profile in DynamoDB, using in-memory fallback:', err)
    const existing = devProfiles.get(identity.userId) ?? getDefaultProfile(identity, now)
    const updated = {
      ...existing,
      ...(displayName !== undefined ? { displayName } : {}),
      ...(bio !== undefined ? { bio } : {}),
      ...(avatarKey !== undefined ? { avatarKey } : {}),
      ...(avatarKey !== undefined ? { avatarUpdatedAt: now } : {}),
      updatedAt: now,
    }
    devProfiles.set(identity.userId, updated)
    await persistDevProfiles(devProfiles)
    res.status(200).json(updated)
  }
})

app.post('/api/profile/username', async (req: Request, res: Response) => {
  const identity = extractUserId(req)
  if (!identity) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const normalized = normalizeUsername((req.body as { username?: unknown }).username)
  if (!normalized) {
    res.status(400).json({ error: 'Username must be 3–20 chars, letters/numbers/underscore only' })
    return
  }

  const usernameLower = normalized.toLowerCase()
  const awsRegion = process.env.AWS_REGION
  const nowIso = new Date().toISOString()

  if (!awsRegion) {
    const existing = (devProfiles.get(identity.userId) ?? getDefaultProfile(identity, nowIso)) as DevProfileRecord
    const currentUsernameLower = typeof existing.usernameLower === 'string'
      ? existing.usernameLower
      : typeof existing.username === 'string'
        ? existing.username.toLowerCase()
        : ''
    if (currentUsernameLower !== usernameLower) {
      const remaining = getRemainingCooldownDays(existing)
      if ((existing.lastUsernameChangeAt || existing.usernameSetAt) && remaining > 0) {
        res.status(429).json({ error: `You can change again in ${remaining} day${remaining === 1 ? '' : 's'}`, reason: 'cooldown', daysRemaining: remaining })
        return
      }
      const claimResult = await claimDevUsername(normalized, identity.userId, identity.email, nowIso, currentUsernameLower || undefined)
      if (!claimResult.ok) {
        res.status(409).json({ error: 'Username is already taken', reason: 'taken' })
        return
      }
    }
    const updated = {
      ...existing,
      username: normalized,
      usernameLower,
      usernameSetAt: existing.usernameSetAt ?? nowIso,
      lastUsernameChangeAt: nowIso,
      updatedAt: nowIso,
    }
    devProfiles.set(identity.userId, updated)
    await persistDevProfiles(devProfiles)
    res.status(200).json(updated)
    return
  }

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const {
      DynamoDBDocumentClient,
      GetCommand,
      PutCommand,
      UpdateCommand,
      DeleteCommand,
    } = await import('@aws-sdk/lib-dynamodb')
    const client = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))

    const existingRes = await client.send(new GetCommand({ TableName: PROFILES_TABLE, Key: { userId: identity.userId } }))
    const existing = (existingRes.Item ?? getDefaultProfile(identity, nowIso)) as DevProfileRecord
    const currentUsernameLower = typeof existing.usernameLower === 'string'
      ? existing.usernameLower
      : typeof existing.username === 'string'
        ? existing.username.toLowerCase()
        : ''

    if (currentUsernameLower !== usernameLower) {
      const remaining = getRemainingCooldownDays(existing)
      if ((existing.lastUsernameChangeAt || existing.usernameSetAt) && remaining > 0) {
        res.status(429).json({ error: `You can change again in ${remaining} day${remaining === 1 ? '' : 's'}`, reason: 'cooldown', daysRemaining: remaining })
        return
      }

      await client.send(
        new PutCommand({
          TableName: PROFILES_TABLE,
          Item: {
            userId: usernameClaimKey(usernameLower),
            entityType: 'username_claim',
            ownerUserId: identity.userId,
            ownerEmail: identity.email,
            username: normalized,
            usernameLower,
            updatedAt: nowIso,
          },
          ConditionExpression: 'attribute_not_exists(userId)',
        }),
      )
      if (currentUsernameLower) {
        await client.send(
          new DeleteCommand({
            TableName: PROFILES_TABLE,
            Key: { userId: usernameClaimKey(currentUsernameLower) },
          }),
        )
      }
    }

    await client.send(
      new UpdateCommand({
        TableName: PROFILES_TABLE,
        Key: { userId: identity.userId },
        UpdateExpression: 'SET #username = :username, #usernameLower = :usernameLower, #usernameSetAt = if_not_exists(#usernameSetAt, :now), #lastUsernameChangeAt = :now, #updatedAt = :now',
        ExpressionAttributeNames: {
          '#username': 'username',
          '#usernameLower': 'usernameLower',
          '#usernameSetAt': 'usernameSetAt',
          '#lastUsernameChangeAt': 'lastUsernameChangeAt',
          '#updatedAt': 'updatedAt',
        },
        ExpressionAttributeValues: {
          ':username': normalized,
          ':usernameLower': usernameLower,
          ':now': nowIso,
        },
      }),
    )
    const refreshed = await client.send(new GetCommand({ TableName: PROFILES_TABLE, Key: { userId: identity.userId } }))
    res.status(200).json(refreshed.Item ?? {})
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      res.status(409).json({ error: 'Username is already taken', reason: 'taken' })
      return
    }
    console.error('[dev-api] Failed username update:', err)
    res.status(500).json({ error: 'Failed to update username' })
  }
})

app.post('/api/auth/signup', async (req: Request, res: Response) => {
  const { email, password, username } = req.body as { email?: unknown; password?: unknown; username?: unknown }
  const normalizedEmail = normalizeEmail(email)
  const normalizedUsername = normalizeUsername(username)
  const passwordError = getPasswordPolicyError(password)
  if (!normalizedEmail || !isValidEmail(normalizedEmail) || passwordError || !normalizedUsername) {
    res.status(400).json({ error: 'Invalid signup payload' })
    return
  }
  const usernameLower = normalizedUsername.toLowerCase()
  const awsRegion = resolveCognitoRegion()
  if (!awsRegion || !COGNITO_CLIENT_ID) {
    res.status(500).json({
      error: 'Signup is not configured. Set COGNITO_CLIENT_ID and AWS_REGION (or COGNITO_USER_POOL_ID).',
      code: 'AuthNotConfigured',
    })
    return
  }

  try {
    const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
    const { DynamoDBDocumentClient, GetCommand, PutCommand } = await import('@aws-sdk/lib-dynamodb')
    const { CognitoIdentityProviderClient, SignUpCommand } = await import('@aws-sdk/client-cognito-identity-provider')
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))

    const availability = await lookupUsernameAvailabilityDev(normalizedUsername)
    if (!availability.available) {
      res.status(409).json({ error: 'Username is already taken', reason: 'taken' })
      return
    }

    const cognito = new CognitoIdentityProviderClient({ region: awsRegion })
    const secretHash = createSecretHash(normalizedEmail)
    const signUpResp = await cognito.send(
      new SignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: normalizedEmail,
        Password: password,
        ...(secretHash ? { SecretHash: secretHash } : {}),
        UserAttributes: [
          { Name: 'email', Value: normalizedEmail },
          { Name: 'preferred_username', Value: normalizedUsername },
          { Name: 'name', Value: normalizedUsername },
        ],
      }),
    )
    const userId = signUpResp.UserSub
    if (!userId) {
      res.status(500).json({ error: 'Signup failed' })
      return
    }
    const nowIso = new Date().toISOString()
    await ddb.send(
      new PutCommand({
        TableName: PROFILES_TABLE,
        Item: {
          userId: usernameClaimKey(usernameLower),
          entityType: 'username_claim',
          ownerUserId: userId,
          ownerEmail: normalizedEmail,
          username: normalizedUsername,
          usernameLower,
          updatedAt: nowIso,
        },
        ConditionExpression: 'attribute_not_exists(userId)',
      }),
    )
    await ddb.send(
      new PutCommand({
        TableName: PROFILES_TABLE,
        Item: {
          userId,
          username: normalizedUsername,
          usernameLower,
          displayName: normalizedUsername,
          usernameSetAt: nowIso,
          lastUsernameChangeAt: nowIso,
          email: normalizedEmail,
          bio: '',
          avatarKey: null,
          avatarUpdatedAt: null,
          role: ADMIN_EMAILS.includes(normalizedEmail) ? 'admin' : 'user',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        ConditionExpression: 'attribute_not_exists(userId)',
      }),
    )
    res.status(200).json({
      ok: true,
      userSub: userId,
      requiresConfirmation: !Boolean(signUpResp.UserConfirmed),
      delivery: signUpResp.CodeDeliveryDetails
        ? {
            destination: signUpResp.CodeDeliveryDetails.Destination ?? null,
            medium: signUpResp.CodeDeliveryDetails.DeliveryMedium ?? null,
          }
        : null,
    })
  } catch (err: any) {
    if (COGNITO_USER_POOL_ID && normalizedEmail && err?.name !== 'UsernameExistsException') {
      try {
        const { CognitoIdentityProviderClient, AdminDeleteUserCommand } = await import('@aws-sdk/client-cognito-identity-provider')
        const cognito = new CognitoIdentityProviderClient({ region: awsRegion })
        await cognito.send(new AdminDeleteUserCommand({
          UserPoolId: COGNITO_USER_POOL_ID,
          Username: normalizedEmail,
        }))
      } catch {
        // best-effort cleanup only
      }
    }
    if (err?.name === 'ConditionalCheckFailedException') {
      res.status(409).json({ error: 'Username is already taken', reason: 'taken' })
      return
    }
    if (err?.name === 'UsernameExistsException') {
      res.status(409).json({ error: 'Account already exists. Try signing in instead.', code: 'UsernameExistsException' })
      return
    }
    if (err?.name === 'InvalidPasswordException') {
      res.status(400).json({
        error: 'Password does not meet Cognito policy. Use at least 8 characters with upper/lowercase and a number.',
        code: 'InvalidPasswordException',
      })
      return
    }
    if (err?.name === 'InvalidParameterException') {
      res.status(400).json({ error: err?.message ?? 'Invalid signup parameters', code: 'InvalidParameterException' })
      return
    }
    if (err?.name === 'NotAuthorizedException' && String(err?.message ?? '').toLowerCase().includes('secret hash')) {
      res.status(500).json({
        error: 'Cognito app client requires a client secret. Set COGNITO_CLIENT_SECRET on the backend.',
        code: 'MissingClientSecret',
      })
      return
    }
    console.error('[dev-api] Signup failed:', err)
    res.status(500).json({ error: err?.message ?? 'Signup failed', code: err?.name ?? 'SignupFailed' })
  }
})

app.post('/api/auth/login', async (req: Request, res: Response) => {
  const { identifier, password } = req.body as { identifier?: unknown; password?: unknown }
  const normalizedIdentifier = typeof identifier === 'string' ? identifier.trim() : ''
  if (!normalizedIdentifier || typeof password !== 'string' || !password) {
    res.status(400).json({ error: 'Invalid login payload' })
    return
  }

  const awsRegion = resolveCognitoRegion()
  if (!awsRegion || !COGNITO_CLIENT_ID) {
    res.status(500).json({
      error: 'Login is not configured. Set COGNITO_CLIENT_ID and AWS_REGION (or COGNITO_USER_POOL_ID).',
      code: 'AuthNotConfigured',
    })
    return
  }

  try {
    let loginEmail = normalizedIdentifier
    if (!normalizedIdentifier.includes('@')) {
      const lower = normalizedIdentifier.toLowerCase()
      const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
      const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb')
      const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
      const claim = await ddb.send(new GetCommand({ TableName: PROFILES_TABLE, Key: { userId: usernameClaimKey(lower) } }))
      const ownerUserId = claim.Item?.ownerUserId
      if (typeof ownerUserId !== 'string') {
        res.status(401).json({ error: 'Invalid username/email or password' })
        return
      }
      const profile = await ddb.send(new GetCommand({ TableName: PROFILES_TABLE, Key: { userId: ownerUserId } }))
      const email = profile.Item?.email
      if (typeof email !== 'string' || !email) {
        res.status(401).json({ error: 'Invalid username/email or password' })
        return
      }
      loginEmail = email
    }

    const { CognitoIdentityProviderClient, InitiateAuthCommand } = await import('@aws-sdk/client-cognito-identity-provider')
    const cognito = new CognitoIdentityProviderClient({ region: awsRegion })
    const secretHash = createSecretHash(loginEmail)
    const authResult = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: loginEmail,
          PASSWORD: password,
          ...(secretHash ? { SECRET_HASH: secretHash } : {}),
        },
      }),
    )

    if (!authResult.AuthenticationResult?.IdToken) {
      res.status(401).json({ error: 'Invalid username/email or password' })
      return
    }

    res.status(200).json({
      idToken: authResult.AuthenticationResult.IdToken,
      accessToken: authResult.AuthenticationResult.AccessToken,
      refreshToken: authResult.AuthenticationResult.RefreshToken,
      expiresIn: authResult.AuthenticationResult.ExpiresIn,
      tokenType: authResult.AuthenticationResult.TokenType,
    })
  } catch (err: any) {
    const errorName = err?.name ?? ''
    if (errorName === 'UserNotConfirmedException') {
      res.status(401).json({
        error: 'Account not verified. Enter the code sent to your email.',
        code: 'UserNotConfirmedException',
        verificationEmail: loginEmail,
      })
      return
    }
    if (errorName === 'NotAuthorizedException' && String(err?.message ?? '').toLowerCase().includes('secret hash')) {
      res.status(500).json({
        error: 'Cognito app client requires a client secret. Set COGNITO_CLIENT_SECRET on the backend.',
        code: 'MissingClientSecret',
      })
      return
    }
    res.status(401).json({ error: 'Invalid username/email or password', code: errorName || 'AuthFailed' })
  }
})

app.post('/api/auth/confirm-signup', async (req: Request, res: Response) => {
  const { email, code } = req.body as { email?: unknown; code?: unknown }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  const confirmationCode = typeof code === 'string' ? code.trim() : ''
  if (!normalizedEmail || !confirmationCode) {
    res.status(400).json({ error: 'Email and verification code are required' })
    return
  }

  const awsRegion = resolveCognitoRegion()
  if (!awsRegion || !COGNITO_CLIENT_ID) {
    res.status(500).json({
      error: 'Verification is not configured. Set COGNITO_CLIENT_ID and AWS_REGION (or COGNITO_USER_POOL_ID).',
      code: 'AuthNotConfigured',
    })
    return
  }

  try {
    const { CognitoIdentityProviderClient, ConfirmSignUpCommand } = await import('@aws-sdk/client-cognito-identity-provider')
    const cognito = new CognitoIdentityProviderClient({ region: awsRegion })
    const secretHash = createSecretHash(normalizedEmail)
    await cognito.send(new ConfirmSignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: normalizedEmail,
      ConfirmationCode: confirmationCode,
      ...(secretHash ? { SecretHash: secretHash } : {}),
    }))
    res.status(200).json({ ok: true })
  } catch (err: any) {
    const codeName = err?.name ?? 'ConfirmSignUpFailed'
    if (codeName === 'CodeMismatchException') {
      res.status(400).json({ error: 'Incorrect code. Please try again.', code: codeName })
      return
    }
    if (codeName === 'ExpiredCodeException') {
      res.status(400).json({ error: 'Verification code expired. Request a new code.', code: codeName })
      return
    }
    if (codeName === 'NotAuthorizedException' && String(err?.message ?? '').toLowerCase().includes('already confirmed')) {
      res.status(200).json({ ok: true, alreadyConfirmed: true })
      return
    }
    res.status(400).json({ error: err?.message ?? 'Verification failed', code: codeName })
  }
})

app.post('/api/auth/resend-signup-code', async (req: Request, res: Response) => {
  const { email } = req.body as { email?: unknown }
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : ''
  if (!normalizedEmail) {
    res.status(400).json({ error: 'Email is required' })
    return
  }
  const awsRegion = resolveCognitoRegion()
  if (!awsRegion || !COGNITO_CLIENT_ID) {
    res.status(500).json({
      error: 'Verification resend is not configured. Set COGNITO_CLIENT_ID and AWS_REGION (or COGNITO_USER_POOL_ID).',
      code: 'AuthNotConfigured',
    })
    return
  }

  try {
    const { CognitoIdentityProviderClient, ResendConfirmationCodeCommand } = await import('@aws-sdk/client-cognito-identity-provider')
    const cognito = new CognitoIdentityProviderClient({ region: awsRegion })
    const secretHash = createSecretHash(normalizedEmail)
    await cognito.send(new ResendConfirmationCodeCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: normalizedEmail,
      ...(secretHash ? { SecretHash: secretHash } : {}),
    }))
    res.status(200).json({ ok: true })
  } catch (err: any) {
    res.status(400).json({ error: err?.message ?? 'Failed to resend code', code: err?.name ?? 'ResendFailed' })
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
    const uploadUrl = `/api/dev-upload-stub?key=${encodeURIComponent(key)}`
    res.status(200).json({ uploadUrl, key, avatarKey: key })
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
    res.status(200).json({ uploadUrl, key, avatarKey: key })
  } catch (err) {
    console.error('[dev-api] Failed to generate presigned URL:', err)
    res.status(500).json({ error: 'Failed to generate upload URL' })
  }
})

app.get('/api/avatar/url', async (req: Request, res: Response) => {
  const identity = extractUserId(req)
  if (!identity) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }

  const key = String(req.query.key ?? '')
  if (!key) {
    res.status(400).json({ error: 'Missing avatar key' })
    return
  }
  if (!key.startsWith(`avatars/${identity.userId}/`)) {
    res.status(401).json({ error: 'Unauthorized avatar key' })
    return
  }

  const awsRegion = process.env.AWS_REGION
  if (!awsRegion || !AVATARS_BUCKET) {
    const localKey = toUploadRelativeKey(key)
    if (!localKey) {
      res.status(400).json({ error: 'Invalid avatar key' })
      return
    }
    const localPath = path.join(DEV_UPLOADS_ROOT, localKey)
    try {
      await fsp.access(localPath, fs.constants.R_OK)
    } catch {
      res.status(404).json({ error: 'Avatar not found' })
      return
    }
    res.status(200).json({ url: `/uploads/${localKey}` })
    return
  }

  try {
    const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
    const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
    const s3 = new S3Client({ region: awsRegion })
    const url = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: AVATARS_BUCKET, Key: key }),
      { expiresIn: 3600 },
    )
    res.status(200).json({ url })
  } catch (err) {
    console.error('[dev-api] Failed to generate avatar GET URL:', err)
    res.status(500).json({ error: 'Failed to generate avatar URL' })
  }
})

// ── Dev avatar upload stub (offline / no-S3 mode) ────────────────────────────
// Accepts PUT uploads and persists image bytes to disk under server/uploads.
// Must stay under /api/ so Vite proxy forwards requests from localhost:5173.
app.put('/api/dev-upload-stub', express.raw({ type: '*/*', limit: '10mb' }), async (req: Request, res: Response) => {
  const key = String(req.query.key ?? '')
  if (!key) {
    res.status(400).json({ error: 'Missing avatar key' })
    return
  }
  const relativeKey = toUploadRelativeKey(key)
  if (!relativeKey) {
    res.status(400).json({ error: 'Invalid avatar key' })
    return
  }
  const body = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0)
  const absolutePath = path.join(DEV_UPLOADS_ROOT, relativeKey)
  await fsp.mkdir(path.dirname(absolutePath), { recursive: true })
  await fsp.writeFile(absolutePath, body)
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
  const {
    problemId = 'unknown',
    problemTitle,
    difficulty,
    language,
    userId: requestUserId = 'guest',
    userName: requestUserName = 'Guest',
    userEmail: requestUserEmail = '',
    avatarUrl: requestAvatarUrl = null,
    sessionId = 'local',
  } = req.body || {}

  const identity = extractUserId(req)
  const awsRegion = process.env.AWS_REGION
  const effectiveUserId = identity?.userId ?? requestUserId
  let effectiveUserName = String(requestUserName ?? '').trim()
  let effectiveUserEmail = String(requestUserEmail ?? '').trim()
  let effectiveAvatarUrl = typeof requestAvatarUrl === 'string' ? requestAvatarUrl : null

  if (identity) {
    try {
      if (!awsRegion) {
        const profile = devProfiles.get(identity.userId)
        if (profile) {
          const displayName = typeof profile.displayName === 'string' ? profile.displayName.trim() : ''
          const username = typeof profile.username === 'string' ? profile.username.trim() : ''
          const email = typeof profile.email === 'string' ? profile.email.trim() : ''
          const avatarKey = typeof profile.avatarKey === 'string' ? profile.avatarKey : null
          effectiveUserName = displayName || username || effectiveUserName
          effectiveUserEmail = email || effectiveUserEmail
          if (!effectiveAvatarUrl && avatarKey) {
            const relativeKey = toUploadRelativeKey(avatarKey)
            if (relativeKey) {
              const port = Number(process.env.PORT ?? 3001)
              effectiveAvatarUrl = `http://localhost:${port}/uploads/${relativeKey}`
            }
          }
        }
      } else {
        const { DynamoDBClient } = await import('@aws-sdk/client-dynamodb')
        const { DynamoDBDocumentClient, GetCommand } = await import('@aws-sdk/lib-dynamodb')
        const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
        const profileRes = await ddb.send(new GetCommand({ TableName: PROFILES_TABLE, Key: { userId: identity.userId } }))
        const profile = profileRes.Item as Record<string, unknown> | undefined
        if (profile) {
          const displayName = typeof profile.displayName === 'string' ? profile.displayName.trim() : ''
          const username = typeof profile.username === 'string' ? profile.username.trim() : ''
          const email = typeof profile.email === 'string' ? profile.email.trim() : ''
          effectiveUserName = displayName || username || effectiveUserName
          effectiveUserEmail = email || effectiveUserEmail
        }
      }
    } catch (profileErr) {
      console.warn('[report] Failed to hydrate profile identity for report payload.', profileErr)
    }
  }

  if (!effectiveUserName) {
    effectiveUserName =
      identity?.name?.trim()
      || identity?.preferredUsername?.trim()
      || effectiveUserEmail.split('@')[0]
      || 'Guest'
  }

  const sanitizeForFilename = (value: string, fallback: string, maxLen = 32) => {
    const slug = String(value ?? '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, maxLen)
    return slug || fallback
  }
  const safeUserSlug = sanitizeForFilename(effectiveUserName || effectiveUserId, 'guest')
  const safeProblemSlug = sanitizeForFilename(problemId, 'problem', 40)
  const dateStamp = new Date().toISOString().slice(0, 10)
  const downloadFilename = `PebbleRecoveryReport_${safeUserSlug}_${safeProblemSlug}_${dateStamp}.pdf`

  try {
    // Build the report from an empty event array (real events would come from DDB rollup)
    // In a real deployment the Lambda would query the pebble-events-rollup table
    const mockEvents = [
      { eventName: 'run.completed', timestamp: new Date().toISOString(), runtimeMs: 3200, errorType: 'wrong_answer' },
      { eventName: 'run.completed', timestamp: new Date().toISOString(), runtimeMs: 2100, errorType: 'wrong_answer' },
      { eventName: 'submit.completed', timestamp: new Date().toISOString(), runtimeMs: 1400, accepted: true, tierUsed: 'T2' },
    ]

    const report = buildRecoveryReport({
      userId: effectiveUserId,
      userName: effectiveUserName,
      userEmail: effectiveUserEmail,
      userAvatarUrl: effectiveAvatarUrl,
      sessionId,
      problemId,
      problemTitle: typeof problemTitle === 'string' ? problemTitle : undefined,
      difficulty: typeof difficulty === 'string' ? difficulty : undefined,
      language: typeof language === 'string' ? language : undefined,
      events: mockEvents,
    })
    const pdfBuffer = await generateReportPdf(report)

    const reportsBucket = process.env.REPORTS_BUCKET_NAME

    if (awsRegion && reportsBucket) {
      try {
        const { S3Client, PutObjectCommand, GetObjectCommand } = await import('@aws-sdk/client-s3')
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
        const s3 = new S3Client({ region: awsRegion })
        const key = `pebble-session-reports/${effectiveUserId}/${sessionId}.pdf`
        await s3.send(new PutObjectCommand({
          Bucket: reportsBucket,
          Key: key,
          Body: pdfBuffer,
          ContentType: 'application/pdf',
        }))
        const reportUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({
            Bucket: reportsBucket,
            Key: key,
            ResponseContentType: 'application/pdf',
            ResponseContentDisposition: `attachment; filename="${downloadFilename}"`,
          }),
          { expiresIn: 3600 },
        )
        return res.status(200).json({ ok: true, reportUrl, expiresIn: 3600, filename: downloadFilename })
      } catch (s3Err) {
        console.error('[report] S3 upload failed, falling back to local', s3Err)
      }
    }

    // Local fallback: write PDF to /tmp/reports/
    const tmpDir = join('/tmp', 'pebble-reports')
    mkdirSync(tmpDir, { recursive: true })
    const filename = downloadFilename
    const filepath = join(tmpDir, filename)
    writeFileSync(filepath, pdfBuffer)

    console.log(`[report] PDF saved locally: ${filepath}`)
    return res.status(200).json({
      ok: true,
      reportUrl: `http://localhost:${process.env.PORT ?? 3001}/api/report/download/${filename}`,
      expiresIn: 3600,
      filename: downloadFilename,
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
import { buildRecapNarrative, isScriptSafe } from './phase9/recapBuilder.ts'
import type { RecapSummary, RecapTone } from './phase9/recapBuilder.ts'
import { buildRecapSsml } from './phase9/recapSsml.ts'
import { generateRecapAudio } from './phase9/pollyClient.ts'
import type { RecapAudioDecision } from './phase9/pollyClient.ts'
import { normalizeAppLanguageCode, type AppLanguageCode, type RecapVoiceMode } from '../shared/recapVoice.ts'
import { mkdirSync as _mkdirSync9, writeFileSync as _writeFileSync9 } from 'fs'
import { join as _join9 } from 'path'

const RISK_TABLE = process.env.RISK_PREDICTIONS_TABLE_NAME || 'PebbleRiskPredictions-dev'
const RECAPS_TABLE = process.env.WEEKLY_RECAPS_TABLE_NAME || 'PebbleWeeklyRecaps-dev'
const RECAP_AUDIO_BUCKET = process.env.RECAP_AUDIO_BUCKET_NAME || ''

// In-memory stores for offline dev
const devRiskStore = new Map<string, RiskResult & { weekStart: string; userId: string }>()
type StoredRecapData = {
  script: string
  audioUrl?: string
  generatedAt: string
  weekStart: string
  tone: RecapTone
  usedHumor: boolean
  playback: RecapAudioDecision
  userId: string
}

type RecapVoiceInput = {
  mode: RecapVoiceMode
  preferredPollyVoiceId?: string | null
  preferredBrowserVoiceURI?: string | null
}

const DEFAULT_RECAP_PLAYBACK: RecapAudioDecision = {
  mode: 'auto',
  provider: 'device',
  appLanguage: 'en',
  locale: 'en-US',
  reason: 'no_audio_generated',
}

const devRecapStore = new Map<string, StoredRecapData>()

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
  const num = (k: string, fallback?: number) => {
    const value = b[k]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    return fallback
  }
  const text = (k: string, maxLength: number) => {
    const value = b[k]
    if (typeof value !== 'string') return undefined
    const cleaned = value.trim().slice(0, maxLength)
    return cleaned.length > 0 ? cleaned : undefined
  }
  const trend = b.trendDirection
  if (trend !== 'improving' && trend !== 'stable' && trend !== 'worsening') return null
  const solvesLast7 = num('solvesLast7')
  const daysActiveLast7 = num('daysActiveLast7')
  const streakDays = num('streakDays')
  if (
    typeof solvesLast7 !== 'number'
    || typeof daysActiveLast7 !== 'number'
    || typeof streakDays !== 'number'
  ) {
    return null
  }
  const struggle = text('biggestStruggle', 80) ?? null
  const hardestSolvedDifficultyRaw = text('hardestSolvedDifficulty', 16)
  const hardestSolvedDifficulty = (
    hardestSolvedDifficultyRaw === 'easy'
    || hardestSolvedDifficultyRaw === 'medium'
    || hardestSolvedDifficultyRaw === 'hard'
  )
    ? hardestSolvedDifficultyRaw
    : null
  return {
    appLanguage: normalizeAppLanguageCode(text('appLanguage', 8)),
    trackLanguage: text('trackLanguage', 24),
    userName: text('userName', 64) ?? null,
    solvesLast7,
    solvesDelta: num('solvesDelta'),
    daysActiveLast7,
    streakDays,
    streakDelta: num('streakDelta'),
    biggestStruggle: struggle,
    trendDirection: trend,
    attemptsLast7: num('attemptsLast7'),
    passRateLast7: num('passRateLast7'),
    passRateDelta: num('passRateDelta'),
    guidanceReliancePct: num('guidanceReliancePct'),
    guidanceRelianceDeltaPct: num('guidanceRelianceDeltaPct'),
    avgRecoveryTimeSec: num('avgRecoveryTimeSec'),
    avgRecoveryTimeDeltaSec: num('avgRecoveryTimeDeltaSec'),
    hardestSolvedDifficulty,
  }
}

function validateRecapVoiceInput(body: unknown): RecapVoiceInput {
  if (!body || typeof body !== 'object') {
    return { mode: 'auto' }
  }
  const value = body as Record<string, unknown>
  const rawMode = value.mode
  const mode: RecapVoiceMode =
    rawMode === 'auto' || rawMode === 'polly' || rawMode === 'device'
      ? rawMode
      : 'auto'

  const preferredPollyVoiceId = typeof value.preferredPollyVoiceId === 'string'
    ? value.preferredPollyVoiceId.trim().slice(0, 64) || null
    : null
  const preferredBrowserVoiceURI = typeof value.preferredBrowserVoiceURI === 'string'
    ? value.preferredBrowserVoiceURI.trim().slice(0, 200) || null
    : null

  return {
    mode,
    preferredPollyVoiceId,
    preferredBrowserVoiceURI,
  }
}

function resolveRecapPlayback(item: Record<string, unknown>): RecapAudioDecision {
  const playbackRaw = item.playback
  if (!playbackRaw || typeof playbackRaw !== 'object') {
    return DEFAULT_RECAP_PLAYBACK
  }
  const playback = playbackRaw as Record<string, unknown>
  const modeRaw = playback.mode
  const providerRaw = playback.provider
  const appLanguageRaw = playback.appLanguage
  const localeRaw = playback.locale
  const mode: RecapVoiceMode = modeRaw === 'auto' || modeRaw === 'polly' || modeRaw === 'device'
    ? modeRaw
    : 'auto'
  const provider: 'polly' | 'device' = providerRaw === 'polly' ? 'polly' : 'device'
  const appLanguage: AppLanguageCode = normalizeAppLanguageCode(appLanguageRaw)
  const locale = typeof localeRaw === 'string' && localeRaw.trim()
    ? localeRaw
    : 'en-US'
  return {
    mode,
    provider,
    appLanguage,
    locale,
    pollyVoiceId: typeof playback.pollyVoiceId === 'string' ? playback.pollyVoiceId : undefined,
    pollyLanguageCode: typeof playback.pollyLanguageCode === 'string' ? playback.pollyLanguageCode : undefined,
    preferredBrowserVoiceURI:
      typeof playback.preferredBrowserVoiceURI === 'string' ? playback.preferredBrowserVoiceURI : undefined,
    reason: typeof playback.reason === 'string' ? playback.reason : undefined,
  }
}

// POST /api/growth/weekly-recap — generate and store a weekly recap
app.post('/api/growth/weekly-recap', async (req: Request, res: Response) => {
  const userId = (req.headers['x-user-id'] as string) || 'anonymous'

  const body = (req.body as Record<string, unknown>) ?? {}
  const rawSummary = body.summary
  const summary = validateRecapSummary(rawSummary)
  if (!summary) {
    return res.status(400).json({ error: 'Invalid or missing summary payload' })
  }
  const voice = validateRecapVoiceInput(body.voice)

  console.log(`[recap] Generating for userId="${userId}" mode=${process.env.RECAP_MODE ?? 'auto'}`)

  const narrative = buildRecapNarrative(summary)
  const script = narrative.script
  if (!isScriptSafe(script)) {
    console.error('[recap] Script failed safety check — blocked')
    return res.status(400).json({ error: 'Recap script failed safety check' })
  }
  const ssml = buildRecapSsml({
    script,
    tone: narrative.tone,
  })

  const weekStart = currentWeekStart()
  const generatedAt = new Date().toISOString()
  let audioUrl: string | undefined
  let s3AudioKey: string | undefined

  // Try Polly when requested/supported; otherwise frontend uses browser speech.
  const audioOutput = await generateRecapAudio({
    script,
    ssml,
    appLanguage: normalizeAppLanguageCode(summary.appLanguage),
    mode: voice.mode,
    preferredPollyVoiceId: voice.preferredPollyVoiceId,
    preferredBrowserVoiceURI: voice.preferredBrowserVoiceURI,
  })
  const { audioBuffer } = audioOutput
  let playback: RecapAudioDecision = audioOutput.decision

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
        s3AudioKey = audioKey
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

  if (audioBuffer && !audioUrl) {
    playback = {
      ...playback,
      provider: 'device',
      reason: 'polly_audio_storage_unavailable',
    }
  }

  const recapData = {
    script,
    audioUrl,
    generatedAt,
    weekStart,
    tone: narrative.tone,
    usedHumor: narrative.usedHumor,
    playback,
  }
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
        s3Key: s3AudioKey,
        playback,
        tone: narrative.tone,
        usedHumor: narrative.usedHumor,
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
    if (!item || typeof item !== 'object') {
      return res.status(200).json({ ok: true, offline: false, data: null })
    }

    const record = item as Record<string, unknown>
    const weekStart = typeof record.weekStart === 'string' ? record.weekStart : currentWeekStart()
    const script = typeof record.script === 'string' ? record.script : ''
    const generatedAt = typeof record.generatedAt === 'string' ? record.generatedAt : new Date().toISOString()
    const tone = (record.tone === 'celebratory'
      || record.tone === 'encouraging'
      || record.tone === 'reflective'
      || record.tone === 'empathetic'
      || record.tone === 'determined')
      ? record.tone
      : 'encouraging'
    const usedHumor = typeof record.usedHumor === 'boolean' ? record.usedHumor : false

    let audioUrl: string | undefined
    const s3Key = typeof record.s3Key === 'string' ? record.s3Key : undefined
    if (s3Key && RECAP_AUDIO_BUCKET) {
      try {
        const { S3Client, GetObjectCommand } = await import('@aws-sdk/client-s3')
        const { getSignedUrl } = await import('@aws-sdk/s3-request-presigner')
        const s3 = new S3Client({ region: awsRegion })
        audioUrl = await getSignedUrl(
          s3,
          new GetObjectCommand({ Bucket: RECAP_AUDIO_BUCKET, Key: s3Key }),
          { expiresIn: 3600 },
        )
        s3.destroy()
      } catch (s3Err) {
        console.error('[recap] Failed to sign audio URL:', s3Err instanceof Error ? s3Err.message : '')
      }
    }

    let playback = resolveRecapPlayback(record)
    if (playback.provider === 'polly' && !audioUrl) {
      playback = {
        ...playback,
        provider: 'device',
        reason: 'polly_audio_unavailable',
      }
    }

    return res.status(200).json({
      ok: true,
      offline: false,
      data: {
        script,
        audioUrl,
        generatedAt,
        weekStart,
        tone,
        usedHumor,
        playback,
      },
    })
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
