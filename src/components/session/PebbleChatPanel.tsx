import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import pebblecodeIconDark from '../../assets/brand/pebblecode-icon-dark.jpg'
import { askPebble } from '../../utils/pebbleLLM'
import { askPebbleAgent, type AgentResponse, type HelpTier } from '../../utils/pebbleAgentClient'
import { ArrowUp, Check, Globe, Lightbulb, Search, Settings2, Wrench } from 'lucide-react'
import { LANGUAGES, type LanguageCode } from '../../i18n/languages'
import { useI18n } from '../../i18n/useI18n'
import { useTheme } from '../../hooks/useTheme'
import { StruggleNudgeBar, type StruggleNudgeAction } from './StruggleNudgeBar'
import type { StruggleContextSummary, StruggleLevel } from '../../lib/struggleEngine'
import { telemetry } from '../../lib/telemetry'
import { buildHintCards } from './hintCopy'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  usedRunOutput?: boolean
  agentResponse?: AgentResponse
}

type PebbleChatPanelProps = {
  unitId: string
  problemId: string | null
  unitTitle: string
  unitConcept: string
  language: string
  executionMode?: 'function' | 'stdio'
  requiredSignature?: string | null
  detectedSignature?: string | null
  liveCode: string
  getLiveCode?: () => string
  runStatus: string
  runMessage: string
  failingSummary: string
  signatureHelper?: {
    required: string
    found: string
  } | null
  initialSummary: string
  onSummaryChange: (summary: string) => void
  struggleLevel: StruggleLevel
  showStruggleNudge: boolean
  getStruggleContext?: () => StruggleContextSummary
  onAssistAction?: (action: StruggleNudgeAction) => void
  onStruggleDismiss?: () => void
  className?: string
}

function renderMarkdown(text: string): ReactNode {
  // Split on **bold** and `code` tokens, preserve everything else as plain text.
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-pebble-text-primary">
          {part.slice(2, -2)}
        </strong>
      )
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="rounded bg-pebble-overlay/[0.15] px-0.5 font-mono text-[0.85em]">
          {part.slice(1, -1)}
        </code>
      )
    }
    return part
  })
}

function formatAgentResponse(response: AgentResponse): string {
  const parts: string[] = []
  if (response.reasoning_brief) parts.push(response.reasoning_brief)
  if (response.hints.length > 0) parts.push('Hints:\n' + response.hints.map((hint, index) => `${index + 1}. ${hint}`).join('\n'))
  if (response.steps.length > 0) parts.push('Steps:\n' + response.steps.map((s, i) => `${i + 1}. ${s}`).join('\n'))
  if (response.patch_suggestion) parts.push('Suggested fix:\n' + response.patch_suggestion)
  return parts.join('\n\n') || 'No response.'
}

const INTERNAL_AGENT_FLAGS = new Set([
  'legacy_fallback',
  'agent_endpoint_unavailable',
  'agent_non_json_html',
  'agent_html_payload',
  'agent_unexpected_shape',
  'agent_fetch_failed',
  'local_fallback',
  'json_parse_fallback',
  'timeout_fallback',
])

function formatDebugFlag(flag: string) {
  return flag.replace(/_/g, ' ')
}

function AgentResponseView({
  response,
  showDebugFlags,
}: {
  response: AgentResponse
  showDebugFlags: boolean
}) {
  const hintCards = buildHintCards(response.hints)
  const visibleDebugFlags = showDebugFlags
    ? response.safety_flags.filter((flag) => flag.trim().length > 0)
    : response.safety_flags.filter((flag) => !INTERNAL_AGENT_FLAGS.has(flag))
  return (
    <div className="space-y-2">
      {/* Tier badge */}
      <span className="inline-flex rounded-full border border-pebble-accent/40 bg-pebble-accent/12 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-pebble-accent">
        T{response.tier} • {response.intent}
      </span>

      {/* Reasoning */}
      {response.reasoning_brief && (
        <p className="text-pebble-text-secondary">{response.reasoning_brief}</p>
      )}

      {/* Hints */}
      {response.hints.length > 0 && (
        <div>
          <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-pebble-text-muted">Hints</p>
          <div className="space-y-1.5">
            {hintCards.map((hint) => (
              <div
                key={hint.id}
                className="rounded-lg border border-pebble-border/35 bg-pebble-overlay/[0.07] px-2.5 py-2"
              >
                <p className="text-[9.5px] font-semibold uppercase tracking-[0.07em] text-pebble-accent">{hint.label}</p>
                <p className="mt-0.5 text-[12px] leading-relaxed text-pebble-text-primary">{renderMarkdown(hint.text)}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Steps */}
      {response.steps.length > 0 && (
        <div>
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-pebble-text-muted">Next steps</p>
          <ol className="space-y-0.5">
            {response.steps.map((step, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="shrink-0 text-[10px] font-bold text-pebble-accent">{i + 1}.</span>
                <span>{renderMarkdown(step)}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Patch suggestion */}
      {response.patch_suggestion && (
        <div>
          <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-pebble-text-muted">Suggested fix</p>
          <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg border border-pebble-border/25 bg-pebble-overlay/[0.06] p-2 font-mono text-[11px] text-pebble-text-primary">
            {response.patch_suggestion}
          </pre>
        </div>
      )}

      {/* Safety flags (debug-only for infra internals) */}
      {visibleDebugFlags.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {visibleDebugFlags.map((flag, i) => (
            <span key={i} className="rounded-full border border-pebble-warning/40 bg-pebble-warning/12 px-1.5 py-0.5 text-[9px] font-medium text-pebble-warning">
              {formatDebugFlag(flag)}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

const TYPE_MIN = 1
const TYPE_MAX = 3
const TYPE_MS = 26

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function summarizeRecentChat(messages: ChatMessage[]) {
  return messages
    .slice(-4)
    .map((message) => `${message.role === 'user' ? 'U' : 'A'}: ${message.text.replace(/\s+/g, ' ').trim()}`)
    .join(' | ')
    .slice(0, 360)
}

function buildPrompt(input: {
  question: string
  unitTitle: string
  unitConcept: string
  language: string
  executionMode: 'function' | 'stdio'
  requiredSignature: string
  detectedSignature: string
  runStatus: string
  runMessage: string
  failingSummary: string
  recentSummary: string
  helpTier: 1 | 2 | 3
  struggleContext: StruggleContextSummary
  chatLanguage: LanguageCode
  chatLanguageLabel: string
}) {
  const tierInstruction =
    input.helpTier === 1
      ? 'Help tier: 1 (hint only, no full solution code).'
      : input.helpTier === 2
        ? 'Help tier: 2 (explain root cause and provide guided next steps).'
        : 'Help tier: 3 (full solution allowed with clear explanation).'

  const contextLines = [
    `Unit: ${input.unitTitle}`,
    `Concept: ${input.unitConcept}`,
    `Language: ${input.language}`,
    `Execution mode: ${input.executionMode}`,
    input.requiredSignature ? `Required signature: ${input.requiredSignature}` : '',
    input.detectedSignature ? `Detected signature: ${input.detectedSignature}` : '',
    `Run status: ${input.runStatus}`,
    input.runMessage ? `Run output summary: ${input.runMessage}` : '',
    input.failingSummary ? `Failing tests: ${input.failingSummary}` : '',
    `Struggle context: failStreak=${input.struggleContext.runFailStreak}, stuck=${input.struggleContext.timeStuckSeconds}s, lastError=${input.struggleContext.lastErrorType ?? 'none'}, level=${input.struggleContext.level}`,
    tierInstruction,
    input.recentSummary ? `Recent chat summary: ${input.recentSummary}` : '',
    `SYSTEM_LANGUAGE: ${input.chatLanguage} (${input.chatLanguageLabel}) [direction: ${input.chatLanguage === 'ur' ? 'rtl' : 'ltr'
    }]. Respond in this language unless user asks otherwise.`,
    input.requiredSignature
      ? 'CONTRACT: Required signature is mandatory. Keep it unchanged. For function mode, return the expected value and do not suggest printing unless explicitly requested.'
      : input.executionMode === 'stdio'
        ? 'CONTRACT: This unit is stdio-mode. Reading input and printing output is expected.'
        : '',
    `Question: ${input.question}`,
  ]

  return contextLines.filter(Boolean).join('\n')
}

export function PebbleChatPanel({
  unitId,
  problemId,
  unitTitle,
  unitConcept,
  language,
  executionMode = 'stdio',
  requiredSignature = null,
  detectedSignature = null,
  liveCode,
  getLiveCode,
  runStatus,
  runMessage,
  failingSummary,
  signatureHelper,
  initialSummary,
  onSummaryChange,
  struggleLevel,
  showStruggleNudge,
  getStruggleContext,
  onAssistAction,
  onStruggleDismiss,
  className,
}: PebbleChatPanelProps) {
  const { lang, setLang, t, isRTL } = useI18n()
  const isUrdu = isRTL
  const { theme } = useTheme()
  const dark = theme === 'dark'
  const [avatarHovered, setAvatarHovered] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: t('chat.starterMessage'),
    },
  ])
  const [input, setInput] = useState('')
  const [assistantState, setAssistantState] = useState<'idle' | 'thinking' | 'typing'>('idle')
  const [typedDraft, setTypedDraft] = useState('')
  const [lastAsked, setLastAsked] = useState('')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [selectedTier, setSelectedTier] = useState<HelpTier>(1)
  const [useAgentMode, _setUseAgentMode] = useState(true)
  const [agentError, setAgentError] = useState<string | null>(null)
  const [showDebugFlags, setShowDebugFlags] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const typingTimerRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)

  const isGenerating = assistantState === 'thinking' || assistantState === 'typing'
  const recentSummary = useMemo(() => summarizeRecentChat(messages), [messages])
  const hasRunContext = runStatus !== 'idle' && runMessage.trim().length > 0
  const selectedLanguageOption = LANGUAGES.find((language) => language.code === lang) ?? LANGUAGES[0]
  const nudgeLevel = showStruggleNudge && struggleLevel > 0 ? (struggleLevel as Exclude<StruggleLevel, 0>) : null

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }
    try {
      const params = new URLSearchParams(window.location.search)
      const enabledFromQuery = params.get('debugAgentFlags') === '1'
      const enabledFromStorage = window.localStorage.getItem('pebble.debug.agentFlags') === '1'
      setShowDebugFlags(enabledFromQuery || enabledFromStorage)
    } catch {
      setShowDebugFlags(false)
    }
  }, [])

  const runStatusLabel = useMemo(() => {
    if (runStatus === 'success') {
      return t('status.success')
    }
    if (runStatus === 'error') {
      return t('status.error')
    }
    if (runStatus === 'running') {
      return t('status.running')
    }
    return t('status.idle')
  }, [runStatus, t])

  useEffect(() => {
    onSummaryChange(recentSummary || initialSummary)
  }, [initialSummary, onSummaryChange, recentSummary])

  useEffect(() => {
    setMessages((prev) =>
      prev.map((message) =>
        message.id === 'welcome'
          ? {
            ...message,
            text: t('chat.starterMessage'),
          }
          : message,
      ),
    )
  }, [t, lang])

  const clearTyping = useCallback(() => {
    if (typingTimerRef.current !== null) {
      window.clearInterval(typingTimerRef.current)
      typingTimerRef.current = null
    }
  }, [])

  const cancelGeneration = useCallback(() => {
    requestIdRef.current += 1
    abortRef.current?.abort()
    abortRef.current = null
    clearTyping()
    setTypedDraft('')
    setAssistantState('idle')
  }, [clearTyping])

  useEffect(() => {
    return () => {
      cancelGeneration()
    }
  }, [cancelGeneration])

  const pushAssistantWithTypewriter = useCallback(
    (text: string, requestId: number, usedRunOutput: boolean) => {
      clearTyping()
      setAssistantState('typing')
      setTypedDraft('')

      let cursor = 0
      typingTimerRef.current = window.setInterval(() => {
        if (requestIdRef.current !== requestId) {
          clearTyping()
          return
        }

        const chunk = clamp(Math.floor(Math.random() * TYPE_MAX) + 1, TYPE_MIN, TYPE_MAX)
        cursor = Math.min(text.length, cursor + chunk)
        setTypedDraft(text.slice(0, cursor))

        if (cursor >= text.length) {
          clearTyping()
          setAssistantState('idle')
          setTypedDraft('')
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text,
              usedRunOutput,
            },
          ])
        }
      }, TYPE_MS)
    },
    [clearTyping],
  )

  const submitQuestion = useCallback(
    async (
      question: string,
      options?: {
        appendUser?: boolean
        helpTier?: 1 | 2 | 3
      },
    ) => {
      if (!question.trim()) {
        return
      }
      const appendUser = options?.appendUser ?? true

      const requestId = requestIdRef.current + 1
      requestIdRef.current = requestId
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller

      if (appendUser) {
        setMessages((prev) => [
          ...prev,
          { id: `user-${Date.now()}`, role: 'user', text: question },
        ])
      }

      setLastAsked(question)
      setAssistantState('thinking')
      setTypedDraft('')

      const usesRunOutput = hasRunContext
      const helpTier =
        options?.helpTier ?? selectedTier
      const struggleContext = getStruggleContext?.() ?? {
        level: struggleLevel,
        runFailStreak: runStatus === 'error' ? 1 : 0,
        timeStuckSeconds: 0,
        lastErrorType: null,
      }

      const isUserMessage = appendUser
      if (isUserMessage) {
        telemetry.track('pebble_chat.message_sent', {
          messageType: 'user'
        }, {
          page: 'session',
          problemId: problemId,
          language: language
        })
      }

      const codeNow = (getLiveCode?.() ?? liveCode).trimEnd()

      // 13 s hard timeout — aborts the controller so pebbleAgentClient returns
      // its built-in AbortError fallback instead of hanging forever.
      const timeoutId = window.setTimeout(() => controller.abort(), 13_000)

      setAgentError(null)

      try {
        if (useAgentMode) {
          // ── Agent mode: structured JSON response ──────────────────────
          const agentResult = await askPebbleAgent({
            tier: helpTier,
            question,
            codeExcerpt: codeNow.length > 3000 ? `${codeNow.slice(0, 3000)}\n...[trimmed]` : codeNow,
            language,
            executionMode,
            requiredSignature: requiredSignature ?? undefined,
            detectedSignature: detectedSignature ?? undefined,
            runStatus,
            runMessage,
            failingSummary,
            unitTitle,
            unitConcept,
            struggleContext,
            signal: controller.signal,
          })

          if (requestIdRef.current !== requestId) return

          // Format as readable text for the typewriter
          const formattedText = formatAgentResponse(agentResult)
          setAssistantState('idle')
          // Push with agent response metadata attached
          clearTyping()
          setMessages((prev) => [
            ...prev,
            {
              id: `assistant-${Date.now()}`,
              role: 'assistant',
              text: formattedText,
              usedRunOutput: usesRunOutput,
              agentResponse: agentResult,
            },
          ])
        } else {
          // ── Legacy mode: plain text ───────────────────────────────────
          const prompt = buildPrompt({
            question,
            unitTitle,
            unitConcept,
            language,
            executionMode,
            requiredSignature: requiredSignature ?? '',
            detectedSignature: detectedSignature ?? '',
            runStatus,
            runMessage,
            failingSummary,
            recentSummary,
            helpTier,
            struggleContext,
            chatLanguage: lang,
            chatLanguageLabel: selectedLanguageOption.nativeName,
          })

          const answer = await askPebble({
            prompt,
            signal: controller.signal,
            context: {
              taskTitle: unitTitle,
              codeText: codeNow.length > 6000 ? `${codeNow.slice(0, 6000)}\n...[trimmed]` : codeNow,
              runStatus,
              runMessage,
              language,
              executionMode,
              requiredSignature: requiredSignature ?? '',
              detectedSignature: detectedSignature ?? '',
              unitId,
              problemId: problemId ?? undefined,
              helpTier,
              struggleContext,
              currentErrorKey: null,
              nudgeVisible: nudgeLevel !== null,
              guidedActive: false,
              struggleScore: Math.min(100, Math.max(10, struggleContext.level * 30 + struggleContext.runFailStreak * 6)),
              repeatErrorCount: struggleContext.runFailStreak,
              errorHistory: failingSummary ? [failingSummary] : [],
            },
          })

          if (requestIdRef.current !== requestId) return
          setAssistantState('idle')
          pushAssistantWithTypewriter(answer, requestId, usesRunOutput)
        }

        telemetry.track('pebble_chat.response_received', {
          messageType: 'assistant'
        }, {
          page: 'session',
          problemId: problemId,
          language: language
        })
      } catch (err) {
        if (requestIdRef.current !== requestId) return
        const msg = err instanceof Error ? err.message : 'Something went wrong.'
        setAssistantState('idle')
        setAgentError(msg)
      } finally {
        window.clearTimeout(timeoutId)
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    [
      failingSummary,
      executionMode,
      getLiveCode,
      getStruggleContext,
      hasRunContext,
      language,
      lang,
      liveCode,
      nudgeLevel,
      problemId,
      pushAssistantWithTypewriter,
      clearTyping,
      requiredSignature,
      detectedSignature,
      recentSummary,
      runMessage,
      runStatus,
      struggleLevel,
      selectedTier,
      useAgentMode,
      selectedLanguageOption.nativeName,
      unitId,
      unitConcept,
      unitTitle,
      setAgentError,
    ],
  )

  const assistPromptByAction: Record<StruggleNudgeAction, string> = {
    hint: t('coach.promptHint'),
    explain: t('coach.promptExplain'),
    next: t('coach.promptNextStep'),
    solution: t('coach.promptSolution'),
  }

  const assistTierByAction: Record<StruggleNudgeAction, 1 | 2 | 3> = {
    hint: 1,
    explain: 2,
    next: 2,
    solution: 3,
  }

  const triggerAssistAction = useCallback(
    (action: StruggleNudgeAction) => {
      onAssistAction?.(action)
      void submitQuestion(assistPromptByAction[action], {
        appendUser: true,
        helpTier: assistTierByAction[action],
      })
    },
    [assistPromptByAction, onAssistAction, submitQuestion],
  )

  const quickActions = [
    {
      action: 'hint' as StruggleNudgeAction,
      label: t('coach.hint'),
    },
    {
      action: 'explain' as StruggleNudgeAction,
      label: t('coach.explain'),
    },
    {
      action: 'next' as StruggleNudgeAction,
      label: t('coach.nextStep'),
    },
  ]

  const canSend = !isGenerating && input.trim().length > 0

  function sendCurrentInput() {
    const value = input.trim()
    if (!value || isGenerating) {
      return
    }
    setInput('')
    void submitQuestion(value)
  }

  return (
    <CardLayout className={className} dir="ltr">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] transition-[box-shadow,transform] duration-300 motion-reduce:transition-none"
            style={{
              background: dark ? '#25304A' : '#E8EEFA',
              boxShadow: avatarHovered
                ? dark
                  ? '0 0 0 1px rgba(198,213,245,0.30), 0 0 14px 6px rgba(96,165,250,0.40), 0 0 28px 12px rgba(59,130,246,0.24), 0 0 44px 20px rgba(79,107,196,0.14)'
                  : '0 0 0 1px rgba(55,72,110,0.16), 0 0 14px 6px rgba(29,78,216,0.22), 0 0 28px 12px rgba(15,34,90,0.12), 0 0 44px 20px rgba(29,78,216,0.07)'
                : dark
                  ? '0 0 0 1px rgba(198,213,245,0.24), 0 0 10px 4px rgba(96,165,250,0.30), 0 0 22px 9px rgba(59,130,246,0.18), 0 0 34px 16px rgba(79,107,196,0.10)'
                  : '0 0 0 1px rgba(55,72,110,0.16), 0 0 10px 4px rgba(29,78,216,0.17), 0 0 22px 9px rgba(15,34,90,0.09), 0 0 34px 16px rgba(29,78,216,0.05)',
              transform: avatarHovered ? 'scale(1.02)' : 'scale(1)',
            }}
            onMouseEnter={() => setAvatarHovered(true)}
            onMouseLeave={() => setAvatarHovered(false)}
          >
            <img
              src={pebblecodeIconDark}
              alt="PebbleCode"
              draggable={false}
              className={`h-10 w-10 select-none rounded-full object-cover pointer-events-none ${
                dark ? 'brightness-[1.24] contrast-[1.06] saturate-110' : ''
              }`}
            />
          </div>
          <div>
            <p className={`text-base font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{t('chat.title')}</p>
            <p className={`text-xs uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>{t('chat.subtitle')}</p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.08] text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.16] hover:text-pebble-text-primary"
            title={t('a11y.openChatSettings')}
            aria-label={t('a11y.openChatSettings')}
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
          </button>
          {settingsOpen && (
            <div className="absolute right-0 top-10 z-20 w-72 rounded-xl border border-pebble-border/35 bg-pebble-panel/95 p-3 shadow-[0_14px_34px_rgba(2,8,23,0.3)]">
              <p className="text-xs uppercase tracking-[0.06em] text-pebble-text-muted">{t('chat.language')}</p>
              <div className="pebble-scrollbar mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
                {LANGUAGES.map((language) => {
                  const selected = language.code === lang
                  return (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => setLang(language.code)}
                      className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${selected
                        ? 'border-pebble-accent/45 bg-pebble-accent/14'
                        : 'border-pebble-border/25 bg-pebble-overlay/[0.05] hover:bg-pebble-overlay/[0.12]'
                        }`}
                    >
                      <span className="inline-flex w-4 justify-center">
                        {selected ? <Check className="h-3.5 w-3.5 text-pebble-accent" aria-hidden="true" /> : null}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p dir={language.direction} className="truncate text-sm text-pebble-text-primary">{language.nativeName}</p>
                        <p className="truncate text-xs text-pebble-text-secondary">{language.romanizedName}</p>
                      </div>
                      <Globe className="h-3.5 w-3.5 text-pebble-text-muted" aria-hidden="true" />
                    </button>
                  )
                })}
              </div>
              <p className={`mt-2 text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{t('chat.replyLanguageHint')}</p>
            </div>
          )}
        </div>
      </div>

      <div className="session-inset rounded-2xl px-3 py-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <p className={`text-[10px] font-semibold uppercase tracking-[0.12em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>Mentor context</p>
            <p className={`text-sm leading-6 text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
              {hasRunContext ? t('chat.helperGrounded') : t('chat.helperUnlock')}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {hasRunContext && (
              <p className={`inline-flex w-fit rounded-full border border-pebble-border/35 bg-pebble-overlay/[0.1] px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.06em] text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                {t('chat.usingRunOutput')}
              </p>
            )}
            <Badge variant={runStatus === 'success' ? 'success' : runStatus === 'error' ? 'warning' : 'neutral'}>
              {runStatusLabel}
            </Badge>
          </div>
        </div>
      </div>

      {signatureHelper ? (
        <div className="rounded-2xl border border-pebble-warning/35 bg-pebble-warning/12 px-3 py-3 text-[11px] text-pebble-text-primary">
          <p className={`font-semibold ${isUrdu ? 'rtlText' : ''}`}>{t('coach.requiredSignature')}</p>
          <p className="mt-0.5 ltrSafe font-mono text-[10px] text-pebble-text-primary">{signatureHelper.required}</p>
          <p className={`mt-0.5 ${isUrdu ? 'rtlText' : ''}`}>{t('coach.detectedSignature')}:</p>
          <p className="ltrSafe font-mono text-[10px] text-pebble-text-secondary">{signatureHelper.found}</p>
        </div>
      ) : null}

      <div className="space-y-2 rounded-2xl border border-pebble-border/20 bg-pebble-overlay/[0.05] px-3 py-3">
        <div className="flex flex-wrap gap-1.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="rounded-full border border-pebble-border/28 bg-pebble-overlay/[0.08] px-3 py-1.5 text-[11px] font-medium text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16] disabled:opacity-50"
              onClick={() => {
                triggerAssistAction(action.action)
              }}
              disabled={isGenerating}
            >
              {action.label}
            </button>
          ))}
        </div>

        {/* Tier selector pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          {([1, 2, 3] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTier(tier)}
              className={`rounded-full px-2.5 py-1 text-[10px] font-semibold transition ${selectedTier === tier
                ? 'border border-pebble-accent/50 bg-pebble-accent/20 text-pebble-text-primary'
                : 'border border-pebble-border/25 bg-pebble-overlay/[0.05] text-pebble-text-secondary hover:bg-pebble-overlay/[0.12]'
                }`}
            >
              T{tier}
            </button>
          ))}
          <span
            key={selectedTier}
            className="ml-1.5 inline-flex items-center gap-1 rounded-full border border-pebble-border/35 bg-pebble-accent/[0.10] px-2.5 py-1 text-[10px] font-medium text-pebble-text-primary motion-safe:animate-[tierFadeIn_150ms_ease-out]"
          >
            {selectedTier === 1 ? <Lightbulb className="h-3 w-3 text-pebble-accent" /> : selectedTier === 2 ? <Search className="h-3 w-3 text-pebble-accent" /> : <Wrench className="h-3 w-3 text-pebble-accent" />}
            {selectedTier === 1 ? 'Hint only' : selectedTier === 2 ? 'Explain + Approach' : 'Full fix'}
          </span>
        </div>

        <p className={`text-[10px] uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>
          {selectedTier === 1 ? 'Nudge only' : selectedTier === 2 ? 'Explain with direction' : 'Guided full fix'}
        </p>
      </div>

      {/* Messages own the vertical scroll so long hints never stretch the session shell. */}
      <div className="pebble-scrollbar session-inset min-h-0 flex-1 space-y-2 overflow-y-auto rounded-[24px] p-3 pr-3">
        {messages.length === 1 && assistantState === 'idle' && !agentError ? (
          <div className="rounded-2xl border border-pebble-border/20 bg-pebble-overlay/[0.05] px-3.5 py-3.5 text-sm text-pebble-text-secondary">
            <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pebble-text-muted">Need a nudge?</p>
            <p className={`mt-2 leading-6 ${isUrdu ? 'rtlText' : ''}`}>
              Ask Pebble for a hint, a clearer explanation, or the next recovery step after a failed run.
            </p>
          </div>
        ) : null}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[95%] rounded-2xl px-3 py-2.5 text-[13px] leading-7 ${message.role === 'user'
              ? 'ml-auto border border-pebble-accent/40 bg-pebble-accent/16 text-pebble-text-primary'
              : 'mr-auto border border-pebble-border/24 bg-pebble-overlay/[0.08] text-pebble-text-primary'
              }`}
          >
            {message.usedRunOutput && (
              <p className="mb-1 inline-flex rounded-full border border-pebble-border/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.04em] text-pebble-text-secondary">
                {t('chat.usingRunOutputTag')}
              </p>
            )}
            {message.agentResponse ? (
              <AgentResponseView response={message.agentResponse} showDebugFlags={showDebugFlags} />
            ) : (
              <p className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${isUrdu ? 'rtlText' : ''}`}>{renderMarkdown(message.text)}</p>
            )}
          </div>
        ))}

        {assistantState === 'thinking' && (
          <div className={`mr-auto max-w-[95%] rounded-2xl border border-pebble-border/24 bg-pebble-overlay/[0.08] px-3 py-2.5 text-xs text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
            <span className="inline-flex items-center gap-1.5">
              <span className="inline-flex gap-0.5">
                <span className="h-1 w-1 animate-pulse rounded-full bg-pebble-accent/70" style={{ animationDelay: '0ms' }} />
                <span className="h-1 w-1 animate-pulse rounded-full bg-pebble-accent/70" style={{ animationDelay: '200ms' }} />
                <span className="h-1 w-1 animate-pulse rounded-full bg-pebble-accent/70" style={{ animationDelay: '400ms' }} />
              </span>
              {useAgentMode ? 'Agent thinking…' : t('chat.thinking')}
            </span>
          </div>
        )}

        {agentError && assistantState === 'idle' && (
          <div className="mr-auto max-w-[95%] rounded-2xl border border-pebble-warning/40 bg-pebble-warning/10 px-3 py-2.5 text-xs text-pebble-text-primary">
            <p className="font-medium text-pebble-warning">Couldn't reach Pebble</p>
            <p className="mt-0.5 text-pebble-text-secondary">{agentError}</p>
            {lastAsked && (
              <button
                type="button"
                onClick={() => { setAgentError(null); void submitQuestion(lastAsked, { appendUser: false }) }}
                className="mt-1.5 rounded-lg border border-pebble-border/30 bg-pebble-overlay/[0.10] px-2 py-0.5 text-[11px] font-medium text-pebble-text-primary transition hover:bg-pebble-overlay/[0.20]"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {assistantState === 'typing' && (
          <div className="mr-auto max-w-[95%] rounded-2xl border border-pebble-border/24 bg-pebble-overlay/[0.08] px-3 py-2.5 text-xs text-pebble-text-primary">
            <p className="mb-1 inline-flex rounded-full border border-pebble-border/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.04em] text-pebble-text-secondary">
              {t('chat.typing')}
            </p>
            <p className={`whitespace-pre-wrap break-words [overflow-wrap:anywhere] ${isUrdu ? 'rtlText' : ''}`}>{renderMarkdown(typedDraft)}</p>
          </div>
        )}
      </div>

      {nudgeLevel ? (
        <StruggleNudgeBar
          level={nudgeLevel}
          visible={!isGenerating}
          busy={isGenerating}
          onAction={triggerAssistAction}
          onDismiss={() => onStruggleDismiss?.()}
        />
      ) : null}

      <div className="shrink-0 space-y-2 border-t border-pebble-border/20 pt-2">
        {(isGenerating || !!lastAsked) && (
          <div className="flex items-center justify-end gap-1.5">
            {isGenerating ? (
              <Button variant="secondary" size="sm" onClick={cancelGeneration}>
                {t('actions.stop')}
              </Button>
            ) : null}
            {!!lastAsked && !isGenerating ? (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void submitQuestion(lastAsked, { appendUser: false })}
              >
                {t('actions.retry')}
              </Button>
            ) : null}
          </div>
        )}

        <div className="relative flex h-12 items-center">
          <input
            type="text"
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                sendCurrentInput()
              }
            }}
            placeholder={t('chat.placeholder')}
            dir={isUrdu ? 'rtl' : 'ltr'}
            className={`h-12 w-full rounded-2xl border border-pebble-border/35 bg-pebble-overlay/[0.08] px-4 pr-14 text-sm leading-[1.25] text-pebble-text-primary outline-none placeholder:text-pebble-text-secondary focus:border-pebble-accent/55 ${isUrdu ? 'text-right' : 'text-left'
              }`}
          />
          <button
            type="button"
            onClick={sendCurrentInput}
            disabled={!canSend}
            className="absolute right-2 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-xl border border-pebble-accent/45 bg-pebble-accent/30 text-pebble-text-primary transition hover:bg-pebble-accent/40 disabled:cursor-not-allowed disabled:opacity-45"
            title={t('actions.send')}
            aria-label={t('a11y.sendMessage')}
          >
            <ArrowUp className="h-[17px] w-[17px] leading-none" aria-hidden="true" />
          </button>
        </div>
      </div>
    </CardLayout>
  )
}

function CardLayout({
  children,
  className,
  dir,
}: {
  children: ReactNode
  className?: string
  dir?: 'ltr' | 'rtl'
}) {
  return (
    <div
      dir={dir}
      className={`session-surface relative flex h-full min-h-0 flex-col gap-3 overflow-hidden rounded-[28px] p-3.5 ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
