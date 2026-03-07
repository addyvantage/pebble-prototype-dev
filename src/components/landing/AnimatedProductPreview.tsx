import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  MessageSquareText,
  MousePointer2,
  Play,
  SendHorizonal,
  Wrench,
} from 'lucide-react'
import { StatusPill } from '../ui/StatusPill'

type AnimatedProductPreviewProps = {
  theme: 'light' | 'dark'
  isUrdu: boolean
  previewLabel: string
  previewUsingRun: string
  previewUnit: string
  previewCoach: string
}

type PreviewPhase =
  | 'idle'
  | 'move_editor'
  | 'type_wrong'
  | 'move_run'
  | 'click_run'
  | 'running'
  | 'failure'
  | 'move_coach_input'
  | 'focus_input'
  | 'type_question'
  | 'move_send'
  | 'send_question'
  | 'coach_thinking'
  | 'coach_reply'
  | 'read_reply'
  | 'move_back_editor'
  | 'apply_fix'
  | 'move_run_again'
  | 'click_run_again'
  | 'running_again'
  | 'success'
  | 'reset'

type TimelineStep = {
  phase: PreviewPhase
  durationMs: number
}

type TimelineFrame = {
  phase: PreviewPhase
  phaseProgress: number
}

type CodeDraftState = {
  logicLines: [string, string, string]
  caretLine: number | null
  mode: 'blank' | 'typing_wrong' | 'wrong' | 'fixing' | 'fixed'
}

type CursorTarget = 'idle' | 'editor' | 'run' | 'failure' | 'coachInput' | 'send' | 'coachReply' | 'success'

type CursorMeta = {
  target: CursorTarget
  moveMs: number
  click?: boolean
}

type CursorPoint = {
  x: number
  y: number
}

const TIMELINE: TimelineStep[] = [
  { phase: 'idle', durationMs: 1300 },
  { phase: 'move_editor', durationMs: 900 },
  { phase: 'type_wrong', durationMs: 3100 },
  { phase: 'move_run', durationMs: 850 },
  { phase: 'click_run', durationMs: 300 },
  { phase: 'running', durationMs: 1100 },
  { phase: 'failure', durationMs: 1900 },
  { phase: 'move_coach_input', durationMs: 900 },
  { phase: 'focus_input', durationMs: 250 },
  { phase: 'type_question', durationMs: 2600 },
  { phase: 'move_send', durationMs: 500 },
  { phase: 'send_question', durationMs: 300 },
  { phase: 'coach_thinking', durationMs: 1400 },
  { phase: 'coach_reply', durationMs: 2100 },
  { phase: 'read_reply', durationMs: 1400 },
  { phase: 'move_back_editor', durationMs: 900 },
  { phase: 'apply_fix', durationMs: 2500 },
  { phase: 'move_run_again', durationMs: 850 },
  { phase: 'click_run_again', durationMs: 300 },
  { phase: 'running_again', durationMs: 1100 },
  { phase: 'success', durationMs: 2400 },
  { phase: 'reset', durationMs: 1000 },
]

const PHASE_RANK: Record<PreviewPhase, number> = TIMELINE.reduce((acc, step, index) => {
  acc[step.phase] = index
  return acc
}, {} as Record<PreviewPhase, number>)

const TOTAL_LOOP_MS = TIMELINE.reduce((sum, step) => sum + step.durationMs, 0)

const STORY_STEPS = [
  { id: 'attempt', label: 'Attempt', detail: 'Write a solution', icon: Code2 },
  { id: 'run1', label: 'Run', detail: 'Execute tests', icon: Play },
  { id: 'fail', label: 'Fail', detail: 'Case #2 breaks', icon: AlertTriangle },
  { id: 'coach', label: 'Pebble', detail: 'Ask for help', icon: MessageSquareText },
  { id: 'fix', label: 'Fix', detail: 'Apply one change', icon: Wrench },
  { id: 'pass', label: 'Pass', detail: 'Accepted', icon: CheckCircle2 },
] as const

const CURSOR_PHASES: Record<PreviewPhase, CursorMeta> = {
  idle: { target: 'idle', moveMs: 0 },
  move_editor: { target: 'editor', moveMs: 900 },
  type_wrong: { target: 'editor', moveMs: 220 },
  move_run: { target: 'run', moveMs: 820 },
  click_run: { target: 'run', moveMs: 220, click: true },
  running: { target: 'run', moveMs: 360 },
  failure: { target: 'failure', moveMs: 640 },
  move_coach_input: { target: 'coachInput', moveMs: 860 },
  focus_input: { target: 'coachInput', moveMs: 220, click: true },
  type_question: { target: 'coachInput', moveMs: 220 },
  move_send: { target: 'send', moveMs: 500 },
  send_question: { target: 'send', moveMs: 200, click: true },
  coach_thinking: { target: 'coachReply', moveMs: 500 },
  coach_reply: { target: 'coachReply', moveMs: 360 },
  read_reply: { target: 'coachReply', moveMs: 260 },
  move_back_editor: { target: 'editor', moveMs: 900 },
  apply_fix: { target: 'editor', moveMs: 220 },
  move_run_again: { target: 'run', moveMs: 820 },
  click_run_again: { target: 'run', moveMs: 220, click: true },
  running_again: { target: 'run', moveMs: 360 },
  success: { target: 'success', moveMs: 680 },
  reset: { target: 'idle', moveMs: 1000 },
}

const DEFAULT_CURSOR_POINTS: Record<CursorTarget, CursorPoint> = {
  idle: { x: 16, y: 20 },
  editor: { x: 31, y: 62 },
  run: { x: 56, y: 40 },
  failure: { x: 34, y: 74 },
  coachInput: { x: 79, y: 80 },
  send: { x: 90, y: 80 },
  coachReply: { x: 78, y: 60 },
  success: { x: 56, y: 76 },
}

const LOGIC_WRONG: [string, string, string] = [
  '        seen[n] = i',
  '        if target - n in seen:',
  '            return [seen[target - n], i]',
]

const LOGIC_FIXED: [string, string, string] = [
  '        if target - n in seen:',
  '            return [seen[target - n], i]',
  '        seen[n] = i',
]

const QUESTION_TEXT = "Help, I'm stuck. Why is case #2 failing?"

const COACH_REPLY_LINES: [string, string, string] = [
  'You insert into seen too early.',
  'Check target - n before storing current value.',
  'Then rerun.',
]

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ')
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value))
}

function easeInOut(value: number) {
  const x = clamp01(value)
  return 0.5 - Math.cos(Math.PI * x) / 2
}

function isAtOrAfter(current: PreviewPhase, target: PreviewPhase) {
  return PHASE_RANK[current] >= PHASE_RANK[target]
}

function totalChars(lines: readonly string[]) {
  return lines.reduce((sum, line, index) => sum + line.length + (index < lines.length - 1 ? 1 : 0), 0)
}

function sliceLinesByChars<T extends readonly string[]>(lines: T, chars: number): string[] {
  let remaining = Math.max(0, chars)

  return lines.map((line, index) => {
    if (remaining <= 0) return ''

    const take = Math.min(line.length, remaining)
    const visible = line.slice(0, take)
    remaining -= take

    if (remaining > 0 && index < lines.length - 1) {
      remaining -= 1
    }

    return visible
  })
}

function getLastTypedLine(lines: readonly string[]) {
  for (let index = lines.length - 1; index >= 0; index -= 1) {
    if (lines[index].length > 0) return index
  }

  return 0
}

function typingWeight(char: string) {
  if (char === ' ') return 0.55
  if (char === ',') return 1.7
  if (char === '.' || char === '?' || char === '!') return 2.8
  if (char === '#') return 1.2
  return 1
}

function getWeightedTypedChars(text: string, progress: number) {
  const chars = Array.from(text)
  const total = chars.reduce((sum, char) => sum + typingWeight(char), 0)
  let budget = total * clamp01(progress)
  let visible = 0

  for (const char of chars) {
    const weight = typingWeight(char)

    if (budget >= weight) {
      budget -= weight
      visible += 1
      continue
    }

    break
  }

  return visible
}

function measurePoint(root: HTMLElement, element: HTMLElement | null, fallback: CursorPoint): CursorPoint {
  if (!element) return fallback

  const rootRect = root.getBoundingClientRect()

  if (rootRect.width <= 0 || rootRect.height <= 0) {
    return fallback
  }

  const rect = element.getBoundingClientRect()

  return {
    x: clampPercent(((rect.left + rect.width / 2 - rootRect.left) / rootRect.width) * 100),
    y: clampPercent(((rect.top + rect.height / 2 - rootRect.top) / rootRect.height) * 100),
  }
}

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReducedMotion(media.matches)

    const onChange = (event: MediaQueryListEvent) => {
      setReducedMotion(event.matches)
    }

    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reducedMotion
}

function useTimelineFrame(reducedMotion: boolean) {
  const [frame, setFrame] = useState<TimelineFrame>({ phase: 'idle', phaseProgress: 0 })

  useEffect(() => {
    if (reducedMotion) {
      setFrame({ phase: 'success', phaseProgress: 1 })
      return
    }

    let rafId = 0
    let lastEmit = -1
    const startedAt = performance.now()

    const tick = (now: number) => {
      if (now - lastEmit >= 40) {
        const elapsed = (now - startedAt) % TOTAL_LOOP_MS
        let running = 0

        for (const step of TIMELINE) {
          const start = running
          const end = start + step.durationMs

          if (elapsed < end) {
            const phaseProgress = clamp01((elapsed - start) / step.durationMs)
            setFrame({ phase: step.phase, phaseProgress })
            break
          }

          running = end
        }

        lastEmit = now
      }

      rafId = window.requestAnimationFrame(tick)
    }

    rafId = window.requestAnimationFrame(tick)

    return () => {
      window.cancelAnimationFrame(rafId)
    }
  }, [reducedMotion])

  return frame
}

function getStoryStepIndex(phase: PreviewPhase) {
  if (PHASE_RANK[phase] <= PHASE_RANK.type_wrong) return 0
  if (PHASE_RANK[phase] <= PHASE_RANK.running) return 1
  if (PHASE_RANK[phase] <= PHASE_RANK.failure) return 2
  if (PHASE_RANK[phase] <= PHASE_RANK.read_reply) return 3
  if (PHASE_RANK[phase] <= PHASE_RANK.running_again) return 4
  return 5
}

function getCodeDraftState(phase: PreviewPhase, phaseProgress: number): CodeDraftState {
  if (!isAtOrAfter(phase, 'type_wrong')) {
    return {
      logicLines: ['', '', ''],
      caretLine: null,
      mode: 'blank',
    }
  }

  if (phase === 'type_wrong') {
    const typed = Math.floor(totalChars(LOGIC_WRONG) * easeInOut(phaseProgress))
    const logicLines = sliceLinesByChars(LOGIC_WRONG, typed) as [string, string, string]

    return {
      logicLines,
      caretLine: getLastTypedLine(logicLines),
      mode: 'typing_wrong',
    }
  }

  if (PHASE_RANK[phase] < PHASE_RANK.apply_fix) {
    return {
      logicLines: LOGIC_WRONG,
      caretLine: null,
      mode: 'wrong',
    }
  }

  if (phase === 'apply_fix') {
    if (phaseProgress < 0.18) {
      return {
        logicLines: LOGIC_WRONG,
        caretLine: 0,
        mode: 'fixing',
      }
    }

    if (phaseProgress < 0.34) {
      return {
        logicLines: ['', '', ''],
        caretLine: 0,
        mode: 'fixing',
      }
    }

    const fixProgress = (phaseProgress - 0.34) / 0.66
    const typed = Math.floor(totalChars(LOGIC_FIXED) * easeInOut(fixProgress))
    const logicLines = sliceLinesByChars(LOGIC_FIXED, typed) as [string, string, string]

    return {
      logicLines,
      caretLine: getLastTypedLine(logicLines),
      mode: 'fixing',
    }
  }

  return {
    logicLines: LOGIC_FIXED,
    caretLine: null,
    mode: 'fixed',
  }
}

function getStatusCopy(phase: PreviewPhase) {
  if (phase === 'running' || phase === 'running_again') {
    return {
      testsLabel: 'Tests: running...',
      statusVariant: 'info' as const,
      statusText: 'Running tests...',
      statusMeta: 'Evaluating',
      runtimeTitle: 'Runtime',
      runtimeBody: 'Executing sample and hidden checks.',
    }
  }

  if (isAtOrAfter(phase, 'failure') && PHASE_RANK[phase] < PHASE_RANK.move_run_again) {
    return {
      testsLabel: 'Tests: 1/3',
      statusVariant: 'fail' as const,
      statusText: 'Fail #2 expected: [0,1] got: -1,-1',
      statusMeta: 'Case isolated',
      runtimeTitle: 'Failure signal',
      runtimeBody: 'Case #2 fails because seen is updated before complement lookup.',
    }
  }

  if (phase === 'move_run_again' || phase === 'click_run_again') {
    return {
      testsLabel: 'Tests: rerun',
      statusVariant: 'info' as const,
      statusText: 'Fix applied. Ready to rerun.',
      statusMeta: 'Ready',
      runtimeTitle: 'Patch',
      runtimeBody: 'Line order corrected. Triggering verification run.',
    }
  }

  if (isAtOrAfter(phase, 'success')) {
    return {
      testsLabel: 'Tests: 3/3',
      statusVariant: 'success' as const,
      statusText: 'Accepted - all tests passed',
      statusMeta: 'Recovery complete',
      runtimeTitle: 'Resolved',
      runtimeBody: 'Grounded guidance + one fix closed the loop.',
    }
  }

  return {
    testsLabel: 'Tests: draft',
    statusVariant: 'info' as const,
    statusText: 'Drafting attempt...',
    statusMeta: 'Editing',
    runtimeTitle: 'Awaiting run',
    runtimeBody: 'Write your attempt, then run once to isolate the failing case.',
  }
}

function getCoachStateLabel(phase: PreviewPhase) {
  if (phase === 'coach_thinking') return 'Thinking'
  if (isAtOrAfter(phase, 'coach_reply') && PHASE_RANK[phase] < PHASE_RANK.success) return 'Guidance'
  if (isAtOrAfter(phase, 'success')) return 'Resolved'
  if (isAtOrAfter(phase, 'focus_input') && PHASE_RANK[phase] < PHASE_RANK.send_question) return 'Asking'
  return 'Idle'
}

export function AnimatedProductPreview({
  theme,
  isUrdu,
  previewLabel,
  previewUsingRun,
  previewUnit,
  previewCoach,
}: AnimatedProductPreviewProps) {
  const reducedMotion = usePrefersReducedMotion()
  const timeline = useTimelineFrame(reducedMotion)

  const phase = reducedMotion ? 'success' : timeline.phase
  const phaseProgress = reducedMotion ? 1 : timeline.phaseProgress

  const storyStepIndex = getStoryStepIndex(phase)
  const status = getStatusCopy(phase)
  const codeDraft = getCodeDraftState(phase, phaseProgress)

  const isResetting = !reducedMotion && phase === 'reset'
  const isRunning = phase === 'running' || phase === 'running_again'
  const isRunHover = phase === 'move_run' || phase === 'click_run' || phase === 'move_run_again' || phase === 'click_run_again'
  const isRunClick = phase === 'click_run' || phase === 'click_run_again'
  const isFailRange = isAtOrAfter(phase, 'failure') && PHASE_RANK[phase] < PHASE_RANK.move_run_again
  const isSuccessTone = isAtOrAfter(phase, 'success')
  const isCodeTyping = phase === 'type_wrong' || phase === 'apply_fix'
  const isInputFocused = phase === 'focus_input' || phase === 'type_question' || phase === 'move_send'

  const inputText = useMemo(() => {
    if (phase === 'type_question') {
      const chars = Math.max(1, getWeightedTypedChars(QUESTION_TEXT, easeInOut(phaseProgress)))
      return QUESTION_TEXT.slice(0, chars)
    }

    if (phase === 'move_send' || phase === 'send_question') {
      return QUESTION_TEXT
    }

    return ''
  }, [phase, phaseProgress])

  const hasSentQuestion = isAtOrAfter(phase, 'send_question')

  const coachResponseLines = useMemo(() => {
    if (phase === 'coach_reply') {
      const chars = Math.floor(totalChars(COACH_REPLY_LINES) * easeInOut(phaseProgress))
      return sliceLinesByChars(COACH_REPLY_LINES, chars)
    }

    if (isAtOrAfter(phase, 'read_reply')) {
      return [...COACH_REPLY_LINES]
    }

    return ['', '', '']
  }, [phase, phaseProgress])

  const previewRootRef = useRef<HTMLDivElement>(null)
  const editorAnchorRef = useRef<HTMLSpanElement>(null)
  const runButtonRef = useRef<HTMLSpanElement>(null)
  const failureAnchorRef = useRef<HTMLSpanElement>(null)
  const coachInputRef = useRef<HTMLDivElement>(null)
  const sendButtonRef = useRef<HTMLSpanElement>(null)
  const coachReplyAnchorRef = useRef<HTMLDivElement>(null)
  const successAnchorRef = useRef<HTMLDivElement>(null)

  const [cursorPoints, setCursorPoints] = useState<Record<CursorTarget, CursorPoint>>(DEFAULT_CURSOR_POINTS)

  const syncCursorPoints = useCallback(() => {
    const root = previewRootRef.current

    if (!root) return

    const nextPoints: Record<CursorTarget, CursorPoint> = {
      idle: DEFAULT_CURSOR_POINTS.idle,
      editor: measurePoint(root, editorAnchorRef.current, DEFAULT_CURSOR_POINTS.editor),
      run: measurePoint(root, runButtonRef.current, DEFAULT_CURSOR_POINTS.run),
      failure: measurePoint(root, failureAnchorRef.current, DEFAULT_CURSOR_POINTS.failure),
      coachInput: measurePoint(root, coachInputRef.current, DEFAULT_CURSOR_POINTS.coachInput),
      send: measurePoint(root, sendButtonRef.current, DEFAULT_CURSOR_POINTS.send),
      coachReply: measurePoint(root, coachReplyAnchorRef.current, DEFAULT_CURSOR_POINTS.coachReply),
      success: measurePoint(root, successAnchorRef.current, DEFAULT_CURSOR_POINTS.success),
    }

    setCursorPoints(nextPoints)
  }, [])

  useLayoutEffect(() => {
    syncCursorPoints()
  }, [syncCursorPoints, phase, hasSentQuestion])

  useEffect(() => {
    if (reducedMotion) return

    const handleResize = () => {
      syncCursorPoints()
    }

    window.addEventListener('resize', handleResize)

    const resizeObserver = typeof ResizeObserver !== 'undefined'
      ? new ResizeObserver(handleResize)
      : null

    const observedElements = [
      previewRootRef.current,
      editorAnchorRef.current,
      runButtonRef.current,
      failureAnchorRef.current,
      coachInputRef.current,
      sendButtonRef.current,
      coachReplyAnchorRef.current,
      successAnchorRef.current,
    ].filter(Boolean) as HTMLElement[]

    observedElements.forEach((element) => resizeObserver?.observe(element))

    return () => {
      window.removeEventListener('resize', handleResize)
      resizeObserver?.disconnect()
    }
  }, [reducedMotion, syncCursorPoints])

  const cursor = CURSOR_PHASES[phase]
  const cursorPoint = cursorPoints[cursor.target]

  const panelOutlineClass = theme === 'dark'
    ? 'border-[rgba(255,255,255,0.09)]'
    : 'border-[rgba(129,144,174,0.58)]'
  const codePanelClass = theme === 'dark'
    ? 'bg-[linear-gradient(180deg,rgba(24,34,58,0.98)_0%,rgba(20,29,49,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    : 'bg-[linear-gradient(160deg,rgba(234,241,252,0.98)_0%,rgba(226,236,249,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
  const coachPanelClass = theme === 'dark'
    ? 'bg-[linear-gradient(180deg,rgba(27,37,60,0.98)_0%,rgba(22,31,51,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    : 'bg-[linear-gradient(165deg,rgba(236,243,253,0.98)_0%,rgba(226,236,249,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]'
  const previewStoryClass = theme === 'dark'
    ? 'border-pebble-accent/14 bg-[linear-gradient(180deg,rgba(59,130,246,0.08)_0%,rgba(255,255,255,0.02)_100%)]'
    : 'border-pebble-accent/14 bg-[linear-gradient(180deg,rgba(59,130,246,0.06)_0%,rgba(255,255,255,0.74)_100%)]'
  const previewStepClass = theme === 'dark'
    ? 'border-pebble-border/18 bg-pebble-canvas/34'
    : 'border-pebble-border/20 bg-white/58'
  const stepDoneClass = theme === 'dark'
    ? 'border-pebble-accent/24 bg-pebble-accent/12'
    : 'border-pebble-accent/24 bg-pebble-accent/10'
  const stepActiveClass = theme === 'dark'
    ? 'border-pebble-accent/34 bg-pebble-accent/18 shadow-[0_0_0_1px_rgba(96,165,250,0.22)_inset]'
    : 'border-pebble-accent/34 bg-pebble-accent/14 shadow-[0_0_0_1px_rgba(59,130,246,0.18)_inset]'
  const storyLabelClass = theme === 'dark'
    ? 'text-[hsl(220_20%_94%)]'
    : 'text-[hsl(223_32%_20%)]'
  const storyMetaClass = theme === 'dark'
    ? 'text-[hsl(220_14%_74%)]'
    : 'text-[hsl(221_22%_38%)]'
  const editorSurfaceClass = theme === 'dark'
    ? 'bg-[hsl(222_22%_26%)] text-[hsl(220_20%_92%)]'
    : 'bg-[hsl(220_38%_97%)] text-[hsl(224_34%_18%)]'

  const runtimeToneClass = isSuccessTone
    ? (theme === 'dark' ? 'border-emerald-300/35 bg-emerald-400/10' : 'border-emerald-500/34 bg-[rgba(230,248,238,0.92)]')
    : isFailRange
      ? (theme === 'dark' ? 'border-amber-300/40 bg-amber-400/10' : 'border-amber-500/38 bg-[rgba(255,244,224,0.92)]')
      : (theme === 'dark' ? 'border-pebble-border/22 bg-pebble-overlay/[0.05]' : 'border-pebble-border/24 bg-pebble-overlay/[0.34]')

  const logicWarnClass = theme === 'dark'
    ? 'border-amber-300/35 bg-amber-400/10 text-[rgba(255,232,201,0.98)]'
    : 'border-amber-500/45 bg-[rgba(255,243,226,0.94)] text-[#8A4A12]'

  const logicFixClass = theme === 'dark'
    ? 'border-pebble-accent/34 bg-pebble-accent/14 text-[hsl(220_24%_95%)]'
    : 'border-pebble-accent/40 bg-pebble-accent/12 text-[hsl(223_40%_22%)]'

  return (
    <div ref={previewRootRef} className={classNames('landing-preview-stage relative', isResetting && 'landing-preview-stage-reset')}>
      <div className="flex items-center justify-between gap-2">
        <p className={classNames('text-[13px] font-semibold uppercase tracking-[0.08em] text-pebble-text-secondary', isUrdu && 'rtlText')}>
          {previewLabel}
        </p>
        <span className="pebble-chip rounded-full px-2.5 py-1 text-[10.5px] uppercase tracking-[0.06em] text-pebble-text-primary">
          {previewUsingRun}
        </span>
      </div>

      <div className={`mt-4 rounded-[18px] border px-3.5 py-3 ${previewStoryClass}`}>
        <div className="grid gap-2.5 sm:grid-cols-6 sm:items-stretch">
          {STORY_STEPS.map((step, index) => {
            const Icon = step.icon
            const isDone = index < storyStepIndex
            const isActive = index === storyStepIndex

            return (
              <div
                key={step.id}
                className={classNames(
                  'rounded-[14px] border px-3 py-2.5 transition-colors duration-500',
                  previewStepClass,
                  isDone && stepDoneClass,
                  isActive && stepActiveClass,
                )}
              >
                <div className="flex items-center gap-1.5">
                  <Icon
                    className={classNames(
                      'h-3.5 w-3.5',
                      isDone || isActive ? 'text-pebble-accent' : 'text-pebble-text-muted',
                    )}
                    aria-hidden="true"
                  />
                  <p className={`text-[10px] font-semibold uppercase tracking-[0.08em] ${storyMetaClass}`}>
                    {step.label}
                  </p>
                </div>
                <p className={`mt-1 text-[11.5px] font-medium ${storyLabelClass}`}>
                  {step.detail}
                </p>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
        <div className={`min-w-0 rounded-[16px] border p-4 md:p-4.5 ${panelOutlineClass} ${codePanelClass}`}>
          <div className="mb-3 flex items-center justify-between text-[13px] text-pebble-text-primary">
            <span className="font-medium">{previewUnit}</span>
            <span
              className={classNames(
                'rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors duration-500',
                isSuccessTone
                  ? 'border-emerald-400/48 bg-emerald-500/12 text-emerald-700 dark:border-emerald-300/46 dark:bg-emerald-400/14 dark:text-emerald-100'
                  : isFailRange
                    ? 'border-amber-400/48 bg-amber-500/12 text-amber-700 dark:border-amber-300/45 dark:bg-amber-400/14 dark:text-amber-100'
                    : 'border-pebble-accent/42 bg-pebble-accent/12 text-pebble-accent dark:text-pebble-text-primary',
              )}
            >
              {status.testsLabel}
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="pebble-chip rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]">
              python3
            </span>
            <span
              ref={runButtonRef}
              className={classNames(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-300',
                theme === 'dark'
                  ? 'border-pebble-accent/34 bg-pebble-accent/16 text-pebble-text-primary'
                  : 'border-pebble-accent/36 bg-pebble-accent/12 text-pebble-accent',
                isRunHover && 'landing-preview-run-glow',
                isRunClick && 'landing-preview-run-click',
              )}
            >
              <Play className="h-3 w-3" aria-hidden="true" />
              {isRunning ? 'Running' : 'Run'}
            </span>
          </div>

          <pre
            dir="ltr"
            className={`ltrSafe min-w-0 overflow-hidden rounded-[10px] border ${panelOutlineClass} ${editorSurfaceClass} p-3 font-mono text-[12.5px] leading-[1.7]`}
          >
            <code className="block">
              <span className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2">
                <span className="text-right text-pebble-text-muted/80">1</span>
                <span>def two_sum(nums, target):</span>
              </span>
              <span className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2">
                <span className="text-right text-pebble-text-muted/80">2</span>
                <span>    seen = &#123;&#125;</span>
              </span>
              <span className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2">
                <span className="text-right text-pebble-text-muted/80">3</span>
                <span>    for i, n in enumerate(nums):</span>
              </span>
              {[4, 5, 6].map((lineNo, logicIndex) => {
                const isMistakeLine = logicIndex === 0 && isFailRange && codeDraft.mode !== 'fixed'
                const isFixedLine = logicIndex === 0 && (codeDraft.mode === 'fixed' || codeDraft.mode === 'fixing' && codeDraft.logicLines[0].includes('if target - n'))

                return (
                  <span key={lineNo} className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2">
                    <span className="text-right text-pebble-text-muted/80">{lineNo}</span>
                    <span
                      ref={lineNo === 4 ? editorAnchorRef : undefined}
                      className={classNames(
                        'rounded-md border px-1.5 transition-[color,background-color,border-color,opacity] duration-400',
                        codeDraft.logicLines[logicIndex] ? 'opacity-100' : 'opacity-45',
                        isMistakeLine && logicWarnClass,
                        isFixedLine && logicFixClass,
                        phase === 'apply_fix' && logicIndex === 0 && 'landing-preview-line-attention',
                        !isMistakeLine && !isFixedLine && 'border-transparent',
                      )}
                    >
                      {codeDraft.logicLines[logicIndex] || ' '}
                      {isCodeTyping && codeDraft.caretLine === logicIndex ? <span className="landing-preview-code-caret">|</span> : null}
                    </span>
                  </span>
                )
              })}
              <span className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2">
                <span className="text-right text-pebble-text-muted/80">7</span>
                <span>    return [-1, -1]</span>
              </span>
            </code>
          </pre>

          <div className="mt-3 grid gap-2.5 md:grid-cols-[1fr_auto] md:items-center">
            <span ref={failureAnchorRef} className="inline-flex min-w-0">
              <StatusPill variant={status.statusVariant} showIcon className="max-w-full whitespace-normal break-words leading-tight transition-all duration-500">
                {status.statusText}
              </StatusPill>
            </span>
            <span
              className={classNames(
                'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-500',
                isSuccessTone || isRunning ? 'pebble-chip-strong' : 'pebble-chip',
              )}
            >
              {status.statusMeta}
            </span>
          </div>

          <div ref={successAnchorRef} className={`mt-3 rounded-[12px] border px-3 py-2.5 text-[12px] leading-[1.6] transition-colors duration-500 ${runtimeToneClass}`}>
            <p className="font-medium text-pebble-text-primary">{status.runtimeTitle}</p>
            <p className="mt-1 text-pebble-text-secondary">{status.runtimeBody}</p>
          </div>
        </div>

        <div className={`min-w-0 rounded-[16px] border p-4 md:p-4.5 ${panelOutlineClass} ${coachPanelClass} grid h-[364px] grid-rows-[auto_minmax(0,1fr)_auto_auto] gap-3`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pebble-accent/28 text-[11px] font-semibold text-pebble-text-primary shadow-[0_6px_12px_rgba(55,72,110,0.10)]">
                P
              </span>
              <p className={classNames('text-[13px] font-semibold text-pebble-text-primary dark:text-[hsl(220_20%_94%)]', isUrdu && 'rtlText')}>
                {previewCoach}
              </p>
            </div>
            <span className="pebble-chip rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]">
              {getCoachStateLabel(phase)}
            </span>
          </div>

          <div className={classNames(`min-h-0 rounded-[12px] border ${panelOutlineClass} bg-pebble-overlay/[0.06] p-3`, isUrdu && 'rtlText')}>
            <div className="grid h-full grid-rows-[56px_minmax(0,1fr)] gap-2">
              <div className="min-h-0">
                <div
                  className={classNames(
                    'ml-auto h-full max-w-[95%] rounded-[10px] border border-pebble-accent/28 bg-pebble-accent/10 px-2.5 py-2 text-[12.5px] leading-[1.62] text-pebble-text-primary transition-opacity duration-350',
                    hasSentQuestion ? 'opacity-100' : 'opacity-0',
                  )}
                  aria-hidden={!hasSentQuestion}
                >
                  {QUESTION_TEXT}
                </div>
              </div>

              <div
                ref={coachReplyAnchorRef}
                className="min-h-0 overflow-hidden rounded-[10px] border border-pebble-border/24 bg-pebble-overlay/[0.08] px-2.5 py-2 text-[12.5px] leading-[1.64] text-pebble-text-secondary"
              >
                {phase === 'coach_thinking' ? (
                  <div className="flex items-center gap-1.5">
                    <span>Analyzing run output</span>
                    <span className="landing-preview-thinking-dots" aria-hidden="true">
                      <span className="landing-preview-thinking-dot" />
                      <span className="landing-preview-thinking-dot" />
                      <span className="landing-preview-thinking-dot" />
                    </span>
                  </div>
                ) : isAtOrAfter(phase, 'coach_reply') ? (
                  <div className="space-y-1">
                    <p className="font-medium text-pebble-text-primary">Grounded suggestion</p>
                    <p className="min-h-[1.2em]">{coachResponseLines[0] || ' '}</p>
                    <p className="min-h-[1.2em]">{coachResponseLines[1] || ' '}</p>
                    <p className="min-h-[1.2em]">{coachResponseLines[2] || ' '}</p>
                  </div>
                ) : (
                  <p>Run once, then ask Pebble why the case failed.</p>
                )}
              </div>
            </div>
          </div>

          <div
            ref={coachInputRef}
            className={classNames(
              'flex items-center gap-2 rounded-[10px] border px-2.5 py-2 transition-[border-color,background-color,box-shadow] duration-300',
              isInputFocused
                ? 'border-pebble-accent/38 bg-pebble-accent/10 shadow-[0_0_0_1px_rgba(59,130,246,0.16)_inset]'
                : 'border-pebble-border/24 bg-pebble-overlay/[0.08]',
            )}
          >
            <div className="min-w-0 flex-1 text-[12px] text-pebble-text-secondary">
              {inputText ? <span className="text-pebble-text-primary">{inputText}</span> : <span className="opacity-70">Ask Pebble...</span>}
            </div>
            <span
              ref={sendButtonRef}
              className={classNames(
                'inline-flex h-7 w-7 items-center justify-center rounded-full border transition-all duration-220',
                phase === 'send_question'
                  ? 'border-pebble-accent/42 bg-pebble-accent/18 text-pebble-text-primary landing-preview-run-click'
                  : phase === 'move_send'
                    ? 'border-pebble-accent/34 bg-pebble-accent/12 text-pebble-text-primary'
                    : 'border-pebble-border/28 bg-pebble-overlay/[0.12] text-pebble-text-secondary',
              )}
            >
              <SendHorizonal className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
          </div>

          <div className={classNames(
            'rounded-[10px] border px-3 py-2.5 text-[12px] leading-[1.6] transition-colors duration-500',
            isSuccessTone
              ? 'border-emerald-400/30 bg-emerald-500/10 text-pebble-text-secondary'
              : 'border-pebble-accent/22 bg-pebble-accent/10 text-pebble-text-secondary',
            isUrdu && 'rtlText',
          )}>
            Recovery loop: run, inspect, ask, fix, rerun.
          </div>
        </div>
      </div>

      {!reducedMotion ? (
        <div className="pointer-events-none absolute inset-0 z-30 hidden md:block" aria-hidden="true">
          <div
            className={classNames('landing-preview-cursor', cursor.click && 'landing-preview-cursor-click')}
            style={{
              left: `${cursorPoint.x}%`,
              top: `${cursorPoint.y}%`,
              transitionDuration: `${cursor.moveMs}ms`,
            }}
          >
            <MousePointer2 className="landing-preview-cursor-icon" />
            <span className="landing-preview-cursor-ring" />
          </div>
        </div>
      ) : null}
    </div>
  )
}
