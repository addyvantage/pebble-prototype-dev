import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { askPebble } from '../../utils/pebbleLLM'
import { ArrowUp, Check, Globe, Settings2 } from 'lucide-react'
import { LANGUAGES, type LanguageCode } from '../../i18n/languages'
import { useI18n } from '../../i18n/useI18n'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
  usedRunOutput?: boolean
}

type PebbleChatPanelProps = {
  unitTitle: string
  unitConcept: string
  codeText: string
  runStatus: string
  runMessage: string
  failingSummary: string
  initialSummary: string
  onSummaryChange: (summary: string) => void
  onAssistAction?: (action: 'hint' | 'explain' | 'next') => void
  className?: string
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
  runStatus: string
  runMessage: string
  failingSummary: string
  recentSummary: string
  chatLanguage: LanguageCode
  chatLanguageLabel: string
}) {
  const contextLines = [
    `Unit: ${input.unitTitle}`,
    `Concept: ${input.unitConcept}`,
    `Run status: ${input.runStatus}`,
    input.runMessage ? `Run output summary: ${input.runMessage}` : '',
    input.failingSummary ? `Failing tests: ${input.failingSummary}` : '',
    input.recentSummary ? `Recent chat summary: ${input.recentSummary}` : '',
    `SYSTEM_LANGUAGE: ${input.chatLanguage} (${input.chatLanguageLabel}) [direction: ${
      input.chatLanguage === 'ur' ? 'rtl' : 'ltr'
    }]. Respond in this language unless user asks otherwise.`,
    `Question: ${input.question}`,
  ]

  return contextLines.filter(Boolean).join('\n')
}

export function PebbleChatPanel({
  unitTitle,
  unitConcept,
  codeText,
  runStatus,
  runMessage,
  failingSummary,
  initialSummary,
  onSummaryChange,
  onAssistAction,
  className,
}: PebbleChatPanelProps) {
  const { lang, setLang, t, isRTL } = useI18n()
  const isUrdu = isRTL
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

  const abortRef = useRef<AbortController | null>(null)
  const typingTimerRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)

  const isGenerating = assistantState === 'thinking' || assistantState === 'typing'
  const recentSummary = useMemo(() => summarizeRecentChat(messages), [messages])
  const hasRunContext = runStatus !== 'idle' && runMessage.trim().length > 0
  const selectedLanguageOption = LANGUAGES.find((language) => language.code === lang) ?? LANGUAGES[0]

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
    async (question: string, appendUser = true) => {
      if (!question.trim()) {
        return
      }

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
      const prompt = buildPrompt({
        question,
        unitTitle,
        unitConcept,
        runStatus,
        runMessage,
        failingSummary,
        recentSummary,
        chatLanguage: lang,
        chatLanguageLabel: selectedLanguageOption.nativeName,
      })

      try {
        const answer = await askPebble({
          prompt,
          signal: controller.signal,
          context: {
            taskTitle: unitTitle,
            codeText: codeText.length > 4000 ? `${codeText.slice(0, 4000)}\n...[trimmed]` : codeText,
            runStatus,
            runMessage,
            currentErrorKey: null,
            nudgeVisible: false,
            guidedActive: false,
            struggleScore: runStatus === 'error' ? 70 : 35,
            repeatErrorCount: runStatus === 'error' ? 1 : 0,
            errorHistory: failingSummary ? [failingSummary] : [],
          },
        })

        if (requestIdRef.current !== requestId) {
          return
        }

        setAssistantState('idle')
        pushAssistantWithTypewriter(answer, requestId, usesRunOutput)
      } finally {
        if (abortRef.current === controller) {
          abortRef.current = null
        }
      }
    },
    [
      codeText,
      failingSummary,
      hasRunContext,
      lang,
      pushAssistantWithTypewriter,
      recentSummary,
      runMessage,
      runStatus,
      selectedLanguageOption.nativeName,
      unitConcept,
      unitTitle,
    ],
  )

  const quickActions = [
    {
      action: 'hint' as const,
      label: t('chat.quickHint'),
      prompt: 'Give me one concise hint. Do not provide the full solution.',
    },
    {
      action: 'explain' as const,
      label: t('chat.quickExplain'),
      prompt: 'Explain what is wrong in my current approach using failing tests.',
    },
    {
      action: 'next' as const,
      label: t('chat.quickNextStep'),
      prompt: 'What is the next smallest step I should implement?',
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
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-pebble-border/35 bg-pebble-accent/18 text-sm font-semibold text-pebble-text-primary">
            P
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-pebble-panel ${
                runStatus === 'success'
                  ? 'bg-pebble-success'
                  : runStatus === 'error'
                    ? 'bg-pebble-warning'
                    : 'bg-pebble-text-secondary/65'
              }`}
            />
          </div>
          <div>
            <p className={`text-sm font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{t('chat.title')}</p>
            <p className={`text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{t('chat.subtitle')}</p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-pebble-border/30 bg-pebble-overlay/[0.08] text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.16] hover:text-pebble-text-primary"
            title={t('a11y.openChatSettings')}
            aria-label={t('a11y.openChatSettings')}
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <Badge variant={runStatus === 'success' ? 'success' : runStatus === 'error' ? 'warning' : 'neutral'}>
            {runStatusLabel}
          </Badge>

          {settingsOpen && (
            <div className="absolute right-0 top-10 z-20 w-72 rounded-xl border border-pebble-border/35 bg-pebble-panel/95 p-3 shadow-[0_14px_34px_rgba(2,8,23,0.3)]">
              <p className="text-[11px] uppercase tracking-[0.06em] text-pebble-text-muted">{t('chat.language')}</p>
              <div className="mt-2 max-h-64 space-y-1 overflow-y-auto pr-1">
                {LANGUAGES.map((language) => {
                  const selected = language.code === lang
                  return (
                    <button
                      key={language.code}
                      type="button"
                      onClick={() => setLang(language.code)}
                      className={`flex w-full items-center gap-2 rounded-lg border px-2.5 py-1.5 text-left transition ${
                        selected
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
              <p className={`mt-2 text-[11px] text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{t('chat.replyLanguageHint')}</p>
            </div>
          )}
        </div>
      </div>

      {hasRunContext && (
        <p className={`inline-flex w-fit rounded-full border border-pebble-border/35 bg-pebble-overlay/[0.1] px-2.5 py-0.5 text-[11px] font-medium text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
          {t('chat.usingRunOutput')}
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.08] px-3 py-1 text-xs font-medium text-pebble-text-primary transition hover:bg-pebble-overlay/[0.16] disabled:opacity-50"
              onClick={() => {
                onAssistAction?.(action.action)
                void submitQuestion(action.prompt, true)
              }}
              disabled={isGenerating}
            >
              {action.label}
            </button>
          ))}
        </div>
        <p className={`text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
          {hasRunContext ? t('chat.helperGrounded') : t('chat.helperUnlock')}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-pebble-border/30 bg-pebble-canvas/45 p-3 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[95%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'ml-auto border border-pebble-accent/40 bg-pebble-accent/16 text-pebble-text-primary'
                : 'mr-auto border border-pebble-border/30 bg-pebble-overlay/[0.08] text-pebble-text-primary'
            }`}
          >
            {message.usedRunOutput && (
              <p className="mb-1 inline-flex rounded-full border border-pebble-border/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.04em] text-pebble-text-secondary">
                {t('chat.usingRunOutputTag')}
              </p>
            )}
            <p className={`whitespace-pre-wrap ${isUrdu ? 'rtlText' : ''}`}>{message.text}</p>
          </div>
        ))}

        {assistantState === 'thinking' && (
          <div className={`mr-auto max-w-[95%] rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.08] px-3 py-2 text-sm text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
            {t('chat.thinking')}
          </div>
        )}

        {assistantState === 'typing' && (
          <div className="mr-auto max-w-[95%] rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.08] px-3 py-2 text-sm text-pebble-text-primary">
            <p className="mb-1 inline-flex rounded-full border border-pebble-border/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.04em] text-pebble-text-secondary">
              {t('chat.typing')}
            </p>
            <p className={`whitespace-pre-wrap ${isUrdu ? 'rtlText' : ''}`}>{typedDraft}</p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {(isGenerating || !!lastAsked) && (
          <div className="flex items-center justify-end gap-1.5">
            {isGenerating ? (
              <Button variant="secondary" size="sm" onClick={cancelGeneration}>
                {t('actions.stop')}
              </Button>
            ) : null}
            {!!lastAsked && !isGenerating ? (
              <Button variant="secondary" size="sm" onClick={() => void submitQuestion(lastAsked, false)}>
                {t('actions.retry')}
              </Button>
            ) : null}
          </div>
        )}

        <div className="relative flex h-11 items-center">
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
            className={`h-11 w-full rounded-xl border border-pebble-border/35 bg-pebble-overlay/[0.08] px-3 pr-12 text-sm leading-[1.25] text-pebble-text-primary outline-none placeholder:text-pebble-text-secondary focus:border-pebble-accent/55 ${
              isUrdu ? 'text-right' : 'text-left'
            }`}
          />
          <button
            type="button"
            onClick={sendCurrentInput}
            disabled={!canSend}
            className="absolute right-1.5 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-pebble-accent/45 bg-pebble-accent/30 text-pebble-text-primary transition hover:bg-pebble-accent/40 disabled:cursor-not-allowed disabled:opacity-45"
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
      className={`relative flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-2xl border border-pebble-border/30 bg-gradient-to-b from-pebble-overlay/[0.12] to-pebble-overlay/[0.04] p-3 ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
