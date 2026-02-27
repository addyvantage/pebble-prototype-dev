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

const DEFAULT_MODEL = 'gpt-4.1-mini'
const REQUEST_TIMEOUT_MS = 20_000
const PEBBLE_TONE_RULES = `Tone rules:
- If struggleScore > 70: stabilize and simplify.
- If struggleScore > 75 OR repeatErrorCount > 3, ask ONE clarifying question instead of giving steps.
- If repeatErrorCount > 2: narrow attention to one small fix.
- If guidedActive: explain only current step.
- If success: reinforce and suggest next micro-step.
- Never rewrite full solutions unless explicitly asked.
- Max 6 lines.
- Short sentences.
- No fluff.`

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

function getResponsesText(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return ''
  }

  const candidate = payload as {
    output_text?: unknown
    output?: Array<{
      content?: Array<{ type?: string; text?: string }>
    }>
    choices?: Array<{
      message?: { content?: string }
    }>
  }

  if (typeof candidate.output_text === 'string' && candidate.output_text.trim()) {
    return candidate.output_text.trim()
  }

  const outputText = (candidate.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text?.trim() ?? '')
    .filter(Boolean)
    .join('\n')

  if (outputText) {
    return outputText
  }

  const choiceText = candidate.choices?.[0]?.message?.content
  if (typeof choiceText === 'string' && choiceText.trim()) {
    return choiceText.trim()
  }

  return ''
}

export default async function handler(
  req: { method?: string; body?: unknown; on?: (event: string, cb: (chunk: Buffer) => void) => void },
  res: { status: (code: number) => { json: (payload: unknown) => void }; json: (payload: unknown) => void },
) {
  if (req.method !== 'POST') {
    sendJson(res, 405, { error: 'Method not allowed. Use POST.' })
    return
  }

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    sendJson(res, 500, { error: 'Server missing OPENAI_API_KEY.' })
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

  const model = process.env.OPENAI_MODEL || DEFAULT_MODEL
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: [
          {
            role: 'system',
            content: `You are Pebble, a focused coding mentor embedded inside a live IDE.
You can see real-time struggle signals, error history, guided state, and run telemetry.
Your job is to restore momentum with minimal cognitive overload.

${PEBBLE_TONE_RULES}`,
          },
          {
            role: 'user',
            content: `${body.prompt}\n\nContext JSON:\n${JSON.stringify(body.context, null, 2)}`,
          },
        ],
      }),
      signal: controller.signal,
    })

    let payload: unknown = null
    try {
      payload = await response.json()
    } catch {
      payload = null
    }

    if (!response.ok) {
      const errorMessage =
        payload && typeof payload === 'object' && 'error' in payload
          ? String((payload as { error?: { message?: string } }).error?.message ?? '')
          : ''
      sendJson(res, 502, { error: errorMessage || 'OpenAI request failed.' })
      return
    }

    const text = getResponsesText(payload)
    if (!text) {
      sendJson(res, 502, { error: 'OpenAI returned no text output.' })
      return
    }

    sendJson(res, 200, { text })
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      sendJson(res, 504, { error: 'Pebble request timed out.' })
      return
    }
    sendJson(res, 500, { error: 'Unexpected server error while contacting OpenAI.' })
  } finally {
    clearTimeout(timeout)
  }
}
