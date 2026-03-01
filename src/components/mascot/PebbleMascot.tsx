import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { PEBBLE_CLARIFY_RULE, PEBBLE_OUTPUT_RULE } from '../../shared/pebblePromptRules'
import { askPebble } from '../../utils/pebbleLLM'
import { safeGetItem, safeSetJSON } from '../../lib/safeStorage'

export type MascotContextData = {
  phase: string
  currentTaskTitle: string
  runStatus: string
  runMessage: string
  moduleProgress: {
    completedCount: number
    totalCount: number
  }
  mascotLine: string
  nudgeVisible: boolean
  guidedStep?: { current: number; total: number }
  guidedActive: boolean
  currentErrorKey: string | null
  codeText: string
  struggleScore: number
  repeatErrorCount: number
  errorHistory: string[]
  isAfk: boolean
}

type AssistantState = 'idle' | 'thinking' | 'typing' | 'done'
type Expression = 'calm' | 'thinking' | 'concerned' | 'panic' | 'proud' | 'afk'
type MemoryTurn = {
  role: 'user' | 'assistant'
  content: string
  ts: number
  kind: 'question' | 'answer' | 'clarifying_question' | 'error_answer'
}

const STORAGE_KEY = 'pebble_mascot_position_v1'
const MASCOT_SIZE = 72
const VIEWPORT_PADDING = 24
const RESET_OUTSIDE_THRESHOLD = 200
const TYPEWRITER_MIN_CHARS = 1
const TYPEWRITER_MAX_CHARS = 3
const TYPEWRITER_TICK_MS = 28

type Position = { x: number; y: number }

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

function getViewportBounds() {
  const minX = VIEWPORT_PADDING
  const minY = VIEWPORT_PADDING
  const maxX = Math.max(minX, window.innerWidth - MASCOT_SIZE - VIEWPORT_PADDING)
  const maxY = Math.max(minY, window.innerHeight - MASCOT_SIZE - VIEWPORT_PADDING)
  return { minX, maxX, minY, maxY }
}

function defaultPosition() {
  if (typeof window === 'undefined') {
    return { x: VIEWPORT_PADDING, y: VIEWPORT_PADDING }
  }

  const bounds = getViewportBounds()
  return {
    x: bounds.maxX,
    y: bounds.maxY,
  }
}

function clampPosition(position: Position) {
  if (typeof window === 'undefined') {
    return position
  }

  const bounds = getViewportBounds()
  return {
    x: clamp(position.x, bounds.minX, bounds.maxX),
    y: clamp(position.y, bounds.minY, bounds.maxY),
  }
}

function isValidPosition(position: Partial<Position> | null | undefined): position is Position {
  return (
    position !== null &&
    position !== undefined &&
    typeof position.x === 'number' &&
    Number.isFinite(position.x) &&
    typeof position.y === 'number' &&
    Number.isFinite(position.y)
  )
}

function isPositionFarOutside(position: Position, bounds: ReturnType<typeof getViewportBounds>) {
  return (
    position.x < bounds.minX - RESET_OUTSIDE_THRESHOLD ||
    position.x > bounds.maxX + RESET_OUTSIDE_THRESHOLD ||
    position.y < bounds.minY - RESET_OUTSIDE_THRESHOLD ||
    position.y > bounds.maxY + RESET_OUTSIDE_THRESHOLD
  )
}

function getSafePosition(storedPosition?: Partial<Position> | null): Position {
  if (typeof window === 'undefined') {
    return { x: VIEWPORT_PADDING, y: VIEWPORT_PADDING }
  }

  const fallback = defaultPosition()
  const bounds = getViewportBounds()
  if (!isValidPosition(storedPosition)) {
    return fallback
  }

  if (isPositionFarOutside(storedPosition, bounds)) {
    return fallback
  }

  return clampPosition(storedPosition)
}

function readStoredPosition() {
  if (typeof window === 'undefined') {
    return null
  }

  const raw = safeGetItem(STORAGE_KEY)
  if (!raw) {
    return null
  }

  try {
    const parsed = JSON.parse(raw) as Partial<Position>
    return parsed
  } catch {
    return null
  }
}

function persistPosition(position: Position) {
  if (typeof window === 'undefined') {
    return
  }

  safeSetJSON(STORAGE_KEY, position, { maxBytes: 512, silent: true })
}

function trimMemory(memory: MemoryTurn[]) {
  return memory.slice(-6)
}

function trimCode(codeText: string, maxChars = 4000) {
  if (codeText.length <= maxChars) {
    return codeText
  }

  const marker = '\n...[code trimmed for context]...\n'
  const remaining = Math.max(0, maxChars - marker.length)
  const headSize = Math.floor(remaining / 2)
  const tailSize = remaining - headSize
  return `${codeText.slice(0, headSize)}${marker}${codeText.slice(codeText.length - tailSize)}`
}

function formatMemory(memory: MemoryTurn[]) {
  if (memory.length === 0) {
    return ''
  }

  const lines = memory.map((turn) => {
    if (turn.role === 'user') {
      return `User: ${turn.content}`
    }
    if (turn.kind === 'clarifying_question') {
      return `Pebble (clarifying): ${turn.content}`
    }
    if (turn.kind === 'error_answer') {
      return `Pebble (error): ${turn.content}`
    }
    return `Pebble: ${turn.content}`
  })
  return lines.join('\n')
}

function getLastUserQuestion(memory: MemoryTurn[]) {
  for (let index = memory.length - 1; index >= 0; index -= 1) {
    const turn = memory[index]
    if (turn.role === 'user' && turn.kind === 'question') {
      return turn.content
    }
  }
  return ''
}

function isErrorishAnswer(answer: string) {
  const normalized = answer.trim().toLowerCase()
  if (!normalized) {
    return false
  }

  const markers = [
    'timed out',
    'temporary issue',
    'request failed',
    'returned an empty response',
    'returned no text output',
  ]
  if (markers.some((marker) => normalized.includes(marker))) {
    return true
  }

  return normalized.length <= 60 && normalized.includes('try again')
}

function classifyAssistantKind(answer: string): MemoryTurn['kind'] {
  if (isErrorishAnswer(answer)) {
    return 'error_answer'
  }

  const normalized = answer.trim()
  const lineCount = normalized.split('\n').filter(Boolean).length
  if (normalized.endsWith('?') && lineCount <= 2) {
    return 'clarifying_question'
  }

  return 'answer'
}

function normalizeAskFailureMessage(answer: string) {
  const normalized = answer.trim()
  if (!/pebble request failed/i.test(normalized)) {
    return answer
  }

  const match = normalized.match(/\bstatus\s+(\d{3})\b/i)
  if (match?.[1]) {
    return `Pebble request failed (status ${match[1]}). Open console / Vercel logs.`
  }
  return 'Pebble request failed. Open console / Vercel logs.'
}

function buildPebblePrompt(question: string, data: MascotContextData, memory: MemoryTurn[]) {
  const recentErrors = data.errorHistory.slice(-3)
  const lastUserQuestion = getLastUserQuestion(memory)
  const memoryBlock = formatMemory(memory)
  const includeLastQuestion = lastUserQuestion && lastUserQuestion !== question

  return [
    `Current user question: ${question}`,
    memoryBlock ? `Recent memory:\n${memoryBlock}` : '',
    `Context: struggleScore=${data.struggleScore}; repeatErrorCount=${data.repeatErrorCount}; guidedActive=${data.guidedActive ? 'true' : 'false'}; guidedStep=${data.guidedStep ? `${data.guidedStep.current}/${data.guidedStep.total}` : 'none'}; nudgeVisible=${data.nudgeVisible ? 'true' : 'false'}; runStatus=${data.runStatus}; currentErrorKey=${data.currentErrorKey ?? 'none'}; errorHistory=[${recentErrors.join(',')}]`,
    ...(includeLastQuestion ? [`lastUserQuestion: "${lastUserQuestion}"`] : []),
    PEBBLE_CLARIFY_RULE,
    PEBBLE_OUTPUT_RULE,
  ]
    .filter(Boolean)
    .join('\n')
}

export function PebbleMascot({ data }: { data: MascotContextData }) {
  const [expanded, setExpanded] = useState(false)
  const [position, setPosition] = useState<Position>(() => getSafePosition(readStoredPosition()))
  const [question, setQuestion] = useState('')
  const [assistantState, setAssistantState] = useState<AssistantState>('idle')
  const [fullAnswer, setFullAnswer] = useState('')
  const [typedAnswer, setTypedAnswer] = useState('')
  const [memory, setMemory] = useState<MemoryTurn[]>([])
  const [celebrate, setCelebrate] = useState(false)
  const [successPulse, setSuccessPulse] = useState(false)
  const [lastAskedQuestion, setLastAskedQuestion] = useState('')
  const [lastAnswerIsErrorish, setLastAnswerIsErrorish] = useState(false)
  const dragRef = useRef<{
    active: boolean
    pointerId: number
    origin: Position
    start: Position
    moved: boolean
  } | null>(null)
  const typingTimerRef = useRef<number | null>(null)
  const celebrateTimerRef = useRef<number | null>(null)
  const successPulseTimerRef = useRef<number | null>(null)
  const settleRafRef = useRef<number | null>(null)
  const settleStateRef = useRef<{ y: number; v: number } | null>(null)
  const activeAbortRef = useRef<AbortController | null>(null)
  const askRequestIdRef = useRef(0)
  const previousRunStatusRef = useRef(data.runStatus)

  const clearTypingTimer = useCallback(() => {
    if (typingTimerRef.current !== null) {
      window.clearInterval(typingTimerRef.current)
      typingTimerRef.current = null
    }
  }, [])

  const clearCelebrateTimer = useCallback(() => {
    if (celebrateTimerRef.current !== null) {
      window.clearTimeout(celebrateTimerRef.current)
      celebrateTimerRef.current = null
    }
  }, [])

  const clearSuccessPulseTimer = useCallback(() => {
    if (successPulseTimerRef.current !== null) {
      window.clearTimeout(successPulseTimerRef.current)
      successPulseTimerRef.current = null
    }
  }, [])

  const abortActiveRequest = useCallback(() => {
    activeAbortRef.current?.abort()
    activeAbortRef.current = null
  }, [])

  const cancelSettle = useCallback(() => {
    if (typeof window === 'undefined') {
      settleRafRef.current = null
      settleStateRef.current = null
      return
    }

    if (settleRafRef.current !== null) {
      window.cancelAnimationFrame(settleRafRef.current)
      settleRafRef.current = null
    }
    settleStateRef.current = null
  }, [])

  const settleToBottomWithBounce = useCallback(
    (startPosition: Position) => {
      if (typeof window === 'undefined') {
        return
      }

      cancelSettle()

      const initialBounds = getViewportBounds()
      const fixedX = clamp(startPosition.x, initialBounds.minX, initialBounds.maxX)
      const startY = clamp(startPosition.y, initialBounds.minY, initialBounds.maxY)
      settleStateRef.current = {
        y: startY,
        v: 0,
      }
      setPosition({ x: fixedX, y: startY })

      const spring = 0.15
      const damping = 0.86
      const bounceFactor = 0.3
      const settleDistanceThreshold = 0.5
      const settleVelocityThreshold = 0.12
      let lastTimestamp: number | null = null

      const step = (timestamp: number) => {
        const state = settleStateRef.current
        if (!state) {
          settleRafRef.current = null
          return
        }

        const frameBounds = getViewportBounds()
        const targetY = frameBounds.maxY
        const x = clamp(fixedX, frameBounds.minX, frameBounds.maxX)
        const dtMs = lastTimestamp === null ? 16.67 : clamp(timestamp - lastTimestamp, 1, 34)
        lastTimestamp = timestamp
        const dt = dtMs / 16.67

        state.v += (targetY - state.y) * spring * dt
        state.v *= Math.pow(damping, dt)
        state.y += state.v * dt

        if (state.y > targetY) {
          state.y = targetY
          state.v *= -bounceFactor
        }

        state.y = clamp(state.y, frameBounds.minY, targetY)

        const nextPosition = { x, y: state.y }
        setPosition(nextPosition)

        if (
          Math.abs(targetY - state.y) < settleDistanceThreshold &&
          Math.abs(state.v) < settleVelocityThreshold
        ) {
          const finalPosition = { x, y: targetY }
          setPosition(finalPosition)
          persistPosition(finalPosition)
          settleStateRef.current = null
          settleRafRef.current = null
          return
        }

        settleRafRef.current = window.requestAnimationFrame(step)
      }

      settleRafRef.current = window.requestAnimationFrame(step)
    },
    [cancelSettle],
  )

  const startTypewriter = useCallback(
    (answer: string, requestId: number, kind: MemoryTurn['kind']) => {
      clearTypingTimer()
      setTypedAnswer('')
      setAssistantState('typing')

      let cursor = 0
      typingTimerRef.current = window.setInterval(() => {
        if (askRequestIdRef.current !== requestId) {
          clearTypingTimer()
          return
        }

        const chunkSize = clamp(
          Math.floor(Math.random() * TYPEWRITER_MAX_CHARS) + 1,
          TYPEWRITER_MIN_CHARS,
          TYPEWRITER_MAX_CHARS,
        )
        cursor = Math.min(answer.length, cursor + chunkSize)
        setTypedAnswer(answer.slice(0, cursor))

        if (cursor >= answer.length) {
          clearTypingTimer()
          setAssistantState('done')
          setCelebrate(true)
          clearCelebrateTimer()
          celebrateTimerRef.current = window.setTimeout(() => {
            setCelebrate(false)
            celebrateTimerRef.current = null
          }, 800)
          setMemory((prev) =>
            trimMemory([
              ...prev,
              {
                role: 'assistant',
                content: answer,
                ts: Date.now(),
                kind,
              },
            ]),
          )
        }
      }, TYPEWRITER_TICK_MS)
    },
    [clearCelebrateTimer, clearTypingTimer],
  )

  useEffect(() => {
    return () => {
      abortActiveRequest()
      cancelSettle()
      clearTypingTimer()
      clearCelebrateTimer()
      clearSuccessPulseTimer()
    }
  }, [abortActiveRequest, cancelSettle, clearCelebrateTimer, clearSuccessPulseTimer, clearTypingTimer])

  useEffect(() => {
    const normalizePosition = (candidate: Partial<Position> | null | undefined) => {
      const safe = getSafePosition(candidate)
      setPosition(safe)
      persistPosition(safe)
    }

    normalizePosition(readStoredPosition())

    const onResize = () => {
      setPosition((prev) => {
        const safe = getSafePosition(prev)
        if (safe.x === prev.x && safe.y === prev.y) {
          return prev
        }
        persistPosition(safe)
        return safe
      })
    }

    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
    }
  }, [])

  useEffect(() => {
    const safe = getSafePosition(position)
    if (safe.x === position.x && safe.y === position.y) {
      return
    }
    setPosition(safe)
    persistPosition(safe)
  }, [position])

  const alignCardRight = useMemo(() => {
    if (typeof window === 'undefined') {
      return true
    }
    return position.x > window.innerWidth / 2
  }, [position.x])

  const showNudgeBadge = data.nudgeVisible && !data.guidedActive
  const expression = useMemo<Expression>(() => {
    if (data.isAfk) {
      return 'afk'
    }
    if (assistantState === 'thinking') {
      return 'thinking'
    }
    if (data.runStatus === 'success') {
      return 'proud'
    }
    if (data.currentErrorKey && data.guidedActive) {
      return 'panic'
    }
    if (data.currentErrorKey && data.nudgeVisible) {
      return 'concerned'
    }
    return 'calm'
  }, [assistantState, data.currentErrorKey, data.guidedActive, data.isAfk, data.nudgeVisible, data.runStatus])

  const isThinkingExpression = expression === 'thinking'
  const isConcernedExpression = expression === 'concerned'
  const isPanicExpression = expression === 'panic'
  const isProudExpression = expression === 'proud'
  const isAfkExpression = expression === 'afk'
  const isGenerating = assistantState === 'thinking' || assistantState === 'typing'
  const pulseClass = successPulse
    ? 'ring-2 ring-emerald-300 shadow-[0_0_18px_rgba(16,185,129,0.55)] animate-pulse'
    : celebrate
      ? 'ring-2 ring-pebble-accent animate-pulse'
      : ''

  useEffect(() => {
    const previousRunStatus = previousRunStatusRef.current
    if (previousRunStatus !== 'success' && data.runStatus === 'success') {
      setSuccessPulse(true)
      clearSuccessPulseTimer()
      successPulseTimerRef.current = window.setTimeout(() => {
        setSuccessPulse(false)
        successPulseTimerRef.current = null
      }, 900)
    }
    previousRunStatusRef.current = data.runStatus
  }, [clearSuccessPulseTimer, data.runStatus])

  async function submitQuestion(questionText: string, options: { appendUserTurn: boolean }) {
    const requestId = askRequestIdRef.current + 1
    askRequestIdRef.current = requestId
    abortActiveRequest()
    const abortController = new AbortController()
    activeAbortRef.current = abortController
    setAssistantState('thinking')
    setTypedAnswer('')
    setFullAnswer('')
    setCelebrate(false)
    setLastAnswerIsErrorish(false)
    const nextMemory = options.appendUserTurn
      ? trimMemory([
          ...memory,
          {
            role: 'user',
            content: questionText,
            ts: Date.now(),
            kind: 'question',
          },
        ])
      : memory
    setMemory(nextMemory)
    const prompt = buildPebblePrompt(questionText, data, nextMemory)
    try {
      const answer = await askPebble({
        prompt,
        signal: abortController.signal,
        context: {
          taskTitle: data.currentTaskTitle,
          codeText: trimCode(data.codeText),
          runStatus: data.runStatus,
          runMessage: data.runMessage,
          currentErrorKey: data.currentErrorKey,
          nudgeVisible: data.nudgeVisible,
          guidedStep: data.guidedStep,
          guidedActive: data.guidedActive,
          struggleScore: data.struggleScore,
          repeatErrorCount: data.repeatErrorCount,
          errorHistory: data.errorHistory.slice(-3),
        },
      })

      if (askRequestIdRef.current !== requestId) {
        return
      }

      const finalAnswer = normalizeAskFailureMessage(answer)
      const assistantKind = classifyAssistantKind(finalAnswer)
      setLastAnswerIsErrorish(assistantKind === 'error_answer')
      setFullAnswer(finalAnswer)
      startTypewriter(finalAnswer, requestId, assistantKind)
    } finally {
      if (activeAbortRef.current === abortController) {
        activeAbortRef.current = null
      }
    }
  }

  async function onAskPebble() {
    if (isGenerating) {
      return
    }

    const trimmedQuestion = question.trim()
    if (!trimmedQuestion) {
      return
    }

    setLastAskedQuestion(trimmedQuestion)
    await submitQuestion(trimmedQuestion, { appendUserTurn: true })
  }

  async function onRetryLastQuestion() {
    if (isGenerating || !lastAskedQuestion) {
      return
    }

    await submitQuestion(lastAskedQuestion, { appendUserTurn: false })
  }

  function onStopGeneration() {
    if (!isGenerating) {
      return
    }

    askRequestIdRef.current += 1
    abortActiveRequest()
    clearTypingTimer()
    clearCelebrateTimer()
    setTypedAnswer('')
    setFullAnswer('')
    setCelebrate(false)
    setLastAnswerIsErrorish(false)
    setAssistantState('idle')
  }

  function onClearAnswer() {
    askRequestIdRef.current += 1
    clearTypingTimer()
    clearCelebrateTimer()
    setCelebrate(false)
    setFullAnswer('')
    setTypedAnswer('')
    setLastAnswerIsErrorish(false)
    setAssistantState('idle')
  }

  function onPointerDown(event: ReactPointerEvent<HTMLButtonElement>) {
    cancelSettle()
    dragRef.current = {
      active: true,
      pointerId: event.pointerId,
      origin: { x: event.clientX, y: event.clientY },
      start: position,
      moved: false,
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || !dragRef.current.active || dragRef.current.pointerId !== event.pointerId) {
      return
    }

    const deltaX = event.clientX - dragRef.current.origin.x
    const deltaY = event.clientY - dragRef.current.origin.y

    if (Math.abs(deltaX) > 2 || Math.abs(deltaY) > 2) {
      dragRef.current.moved = true
    }

    setPosition(
      clampPosition({
        x: dragRef.current.start.x + deltaX,
        y: dragRef.current.start.y + deltaY,
      }),
    )
  }

  function onPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return
    }

    const releasePosition = clampPosition({
      x: dragRef.current.start.x + (event.clientX - dragRef.current.origin.x),
      y: dragRef.current.start.y + (event.clientY - dragRef.current.origin.y),
    })
    const dragged = dragRef.current.moved
    dragRef.current.active = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    dragRef.current = null

    if (dragged) {
      settleToBottomWithBounce(releasePosition)
      return
    }

    setPosition(releasePosition)
    persistPosition(releasePosition)
    setExpanded((prev) => !prev)
  }

  function onPointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return
    }

    dragRef.current.active = false
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }

    setPosition((prev) => {
      const next = clampPosition(prev)
      persistPosition(next)
      return next
    })
  }

  function onLostPointerCapture(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return
    }

    dragRef.current.active = false
    dragRef.current = null
    setPosition((prev) => {
      const next = clampPosition(prev)
      persistPosition(next)
      return next
    })
  }

  const mascotNode = (
    <div
      className="fixed z-[9999] pointer-events-auto"
      style={{
        left: position.x,
        top: position.y,
        pointerEvents: 'auto',
      }}
    >
      <style>
        {`
          @keyframes pebble-mascot-shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-1px); }
            75% { transform: translateX(1px); }
          }
          @keyframes pebble-mascot-dot {
            0%, 80%, 100% { opacity: 0.3; transform: translateY(0); }
            40% { opacity: 1; transform: translateY(-2px); }
          }
        `}
      </style>
      <button
        type="button"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        onLostPointerCapture={onLostPointerCapture}
        className={`relative flex h-[72px] w-[72px] items-center justify-center rounded-full border border-pebble-accent/35 bg-pebble-panel/95 shadow-[0_16px_28px_rgba(2,8,23,0.38)] backdrop-blur-md transition hover:border-pebble-accent/50 ${pulseClass}`}
        style={{ touchAction: 'none', cursor: 'grab' }}
        aria-label="Toggle Pebble mascot"
      >
        <div
          className="relative h-11 w-11 rounded-[16px] bg-gradient-to-br from-[#60a5fa] via-[#3b82f6] to-[#1d4ed8] shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
          style={isPanicExpression ? { animation: 'pebble-mascot-shake 0.35s ease-in-out infinite' } : undefined}
        >
          {isProudExpression && (
            <span className="absolute -inset-1 rounded-[18px] border border-white/40 shadow-[0_0_14px_rgba(96,165,250,0.9)]" />
          )}
          {isConcernedExpression && (
            <>
              <span className="absolute left-[10px] top-[10px] h-[2px] w-[10px] rounded bg-white/90" style={{ transform: 'rotate(-22deg)' }} />
              <span className="absolute right-[10px] top-[10px] h-[2px] w-[10px] rounded bg-white/90" style={{ transform: 'rotate(22deg)' }} />
            </>
          )}
          <span
            className="absolute left-[11px] rounded-full bg-white/95"
            style={{
              top: isThinkingExpression ? '12px' : '14px',
              width: isPanicExpression ? '7px' : isAfkExpression ? '10px' : '6px',
              height: isAfkExpression ? '2px' : isPanicExpression ? '7px' : '6px',
            }}
          />
          <span
            className="absolute right-[11px] rounded-full bg-white/95"
            style={{
              top: isThinkingExpression ? '12px' : '14px',
              width: isPanicExpression ? '7px' : isAfkExpression ? '10px' : '6px',
              height: isAfkExpression ? '2px' : isPanicExpression ? '7px' : '6px',
            }}
          />
          {!isAfkExpression && !isThinkingExpression && (
            <span
              className="absolute left-1/2 -translate-x-1/2 bg-white/90"
              style={{
                top: '26px',
                width: isProudExpression ? '17px' : '15px',
                height: isConcernedExpression ? '2px' : '4px',
                borderRadius: isConcernedExpression ? '2px' : '999px',
              }}
            />
          )}
          {isThinkingExpression && (
            <div className="absolute left-1/2 top-[26px] flex -translate-x-1/2 items-center gap-1">
              <span className="h-[2px] w-[2px] rounded-full bg-white/90" style={{ animation: 'pebble-mascot-dot 0.9s ease-in-out infinite' }} />
              <span className="h-[2px] w-[2px] rounded-full bg-white/90" style={{ animation: 'pebble-mascot-dot 0.9s ease-in-out infinite 0.15s' }} />
              <span className="h-[2px] w-[2px] rounded-full bg-white/90" style={{ animation: 'pebble-mascot-dot 0.9s ease-in-out infinite 0.3s' }} />
            </div>
          )}
        </div>
        {showNudgeBadge && (
          <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-pebble-warning px-1 text-xs font-semibold text-pebble-canvas">
            !
          </span>
        )}
      </button>

      {expanded && (
        <div
          className="absolute bottom-[70px] w-[300px] rounded-xl border border-pebble-border/40 bg-pebble-panel/95 p-3 shadow-[0_18px_34px_rgba(2,8,23,0.42)] backdrop-blur-xl"
          style={alignCardRight ? { right: 0 } : { left: 0 }}
        >
          <p className="text-xs font-semibold uppercase tracking-[0.05em] text-pebble-text-muted">
            Pebble status
          </p>
          <p className="mt-2 text-sm text-pebble-text-primary">
            Phase: <span className="font-medium">{data.phase}</span>
          </p>
          <p className="text-sm text-pebble-text-primary">
            Task: <span className="font-medium">{data.currentTaskTitle}</span>
          </p>
          <p className="text-sm text-pebble-text-primary">
            Run: <span className="font-medium">{data.runStatus}</span>
          </p>
          <p className="text-xs text-pebble-text-secondary">
            Module progress: {data.moduleProgress.completedCount}/{data.moduleProgress.totalCount}
          </p>
          <p className="mt-1 text-xs text-pebble-text-secondary">{data.mascotLine}</p>
          <p className="mt-1 line-clamp-2 text-xs text-pebble-text-muted">{data.runMessage}</p>
          {data.guidedStep && (
            <p className="mt-1 text-xs text-pebble-text-secondary">
              Guided fix active: Step {data.guidedStep.current} / {data.guidedStep.total}
            </p>
          )}
          {data.nudgeVisible && !data.guidedActive && (
            <p className="mt-1 text-xs text-pebble-text-secondary">
              Nudge ready. “Show me” opens guided recovery.
            </p>
          )}
          {data.isAfk && (
            <p className="mt-1 text-xs text-pebble-text-secondary">Paused while you're away.</p>
          )}
          <div className="mt-3 rounded-lg border border-pebble-border/28 bg-pebble-overlay/[0.06] p-2.5">
            <p className="text-xs font-medium text-pebble-text-secondary">Ask Pebble</p>
            <div className="mt-2 flex items-center gap-2">
              <input
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    void onAskPebble()
                  }
                }}
                className="w-full rounded-md border border-pebble-border/35 bg-pebble-canvas/85 px-2 py-1.5 text-xs text-pebble-text-primary outline-none placeholder:text-pebble-text-muted focus:border-pebble-accent/65"
                placeholder="Ask Pebble..."
              />
              <button
                type="button"
                onClick={() => void onAskPebble()}
                disabled={isGenerating}
                className="shrink-0 rounded-md border border-pebble-accent/45 bg-pebble-accent/15 px-2.5 py-1.5 text-xs font-medium text-pebble-text-primary transition hover:bg-pebble-accent/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Ask Pebble
              </button>
              {isGenerating && (
                <button
                  type="button"
                  onClick={onStopGeneration}
                  className="shrink-0 rounded-md border border-pebble-border/45 bg-pebble-overlay/10 px-2.5 py-1.5 text-xs font-medium text-pebble-text-secondary transition hover:bg-pebble-overlay/20"
                >
                  Stop
                </button>
              )}
            </div>

            {(assistantState !== 'idle' || typedAnswer) && (
              <div className="mt-2 rounded-md border border-pebble-border/30 bg-pebble-canvas/70 p-2">
                <div className="mb-1 h-4 text-xs uppercase tracking-[0.04em] text-pebble-text-muted">
                  {assistantState === 'thinking' && (
                    <p className="flex items-center gap-1">
                      <span>Thinking</span>
                      <span className="inline-flex animate-pulse">...</span>
                    </p>
                  )}
                  {assistantState === 'typing' && <p>Typing...</p>}
                </div>
                {(assistantState === 'typing' || assistantState === 'done') && (
                  <p className="whitespace-pre-wrap text-xs leading-relaxed text-pebble-text-secondary">
                    {typedAnswer}
                  </p>
                )}
                {fullAnswer && (
                  <div className="mt-2 flex justify-end">
                    {lastAnswerIsErrorish && (
                      <button
                        type="button"
                        onClick={() => void onRetryLastQuestion()}
                        disabled={isGenerating || !lastAskedQuestion}
                        className="mr-2 rounded-md border border-pebble-border/35 px-2 py-1 text-xs text-pebble-text-secondary transition hover:bg-pebble-overlay/10 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        Retry
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={onClearAnswer}
                      className="rounded-md border border-pebble-border/35 px-2 py-1 text-xs text-pebble-text-secondary transition hover:bg-pebble-overlay/10"
                    >
                      Clear
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )

  if (typeof document === 'undefined') {
    return mascotNode
  }

  return createPortal(mascotNode, document.body)
}
