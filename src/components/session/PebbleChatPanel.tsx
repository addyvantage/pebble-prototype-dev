import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { askPebble } from '../../utils/pebbleLLM'
import { Globe, SendHorizontal, Settings2 } from 'lucide-react'

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
  className?: string
}

const CHAT_LANGUAGE_KEY = 'pebble.chatLanguage.v1'

const CHAT_LANGUAGES = [
  'English',
  'Hindi',
  'Bengali',
  'Telugu',
  'Marathi',
  'Tamil',
  'Urdu',
  'Gujarati',
  'Kannada',
  'Malayalam',
  'Odia',
  'Punjabi',
  'Assamese',
] as const

type ChatLanguage = (typeof CHAT_LANGUAGES)[number]

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

function isChatLanguage(value: string | null): value is ChatLanguage {
  return CHAT_LANGUAGES.includes((value ?? '') as ChatLanguage)
}

function resolveInitialChatLanguage() {
  if (typeof window === 'undefined') {
    return 'English' as ChatLanguage
  }

  const stored = window.localStorage.getItem(CHAT_LANGUAGE_KEY)
  return isChatLanguage(stored) ? stored : 'English'
}

function buildPrompt(input: {
  question: string
  unitTitle: string
  unitConcept: string
  runStatus: string
  runMessage: string
  failingSummary: string
  recentSummary: string
  chatLanguage: ChatLanguage
}) {
  const contextLines = [
    `Unit: ${input.unitTitle}`,
    `Concept: ${input.unitConcept}`,
    `Run status: ${input.runStatus}`,
    input.runMessage ? `Run output summary: ${input.runMessage}` : '',
    input.failingSummary ? `Failing tests: ${input.failingSummary}` : '',
    input.recentSummary ? `Recent chat summary: ${input.recentSummary}` : '',
    `User language preference: ${input.chatLanguage}. Respond in this language unless user asks otherwise.`,
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
  className,
}: PebbleChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'I can help with hints, debugging, and your next tiny step. Run tests and ask anytime.',
    },
  ])
  const [input, setInput] = useState('')
  const [assistantState, setAssistantState] = useState<'idle' | 'thinking' | 'typing'>('idle')
  const [typedDraft, setTypedDraft] = useState('')
  const [lastAsked, setLastAsked] = useState('')
  const [chatLanguage, setChatLanguage] = useState<ChatLanguage>(resolveInitialChatLanguage)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const abortRef = useRef<AbortController | null>(null)
  const typingTimerRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)

  const isGenerating = assistantState === 'thinking' || assistantState === 'typing'
  const recentSummary = useMemo(() => summarizeRecentChat(messages), [messages])
  const hasRunContext = runStatus !== 'idle' && runMessage.trim().length > 0

  useEffect(() => {
    onSummaryChange(recentSummary || initialSummary)
  }, [initialSummary, onSummaryChange, recentSummary])

  useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    window.localStorage.setItem(CHAT_LANGUAGE_KEY, chatLanguage)
  }, [chatLanguage])

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
        chatLanguage,
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
      chatLanguage,
      codeText,
      failingSummary,
      hasRunContext,
      pushAssistantWithTypewriter,
      recentSummary,
      runMessage,
      runStatus,
      unitConcept,
      unitTitle,
    ],
  )

  const quickActions = [
    {
      label: 'Hint',
      prompt: 'Give me one concise hint. Do not provide the full solution.',
    },
    {
      label: 'Explain',
      prompt: 'Explain what is wrong in my current approach using failing tests.',
    },
    {
      label: 'Next step',
      prompt: 'What is the next smallest step I should implement?',
    },
  ] as const

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
    <CardLayout className={className}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-pebble-accent/20 text-sm font-semibold text-white">
            P
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border border-[#0b1120] ${
                runStatus === 'success'
                  ? 'bg-pebble-success'
                  : runStatus === 'error'
                    ? 'bg-pebble-warning'
                    : 'bg-white/45'
              }`}
            />
          </div>
          <div>
            <p className="text-sm font-semibold text-white">Pebble</p>
            <p className="text-xs text-white/70">AI mentor in context</p>
          </div>
        </div>

        <div className="relative flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSettingsOpen((prev) => !prev)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/[0.05] text-white/75 transition hover:bg-white/[0.12]"
            title="Chat settings"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
          </button>
          <Badge variant={runStatus === 'success' ? 'success' : runStatus === 'error' ? 'warning' : 'neutral'}>
            {runStatus}
          </Badge>

          {settingsOpen && (
            <div className="absolute right-0 top-10 z-20 w-56 rounded-xl border border-white/12 bg-[#101827] p-3 shadow-[0_14px_34px_rgba(2,8,23,0.45)]">
              <label className="space-y-1">
                <span className="text-[11px] uppercase tracking-[0.06em] text-white/55">Chat language</span>
                <div className="relative">
                  <Globe className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-white/55" />
                  <select
                    value={chatLanguage}
                    onChange={(event) => setChatLanguage(event.target.value as ChatLanguage)}
                    className="w-full appearance-none rounded-lg border border-white/10 bg-white/[0.05] px-8 py-1.5 text-xs text-white outline-none focus:border-pebble-accent/45"
                  >
                    {CHAT_LANGUAGES.map((language) => (
                      <option key={language} value={language} className="bg-[#101827] text-white">
                        {language}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
              <p className="mt-2 text-[11px] text-white/55">Responses follow selected language preference.</p>
            </div>
          )}
        </div>
      </div>

      {hasRunContext && (
        <p className="inline-flex w-fit rounded-full border border-white/15 bg-white/[0.06] px-2.5 py-0.5 text-[11px] font-medium text-white/75">
          Using your run output
        </p>
      )}

      <div className="space-y-1.5">
        <div className="flex flex-wrap gap-1.5">
          {quickActions.map((action) => (
            <button
              key={action.label}
              type="button"
              className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs font-medium text-white/85 transition hover:bg-white/[0.12] disabled:opacity-50"
              onClick={() => void submitQuestion(action.prompt, true)}
              disabled={isGenerating}
            >
              {action.label}
            </button>
          ))}
        </div>
        <p className="text-xs text-white/58">
          {hasRunContext ? 'Guidance is grounded in your latest run.' : 'Run tests to unlock specific guidance.'}
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-black/20 p-3 pr-2">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[95%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
              message.role === 'user'
                ? 'ml-auto border border-pebble-accent/40 bg-pebble-accent/16 text-white'
                : 'mr-auto border border-white/10 bg-white/[0.07] text-white/90'
            }`}
          >
            {message.usedRunOutput && (
              <p className="mb-1 inline-flex rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.04em] text-white/60">
                using run output
              </p>
            )}
            <p className="whitespace-pre-wrap">{message.text}</p>
          </div>
        ))}

        {assistantState === 'thinking' && (
          <div className="mr-auto max-w-[95%] rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 text-sm text-white/80">
            Pebble is thinking...
          </div>
        )}

        {assistantState === 'typing' && (
          <div className="mr-auto max-w-[95%] rounded-xl border border-white/10 bg-white/[0.07] px-3 py-2 text-sm text-white/90">
            <p className="mb-1 inline-flex rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.04em] text-white/60">
              typing
            </p>
            <p className="whitespace-pre-wrap">{typedDraft}</p>
          </div>
        )}
      </div>

      <div className="space-y-1.5">
        {(isGenerating || !!lastAsked) && (
          <div className="flex items-center justify-end gap-1.5">
            {isGenerating ? (
              <Button variant="secondary" size="sm" onClick={cancelGeneration}>
                Stop
              </Button>
            ) : null}
            {!!lastAsked && !isGenerating ? (
              <Button variant="secondary" size="sm" onClick={() => void submitQuestion(lastAsked, false)}>
                Retry
              </Button>
            ) : null}
          </div>
        )}

        <div className="relative">
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                sendCurrentInput()
              }
            }}
            rows={1}
            placeholder="Ask Pebble..."
            className="min-h-[44px] w-full resize-none rounded-xl border border-white/15 bg-white/[0.06] px-3 py-2 pr-12 text-sm text-white outline-none placeholder:text-white/55 focus:border-pebble-accent/55"
          />
          <button
            type="button"
            onClick={sendCurrentInput}
            disabled={!canSend}
            className="absolute right-2 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-lg border border-pebble-accent/45 bg-pebble-accent/30 text-white transition hover:bg-pebble-accent/40 disabled:cursor-not-allowed disabled:opacity-45"
            title="Send"
          >
            <SendHorizontal className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </CardLayout>
  )
}

function CardLayout({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`relative flex h-full min-h-0 flex-col gap-2 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] p-3 ${className ?? ''}`}
    >
      {children}
    </div>
  )
}
