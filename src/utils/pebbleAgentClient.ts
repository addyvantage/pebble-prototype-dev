/**
 * Client for the Pebble Agent endpoint.
 * POSTs to /api/pebble-agent and returns typed AgentResponse.
 */

import { askPebble } from './pebbleLLM'
import { apiFetch } from '../lib/apiUrl'

export type HelpTier = 1 | 2 | 3

export interface AgentResponse {
    tier: HelpTier
    intent: string
    reasoning_brief: string
    steps: string[]
    hints: string[]
    patch_suggestion: string | null
    safety_flags: string[]
}

export interface AgentRequestInput {
    tier: HelpTier
    question: string
    codeExcerpt: string
    language: string
    executionMode?: 'function' | 'stdio'
    requiredSignature?: string
    detectedSignature?: string
    runStatus: string
    runMessage: string
    failingSummary: string
    unitTitle: string
    unitConcept: string
    struggleContext: {
        runFailStreak: number
        timeStuckSeconds: number
        lastErrorType: string | null
        level: number
    }
    signal?: AbortSignal
}

const AGENT_TIMEOUT_MS = 25_000

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value) && typeof value === 'object'
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return []
    }
    return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
}

function coerceTier(value: unknown, fallbackTier: HelpTier): HelpTier {
    return value === 1 || value === 2 || value === 3 ? value : fallbackTier
}

function looksLikeHtmlDocument(raw: string): boolean {
    const sample = raw.trim().toLowerCase().slice(0, 220)
    return (
        sample.startsWith('<!doctype html') ||
        sample.startsWith('<html') ||
        sample.includes('<head') ||
        sample.includes('<body')
    )
}

function parseAgentPayload(payload: unknown, fallbackTier: HelpTier): AgentResponse | null {
    if (!isRecord(payload)) {
        return null
    }

    const text = typeof payload.text === 'string' ? payload.text.trim() : ''
    const reasoningBrief = typeof payload.reasoning_brief === 'string' ? payload.reasoning_brief.trim() : text
    const hints = asStringArray(payload.hints)
    const steps = asStringArray(payload.steps)
    const patchSuggestion =
        typeof payload.patch_suggestion === 'string' && payload.patch_suggestion.trim()
            ? payload.patch_suggestion
            : null

    if (!reasoningBrief && hints.length === 0 && steps.length === 0 && !patchSuggestion) {
        return null
    }

    return {
        tier: coerceTier(payload.tier, fallbackTier),
        intent:
            typeof payload.intent === 'string' && payload.intent.trim().length > 0
                ? payload.intent
                : 'Guidance',
        reasoning_brief: reasoningBrief,
        steps,
        hints,
        patch_suggestion: patchSuggestion,
        safety_flags: asStringArray(payload.safety_flags),
    }
}

function buildLegacyPrompt(input: AgentRequestInput): string {
    const tierRule =
        input.tier === 1
            ? 'Help tier: 1 (hint only, no full solution code).'
            : input.tier === 2
                ? 'Help tier: 2 (explain root cause and guided next steps).'
                : 'Help tier: 3 (full solution allowed with explanation).'

    return [
        `Unit: ${input.unitTitle}`,
        `Concept: ${input.unitConcept}`,
        `Language: ${input.language}`,
        `Execution mode: ${input.executionMode ?? 'stdio'}`,
        input.requiredSignature ? `Required signature: ${input.requiredSignature}` : '',
        input.detectedSignature ? `Detected signature: ${input.detectedSignature}` : '',
        `Run status: ${input.runStatus}`,
        input.runMessage ? `Run output summary: ${input.runMessage}` : '',
        input.failingSummary ? `Failing tests: ${input.failingSummary}` : '',
        `Struggle context: failStreak=${input.struggleContext.runFailStreak}, stuck=${input.struggleContext.timeStuckSeconds}s, lastError=${input.struggleContext.lastErrorType ?? 'none'}, level=${input.struggleContext.level}`,
        tierRule,
        input.requiredSignature
            ? 'CONTRACT: Required signature is mandatory. Keep it unchanged. For function mode, return values instead of printing unless explicitly requested.'
            : input.executionMode === 'stdio'
                ? 'CONTRACT: This unit is stdio-mode. Reading stdin and printing output is expected.'
                : '',
        `Question: ${input.question}`,
    ]
        .filter(Boolean)
        .join('\n')
}

async function fallbackToLegacyPebble(input: AgentRequestInput, reason: string): Promise<AgentResponse> {
    const responseText = await askPebble({
        prompt: buildLegacyPrompt(input),
        signal: input.signal,
        context: {
            taskTitle: input.unitTitle,
            codeText: input.codeExcerpt,
            runStatus: input.runStatus,
            runMessage: input.runMessage,
            language: input.language,
            executionMode: input.executionMode ?? 'stdio',
            requiredSignature: input.requiredSignature ?? '',
            detectedSignature: input.detectedSignature ?? '',
            helpTier: input.tier,
            struggleContext: input.struggleContext,
            currentErrorKey: input.struggleContext.lastErrorType,
            nudgeVisible: false,
            guidedActive: false,
            struggleScore: Math.max(
                10,
                Math.min(100, input.struggleContext.level * 28 + input.struggleContext.runFailStreak * 8),
            ),
            repeatErrorCount: input.struggleContext.runFailStreak,
            errorHistory: input.failingSummary ? [input.failingSummary] : [],
        },
    })

    return {
        tier: input.tier,
        intent: 'Guidance',
        reasoning_brief: responseText.trim() || 'Pebble is temporarily unavailable. Try again in a moment.',
        steps: [],
        hints: [],
        patch_suggestion: null,
        safety_flags: ['legacy_fallback', reason],
    }
}

export async function askPebbleAgent(input: AgentRequestInput): Promise<AgentResponse> {
    const controller = new AbortController()
    const timer = window.setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS)

    // Bridge external abort signal
    const onExternalAbort = () => controller.abort()
    if (input.signal) {
        if (input.signal.aborted) {
            controller.abort()
        } else {
            input.signal.addEventListener('abort', onExternalAbort, { once: true })
        }
    }

    try {
        const body: Omit<AgentRequestInput, 'signal'> = {
            tier: input.tier,
            question: input.question,
            codeExcerpt: input.codeExcerpt,
            language: input.language,
            executionMode: input.executionMode,
            requiredSignature: input.requiredSignature,
            detectedSignature: input.detectedSignature,
            runStatus: input.runStatus,
            runMessage: input.runMessage,
            failingSummary: input.failingSummary,
            unitTitle: input.unitTitle,
            unitConcept: input.unitConcept,
            struggleContext: input.struggleContext,
        }

        const response = await apiFetch('/api/pebble-agent', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
        })

        const rawBody = await response.text().catch(() => '')
        const contentType = (response.headers.get('content-type') ?? '').toLowerCase()

        if (!response.ok) {
            // CloudFront + SPA fallback can convert missing /api/pebble-agent into HTML.
            // In that case, transparently fall back to legacy /api/pebble.
            if (looksLikeHtmlDocument(rawBody) || response.status === 404 || response.status === 405) {
                return await fallbackToLegacyPebble(input, 'agent_endpoint_unavailable')
            }
            throw new Error(`Agent request failed (HTTP ${response.status}): ${rawBody.slice(0, 200)}`)
        }

        if (!contentType.includes('application/json') && looksLikeHtmlDocument(rawBody)) {
            return await fallbackToLegacyPebble(input, 'agent_non_json_html')
        }

        let parsed: unknown = null
        try {
            parsed = rawBody ? JSON.parse(rawBody) as unknown : null
        } catch {
            parsed = null
        }

        if (parsed === null) {
            if (looksLikeHtmlDocument(rawBody)) {
                return await fallbackToLegacyPebble(input, 'agent_html_payload')
            }
            throw new Error(`Agent returned invalid JSON payload: ${rawBody.slice(0, 200)}`)
        }

        const normalized = parseAgentPayload(parsed, input.tier)
        if (normalized) {
            return normalized
        }

        return await fallbackToLegacyPebble(input, 'agent_unexpected_shape')
    } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') {
            // Return a minimal fallback on timeout/abort
            return {
                tier: input.tier,
                intent: 'Request timed out',
                reasoning_brief: 'The request was cancelled or timed out. Try again with a simpler question.',
                steps: [],
                hints: ['Try breaking your question into smaller parts.'],
                patch_suggestion: null,
                safety_flags: ['timeout'],
            }
        }
        return await fallbackToLegacyPebble(input, 'agent_fetch_failed')
    } finally {
        window.clearTimeout(timer)
        input.signal?.removeEventListener('abort', onExternalAbort)
    }
}
