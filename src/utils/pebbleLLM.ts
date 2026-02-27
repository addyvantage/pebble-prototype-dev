type PebbleLLMContext = {
  taskTitle: string
  codeText: string
  runStatus: string
  runMessage: string
  currentErrorKey: string | null
  nudgeVisible: boolean
  guidedStep?: { current: number; total: number }
  guidedActive: boolean
  struggleScore: number
  repeatErrorCount: number
  errorHistory: string[]
}

type AskPebbleInput = {
  prompt: string
  context: PebbleLLMContext
  signal?: AbortSignal
}

const REQUEST_TIMEOUT_MS = 18_000
const DEFAULT_MODEL = 'gpt-4.1-mini'
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

function withTimeout(timeoutMs: number) {
  const controller = new AbortController()
  const timer = window.setTimeout(() => controller.abort(), timeoutMs)
  return {
    controller,
    clear: () => window.clearTimeout(timer),
  }
}

function bridgeAbortSignal(controller: AbortController, externalSignal?: AbortSignal) {
  if (!externalSignal) {
    return () => {}
  }

  const onExternalAbort = () => {
    controller.abort()
  }

  if (externalSignal.aborted) {
    controller.abort()
    return () => {}
  }

  externalSignal.addEventListener('abort', onExternalAbort, { once: true })
  return () => {
    externalSignal.removeEventListener('abort', onExternalAbort)
  }
}

async function readJsonResponse(response: Response) {
  try {
    return (await response.json()) as unknown
  } catch {
    return null
  }
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

async function askServer(input: AskPebbleInput) {
  const { controller, clear } = withTimeout(REQUEST_TIMEOUT_MS)
  const disconnect = bridgeAbortSignal(controller, input.signal)
  try {
    const response = await fetch('/api/pebble', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: input.prompt,
        context: input.context,
      }),
      signal: controller.signal,
    })

    const payload = await readJsonResponse(response)
    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'error' in payload
          ? String((payload as { error?: unknown }).error ?? '')
          : ''
      throw new Error(message || 'Pebble server request failed.')
    }

    const text =
      payload && typeof payload === 'object' && 'text' in payload
        ? String((payload as { text?: unknown }).text ?? '')
        : ''

    if (!text.trim()) {
      throw new Error('Pebble could not produce an answer right now.')
    }

    return text.trim()
  } finally {
    disconnect()
    clear()
  }
}

async function askUnsafeClient(input: AskPebbleInput) {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY as string | undefined
  if (!apiKey) {
    throw new Error('Unsafe client mode is on, but VITE_OPENAI_API_KEY is missing.')
  }

  const model = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || DEFAULT_MODEL
  const { controller, clear } = withTimeout(REQUEST_TIMEOUT_MS)
  const disconnect = bridgeAbortSignal(controller, input.signal)

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
            content: `${input.prompt}\n\nContext JSON:\n${JSON.stringify(input.context, null, 2)}`,
          },
        ],
      }),
      signal: controller.signal,
    })

    const payload = await readJsonResponse(response)
    if (!response.ok) {
      const message =
        payload && typeof payload === 'object' && 'error' in payload
          ? String((payload as { error?: { message?: string } }).error?.message ?? '')
          : ''
      throw new Error(message || 'OpenAI client request failed.')
    }

    const text = getResponsesText(payload)
    if (!text) {
      throw new Error('OpenAI returned an empty response.')
    }

    return text
  } finally {
    disconnect()
    clear()
  }
}

export async function askPebble(input: AskPebbleInput): Promise<string> {
  const requestedMode = import.meta.env.VITE_PEBBLE_LLM_MODE as string | undefined
  const unsafeModeRequested = requestedMode === 'unsafe_client'
  const hasClientKey = Boolean(import.meta.env.VITE_OPENAI_API_KEY)

  try {
    if (unsafeModeRequested && hasClientKey) {
      return await askUnsafeClient(input)
    }
    return await askServer(input)
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        if (input.signal?.aborted) {
          return 'Stopped.'
        }
        return 'Pebble timed out while thinking. Try a shorter question.'
      }
      return error.message || 'Pebble hit a temporary issue. Try again.'
    }
    return 'Pebble hit a temporary issue. Try again.'
  }
}

export type { AskPebbleInput, PebbleLLMContext }
