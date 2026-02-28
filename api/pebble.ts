import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import { PEBBLE_CLARIFY_RULE, PEBBLE_OUTPUT_RULE, PEBBLE_SYSTEM_PROMPT } from './_shared/pebblePromptRules.js'

export const config = {
  runtime: 'nodejs',
  api: {
    bodyParser: {
      sizeLimit: '200kb',
    },
  },
}

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

const REQUEST_TIMEOUT_MS = 20_000
const RUN_MESSAGE_MAX_CHARS = 360
const CODE_TEXT_MAX_CHARS = 1800

function sendJson(res: { status: (code: number) => unknown; json: (payload: unknown) => void }, status: number, payload: unknown) {
  res.status(status)
  res.json(payload)
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

function isContextValid(context: unknown) {
  return Boolean(context && typeof context === 'object')
}

function decodeBedrockBody(body: Uint8Array | undefined) {
  if (!body) {
    return ''
  }
  return new TextDecoder().decode(body)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function asOptionalString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function asOptionalBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : false
}

function asOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function trimValue(value: string, maxChars: number) {
  if (value.length <= maxChars) {
    return value
  }
  return `${value.slice(0, maxChars)}...`
}

function trimCodeForModel(codeText: string, maxChars: number) {
  if (codeText.length <= maxChars) {
    return codeText
  }

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
    if (typeof current === 'number' && Number.isFinite(current) && typeof total === 'number' && Number.isFinite(total)) {
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

function buildBedrockUserMessage(prompt: string, context: CompactModelContext) {
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

function getBedrockText(payload: unknown) {
  if (!isRecord(payload)) {
    return ''
  }

  const content = payload.content
  if (!Array.isArray(content)) {
    return ''
  }

  const lines: string[] = []
  for (const item of content) {
    if (!isRecord(item) || item.type !== 'text') {
      continue
    }

    const text = item.text
    if (typeof text !== 'string') {
      continue
    }

    const normalized = text.trim()
    if (normalized) {
      lines.push(normalized)
    }
  }

  return lines.join('\n')
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
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const region = process.env.AWS_REGION
  const modelId = process.env.BEDROCK_MODEL_ID
  const debugErrors = process.env.PEBBLE_DEBUG_ERRORS === '1'
  let timedOut = false
  let missingVars: string[] = []

  if (req.method === 'GET') {
    sendJson(res, 200, {
      ok: true,
      route: '/api/pebble',
      hasEnv: {
        AWS_REGION: Boolean(region),
        BEDROCK_MODEL_ID: Boolean(modelId),
        AWS_ACCESS_KEY_ID: Boolean(accessKeyId),
        AWS_SECRET_ACCESS_KEY: Boolean(secretAccessKey),
      },
    })
    return
  }

  if (req.method !== 'POST') {
    res.setHeader?.('Allow', 'GET, POST')
    sendJson(res, 405, { error: 'Method not allowed. Use GET or POST.' })
    return
  }

  try {
    missingVars = [
      ['AWS_REGION', region],
      ['BEDROCK_MODEL_ID', modelId],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key)

    if (missingVars.length > 0) {
      sendJson(res, 500, { error: `Server missing required env vars: ${missingVars.join(', ')}.` })
      return
    }

    if ((accessKeyId && !secretAccessKey) || (!accessKeyId && secretAccessKey)) {
      sendJson(res, 500, { error: 'Set both AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY, or neither.' })
      return
    }

    const awsRegion = region as string
    const bedrockModelId = modelId as string
    if (bedrockModelId === 'anthropic.claude-sonnet-4-5' || !bedrockModelId.includes('v1:0')) {
      sendJson(res, 500, {
        error:
          'BEDROCK_MODEL_ID looks incomplete. Use the exact modelId from `aws bedrock list-foundation-models ...` (example: anthropic.claude-sonnet-4-5-20250929-v1:0 or global.*).',
      })
      return
    }

    const rawBody = await readBody(req)
    let body: PebbleRequestBody
    try {
      body = rawBody ? (JSON.parse(rawBody) as PebbleRequestBody) : {}
    } catch {
      sendJson(res, 400, { error: 'Invalid JSON body.' })
      return
    }

    if (typeof body.prompt !== 'string' || !body.prompt.trim()) {
      sendJson(res, 400, { error: 'Field "prompt" must be a non-empty string.' })
      return
    }

    if (!isContextValid(body.context)) {
      sendJson(res, 400, { error: 'Field "context" must be an object.' })
      return
    }
    const compactContext = compactContextForModel(body.context)

    const controller = new AbortController()
    const timeout = setTimeout(() => {
      timedOut = true
      controller.abort()
    }, REQUEST_TIMEOUT_MS)
    const clientConfig: ConstructorParameters<typeof BedrockRuntimeClient>[0] = {
      region: awsRegion,
    }
    if (accessKeyId && secretAccessKey) {
      clientConfig.credentials = {
        accessKeyId,
        secretAccessKey,
      }
    }
    const client = new BedrockRuntimeClient(clientConfig)

    try {
      const userMessage = buildBedrockUserMessage(body.prompt, compactContext)
      if (process.env.PEBBLE_DEBUG_COST === '1') {
        const totalChars = PEBBLE_SYSTEM_PROMPT.length + userMessage.length
        const estimatedTokens = Math.ceil(totalChars / 4)
        console.log(
          `[pebble-cost] systemChars=${PEBBLE_SYSTEM_PROMPT.length} userChars=${userMessage.length} totalChars=${totalChars} estTokens=${estimatedTokens}`,
        )
      }

      const command = new InvokeModelCommand({
        modelId: bedrockModelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          anthropic_version: 'bedrock-2023-05-31',
          max_tokens: 240,
          temperature: 0.35,
          system: PEBBLE_SYSTEM_PROMPT,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: userMessage,
                },
              ],
            },
          ],
        }),
      })

      const response = await client.send(command, { abortSignal: controller.signal })
      const rawResponse = decodeBedrockBody(response.body)
      if (!rawResponse) {
        sendJson(res, 502, { error: 'Bedrock returned an empty response body.' })
        return
      }

      let payload: unknown
      try {
        payload = JSON.parse(rawResponse) as unknown
      } catch {
        sendJson(res, 502, { error: 'Bedrock returned malformed JSON.' })
        return
      }

      const text = getBedrockText(payload)
      if (!text) {
        sendJson(res, 502, { error: 'Bedrock returned no text output.' })
        return
      }

      sendJson(res, 200, { text })
    } catch (error) {
      if (controller.signal.aborted) {
        if (timedOut) {
          sendJson(res, 504, { error: 'Pebble request timed out.' })
        } else {
          sendJson(res, 200, { text: 'Stopped.' })
        }
        return
      }
      throw error
    } finally {
      clearTimeout(timeout)
      client.destroy()
    }
  } catch (error) {
    const name = error instanceof Error ? error.name : 'UnknownError'
    const message = error instanceof Error ? error.message : 'Unknown error'
    const stack = error instanceof Error && error.stack ? error.stack : `${name}: ${message}`
    console.error('[pebble-api-error]', stack)

    if (debugErrors) {
      sendJson(res, 502, {
        error: message,
        name,
        stackTop: stack.split('\n').slice(0, 12).join('\n'),
        timedOut,
        region: region ?? '',
        modelId: modelId ?? '',
        missingVars,
      })
      return
    }

    sendJson(res, 502, { error: 'Pebble server request failed.' })
  }
}
