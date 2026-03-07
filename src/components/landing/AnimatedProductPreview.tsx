import { useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle2, Play, Sparkles, Wrench } from 'lucide-react'
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
  | 'run1'
  | 'fail'
  | 'coach'
  | 'fix'
  | 'run2'
  | 'success'
  | 'hold'
  | 'reset'

type PreviewCopy = {
  testsLabel: string
  statusVariant: 'info' | 'fail' | 'success'
  statusText: string
  statusMeta: string
  runLabel: string
  coachState: string
  coachMessage: string
  coachNextStep: string
  runtimeTitle: string
  runtimeBody: string
}

const TIMELINE: Array<{ phase: PreviewPhase; durationMs: number }> = [
  { phase: 'idle', durationMs: 1000 },
  { phase: 'run1', durationMs: 950 },
  { phase: 'fail', durationMs: 1600 },
  { phase: 'coach', durationMs: 2100 },
  { phase: 'fix', durationMs: 1700 },
  { phase: 'run2', durationMs: 950 },
  { phase: 'success', durationMs: 1700 },
  { phase: 'hold', durationMs: 1350 },
  { phase: 'reset', durationMs: 650 },
]

const PHASE_RANK: Record<PreviewPhase, number> = {
  idle: 0,
  run1: 1,
  fail: 2,
  coach: 3,
  fix: 4,
  run2: 5,
  success: 6,
  hold: 7,
  reset: 8,
}

const STORY_STEPS = [
  { id: 'attempt', label: 'Attempt', detail: 'Two Sum run', icon: Play },
  { id: 'failure', label: 'Failure', detail: 'Case #2 fails', icon: AlertTriangle },
  { id: 'coach', label: 'Coach', detail: 'Grounded hint', icon: Sparkles },
  { id: 'fix', label: 'Fix', detail: 'Swap line order', icon: Wrench },
  { id: 'success', label: 'Passed', detail: 'Accepted', icon: CheckCircle2 },
] as const

const FIX_IF_LINE = '        if target - n in seen:'
const WRONG_STORE_LINE = '        seen[n] = i'
const RETURN_LINE = '            return [seen[target - n], i]'
const FINAL_LINE = '    return [-1, -1]'
const FIX_STORE_LINE = '        seen[n] = i'

function classNames(...values: Array<string | false | undefined>) {
  return values.filter(Boolean).join(' ')
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

function usePreviewTimeline(reducedMotion: boolean) {
  const [phase, setPhase] = useState<PreviewPhase>('idle')

  useEffect(() => {
    if (reducedMotion) {
      setPhase('success')
      return
    }

    let isCancelled = false
    let timeoutId: number | undefined

    const runStep = (index: number) => {
      if (isCancelled) return

      const step = TIMELINE[index]
      setPhase(step.phase)

      timeoutId = window.setTimeout(() => {
        runStep((index + 1) % TIMELINE.length)
      }, step.durationMs)
    }

    runStep(0)

    return () => {
      isCancelled = true
      if (timeoutId) window.clearTimeout(timeoutId)
    }
  }, [reducedMotion])

  return phase
}

function getStoryStepIndex(phase: PreviewPhase) {
  if (phase === 'idle' || phase === 'run1') return 0
  if (phase === 'fail') return 1
  if (phase === 'coach') return 2
  if (phase === 'fix' || phase === 'run2') return 3
  return 4
}

function getPhaseCopy(phase: PreviewPhase): PreviewCopy {
  if (phase === 'run1') {
    return {
      testsLabel: 'Tests: running...',
      statusVariant: 'info',
      statusText: 'Running tests...',
      statusMeta: 'Evaluating',
      runLabel: 'Running',
      coachState: 'Analyzing',
      coachMessage: 'Running your current approach on sample and hidden checks.',
      coachNextStep: 'Waiting for failure signal...',
      runtimeTitle: 'Runtime',
      runtimeBody: 'Executing sample and hidden testcases.',
    }
  }

  if (phase === 'fail') {
    return {
      testsLabel: 'Tests: 1/3',
      statusVariant: 'fail',
      statusText: 'Fail #2 expected: [0, 1] got: -1, -1',
      statusMeta: 'Case isolated',
      runLabel: 'Run',
      coachState: 'Failure',
      coachMessage: 'Case #2 misses the already-seen complement.',
      coachNextStep: 'Root cause isolated from current run output.',
      runtimeTitle: 'Failure signal',
      runtimeBody: 'You insert into seen too early, then miss the complement check.',
    }
  }

  if (phase === 'coach') {
    return {
      testsLabel: 'Tests: 1/3',
      statusVariant: 'fail',
      statusText: 'Fail #2 expected: [0, 1] got: -1, -1',
      statusMeta: 'Coach grounded',
      runLabel: 'Run',
      coachState: 'Hint',
      coachMessage: 'Check complement before storing current value.',
      coachNextStep: 'One next step: swap the lookup and insert order.',
      runtimeTitle: 'Guided recovery',
      runtimeBody: 'Pebble points to one targeted fix, not a rewrite.',
    }
  }

  if (phase === 'fix') {
    return {
      testsLabel: 'Tests: 2/3',
      statusVariant: 'info',
      statusText: 'Applying one-line fix...',
      statusMeta: 'Fix in progress',
      runLabel: 'Rerun',
      coachState: 'Next step',
      coachMessage: 'Move the lookup first, then keep insert after return check.',
      coachNextStep: 'Only one structural change needed.',
      runtimeTitle: 'Patch',
      runtimeBody: 'Swapping two lines closes the failing path.',
    }
  }

  if (phase === 'run2') {
    return {
      testsLabel: 'Tests: rerunning...',
      statusVariant: 'info',
      statusText: 'Rerunning after fix...',
      statusMeta: 'Verifying',
      runLabel: 'Running',
      coachState: 'Verifying',
      coachMessage: 'Good fix. Rechecking sample and hidden tests now.',
      coachNextStep: 'Looking for regressions before final pass.',
      runtimeTitle: 'Validation',
      runtimeBody: 'Re-running all checks with updated line order.',
    }
  }

  if (phase === 'success' || phase === 'hold' || phase === 'reset') {
    return {
      testsLabel: 'Tests: 3/3',
      statusVariant: 'success',
      statusText: 'Accepted - all tests passed',
      statusMeta: 'Recovery complete',
      runLabel: 'Run',
      coachState: 'Resolved',
      coachMessage: 'Accepted. Recovery complete.',
      coachNextStep: 'Pattern locked: check complement first, then store.',
      runtimeTitle: 'Resolved',
      runtimeBody: 'Passed hidden tests after one grounded fix.',
    }
  }

  return {
    testsLabel: 'Tests: 1/3',
    statusVariant: 'info',
    statusText: 'Ready to run',
    statusMeta: 'Runtime ready',
    runLabel: 'Run',
    coachState: 'Waiting',
    coachMessage: 'Run your current attempt and I will anchor guidance to the failure.',
    coachNextStep: 'Recovery loop starts when you run.',
    runtimeTitle: 'Awaiting run',
    runtimeBody: 'Trigger one run to isolate the failing testcase.',
  }
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
  const phase = usePreviewTimeline(reducedMotion)
  const activePhase: PreviewPhase = reducedMotion ? 'success' : phase
  const copy = getPhaseCopy(activePhase)
  const storyStepIndex = getStoryStepIndex(activePhase)
  const isRunning = activePhase === 'run1' || activePhase === 'run2'
  const isResetting = !reducedMotion && activePhase === 'reset'
  const isFailTone = PHASE_RANK[activePhase] >= PHASE_RANK.fail && PHASE_RANK[activePhase] <= PHASE_RANK.run2
  const isSuccessTone = PHASE_RANK[activePhase] >= PHASE_RANK.success

  const codeState: 'wrong' | 'fixing' | 'fixed' = activePhase === 'fix'
    ? 'fixing'
    : PHASE_RANK[activePhase] >= PHASE_RANK.run2
      ? 'fixed'
      : 'wrong'

  const [fixTypedChars, setFixTypedChars] = useState(FIX_IF_LINE.length)

  useEffect(() => {
    if (reducedMotion) {
      setFixTypedChars(FIX_IF_LINE.length)
      return
    }

    if (activePhase !== 'fix') {
      if (PHASE_RANK[activePhase] > PHASE_RANK.fix) {
        setFixTypedChars(FIX_IF_LINE.length)
      }
      return
    }

    setFixTypedChars(0)
    let nextChars = 0
    const intervalId = window.setInterval(() => {
      nextChars += 1
      setFixTypedChars(Math.min(nextChars, FIX_IF_LINE.length))

      if (nextChars >= FIX_IF_LINE.length) {
        window.clearInterval(intervalId)
      }
    }, 28)

    return () => window.clearInterval(intervalId)
  }, [activePhase, reducedMotion])

  const lineFourText = codeState === 'wrong'
    ? WRONG_STORE_LINE
    : codeState === 'fixing'
      ? FIX_IF_LINE.slice(0, fixTypedChars)
      : FIX_IF_LINE
  const lineFiveText = codeState === 'wrong' ? '        if target - n in seen:' : RETURN_LINE
  const lineSixText = codeState === 'wrong' ? RETURN_LINE : FIX_STORE_LINE
  const lineSixOpacity = codeState === 'fixing'
    ? Math.min(1, 0.32 + fixTypedChars / (FIX_IF_LINE.length * 1.2))
    : 1

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
  const runtimeNeutralClass = theme === 'dark'
    ? 'border-pebble-border/22 bg-pebble-overlay/[0.05]'
    : 'border-pebble-border/24 bg-pebble-overlay/[0.34]'
  const runtimeFailClass = theme === 'dark'
    ? 'border-amber-300/40 bg-amber-400/10'
    : 'border-amber-500/38 bg-[rgba(255,244,224,0.92)]'
  const runtimeSuccessClass = theme === 'dark'
    ? 'border-emerald-300/35 bg-emerald-400/10'
    : 'border-emerald-500/34 bg-[rgba(230,248,238,0.92)]'
  const lineWarnClass = theme === 'dark'
    ? 'border-amber-300/35 bg-amber-400/10 text-[rgba(255,232,201,0.98)]'
    : 'border-amber-500/45 bg-[rgba(255,243,226,0.94)] text-[#8A4A12]'
  const lineFixClass = theme === 'dark'
    ? 'border-pebble-accent/34 bg-pebble-accent/14 text-[hsl(220_24%_95%)]'
    : 'border-pebble-accent/40 bg-pebble-accent/12 text-[hsl(223_40%_22%)]'

  const runtimeToneClass = isSuccessTone ? runtimeSuccessClass : isFailTone ? runtimeFailClass : runtimeNeutralClass
  const editorHeaderChipClass = isSuccessTone
    ? 'border-emerald-400/48 bg-emerald-500/12 text-emerald-700 dark:border-emerald-300/46 dark:bg-emerald-400/14 dark:text-emerald-100'
    : isFailTone
      ? 'border-amber-400/48 bg-amber-500/12 text-amber-700 dark:border-amber-300/45 dark:bg-amber-400/14 dark:text-amber-100'
      : 'border-pebble-accent/42 bg-pebble-accent/12 text-pebble-accent dark:text-pebble-text-primary'

  return (
    <div className={classNames('landing-preview-stage', isResetting && 'landing-preview-stage-reset')}>
      <div className="flex items-center justify-between gap-2">
        <p className={classNames('text-[13px] font-semibold uppercase tracking-[0.08em] text-pebble-text-secondary', isUrdu && 'rtlText')}>
          {previewLabel}
        </p>
        <span className="pebble-chip rounded-full px-2.5 py-1 text-[10.5px] uppercase tracking-[0.06em] text-pebble-text-primary">
          {previewUsingRun}
        </span>
      </div>

      <div className={`mt-4 rounded-[18px] border px-3.5 py-3 ${previewStoryClass}`}>
        <div className="grid gap-2.5 sm:grid-cols-5 sm:items-stretch">
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
                  <p className={`text-[10.5px] font-semibold uppercase tracking-[0.08em] ${storyMetaClass}`}>
                    {step.label}
                  </p>
                </div>
                <p className={`mt-1 text-[12px] font-medium ${storyLabelClass}`}>
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
            <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold transition-colors duration-500 ${editorHeaderChipClass}`}>
              {copy.testsLabel}
            </span>
          </div>

          <div className="mb-3 flex items-center justify-between gap-2">
            <span className="pebble-chip rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]">
              python3
            </span>
            <span
              className={classNames(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-all duration-500',
                theme === 'dark'
                  ? 'border-pebble-accent/34 bg-pebble-accent/16 text-pebble-text-primary'
                  : 'border-pebble-accent/36 bg-pebble-accent/12 text-pebble-accent',
                isRunning && 'landing-preview-run-glow',
              )}
            >
              <Play className="h-3 w-3" aria-hidden="true" />
              {copy.runLabel}
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
              <span className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2">
                <span className="text-right text-pebble-text-muted/80">4</span>
                <span
                  className={classNames(
                    'rounded-md border px-1.5 transition-colors duration-500',
                    codeState === 'wrong' && (activePhase === 'fail' || activePhase === 'coach') && lineWarnClass,
                    codeState !== 'wrong' && lineFixClass,
                    activePhase === 'fix' && 'landing-preview-line-attention',
                  )}
                >
                  {lineFourText}
                  {codeState === 'fixing' && fixTypedChars < FIX_IF_LINE.length ? <span className="landing-preview-code-caret">|</span> : null}
                </span>
              </span>
              <span className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2">
                <span className="text-right text-pebble-text-muted/80">5</span>
                <span>{lineFiveText}</span>
              </span>
              <span className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2">
                <span className="text-right text-pebble-text-muted/80">6</span>
                <span
                  style={{ opacity: lineSixOpacity }}
                  className={classNames(
                    'rounded-md border px-1.5 transition-[opacity,color,background-color,border-color] duration-500',
                    codeState === 'wrong' ? 'border-transparent' : lineFixClass,
                  )}
                >
                  {lineSixText}
                </span>
              </span>
              <span className="grid grid-cols-[1.4rem_minmax(0,1fr)] gap-2">
                <span className="text-right text-pebble-text-muted/80">7</span>
                <span>{FINAL_LINE}</span>
              </span>
            </code>
          </pre>

          <div className="mt-3 grid gap-2.5 md:grid-cols-[1fr_auto] md:items-center">
            <StatusPill variant={copy.statusVariant} showIcon className="max-w-full whitespace-normal break-words leading-tight transition-all duration-500">
              {copy.statusText}
            </StatusPill>
            <span
              className={classNames(
                'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors duration-500',
                isSuccessTone || isRunning ? 'pebble-chip-strong' : 'pebble-chip',
              )}
            >
              {copy.statusMeta}
            </span>
          </div>

          <div className={`mt-3 rounded-[12px] border px-3 py-2.5 text-[12px] leading-[1.6] transition-colors duration-500 ${runtimeToneClass}`}>
            <p className="font-medium text-pebble-text-primary">{copy.runtimeTitle}</p>
            <p className="mt-1 text-pebble-text-secondary">{copy.runtimeBody}</p>
          </div>
        </div>

        <div className={`min-w-0 rounded-[16px] border p-4 md:p-4.5 ${panelOutlineClass} ${coachPanelClass}`}>
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
              {copy.coachState}
            </span>
          </div>

          <p
            key={`${activePhase}-coach-message`}
            className={classNames(
              'landing-preview-message-enter mt-3 text-[13.5px] leading-[1.76] text-pebble-text-secondary dark:text-[hsl(220_15%_78%)]',
              isUrdu && 'rtlText',
            )}
          >
            {copy.coachMessage}
          </p>

          <div
            key={`${activePhase}-coach-next`}
            className={classNames(
              `landing-preview-message-enter mt-3.5 rounded-[10px] border ${panelOutlineClass} bg-pebble-overlay/[0.08] px-3 py-2.5 text-[12px] leading-[1.6] text-pebble-text-secondary`,
              isUrdu && 'rtlText',
            )}
          >
            <p className="font-medium text-pebble-text-primary">Next step</p>
            <p className="mt-1">{copy.coachNextStep}</p>
          </div>

          <div className={classNames(
            `mt-3 rounded-[10px] border px-3 py-2.5 text-[12px] leading-[1.6] transition-colors duration-500`,
            isSuccessTone
              ? 'border-emerald-400/30 bg-emerald-500/10 text-pebble-text-secondary'
              : 'border-pebble-accent/22 bg-pebble-accent/10 text-pebble-text-secondary',
            isUrdu && 'rtlText',
          )}>
            Recovery loop: attempt, fail, coach, fix, accepted.
          </div>
        </div>
      </div>
    </div>
  )
}
