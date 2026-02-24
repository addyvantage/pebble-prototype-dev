import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { SimulatedEditor } from '../components/session/SimulatedEditor'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import { buttonClass } from '../components/ui/buttonStyles'
import { getDemoMode } from '../utils/demoMode'
import { updatePebbleMemoryAfterSession } from '../utils/pebbleMemory'
import { computeStruggleScore, type TelemetrySnapshot } from '../utils/telemetry'

type Scene = 'struggle' | 'recovery' | 'complete'
type RunStatus = 'idle' | 'error' | 'success'
type RecoveryPath = 'none' | 'demo_auto' | 'autonomous' | 'hint'
type DemoAutoStage = 'idle' | 'waiting' | 'applying'

type SimulationState = {
  simSecond: number
  scene: Scene
  sceneSecond: number
  codeLines: string[]
  highlightedLines: number[]
  cursorLine: number
  runStatus: RunStatus
  runMessage: string
  telemetry: TelemetrySnapshot
  struggleScore: number
  thresholdStreak: number
  lowScoreStreak: number
  breakpointAt: number | null
  recoveryTimeSec: number | null
  nudgeVisible: boolean
  nudgeEverShown: boolean
  demoAutoStage: DemoAutoStage
  demoAutoStageTicks: number
  snoozeUntil: number
  snoozeCount: number
  recoveryPath: RecoveryPath
  flowRecovered: boolean
  sessionComplete: boolean
  usedHint: boolean
}

const struggleFrames = [
  [
    'function sumEven(nums: number[]) {',
    '  let total = 0;',
    '  for (const n of nums) {',
    '    if (n % 2 = 0) {',
    '      total += nums;',
    '    }',
    '  }',
    '  return total',
    '}',
  ],
  [
    'function sumEven(nums: number[]) {',
    '  let total = 0;',
    '  for (const n of nums) {',
    '    if (n % 2 == 0) {',
    '      total += nums;',
    '    }',
    '  }',
    '  return total',
    '}',
  ],
  [
    'function sumEven(nums: number[]) {',
    '  let total = 0;',
    '  for (const n of nums) {',
    '    if (n % 2 == 0) {',
    '      total += nums',
    '    }',
    '  }',
    '  return total',
    '}',
  ],
  [
    'function sumEven(nums: number[]) {',
    '  let total = 0;',
    '  for (const n of nums) {',
    '    if (n % 2 == 0) {',
    '      total += num',
    '    }',
    '  }',
    '  return total',
    '}',
  ],
]

const recoveryFrames = [
  [
    'function sumEven(nums: number[]) {',
    '  let total = 0;',
    '  for (const n of nums) {',
    '    if (n % 2 === 0) {',
    '      total += n;',
    '    }',
    '  }',
    '  return total;',
    '}',
  ],
  [
    'function sumEven(nums: number[]) {',
    '  let total = 0;',
    '  for (const n of nums) {',
    '    if (n % 2 === 0) {',
    '      total += n;',
    '    }',
    '  }',
    '  return total;',
    '}',
  ],
]

const initialState: SimulationState = {
  simSecond: 0,
  scene: 'struggle',
  sceneSecond: 0,
  codeLines: struggleFrames[0],
  highlightedLines: [],
  cursorLine: 5,
  runStatus: 'idle',
  runMessage: 'Awaiting run attempt',
  telemetry: {
    keysPerSecond: 2.5,
    idleSeconds: 0,
    backspaceBurstCount: 0,
    runAttempts: 0,
    repeatErrorCount: 0,
  },
  struggleScore: 24,
  thresholdStreak: 0,
  lowScoreStreak: 0,
  breakpointAt: null,
  recoveryTimeSec: null,
  nudgeVisible: false,
  nudgeEverShown: false,
  demoAutoStage: 'idle',
  demoAutoStageTicks: 0,
  snoozeUntil: 0,
  snoozeCount: 0,
  recoveryPath: 'none',
  flowRecovered: false,
  sessionComplete: false,
  usedHint: false,
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function startRecovery(state: SimulationState, usedHint: boolean, recoveryPath: RecoveryPath) {
  return {
    ...state,
    scene: 'recovery' as const,
    sceneSecond: 0,
    codeLines: recoveryFrames[0],
    highlightedLines: usedHint ? [4, 5] : [4],
    cursorLine: 4,
    runStatus: 'idle' as const,
    runMessage: usedHint
      ? 'Hint applied: parity check and accumulator target aligned.'
      : 'Autonomous rewrite detected, validating loop logic.',
    nudgeVisible: false,
    demoAutoStage: 'idle' as const,
    demoAutoStageTicks: 0,
    recoveryPath,
    usedHint: usedHint || state.usedHint,
  }
}

function getStruggleFrame(second: number) {
  if (second < 8) {
    return { frameIndex: 0, cursorLine: 4, keysPerSecond: 2.5, backspaceDelta: 0 }
  }
  if (second < 16) {
    return { frameIndex: 1, cursorLine: 5, keysPerSecond: 1.1, backspaceDelta: 0 }
  }
  if (second < 24) {
    return {
      frameIndex: second % 2 === 0 ? 2 : 3,
      cursorLine: 5,
      keysPerSecond: 0.5,
      backspaceDelta: second % 3 === 0 ? 1 : 0,
    }
  }

  if (second < 34) {
    return {
      frameIndex: second % 2 === 0 ? 2 : 1,
      cursorLine: 8,
      keysPerSecond: 1.45,
      backspaceDelta: second % 6 === 0 ? 1 : 0,
    }
  }

  return {
    frameIndex: 1,
    cursorLine: 8,
    keysPerSecond: 1.9,
    backspaceDelta: second % 7 === 0 ? 1 : 0,
  }
}

export function SessionPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const demoMode = useMemo(() => getDemoMode(), [])
  const [sim, setSim] = useState<SimulationState>(initialState)
  const memoryUpdatedRef = useRef(false)

  useEffect(() => {
    const tickMs = demoMode ? 450 : 750
    const demoWaitTicks = Math.max(1, Math.ceil(2000 / tickMs))
    const demoApplyTicks = Math.max(1, Math.ceil(1000 / tickMs))
    const timer = window.setInterval(() => {
      setSim((prev) => {
        if (prev.sessionComplete) {
          return prev
        }

        let next: SimulationState = {
          ...prev,
          simSecond: prev.simSecond + 1,
          sceneSecond: prev.sceneSecond + 1,
          telemetry: {
            ...prev.telemetry,
          },
        }
        const resetDemoAutoStage = () => {
          next.demoAutoStage = 'idle'
          next.demoAutoStageTicks = 0
        }

        if (next.scene === 'struggle') {
          const frame = getStruggleFrame(next.sceneSecond)
          next.codeLines = struggleFrames[frame.frameIndex]
          next.cursorLine = frame.cursorLine
          next.highlightedLines = []
          next.telemetry.keysPerSecond = frame.keysPerSecond
          next.telemetry.backspaceBurstCount += frame.backspaceDelta

          if (frame.keysPerSecond < 0.9) {
            next.telemetry.idleSeconds += 1
          } else {
            next.telemetry.idleSeconds = Math.max(0, next.telemetry.idleSeconds - 1)
          }

          if (next.sceneSecond === 13 || next.sceneSecond === 21) {
            next.telemetry.runAttempts += 1
            next.telemetry.repeatErrorCount = Math.max(0, next.telemetry.runAttempts - 1)
            next.runStatus = 'error'
            next.runMessage = 'Run failed: expected even sum 12, received NaN.'
          }

        }

        if (next.scene === 'recovery') {
          const recoveryFrameIndex = next.sceneSecond > 4 ? 1 : 0
          next.codeLines = recoveryFrames[recoveryFrameIndex]
          next.cursorLine = next.sceneSecond < 6 ? 5 : 8
          next.telemetry.keysPerSecond = next.sceneSecond < 4 ? 2.1 : 2.7
          next.telemetry.idleSeconds = Math.max(0, next.telemetry.idleSeconds - 1)

          if (next.sceneSecond === 8) {
            next.telemetry.runAttempts += 1
            next.runStatus = 'success'
            next.runMessage = 'Run successful: all checks passed.'
          }
        }

        next.struggleScore = computeStruggleScore(next.telemetry, {
          runStatus: next.runStatus,
          phase: next.scene,
        })

        if (next.struggleScore >= 64 && next.scene === 'struggle') {
          next.thresholdStreak += 1
        } else {
          next.thresholdStreak = Math.max(0, next.thresholdStreak - 1)
        }

        if (next.scene === 'struggle' && next.struggleScore <= 48) {
          next.lowScoreStreak += 1
        } else {
          next.lowScoreStreak = Math.max(0, next.lowScoreStreak - 1)
        }

        if (!next.breakpointAt && next.thresholdStreak >= 4) {
          next.breakpointAt = next.simSecond
        }

        if (
          next.scene === 'struggle' &&
          !next.nudgeVisible &&
          next.simSecond >= next.snoozeUntil &&
          next.thresholdStreak >= 4
        ) {
          next.nudgeVisible = true
          next.nudgeEverShown = true
        }

        if (demoMode) {
          if (next.scene !== 'struggle') {
            resetDemoAutoStage()
          } else if (!next.nudgeVisible && next.demoAutoStage !== 'idle') {
            resetDemoAutoStage()
          } else if (next.nudgeVisible && next.demoAutoStage === 'idle') {
            next.demoAutoStage = 'waiting'
            next.demoAutoStageTicks = 0
          } else if (next.demoAutoStage === 'waiting') {
            const waitingTicks = next.demoAutoStageTicks + 1
            if (waitingTicks >= demoWaitTicks) {
              next.demoAutoStage = 'applying'
              next.demoAutoStageTicks = 0
              if (next.runStatus !== 'error' || next.runMessage === 'Awaiting run attempt') {
                next.runMessage = 'Applying Pebble guidance to the active loop.'
              }
            } else {
              next.demoAutoStageTicks = waitingTicks
            }
          } else if (next.demoAutoStage === 'applying') {
            const applyingTicks = next.demoAutoStageTicks + 1
            if (
              applyingTicks >= demoApplyTicks &&
              next.nudgeVisible &&
              next.recoveryPath === 'none'
            ) {
              next = startRecovery(next, true, 'demo_auto')
            } else {
              next.demoAutoStageTicks = applyingTicks
            }
          }
        }

        if (
          !demoMode &&
          next.scene === 'struggle' &&
          next.recoveryPath === 'none' &&
          next.breakpointAt !== null &&
          next.telemetry.runAttempts >= 2 &&
          next.lowScoreStreak >= 8 &&
          (next.nudgeEverShown || next.snoozeCount > 0) &&
          !next.nudgeVisible
        ) {
          next = startRecovery(next, false, 'autonomous')
        }

        if (
          !next.flowRecovered &&
          next.runStatus === 'success' &&
          (next.scene === 'recovery' || next.scene === 'complete') &&
          next.struggleScore < 42
        ) {
          next.flowRecovered = true
        }

        if (next.scene === 'recovery' && next.sceneSecond >= 12 && next.runStatus === 'success') {
          next.scene = 'complete'
          next.sessionComplete = true
          next.highlightedLines = []
          next.recoveryTimeSec =
            next.breakpointAt !== null ? next.simSecond - next.breakpointAt : 18
          next.runMessage = 'Session complete. Recovery pattern logged.'
        }

        return next
      })
    }, tickMs)

    return () => window.clearInterval(timer)
  }, [demoMode])

  useEffect(() => {
    if (!sim.sessionComplete || sim.recoveryTimeSec === null || memoryUpdatedRef.current) {
      return
    }

    memoryUpdatedRef.current = true
    const flowStability = clamp(
      Math.round(100 - sim.struggleScore * 0.72 + (sim.usedHint ? 4 : 8)),
      58,
      92,
    )

    updatePebbleMemoryAfterSession({
      usedHint: sim.usedHint,
      nudgeShown: sim.nudgeEverShown,
      flowStability,
      recoveryTimeSec: sim.recoveryTimeSec,
      breakpointsResolved: Math.max(1, sim.telemetry.repeatErrorCount + 1),
      repeatErrorCount: sim.telemetry.repeatErrorCount,
      autonomousRecovery: !sim.usedHint,
    })
  }, [sim])

  function onShowMe() {
    setSim((prev) => startRecovery(prev, true, 'hint'))
  }

  function onNotNow() {
    setSim((prev) => ({
      ...prev,
      nudgeVisible: false,
      demoAutoStage: 'idle',
      demoAutoStageTicks: 0,
      snoozeUntil: prev.simSecond + 15,
      snoozeCount: prev.snoozeCount + 1,
      thresholdStreak: 0,
      runMessage: 'Pebble nudge snoozed for 15 simulated seconds.',
    }))
  }

  function onReplay() {
    memoryUpdatedRef.current = false
    setSim(initialState)
  }

  const phaseLabel =
    sim.scene === 'struggle'
      ? 'Phase 1 · Struggle'
      : sim.scene === 'recovery'
        ? 'Phase 2 · Recovery'
        : 'Phase complete'

  return (
    <section className="page-enter grid gap-6 lg:grid-cols-[1.35fr_0.65fr]">
      <Card className="min-h-[520px] space-y-4" padding="md" interactive>
        <header className="flex items-center justify-between">
          <div className="space-y-2">
            <Badge variant="neutral">Simulated IDE</Badge>
            <h1 className="text-2xl font-semibold tracking-[-0.015em] text-pebble-text-primary">
              Session {sessionId ?? '1'}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            {sim.flowRecovered && <Badge variant="success">Flow recovered</Badge>}
            <Button size="sm" variant="secondary" onClick={onReplay}>
              Replay
            </Button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-pebble-text-secondary">Typing cadence</p>
            <p className="mt-1 text-base font-semibold text-pebble-text-primary">
              {sim.telemetry.keysPerSecond.toFixed(1)} keys/s
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-pebble-text-secondary">Idle</p>
            <p className="mt-1 text-base font-semibold text-pebble-text-primary">
              {sim.telemetry.idleSeconds}s
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-pebble-text-secondary">Backspace bursts</p>
            <p className="mt-1 text-base font-semibold text-pebble-text-primary">
              {sim.telemetry.backspaceBurstCount}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-pebble-text-secondary">Run attempts</p>
            <p className="mt-1 text-base font-semibold text-pebble-text-primary">
              {sim.telemetry.runAttempts}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-pebble-text-secondary">Repeat errors</p>
            <p className="mt-1 text-base font-semibold text-pebble-text-primary">
              {sim.telemetry.repeatErrorCount}
            </p>
          </div>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs text-pebble-text-secondary">Struggle score</p>
            <p className="mt-1 text-base font-semibold text-pebble-warning">
              {sim.struggleScore}/100
            </p>
          </div>
        </div>

        <SimulatedEditor
          moduleTitle="Loop diagnostics"
          stepLabel={phaseLabel}
          codeLines={sim.codeLines}
          highlightedLines={sim.highlightedLines}
          cursorLine={sim.cursorLine}
          runStatus={sim.runStatus}
          runMessage={sim.runMessage}
          runAttempts={sim.telemetry.runAttempts}
        />
      </Card>

      <Card className="space-y-4" padding="md" interactive>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-[-0.015em] text-pebble-text-primary">
            Cognitive recovery
          </h2>
          <p className="text-sm leading-relaxed text-pebble-text-secondary">
            Pebble watches for cognitive breakpoints, nudges only when needed, then
            tracks whether you recover independently.
          </p>
        </div>

        <Divider />

        {sim.nudgeVisible && (
          <div className="nudge-enter rounded-xl border border-pebble-accent/30 bg-pebble-accent/10 p-4">
            <p className="text-sm font-semibold text-pebble-text-primary">Pebble nudge</p>
            <p className="mt-2 text-sm leading-relaxed text-pebble-text-secondary">
              You are close. Validate parity first, then add the current number into
              your running total.
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button type="button" className={buttonClass('primary', 'sm')} onClick={onShowMe}>
                Show me
              </button>
              <button
                type="button"
                className={buttonClass('secondary', 'sm')}
                onClick={onNotNow}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        {!sim.nudgeVisible && sim.scene === 'struggle' && sim.simSecond < sim.snoozeUntil && (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <p className="text-xs font-medium tracking-[0.01em] text-pebble-text-secondary">
              Snoozed · {sim.snoozeUntil - sim.simSecond}s remaining
            </p>
            <p className="mt-1 text-xs text-pebble-text-muted">
              Pebble will re-check after the timer expires.
            </p>
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-sm font-medium text-pebble-text-primary">Session state</p>
          <p className="text-sm text-pebble-text-secondary">
            {sim.scene === 'complete'
              ? `Completed. Recovery time: ${sim.recoveryTimeSec ?? 0}s.`
              : sim.scene === 'recovery'
                ? 'Recovery phase in progress, flow stability is improving.'
                : 'Struggle signals active, waiting for nudge decision.'}
          </p>
        </div>

        <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
          <p className="text-xs text-pebble-text-secondary">Demo pacing</p>
          <p className="mt-1 text-sm font-medium text-pebble-text-primary">
            {demoMode
              ? 'Demo mode On, simulation runs in approximately 30 seconds.'
              : 'Demo mode Off, simulation runs at a realistic pace.'}
          </p>
        </div>

        <Link to="/dashboard" className={buttonClass('secondary', 'sm')}>
          Open insights
        </Link>
      </Card>
    </section>
  )
}
