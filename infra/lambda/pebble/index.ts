import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { PEBBLE_CLARIFY_RULE, PEBBLE_OUTPUT_RULE, PEBBLE_SYSTEM_PROMPT } from '../../../shared/pebblePromptRules'
import { runAgentLoop } from '../../../server/pebbleAgent/agent'
import type { AgentRequest } from '../../../server/pebbleAgent/types'

// Abort Bedrock at 22 s — Lambda timeout is 25 s so we return cleanly before it kills us.
const REQUEST_TIMEOUT_MS = 22_000
const RUN_MESSAGE_MAX_CHARS = 360
const CODE_TEXT_MAX_CHARS = 1800

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
}

function respond(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  // IMPORTANT: never return 403 or 404 — CloudFront's global error response
  // would intercept those and serve index.html instead of the JSON body.
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) }
}

// ── Types ─────────────────────────────────────────────────────────────────────

type PebbleContext = {
  taskTitle?: unknown
  codeText?: unknown
  runStatus?: unknown
  runMessage?: unknown
  currentErrorKey?: unknown
  nudgeVisible?: unknown
  guidedStep?: unknown
  guidedActive?: unknown
  struggleScore?: unknown
  repeatErrorCount?: unknown
  errorHistory?: unknown
}

type PebbleRequestBody = {
  prompt?: unknown
  context?: PebbleContext
}

// ── Helpers (ported from api/pebble.ts) ───────────────────────────────────────

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asOptionalString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function asOptionalBoolean(value: unknown): boolean {
  return typeof value === 'boolean' ? value : false
}

function asOptionalNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function trimValue(value: string, maxChars: number): string {
  return value.length <= maxChars ? value : `${value.slice(0, maxChars)}...`
}

function trimCodeForModel(codeText: string, maxChars: number): string {
  if (codeText.length <= maxChars) return codeText
  const marker = '\n...[code trimmed for model]...\n'
  const remaining = Math.max(0, maxChars - marker.length)
  const headSize = Math.floor(remaining / 2)
  const tailSize = remaining - headSize
  return `${codeText.slice(0, headSize)}${marker}${codeText.slice(codeText.length - tailSize)}`
}

type CompactModelContext = {
  taskTitle: string
  runStatus: string
  runMessage: string
  currentErrorKey: string
  guidedActive: boolean
  guidedStep: string
  nudgeVisible: boolean
  struggleScore: number
  repeatErrorCount: number
  errorHistory: string[]
  codeText: string
}

function compactContextForModel(context: PebbleContext): CompactModelContext {
  const errorHistory = Array.isArray(context.errorHistory)
    ? context.errorHistory
        .filter((item): item is string => typeof item === 'string' && item.length > 0)
        .slice(-3)
    : []

  const guidedStepRaw = context.guidedStep
  let guidedStep = 'none'
  if (isRecord(guidedStepRaw)) {
    const current = guidedStepRaw.current
    const total = guidedStepRaw.total
    if (
      typeof current === 'number' && Number.isFinite(current) &&
      typeof total === 'number' && Number.isFinite(total)
    ) {
      guidedStep = `${current}/${total}`
    }
  }

  return {
    taskTitle: trimValue(asOptionalString(context.taskTitle), 120),
    runStatus: trimValue(asOptionalString(context.runStatus), 40),
    runMessage: trimValue(asOptionalString(context.runMessage), RUN_MESSAGE_MAX_CHARS),
    currentErrorKey: trimValue(asOptionalString(context.currentErrorKey), 80) || 'none',
    guidedActive: asOptionalBoolean(context.guidedActive),
    guidedStep,
    nudgeVisible: asOptionalBoolean(context.nudgeVisible),
    struggleScore: asOptionalNumber(context.struggleScore),
    repeatErrorCount: asOptionalNumber(context.repeatErrorCount),
    errorHistory,
    codeText: trimCodeForModel(asOptionalString(context.codeText), CODE_TEXT_MAX_CHARS),
  }
}

function buildBedrockUserMessage(prompt: string, context: CompactModelContext): string {
  return [
    prompt,
    `Model context: ${JSON.stringify({
      taskTitle: context.taskTitle,
      runStatus: context.runStatus,
      runMessage: context.runMessage,
      currentErrorKey: context.currentErrorKey,
      guidedActive: context.guidedActive,
      guidedStep: context.guidedStep,
      nudgeVisible: context.nudgeVisible,
      struggleScore: context.struggleScore,
      repeatErrorCount: context.repeatErrorCount,
      errorHistory: context.errorHistory,
    })}`,
    context.codeText ? `Code excerpt:\n${context.codeText}` : '',
    `Constraints: ${PEBBLE_CLARIFY_RULE} ${PEBBLE_OUTPUT_RULE}`,
  ]
    .filter(Boolean)
    .join('\n')
}

function getBedrockText(payload: unknown): string {
  if (!isRecord(payload)) return ''
  const content = payload.content
  if (!Array.isArray(content)) return ''
  const lines: string[] = []
  for (const item of content) {
    if (!isRecord(item) || item.type !== 'text') continue
    const text = item.text
    if (typeof text !== 'string') continue
    const normalized = text.trim()
    if (normalized) lines.push(normalized)
  }
  return lines.join('\n')
}

function normalizeRequestPath(path: string | undefined) {
  if (!path) return '/'
  const normalized = path.replace(/\/+$/, '')
  return normalized || '/'
}

function pathMatches(path: string, expected: string) {
  const normalizedPath = normalizeRequestPath(path)
  const normalizedExpected = normalizeRequestPath(expected)
  return (
    normalizedPath === normalizedExpected
    || normalizedPath.endsWith(normalizedExpected)
  )
}

function toAgentRequest(input: unknown): AgentRequest | null {
  if (!isRecord(input)) return null
  const question = asOptionalString(input.question).trim()
  if (!question) return null

  const tierRaw = input.tier
  const tier = tierRaw === 1 || tierRaw === 2 || tierRaw === 3 ? tierRaw : 1
  const struggleContextRaw = isRecord(input.struggleContext) ? input.struggleContext : {}

  return {
    tier,
    question,
    codeExcerpt: asOptionalString(input.codeExcerpt).slice(0, 3000),
    language: asOptionalString(input.language) || 'python',
    executionMode: input.executionMode === 'function' ? 'function' : 'stdio',
    requiredSignature: asOptionalString(input.requiredSignature) || undefined,
    detectedSignature: asOptionalString(input.detectedSignature) || undefined,
    runStatus: asOptionalString(input.runStatus),
    runMessage: asOptionalString(input.runMessage).slice(0, 500),
    failingSummary: asOptionalString(input.failingSummary).slice(0, 500),
    unitTitle: asOptionalString(input.unitTitle),
    unitConcept: asOptionalString(input.unitConcept),
    struggleContext: {
      runFailStreak: asOptionalNumber(struggleContextRaw.runFailStreak),
      timeStuckSeconds: asOptionalNumber(struggleContextRaw.timeStuckSeconds),
      lastErrorType: asOptionalString(struggleContextRaw.lastErrorType) || null,
      level: asOptionalNumber(struggleContextRaw.level),
    },
  }
}

async function handlePebbleAgentRoute(rawBody: string | null) {
  let parsed: unknown
  try {
    parsed = rawBody ? JSON.parse(rawBody) as unknown : null
  } catch {
    return respond(400, { error: 'Invalid JSON body.' })
  }

  const request = toAgentRequest(parsed)
  if (!request) {
    return respond(400, { error: 'Field "question" is required.' })
  }

  try {
    const result = await runAgentLoop(request)
    return respond(200, result)
  } catch (error) {
    console.error('[pebble-agent-lambda-error]', error)
    // Return a shaped fallback so the client never has to fail hard.
    return respond(200, {
      tier: request.tier,
      intent: 'Guidance',
      reasoning_brief: 'Pebble is temporarily unavailable. Try again in a moment.',
      steps: [],
      hints: ['Retry after a short pause.'],
      patch_suggestion: null,
      safety_flags: ['lambda_error_fallback'],
    })
  }
}

// ── Lambda handler ─────────────────────────────────────────────────────────────

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method.toUpperCase()
  const path = event.requestContext.http.path ?? event.rawPath ?? '/'

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  if (method !== 'POST') {
    return respond(400, { error: 'Method not allowed. Use POST.' })
  }

  if (pathMatches(path, '/api/pebble-agent')) {
    return handlePebbleAgentRoute(event.body ?? null)
  }

  const modelId = process.env.BEDROCK_MODEL_ID
  const region = process.env.AWS_REGION ?? 'ap-south-1'

  if (!modelId) {
    return respond(500, { error: 'Server misconfigured: BEDROCK_MODEL_ID not set.' })
  }

  let body: PebbleRequestBody
  try {
    const raw = event.body ?? ''
    body = raw ? (JSON.parse(raw) as PebbleRequestBody) : {}
  } catch {
    return respond(400, { error: 'Invalid JSON body.' })
  }

  if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
    return respond(400, { error: 'Field "prompt" must be a non-empty string.' })
  }

  if (!body.context || typeof body.context !== 'object') {
    return respond(400, { error: 'Field "context" must be an object.' })
  }

  const compactContext = compactContextForModel(body.context)
  const userMessage = buildBedrockUserMessage(body.prompt, compactContext)

  const client = new BedrockRuntimeClient({ region })
  const controller = new AbortController()
  let timedOut = false
  const timeout = setTimeout(() => {
    timedOut = true
    controller.abort()
  }, REQUEST_TIMEOUT_MS)

  try {
    const command = new InvokeModelCommand({
      modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: 240,
        temperature: 0.35,
        system: PEBBLE_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: [{ type: 'text', text: userMessage }] }],
      }),
    })

    const response = await client.send(command, { abortSignal: controller.signal })
    const rawResponse = response.body ? new TextDecoder().decode(response.body) : ''
    if (!rawResponse) {
      return respond(500, { error: 'Bedrock returned an empty response body.' })
    }

    let payload: unknown
    try {
      payload = JSON.parse(rawResponse)
    } catch {
      return respond(500, { error: 'Bedrock returned malformed JSON.' })
    }

    const text = getBedrockText(payload)
    if (!text) {
      return respond(500, { error: 'Bedrock returned no text output.' })
    }

    return respond(200, { text })
  } catch (error) {
    if (controller.signal.aborted) {
      // Return 200 with an in-band error message so CloudFront passes it through.
      return timedOut
        ? respond(200, { text: 'Pebble timed out. Try a shorter question.' })
        : respond(200, { text: 'Stopped.' })
    }
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[pebble-lambda-error]', message)
    if (/too many requests|throttl/i.test(message)) {
      return respond(200, { text: 'Pebble is handling high load right now. Please retry in a few seconds.' })
    }
    return respond(500, { error: 'Pebble server request failed.' })
  } finally {
    clearTimeout(timeout)
    client.destroy()
  }
}
