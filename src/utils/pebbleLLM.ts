import { PEBBLE_SYSTEM_PROMPT } from '../shared/pebblePromptRules'
import { apiFetch } from '../lib/apiUrl'

type PebbleLLMContext = {
  taskTitle: string
  codeText: string
  executionMode?: 'function' | 'stdio'
  requiredSignature?: string
  detectedSignature?: string
  runStatus: string
  runMessage: string
  language?: string
  unitId?: string
  problemId?: string
  helpTier?: 1 | 2 | 3
  struggleContext?: {
    runFailStreak?: number
    timeStuckSeconds?: number
    lastErrorType?: string | null
    level?: number
  }
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

async function readErrorSnippet(response: Response) {
  let raw = ''
  try {
    raw = await response.text()
  } catch {
    return '<unreadable body>'
  }

  const trimmed = raw.trim()
  if (!trimmed) {
    return '<empty body>'
  }

  let normalized = trimmed
  try {
    const parsed = JSON.parse(trimmed) as unknown
    normalized = typeof parsed === 'string' ? parsed : JSON.stringify(parsed)
  } catch {
    normalized = trimmed
  }

  return normalized.replace(/\s+/g, ' ').slice(0, 500)
}

function getStatusFromMessage(message: string) {
  const match = message.match(/\bHTTP\s+(\d{3})\b/i)
  return match?.[1] ?? ''
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
    let response: Response
    try {
      response = await apiFetch('/api/pebble', {
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
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw error
        }
        throw new Error(`Fetch /api/pebble failed: ${error.name}: ${error.message}`)
      }
      throw new Error('Fetch /api/pebble failed: unknown error')
    }

    if (!response.ok) {
      const snippet = await readErrorSnippet(response)
      throw new Error(`HTTP ${response.status} from /api/pebble. Body: ${snippet}`)
    }

    const payload = await readJsonResponse(response)
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
    let response: Response
    try {
      response = await fetch('https://api.openai.com/v1/responses', {
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
              content: PEBBLE_SYSTEM_PROMPT,
            },
            {
              role: 'user',
              content: `${input.prompt}\nContext:${JSON.stringify(input.context)}`,
            },
          ],
        }),
        signal: controller.signal,
      })
    } catch (error) {
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw error
        }
        throw new Error(`Fetch OpenAI failed: ${error.name}: ${error.message}`)
      }
      throw new Error('Fetch OpenAI failed: unknown error')
    }

    if (!response.ok) {
      const snippet = await readErrorSnippet(response)
      throw new Error(`HTTP ${response.status} from OpenAI. Body: ${snippet}`)
    }

    const payload = await readJsonResponse(response)
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
      console.error('[pebble-llm]', error.name, error.message)
      const status = getStatusFromMessage(error.message)
      if (status) {
        return `Pebble request failed (status ${status}). Check browser console for details.`
      }
      return `Pebble request failed. Check browser console for details. (${error.name})`
    }
    return 'Pebble hit a temporary issue. Try again.'
  }
}

export type { AskPebbleInput, PebbleLLMContext }
