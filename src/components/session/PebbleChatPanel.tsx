import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Badge } from '../ui/Badge'
import { Button } from '../ui/Button'
import { askPebble } from '../../utils/pebbleLLM'

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
}) {
  const contextLines = [
    `Unit: ${input.unitTitle}`,
    `Concept: ${input.unitConcept}`,
    `Run status: ${input.runStatus}`,
    input.runMessage ? `Run output summary: ${input.runMessage}` : '',
    input.failingSummary ? `Failing tests: ${input.failingSummary}` : '',
    input.recentSummary ? `Recent chat summary: ${input.recentSummary}` : '',
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

  const abortRef = useRef<AbortController | null>(null)
  const typingTimerRef = useRef<number | null>(null)
  const requestIdRef = useRef(0)

  const isGenerating = assistantState === 'thinking' || assistantState === 'typing'
  const recentSummary = useMemo(() => summarizeRecentChat(messages), [messages])

  useEffect(() => {
    onSummaryChange(recentSummary || initialSummary)
  }, [initialSummary, onSummaryChange, recentSummary])

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

      const usesRunOutput = Boolean(runMessage.trim())
      const prompt = buildPrompt({
        question,
        unitTitle,
        unitConcept,
        runStatus,
        runMessage,
        failingSummary,
        recentSummary,
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

  return (
    <CardLayout>
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-pebble-text-primary">Pebble Chat</p>
          <p className="text-xs text-pebble-text-secondary">Guidance tuned to your latest run.</p>
        </div>
        <Badge variant={runStatus === 'success' ? 'success' : runStatus === 'error' ? 'warning' : 'neutral'}>
          {runStatus}
        </Badge>
      </div>

      <div className="flex flex-wrap gap-2">
        {quickActions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="rounded-full border border-pebble-border/35 bg-pebble-overlay/[0.08] px-3 py-1 text-xs text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.16] hover:text-pebble-text-primary"
            onClick={() => void submitQuestion(action.prompt, true)}
            disabled={isGenerating}
          >
            {action.label}
          </button>
        ))}
      </div>

      <div className="max-h-[360px] space-y-2 overflow-y-auto rounded-xl border border-pebble-border/30 bg-pebble-canvas/70 p-3">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
              message.role === 'user'
                ? 'ml-auto border border-pebble-accent/35 bg-pebble-accent/14 text-pebble-text-primary'
                : 'mr-auto border border-pebble-border/30 bg-pebble-overlay/[0.09] text-pebble-text-secondary'
            }`}
          >
            {message.usedRunOutput && (
              <p className="mb-1 inline-flex rounded-full border border-pebble-border/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.04em] text-pebble-text-muted">
                using run output
              </p>
            )}
            <p className="whitespace-pre-wrap">{message.text}</p>
          </div>
        ))}

        {assistantState === 'thinking' && (
          <div className="mr-auto max-w-[92%] rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.09] px-3 py-2 text-xs text-pebble-text-secondary">
            Pebble is thinking...
          </div>
        )}

        {assistantState === 'typing' && (
          <div className="mr-auto max-w-[92%] rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.09] px-3 py-2 text-xs text-pebble-text-secondary">
            <p className="mb-1 inline-flex rounded-full border border-pebble-border/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.04em] text-pebble-text-muted">
              typing
            </p>
            <p className="whitespace-pre-wrap">{typedDraft}</p>
          </div>
        )}
      </div>

      <div className="space-y-2">
        <textarea
          value={input}
          onChange={(event) => setInput(event.target.value)}
          rows={3}
          placeholder="Ask about your failing tests, edge cases, or next step..."
          className="w-full resize-none rounded-xl border border-pebble-border/35 bg-pebble-canvas/85 p-3 text-sm text-pebble-text-primary outline-none placeholder:text-pebble-text-muted focus:border-pebble-accent/60"
        />
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-pebble-text-muted">
            {runMessage ? 'Pebble can use your latest run result.' : 'Run tests to unlock more specific guidance.'}
          </p>
          <div className="flex items-center gap-2">
            {isGenerating && (
              <Button variant="secondary" size="sm" onClick={cancelGeneration}>
                Stop
              </Button>
            )}
            <Button
              size="sm"
              onClick={() => {
                const value = input.trim()
                if (!value) {
                  return
                }
                setInput('')
                void submitQuestion(value)
              }}
              disabled={isGenerating || !input.trim()}
            >
              Ask Pebble
            </Button>
            {!!lastAsked && !isGenerating && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void submitQuestion(lastAsked, false)}
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    </CardLayout>
  )
}

function CardLayout({ children }: { children: ReactNode }) {
  return (
    <div className="glass-panel soft-ring flex h-full min-h-[420px] flex-col gap-3 p-4">
      {children}
    </div>
  )
}
