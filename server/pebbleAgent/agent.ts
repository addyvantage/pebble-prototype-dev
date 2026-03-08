/**
 * Pebble Agent — observe/plan/act/respond loop.
 * Runs server-side only. Uses Bedrock when available, falls back to canned responses.
 */
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'
import type { AgentRequest, AgentResponse, ToolResult } from './types.ts'
import { enforceTierPolicy, getTierInstruction, runSafetyFilter } from './policy.ts'

const AGENT_TIMEOUT_MS = 22_000
const CODE_EXCERPT_MAX = 1500

// ── Tool implementations (server-side data extraction) ─────────────────────

function toolReadCodeExcerpt(req: AgentRequest): ToolResult {
    let code = req.codeExcerpt || ''
    if (code.length > CODE_EXCERPT_MAX) {
        const half = Math.floor(CODE_EXCERPT_MAX / 2)
        code = `${code.slice(0, half)}\n...[trimmed]...\n${code.slice(-half)}`
    }
    // Safety: redact any secrets in user code before agent sees it
    const { cleaned } = runSafetyFilter(code)
    return {
        tool: 'read_current_code_excerpt',
        output: `Language: ${req.language}\nCode:\n${cleaned}`,
    }
}

function toolReadRunResults(req: AgentRequest): ToolResult {
    return {
        tool: 'read_last_run_results',
        output: [
            `Run status: ${req.runStatus}`,
            req.runMessage ? `Output: ${req.runMessage.slice(0, 400)}` : '',
            req.failingSummary ? `Failing tests: ${req.failingSummary.slice(0, 300)}` : '',
        ].filter(Boolean).join('\n'),
    }
}

// ── Agent system prompt builder ────────────────────────────────────────────

function buildAgentSystemPrompt(tier: number): string {
  return `You are Pebble Agent, an agentic coding coach inside a live IDE.
You have access to tools to read the student's code and run results.
You MUST respond with valid JSON matching this schema exactly:

{
  "tier": ${tier},
  "intent": "<one-line description of what you're helping with>",
  "reasoning_brief": "<2-3 sentences max: what you observed and your approach>",
  "steps": ["<numbered action step 1>", "<step 2>", ...],
  "hints": ["<hint 1>", "<hint 2>", ...],
  "patch_suggestion": ${tier === 3 ? '"<small diff or code fix>"' : 'null'},
  "safety_flags": []
}

${getTierInstruction(tier as 1 | 2 | 3)}

CRITICAL RULES:
- Output ONLY the JSON object, no markdown fences, no extra text.
- Keep reasoning_brief under 3 sentences.
- Keep steps to 3-5 items max.
- Keep hints to 2-3 items max.
- If requiredSignature is provided, treat it as the ground-truth contract and keep it unchanged.
- In function mode, prioritize return values. Do not default to printing/stdio advice unless explicitly requested.
- In stdio mode, prioritize reading stdin and printing expected stdout.
- Never include AWS keys, tokens, or credentials in your response.
- Never include full file rewrites. Only small targeted fixes.`
}

function buildAgentUserMessage(req: AgentRequest, toolResults: ToolResult[]): string {
    const toolSection = toolResults
        .map(t => `[Tool: ${t.tool}]\n${t.output}`)
        .join('\n\n')

    return `Student question: ${req.question}

Problem: ${req.unitTitle} — ${req.unitConcept}
Execution mode: ${req.executionMode ?? 'stdio'}
${req.requiredSignature ? `Required signature: ${req.requiredSignature}` : ''}
${req.detectedSignature ? `Detected signature: ${req.detectedSignature}` : ''}
${req.requiredSignature
            ? 'Contract: Keep the required signature exactly as-is. Fix implementation around it.'
            : req.executionMode === 'function'
                ? 'Contract: Function mode; focus on returned value contract.'
                : 'Contract: Stdio mode; focus on stdin/stdout behavior.'}
Struggle: failStreak=${req.struggleContext.runFailStreak}, stuckTime=${req.struggleContext.timeStuckSeconds}s, lastError=${req.struggleContext.lastErrorType ?? 'none'}, level=${req.struggleContext.level}

${toolSection}

Respond with the JSON object only.`
}

// ── Local fallback (no Bedrock) ────────────────────────────────────────────

function buildLocalFallback(req: AgentRequest): AgentResponse {
  const base: AgentResponse = {
    tier: req.tier,
    intent: 'Helping with coding problem',
    reasoning_brief: `Let's focus on the contract for "${req.unitTitle}" and get this run passing.`,
    steps: [],
    hints: [],
    patch_suggestion: null,
        safety_flags: ['local_fallback'],
    }

    if (req.tier === 1) {
        if (req.requiredSignature) {
            base.hints = [
                `Match the exact signature: ${req.requiredSignature}.`,
                req.detectedSignature
                    ? `Your detected signature is ${req.detectedSignature}; adjust only the function shape.`
                    : 'Define the required function first, then return the expected value.',
            ]
        } else if ((req.executionMode ?? 'stdio') === 'function') {
            base.hints = [
                'This is function mode: return the expected value from the function.',
                'Avoid switching to print-based output unless the unit explicitly asks for stdio.',
            ]
        } else {
            base.hints = [
                'This is stdio mode: read stdin and print exactly what the tests expect.',
                `Think about what the "${req.unitConcept}" concept requires.`,
            ]
        }
        base.steps = ['Read the latest run output', 'Apply one small contract-aligned fix', 'Run again']
    } else if (req.tier === 2) {
        base.hints = req.requiredSignature
            ? [
                `Keep ${req.requiredSignature} unchanged and fix only implementation details.`,
                req.failingSummary
                    ? `Use this failure clue: ${req.failingSummary.slice(0, 100)}`
                    : 'Return the expected type/value contract from the required function.',
            ]
            : [
                req.failingSummary
                    ? `Your failing tests suggest: ${req.failingSummary.slice(0, 100)}`
                    : (req.executionMode ?? 'stdio') === 'function'
                        ? 'Check if your function returns the expected type and value.'
                        : 'Check if stdout exactly matches expected output.',
            ]
        base.steps = [
            'Identify which test case fails',
            'Compare your output to the expected output',
            'Trace through your code with that specific input',
            'Fix the logic and re-run',
        ]
    } else {
        base.hints = ['Here is a guided fix approach:']
        base.steps = [
            'Look at the failing test input/output',
            'The issue is likely in your main logic',
            'Try adjusting the core calculation or condition',
        ]
        base.patch_suggestion = '// Adjust the condition or return value in your solution'
    }

    return base
}

// ── Main agent loop ────────────────────────────────────────────────────────

export async function runAgentLoop(req: AgentRequest): Promise<AgentResponse> {
    // Phase 1: Observe — run tools to gather context
    const toolResults: ToolResult[] = [
        toolReadCodeExcerpt(req),
        toolReadRunResults(req),
    ]

    // Phase 2: Check Bedrock availability
    const region = process.env.AWS_REGION
    const modelId = process.env.BEDROCK_MODEL_ID

    if (!region || !modelId) {
        console.log('[pebble-agent] No Bedrock config, using local fallback')
        const fallback = buildLocalFallback(req)
        return enforceTierPolicy(req.tier, fallback)
    }

    // Phase 3: Plan + Act + Respond — call Bedrock with structured prompt
    // Use the default AWS credential provider chain (Lambda role, local profile, etc.).
    // Do not partially override env credentials here; temporary creds require session token.
    const client = new BedrockRuntimeClient({ region })
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), AGENT_TIMEOUT_MS)

    try {
        const systemPrompt = buildAgentSystemPrompt(req.tier)
        const userMessage = buildAgentUserMessage(req, toolResults)

        const command = new InvokeModelCommand({
            modelId,
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                anthropic_version: 'bedrock-2023-05-31',
                max_tokens: 600,
                temperature: 0.3,
                system: systemPrompt,
                messages: [
                    {
                        role: 'user',
                        content: [{ type: 'text', text: userMessage }],
                    },
                ],
            }),
        })

        const bedrockResponse = await client.send(command, { abortSignal: controller.signal })
        const rawBody = new TextDecoder().decode(bedrockResponse.body)

        if (!rawBody) {
            console.warn('[pebble-agent] Bedrock returned empty body, using fallback')
            return enforceTierPolicy(req.tier, buildLocalFallback(req))
        }

        // Parse Bedrock response
        let bedrockPayload: Record<string, unknown>
        try {
            bedrockPayload = JSON.parse(rawBody)
        } catch {
            console.warn('[pebble-agent] Bedrock returned malformed JSON wrapper')
            return enforceTierPolicy(req.tier, buildLocalFallback(req))
        }

        // Extract text from Bedrock's content array
        const content = bedrockPayload.content as Array<{ type?: string; text?: string }> | undefined
        const textBlock = content?.find(c => c.type === 'text')?.text ?? ''

        if (!textBlock.trim()) {
            console.warn('[pebble-agent] Bedrock returned no text content')
            return enforceTierPolicy(req.tier, buildLocalFallback(req))
        }

        // Parse the agent's JSON response
        let agentOutput: AgentResponse
        try {
            // The model might wrap in markdown fences, strip them
            const cleaned = textBlock.replace(/^```json?\s*/i, '').replace(/\s*```$/i, '').trim()
            agentOutput = JSON.parse(cleaned)
        } catch {
            console.warn('[pebble-agent] Failed to parse agent JSON output, using as plain text')
            agentOutput = {
                tier: req.tier,
                intent: 'Help with problem',
                reasoning_brief: textBlock.slice(0, 200),
                steps: [],
                hints: [textBlock.slice(0, 400)],
                patch_suggestion: null,
                safety_flags: ['json_parse_fallback'],
            }
        }

        // Phase 4: Enforce tier policy + safety
        return enforceTierPolicy(req.tier, agentOutput)
    } catch (err) {
        if (controller.signal.aborted) {
            console.warn('[pebble-agent] Request timed out')
            const fallback = buildLocalFallback(req)
            fallback.safety_flags.push('timeout_fallback')
            return enforceTierPolicy(req.tier, fallback)
        }
        console.error('[pebble-agent] Bedrock error:', err)
        return enforceTierPolicy(req.tier, buildLocalFallback(req))
    } finally {
        clearTimeout(timeout)
        client.destroy()
    }
}
