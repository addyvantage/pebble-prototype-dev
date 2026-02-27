import { useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { PebbleMascot } from '../components/mascot/PebbleMascot'
import { CodeEditor } from '../components/session/CodeEditor'
import { GuidedFixPanel } from '../components/session/GuidedFixPanel'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import { buttonClass } from '../components/ui/buttonStyles'
import { getTaskById, taskList } from '../tasks'
import type { GuidedStep, TaskLesson } from '../tasks/types'
import { getDemoMode } from '../utils/demoMode'
import { updatePebbleMemoryAfterSession } from '../utils/pebbleMemory'
import { appendSessionInsight } from '../utils/sessionInsights'
import { type RunErrorKey, type TaskRunResult } from '../utils/taskHarness'
import { getTaskProgress, markTaskCompleted } from '../utils/taskProgress'
import { computeStruggleScore, type TelemetrySnapshot } from '../utils/telemetry'
import {
  getRequestedLanguageLabel,
  getRuntimeLanguageLabel,
  getUserProfile,
  type UserSkillLevel,
} from '../utils/userProfile'

type Scene = 'struggle' | 'recovery' | 'complete'
type RunStatus = 'idle' | 'error' | 'success'
type RecoveryMode = 'none' | 'guided'
type DecisionChoice = 'show_me' | 'not_now' | null

type GuidedContent = {
  nudgeCopy: string
  guidedSteps: GuidedStep[]
}

type RecoveryState = {
  mode: RecoveryMode
  step: number
  totalSteps: number
  fixApplied: boolean
  startedAtSimSecond: number
}

type SimulationState = {
  simSecond: number
  scene: Scene
  codeText: string
  highlightedLines: number[]
  proposedLines: number[]
  runStatus: RunStatus
  runMessage: string
  lastErrorKey: RunErrorKey | null
  currentErrorKey: RunErrorKey | null
  guidedErrorKey: RunErrorKey | null
  errorKeyHistory: RunErrorKey[]
  sameErrorStreak: number
  telemetry: TelemetrySnapshot
  struggleScore: number
  thresholdStreak: number
  firstStruggleAt: number | null
  firstRecoveryAt: number | null
  recoveryTimeSec: number | null
  nudgeVisible: boolean
  nudgeEverShown: boolean
  nudgeShownAtSimSecond: number | null
  snoozeUntil: number
  snoozeCount: number
  recovery: RecoveryState
  recoveryEffectivenessScore: number
  struggleScorePeak: number
  flowRecovered: boolean
  sessionComplete: boolean
  usedHint: boolean
  decisionChoice: DecisionChoice
  timeToDecisionSec: number
  guidedFixStartedAtSimSecond: number | null
  timeInGuidedFixSec: number
  applyFixUsed: boolean
  recoveryStableSince: number | null
}

type DemoStep =
  | 'idle'
  | 'init'
  | 'run_first'
  | 'type_partial_fix'
  | 'run_second'
  | 'wait_nudge'
  | 'show_me'
  | 'guided_progress'
  | 'apply_fix'
  | 'run_success'
  | 'finish'
  | 'pause'
  | 'replay'

type LessonTab = 'objectives' | 'hints' | 'mistakes'

type HandlerOptions = {
  fromDemo?: boolean
}

type DemoTypingOptions = {
  nextStep: DemoStep
  startDelayMs?: number
  pauseAfterTypingMs?: number
  key: string
}

const AFK_THRESHOLD_MS = 20_000
const AFK_THRESHOLD_MS_DEMO = 7_000
const ACTIVITY_THROTTLE_MS = 500
const NUDGE_SCORE_THRESHOLD = 64
const NUDGE_STREAK_THRESHOLD = 3
const EDIT_WINDOW_MS = 5_000
const BACKSPACE_BURST_WINDOW_MS = 700
const BACKSPACE_BURST_THRESHOLD = 4
const ERROR_HISTORY_SIZE = 5

const DEMO_PACING = {
  typeCharMs: 45,
  typeChunk: 1,
  pauseAfterTypingMs: 800,
  pauseAfterRunMs: 1400,
  pauseOnNudgeMs: 2200,
  pauseOnGuidedStepMs: 2000,
  pauseBeforeApplyMs: 1500,
  pauseAfterApplyMs: 1200,
  pauseOnSuccessMs: 1600,
  pauseBeforeFinishMs: 1200,
  pauseBeforeReplayMs: 2500,
  pollMs: 350,
} as const

const fallbackGuidedContent: GuidedContent = {
  nudgeCopy: 'Validate the failing condition first, then rerun with a minimal fix.',
  guidedSteps: [
    {
      title: 'Inspect the failing line',
      detail: 'Focus on the highlighted line and verify the intended condition.',
      runMessage: 'Step 1/2: inspecting issue.',
      highlightedLines: [],
      proposedLines: [],
    },
    {
      title: 'Apply the smallest safe fix',
      detail: 'Patch the issue, then rerun to confirm behavior.',
      runMessage: 'Step 2/2: ready to apply fix.',
      highlightedLines: [],
      proposedLines: [],
    },
  ],
}

const fallbackLesson: TaskLesson = {
  objectives: [
    'Understand the expected behavior before coding.',
    'Make one small fix, then run again.',
    'Use run output and guidance to validate progress.',
  ],
  hints: [
    'Start with the line most tied to correctness.',
    'Prefer minimal edits over large rewrites.',
    'Re-run quickly after each meaningful change.',
  ],
  commonMistakes: [
    'Editing too many lines at once.',
    'Ignoring run output details.',
    'Skipping validation after changes.',
  ],
}

const defaultRecoveryState: RecoveryState = {
  mode: 'none',
  step: 0,
  totalSteps: 0,
  fixApplied: false,
  startedAtSimSecond: 0,
}

function createInitialState(starterCode: string): SimulationState {
  return {
    simSecond: 0,
    scene: 'struggle',
    codeText: starterCode,
    highlightedLines: [],
    proposedLines: [],
    runStatus: 'idle',
    runMessage: 'Edit the function, then run to validate output.',
    lastErrorKey: null,
    currentErrorKey: null,
    guidedErrorKey: null,
    errorKeyHistory: [],
    sameErrorStreak: 0,
    telemetry: {
      keysPerSecond: 0,
      idleSeconds: 0,
      backspaceBurstCount: 0,
      runAttempts: 0,
      repeatErrorCount: 0,
    },
    struggleScore: 24,
    thresholdStreak: 0,
    firstStruggleAt: null,
    firstRecoveryAt: null,
    recoveryTimeSec: null,
    nudgeVisible: false,
    nudgeEverShown: false,
    nudgeShownAtSimSecond: null,
    snoozeUntil: 0,
    snoozeCount: 0,
    recovery: defaultRecoveryState,
    recoveryEffectivenessScore: 0,
    struggleScorePeak: 24,
    flowRecovered: false,
    sessionComplete: false,
    usedHint: false,
    decisionChoice: null,
    timeToDecisionSec: 0,
    guidedFixStartedAtSimSecond: null,
    timeInGuidedFixSec: 0,
    applyFixUsed: false,
    recoveryStableSince: null,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function computeRecoveryEffectivenessScore(timeToRecovery: number) {
  return clamp(Math.round(100 - timeToRecovery * 12), 0, 100)
}

function getDefaultLessonTab(skillLevel: UserSkillLevel | null): LessonTab {
  if (skillLevel === 'Newbie' || skillLevel === 'Beginner') {
    return 'objectives'
  }
  return 'hints'
}

function getNudgeThreshold(skillLevel: UserSkillLevel | null) {
  if (skillLevel === 'Newbie') {
    return clamp(NUDGE_SCORE_THRESHOLD - 6, 45, 80)
  }
  if (skillLevel === 'Beginner') {
    return clamp(NUDGE_SCORE_THRESHOLD - 3, 45, 80)
  }
  if (skillLevel === 'Professional') {
    return clamp(NUDGE_SCORE_THRESHOLD + 4, 45, 80)
  }
  return NUDGE_SCORE_THRESHOLD
}

function personalizeNudgeCopy(baseCopy: string, skillLevel: UserSkillLevel | null) {
  if (skillLevel === 'Newbie' || skillLevel === 'Beginner') {
    return `${baseCopy} Pebble will walk you through each step clearly.`
  }
  if (skillLevel === 'Intermediate' || skillLevel === 'Professional') {
    return `${baseCopy} Keep it minimal, then rerun.`
  }
  return baseCopy
}

function isDecisionGateOpen(state: SimulationState) {
  return state.nudgeVisible && state.scene === 'struggle'
}

function isGuidedRecoveryInProgress(state: SimulationState) {
  return state.scene === 'struggle' && state.recovery.mode === 'guided' && !state.recovery.fixApplied
}

function recomputeStruggle(state: SimulationState, isAfk: boolean) {
  const nextScore = computeStruggleScore(state.telemetry, {
    runStatus: state.runStatus,
    phase: state.scene,
    isAfk,
  })

  return {
    ...state,
    struggleScore: nextScore,
    struggleScorePeak: Math.max(state.struggleScorePeak, nextScore),
  }
}

function buildGuidedSnippetLines(codeText: string, lineNumbers: number[]) {
  const codeLines = codeText.split('\n')
  if (codeLines.length === 0 || lineNumbers.length === 0) {
    return [] as string[]
  }

  const firstLine = Math.max(1, Math.min(...lineNumbers) - 1)
  const lastLine = Math.min(codeLines.length, Math.max(...lineNumbers) + 1)

  return codeLines
    .slice(firstLine - 1, lastLine)
    .map((line, index) => `${firstLine + index}. ${line}`)
}

function completeSession(state: SimulationState) {
  if (state.sessionComplete) {
    return state
  }

  const recoveryTimeSec =
    state.firstStruggleAt !== null && state.firstRecoveryAt !== null
      ? Math.max(1, state.firstRecoveryAt - state.firstStruggleAt)
      : Math.max(1, state.simSecond)

  return {
    ...state,
    scene: 'complete' as const,
    sessionComplete: true,
    highlightedLines: [],
    proposedLines: [],
    recoveryTimeSec,
    runMessage: 'Session complete. Recovery pattern logged.',
  }
}

export function SessionPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams<{ sessionId: string }>()
  const demoMode = useMemo(() => getDemoMode(), [])
  const task = useMemo(() => getTaskById(sessionId), [sessionId])
  const autoplayDemoEnabled = demoMode && task.id === '1'
  const userProfile = useMemo(() => getUserProfile(), [])
  const afkThresholdMs = useMemo(
    () => (autoplayDemoEnabled ? AFK_THRESHOLD_MS_DEMO : AFK_THRESHOLD_MS),
    [autoplayDemoEnabled],
  )
  const nudgeScoreThreshold = useMemo(
    () => getNudgeThreshold(userProfile?.skillLevel ?? null),
    [userProfile],
  )

  const [sim, setSim] = useState<SimulationState>(() => createInitialState(task.starterCode))
  const [isAfk, setIsAfk] = useState(false)
  const [isShowMeTooltipOpen, setIsShowMeTooltipOpen] = useState(false)
  const [showMeTooltipPosition, setShowMeTooltipPosition] = useState<{
    top: number
    left: number
  } | null>(null)
  const [demoStep, setDemoStep] = useState<DemoStep>(autoplayDemoEnabled ? 'init' : 'idle')
  const [demoStoppedByUser, setDemoStoppedByUser] = useState(false)
  const [demoRunId, setDemoRunId] = useState(0)
  const [lessonTab, setLessonTab] = useState<LessonTab>(() =>
    getDefaultLessonTab(userProfile?.skillLevel ?? null),
  )
  const [isReviewSolutionOpen, setIsReviewSolutionOpen] = useState(false)
  const demoPartialFixCode = task.demoScript?.partialFixCode ?? task.starterCode

  const memoryUpdatedRef = useRef(false)
  const reviewCodeBeforeSolutionRef = useRef<string | null>(null)
  const showMeButtonRef = useRef<HTMLButtonElement | null>(null)
  const showMeTooltipId = useId()
  const sessionSectionRef = useRef<HTMLElement | null>(null)

  const lastActivityAtRef = useRef(Date.now())
  const lastMouseMoveAtRef = useRef(0)
  const isWindowFocusedRef = useRef(true)
  const wasAfkRef = useRef(false)
  const guidedRecoveryOpenRef = useRef(false)

  const lastEditAtRef = useRef(Date.now())
  const editEventTimesRef = useRef<number[]>([])
  const deleteBurstRef = useRef({ count: 0, lastAt: 0 })
  const demoTimerRef = useRef<number | null>(null)
  const demoTypingTimerRef = useRef<number | null>(null)
  const demoTypingInProgressRef = useRef(false)
  const userInteractedRef = useRef(false)
  const demoInternalActionRef = useRef(false)
  const demoScheduleKeyRef = useRef<string | null>(null)
  const demoStepActionDoneRef = useRef<DemoStep | null>(null)
  const simRef = useRef(sim)
  const isAfkRef = useRef(isAfk)
  const demoStoppedByUserRef = useRef(demoStoppedByUser)
  const loadedTaskIdRef = useRef(task.id)

  const decisionGateOpen = isDecisionGateOpen(sim)
  const guidedRecoveryOpen = isGuidedRecoveryInProgress(sim)

  useEffect(() => {
    guidedRecoveryOpenRef.current = guidedRecoveryOpen
  }, [guidedRecoveryOpen])

  useEffect(() => {
    setLessonTab(getDefaultLessonTab(userProfile?.skillLevel ?? null))
  }, [task.id, userProfile])

  const getGuidedContent = useCallback(
    (errorKey: RunErrorKey | null): GuidedContent => {
      const primaryConfig = errorKey ? task.errorKeyConfig[errorKey] : undefined
      if (primaryConfig) {
        return {
          nudgeCopy: primaryConfig.nudgeCopy,
          guidedSteps: primaryConfig.guidedSteps,
        }
      }

      const firstConfig = Object.values(task.errorKeyConfig)[0]
      if (firstConfig) {
        return {
          nudgeCopy: firstConfig.nudgeCopy,
          guidedSteps: firstConfig.guidedSteps,
        }
      }

      return fallbackGuidedContent
    },
    [task],
  )

  const getShowMeTooltipPosition = useCallback((buttonRect: DOMRect) => {
    const tooltipWidth = 320
    const tooltipHeight = 116
    const gap = 10
    const viewportPadding = 8

    const left = clamp(
      buttonRect.left + buttonRect.width / 2 - tooltipWidth / 2,
      viewportPadding,
      window.innerWidth - tooltipWidth - viewportPadding,
    )

    const aboveTop = buttonRect.top - tooltipHeight - gap
    const belowTop = buttonRect.bottom + gap

    const top =
      aboveTop >= viewportPadding
        ? aboveTop
        : clamp(
            belowTop,
            viewportPadding,
            window.innerHeight - tooltipHeight - viewportPadding,
          )

    return { top, left }
  }, [])

  const showShowMeTooltip = useCallback(() => {
    if (!decisionGateOpen || isAfk) {
      return
    }

    const rect = showMeButtonRef.current?.getBoundingClientRect()
    if (!rect) {
      return
    }

    setShowMeTooltipPosition(getShowMeTooltipPosition(rect))
    setIsShowMeTooltipOpen(true)
  }, [decisionGateOpen, getShowMeTooltipPosition, isAfk])

  const hideShowMeTooltip = useCallback(() => {
    setIsShowMeTooltipOpen(false)
  }, [])

  useEffect(() => {
    simRef.current = sim
  }, [sim])

  useEffect(() => {
    isAfkRef.current = isAfk
  }, [isAfk])

  useEffect(() => {
    demoStoppedByUserRef.current = demoStoppedByUser
  }, [demoStoppedByUser])

  const clearDemoTimer = useCallback(() => {
    if (demoTimerRef.current !== null) {
      window.clearTimeout(demoTimerRef.current)
      demoTimerRef.current = null
    }
    demoScheduleKeyRef.current = null
  }, [])

  const clearDemoTypingTimer = useCallback(() => {
    if (demoTypingTimerRef.current !== null) {
      window.clearTimeout(demoTypingTimerRef.current)
      demoTypingTimerRef.current = null
    }
    demoTypingInProgressRef.current = false
  }, [])

  const runDemoInternalAction = useCallback((action: () => void) => {
    demoInternalActionRef.current = true
    try {
      action()
    } finally {
      demoInternalActionRef.current = false
    }
  }, [])

  const runDemoStepActionOnce = useCallback(
    (step: DemoStep, action: () => void) => {
      if (demoStepActionDoneRef.current === step) {
        return false
      }

      demoStepActionDoneRef.current = step
      runDemoInternalAction(action)
      return true
    },
    [runDemoInternalAction],
  )

  const scheduleDemoAction = useCallback(
    (delayMs: number, key: string, action: () => void) => {
      if (demoTimerRef.current !== null && demoScheduleKeyRef.current === key) {
        return
      }

      clearDemoTimer()
      demoScheduleKeyRef.current = key
      demoTimerRef.current = window.setTimeout(() => {
        demoTimerRef.current = null
        demoScheduleKeyRef.current = null

        if (!autoplayDemoEnabled || demoStoppedByUserRef.current || isAfkRef.current) {
          return
        }

        runDemoInternalAction(action)
      }, delayMs)
    },
    [autoplayDemoEnabled, clearDemoTimer, runDemoInternalAction],
  )

  const scheduleDemoNext = useCallback(
    (
      nextStep: DemoStep,
      delayMs: number,
      key = `${demoStep}->${nextStep}`,
      action?: () => void,
    ) => {
      scheduleDemoAction(delayMs, key, () => {
        action?.()
        demoStepActionDoneRef.current = null
        setDemoStep(nextStep)
      })
    },
    [demoStep, scheduleDemoAction],
  )

  const markUserInteraction = useCallback(() => {
    if (!autoplayDemoEnabled || demoInternalActionRef.current || userInteractedRef.current) {
      return
    }

    userInteractedRef.current = true
    setDemoStoppedByUser(true)
    clearDemoTimer()
    clearDemoTypingTimer()
  }, [autoplayDemoEnabled, clearDemoTimer, clearDemoTypingTimer])

  const runDemoTyping = useCallback(
    (targetText: string, speedMs: number, chunk: number, onComplete: () => void) => {
      clearDemoTypingTimer()
      demoTypingInProgressRef.current = true

      const startText = simRef.current.codeText
      const baseText = targetText.startsWith(startText) ? startText : ''
      let cursor = baseText.length

      if (baseText !== startText) {
        setSim((prev) => ({
          ...prev,
          codeText: '',
        }))
      }

      const tick = () => {
        if (!autoplayDemoEnabled || demoStoppedByUserRef.current) {
          clearDemoTypingTimer()
          return
        }

        if (isAfkRef.current) {
          demoTypingTimerRef.current = window.setTimeout(tick, 250)
          return
        }

        cursor = Math.min(targetText.length, cursor + chunk)
        const nextValue = targetText.slice(0, cursor)
        const now = Date.now()
        lastEditAtRef.current = now
        editEventTimesRef.current.push(now)
        editEventTimesRef.current = editEventTimesRef.current.filter(
          (timestamp) => now - timestamp <= EDIT_WINDOW_MS,
        )

        setSim((prev) => ({
          ...prev,
          codeText: nextValue,
        }))

        if (cursor >= targetText.length) {
          clearDemoTypingTimer()
          onComplete()
          return
        }

        demoTypingTimerRef.current = window.setTimeout(tick, speedMs)
      }

      demoTypingTimerRef.current = window.setTimeout(tick, speedMs)
    },
    [autoplayDemoEnabled, clearDemoTypingTimer],
  )

  const scheduleDemoTyping = useCallback(
    (targetText: string, options: DemoTypingOptions) => {
      scheduleDemoAction(options.startDelayMs ?? 0, options.key, () => {
        runDemoTyping(targetText, DEMO_PACING.typeCharMs, DEMO_PACING.typeChunk, () => {
          scheduleDemoNext(
            options.nextStep,
            options.pauseAfterTypingMs ?? DEMO_PACING.pauseAfterTypingMs,
            `${options.key}:after-typing`,
          )
        })
      })
    },
    [runDemoTyping, scheduleDemoAction, scheduleDemoNext],
  )

  const resetSessionState = useCallback(() => {
    const now = Date.now()
    memoryUpdatedRef.current = false
    reviewCodeBeforeSolutionRef.current = null
    lastEditAtRef.current = now
    editEventTimesRef.current = []
    deleteBurstRef.current = { count: 0, lastAt: 0 }
    lastActivityAtRef.current = now
    lastMouseMoveAtRef.current = 0
    isWindowFocusedRef.current = typeof document === 'undefined' ? true : document.hasFocus()
    wasAfkRef.current = false
    isAfkRef.current = false
    guidedRecoveryOpenRef.current = false
    setIsAfk(false)
    setIsReviewSolutionOpen(false)
    setIsShowMeTooltipOpen(false)
    setShowMeTooltipPosition(null)
    setSim(createInitialState(task.starterCode))
  }, [task.starterCode])

  const resetDemoController = useCallback(
    (restartAutoplay: boolean) => {
      clearDemoTimer()
      clearDemoTypingTimer()
      demoStepActionDoneRef.current = null
      demoScheduleKeyRef.current = null
      userInteractedRef.current = false
      demoInternalActionRef.current = false
      demoStoppedByUserRef.current = false
      setDemoStoppedByUser(false)
      setDemoStep(restartAutoplay ? 'init' : 'idle')
      if (restartAutoplay) {
        setDemoRunId((value) => value + 1)
      }
    },
    [clearDemoTimer, clearDemoTypingTimer],
  )

  const forceDemoNudgeIfNeeded = useCallback(() => {
    setSim((prev) => {
      if (prev.nudgeVisible) {
        return prev
      }

      return {
        ...prev,
        nudgeVisible: true,
        nudgeEverShown: true,
        nudgeShownAtSimSecond: prev.simSecond,
        thresholdStreak: Math.max(prev.thresholdStreak, NUDGE_STREAK_THRESHOLD),
        firstStruggleAt: prev.firstStruggleAt ?? prev.simSecond,
      }
    })
  }, [])

  const handleSessionInteractionCapture = useCallback(() => {
    markUserInteraction()
  }, [markUserInteraction])

  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      return
    }

    isWindowFocusedRef.current = document.hasFocus()
    lastActivityAtRef.current = Date.now()

    const markActive = (force = false) => {
      const now = Date.now()
      if (!force && now - lastActivityAtRef.current < ACTIVITY_THROTTLE_MS) {
        return
      }

      lastActivityAtRef.current = now
      if (document.visibilityState === 'visible' && isWindowFocusedRef.current) {
        setIsAfk(false)
      }
    }

    const handleMouseMove = () => {
      const now = Date.now()
      if (now - lastMouseMoveAtRef.current < ACTIVITY_THROTTLE_MS) {
        return
      }

      lastMouseMoveAtRef.current = now
      markActive(true)
    }

    const handleKeyDown = () => {
      markActive(true)
    }

    const handlePointerDown = () => {
      markActive(true)
    }

    const handleTouchStart = () => {
      markActive(true)
    }

    const handleWheel = () => {
      markActive()
    }

    const handleFocus = () => {
      isWindowFocusedRef.current = true
      markActive(true)
    }

    const handleBlur = () => {
      isWindowFocusedRef.current = false
      setIsAfk(true)
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        setIsAfk(true)
        return
      }

      markActive(true)
    }

    const intervalId = window.setInterval(() => {
      if (document.visibilityState === 'hidden' || !isWindowFocusedRef.current) {
        setIsAfk(true)
        return
      }

      const now = Date.now()
      if (now - lastActivityAtRef.current >= afkThresholdMs) {
        if (guidedRecoveryOpenRef.current) {
          setIsAfk(false)
        } else {
          setIsAfk(true)
        }
      } else {
        setIsAfk(false)
      }
    }, 1000)

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('touchstart', handleTouchStart)
    window.addEventListener('wheel', handleWheel)
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('pointerdown', handlePointerDown)
      window.removeEventListener('touchstart', handleTouchStart)
      window.removeEventListener('wheel', handleWheel)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [afkThresholdMs])

  useEffect(() => {
    if (isAfk) {
      wasAfkRef.current = true
      setIsShowMeTooltipOpen(false)
      return
    }

    if (!wasAfkRef.current) {
      return
    }

    wasAfkRef.current = false
    setSim((prev) => {
      const nextRunMessage =
        prev.scene === 'struggle' && !isGuidedRecoveryInProgress(prev)
          ? 'Back in session. Pebble recalibrated struggle signals.'
          : prev.runMessage

      return {
        ...prev,
        telemetry: {
          ...prev.telemetry,
          idleSeconds: Math.max(0, prev.telemetry.idleSeconds - 3),
        },
        thresholdStreak: 0,
        runMessage: nextRunMessage,
      }
    })
  }, [isAfk])

  useEffect(() => {
    const tickMs = autoplayDemoEnabled ? 750 : 1000

    const timer = window.setInterval(() => {
      setSim((prev) => {
        if (prev.sessionComplete || isAfk) {
          return prev
        }

        const now = Date.now()
        editEventTimesRef.current = editEventTimesRef.current.filter(
          (timestamp) => now - timestamp <= EDIT_WINDOW_MS,
        )

        const keysPerSecond = Number((editEventTimesRef.current.length / 5).toFixed(1))
        const decisionPaused = isDecisionGateOpen(prev)
        const guidedPaused = isGuidedRecoveryInProgress(prev)

        let next: SimulationState = {
          ...prev,
          simSecond: prev.simSecond + 1,
          telemetry: {
            ...prev.telemetry,
          },
        }

        if (!decisionPaused && !guidedPaused) {
          next.telemetry.keysPerSecond = keysPerSecond

          if (now - lastEditAtRef.current >= 1000) {
            next.telemetry.idleSeconds += 1
          } else {
            next.telemetry.idleSeconds = Math.max(0, next.telemetry.idleSeconds - 1)
          }

          next = recomputeStruggle(next, isAfk)

          if (next.scene === 'struggle') {
            if (next.struggleScore >= nudgeScoreThreshold) {
              next.thresholdStreak += 1
            } else {
              next.thresholdStreak = Math.max(0, next.thresholdStreak - 1)
            }

            if (
              next.firstStruggleAt === null &&
              next.thresholdStreak >= NUDGE_STREAK_THRESHOLD
            ) {
              next.firstStruggleAt = next.simSecond
            }

            const nudgeEligibleByRuns =
              next.telemetry.runAttempts >= 2 || next.telemetry.repeatErrorCount >= 1

            if (
              !next.nudgeVisible &&
              next.simSecond >= next.snoozeUntil &&
              nudgeEligibleByRuns &&
              next.thresholdStreak >= NUDGE_STREAK_THRESHOLD
            ) {
              next.nudgeVisible = true
              next.nudgeEverShown = true
              next.nudgeShownAtSimSecond = next.simSecond
            }
          }
        }

        const stableSeconds = autoplayDemoEnabled ? 3 : 6
        if (
          next.scene === 'recovery' &&
          next.runStatus === 'success' &&
          next.recoveryStableSince !== null &&
          next.simSecond - next.recoveryStableSince >= stableSeconds
        ) {
          next = completeSession(next)
        }

        return next
      })
    }, tickMs)

    return () => window.clearInterval(timer)
  }, [autoplayDemoEnabled, isAfk, nudgeScoreThreshold])

  useEffect(() => {
    if (!sim.sessionComplete || sim.recoveryTimeSec === null || memoryUpdatedRef.current) {
      return
    }

    memoryUpdatedRef.current = true
    markTaskCompleted(task.id)
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

    appendSessionInsight({
      sessionId: sessionId ?? '1',
      struggleScorePeak: sim.struggleScorePeak,
      recoveryMode: sim.decisionChoice === 'show_me' ? 'guided' : 'skipped',
      recoveryEffectivenessScore: sim.applyFixUsed ? sim.recoveryEffectivenessScore : 0,
      totalRecoveryTime: sim.recoveryTimeSec,
      timeToDecisionSec: sim.timeToDecisionSec,
      timeInGuidedFixSec: sim.timeInGuidedFixSec,
      applyFixUsed: sim.applyFixUsed,
      timestamp: Date.now(),
    })
  }, [sessionId, sim, task.id])

  useEffect(() => {
    if (!isShowMeTooltipOpen || isAfk) {
      return
    }

    const updateTooltipPosition = () => {
      const rect = showMeButtonRef.current?.getBoundingClientRect()
      if (!rect) {
        return
      }
      setShowMeTooltipPosition(getShowMeTooltipPosition(rect))
    }

    updateTooltipPosition()
    window.addEventListener('resize', updateTooltipPosition)
    window.addEventListener('scroll', updateTooltipPosition, true)

    return () => {
      window.removeEventListener('resize', updateTooltipPosition)
      window.removeEventListener('scroll', updateTooltipPosition, true)
    }
  }, [getShowMeTooltipPosition, isAfk, isShowMeTooltipOpen])

  useEffect(() => {
    resetDemoController(autoplayDemoEnabled)
  }, [autoplayDemoEnabled, resetDemoController])

  useEffect(() => {
    if (loadedTaskIdRef.current === task.id) {
      return
    }

    loadedTaskIdRef.current = task.id
    resetSessionState()
    resetDemoController(autoplayDemoEnabled)
  }, [autoplayDemoEnabled, resetDemoController, resetSessionState, task.id])

  useEffect(() => {
    if (!autoplayDemoEnabled || demoStoppedByUser) {
      clearDemoTimer()
      clearDemoTypingTimer()
      return
    }

    if (isAfk) {
      clearDemoTimer()
      return
    }

    if (demoStep === 'idle') {
      scheduleDemoNext('init', 0, 'idle->init')
      return
    }

    if (demoStep === 'init') {
      runDemoStepActionOnce('init', () => onReplay({ fromDemo: true }))
      scheduleDemoNext('run_first', DEMO_PACING.pauseAfterTypingMs, 'init->run_first')
      return
    }

    if (demoStep === 'run_first') {
      runDemoStepActionOnce('run_first', () => onRun({ fromDemo: true }))
      scheduleDemoNext('type_partial_fix', DEMO_PACING.pauseAfterRunMs, 'run_first->type_partial_fix')
      return
    }

    if (demoStep === 'type_partial_fix') {
      if (demoTypingInProgressRef.current) {
        return
      }

      runDemoStepActionOnce('type_partial_fix', () => undefined)
      scheduleDemoTyping(demoPartialFixCode, {
        key: 'type_partial_fix',
        nextStep: 'run_second',
      })
      return
    }

    if (demoStep === 'run_second') {
      runDemoStepActionOnce('run_second', () => onRun({ fromDemo: true }))
      scheduleDemoNext('wait_nudge', DEMO_PACING.pauseAfterRunMs, 'run_second->wait_nudge')
      return
    }

    if (demoStep === 'wait_nudge') {
      if (sim.recovery.mode === 'guided' && !sim.recovery.fixApplied) {
        scheduleDemoNext('guided_progress', DEMO_PACING.pauseOnGuidedStepMs, 'wait_nudge:guided-open')
        return
      }

      if (sim.nudgeVisible) {
        scheduleDemoNext('show_me', DEMO_PACING.pauseOnNudgeMs, 'wait_nudge:visible')
        return
      }

      scheduleDemoNext('show_me', DEMO_PACING.pauseOnNudgeMs, 'wait_nudge:force-show', () => {
        if (!simRef.current.nudgeVisible) {
          forceDemoNudgeIfNeeded()
        }
      })
      return
    }

    if (demoStep === 'show_me') {
      if (sim.recovery.mode === 'guided' && !sim.recovery.fixApplied) {
        scheduleDemoNext('guided_progress', DEMO_PACING.pauseOnGuidedStepMs, 'show_me:guided-open')
        return
      }

      if (!sim.nudgeVisible) {
        scheduleDemoNext('wait_nudge', DEMO_PACING.pollMs, 'show_me:wait_for_nudge')
        return
      }

      runDemoStepActionOnce('show_me', () => onShowMe({ fromDemo: true }))
      scheduleDemoNext('guided_progress', DEMO_PACING.pauseOnGuidedStepMs, 'show_me->guided_progress')
      return
    }

    if (demoStep === 'guided_progress') {
      if (sim.recovery.mode !== 'guided' || sim.recovery.fixApplied) {
        scheduleDemoNext('apply_fix', DEMO_PACING.pauseBeforeApplyMs, 'guided_progress->apply_fix')
        return
      }

      if (sim.recovery.step < sim.recovery.totalSteps) {
        scheduleDemoNext(
          'guided_progress',
          DEMO_PACING.pauseOnGuidedStepMs,
          `guided_progress:step-${sim.recovery.step}`,
          () => {
            onGuidedNextStep({ fromDemo: true })
          },
        )
        return
      }

      scheduleDemoNext(
        'apply_fix',
        DEMO_PACING.pauseBeforeApplyMs,
        'guided_progress:last-step->apply_fix',
      )
      return
    }

    if (demoStep === 'apply_fix') {
      runDemoStepActionOnce('apply_fix', () => onGuidedApplyFix({ fromDemo: true }))
      scheduleDemoNext('run_success', DEMO_PACING.pauseAfterApplyMs, 'apply_fix->run_success')
      return
    }

    if (demoStep === 'run_success') {
      if (sim.scene === 'recovery' && sim.runStatus === 'success') {
        scheduleDemoNext('finish', DEMO_PACING.pauseOnSuccessMs, 'run_success->finish')
        return
      }

      scheduleDemoNext('run_success', DEMO_PACING.pollMs, 'run_success:wait-for-success')
      return
    }

    if (demoStep === 'finish') {
      if (sim.scene === 'recovery' && sim.runStatus === 'success') {
        scheduleDemoNext('pause', DEMO_PACING.pauseBeforeFinishMs, 'finish->pause', () => {
          onFinishSession({ fromDemo: true })
        })
        return
      }

      if (sim.sessionComplete) {
        scheduleDemoNext('pause', 0, 'finish:already-complete->pause')
      }
      return
    }

    if (demoStep === 'pause') {
      if (!sim.sessionComplete) {
        scheduleDemoNext('pause', DEMO_PACING.pollMs, 'pause:wait-for-complete')
        return
      }

      scheduleDemoNext('replay', DEMO_PACING.pauseBeforeReplayMs, 'pause->replay')
      return
    }

    if (demoStep === 'replay') {
      runDemoStepActionOnce('replay', () => onReplay({ fromDemo: true }))
      scheduleDemoNext('run_first', DEMO_PACING.pauseAfterTypingMs, 'replay->run_first')
    }
  }, [
    clearDemoTimer,
    clearDemoTypingTimer,
    autoplayDemoEnabled,
    demoPartialFixCode,
    demoRunId,
    demoStep,
    demoStoppedByUser,
    forceDemoNudgeIfNeeded,
    isAfk,
    runDemoStepActionOnce,
    scheduleDemoNext,
    scheduleDemoTyping,
    sim.nudgeVisible,
    sim.recovery.fixApplied,
    sim.recovery.mode,
    sim.recovery.step,
    sim.recovery.totalSteps,
    sim.runStatus,
    sim.scene,
    sim.sessionComplete,
    task.id,
  ])

  useEffect(() => {
    return () => {
      clearDemoTimer()
      clearDemoTypingTimer()
    }
  }, [clearDemoTimer, clearDemoTypingTimer])

  function onEditorChange(nextValue: string) {
    markUserInteraction()

    const now = Date.now()
    lastEditAtRef.current = now
    editEventTimesRef.current.push(now)
    editEventTimesRef.current = editEventTimesRef.current.filter(
      (timestamp) => now - timestamp <= EDIT_WINDOW_MS,
    )

    setSim((prev) => {
      if (prev.sessionComplete && prev.scene !== 'complete') {
        return prev
      }

      const deletedChars = Math.max(0, prev.codeText.length - nextValue.length)
      let backspaceBurstDelta = 0

      if (deletedChars > 0) {
        if (now - deleteBurstRef.current.lastAt <= BACKSPACE_BURST_WINDOW_MS) {
          deleteBurstRef.current.count += deletedChars
        } else {
          deleteBurstRef.current.count = deletedChars
        }

        deleteBurstRef.current.lastAt = now

        if (deleteBurstRef.current.count >= BACKSPACE_BURST_THRESHOLD) {
          backspaceBurstDelta = 1
          deleteBurstRef.current.count = 0
        }
      } else if (nextValue.length > prev.codeText.length) {
        deleteBurstRef.current.count = 0
        deleteBurstRef.current.lastAt = now
      }

      let next: SimulationState = {
        ...prev,
        codeText: nextValue,
        telemetry: {
          ...prev.telemetry,
          backspaceBurstCount: prev.telemetry.backspaceBurstCount + backspaceBurstDelta,
        },
      }

      if (prev.scene === 'recovery' || prev.scene === 'complete') {
        next.scene = 'struggle'
        next.sessionComplete = false
        next.recovery = defaultRecoveryState
        next.recoveryStableSince = null
        next.recoveryTimeSec = null
        next.runStatus = 'idle'
        next.runMessage = 'Code updated. Run again to validate output.'
        next.flowRecovered = false
        next.thresholdStreak = 0
        next.firstStruggleAt = null
        next.firstRecoveryAt = null
        next.nudgeVisible = false
        next.nudgeShownAtSimSecond = null
        next.snoozeUntil = prev.simSecond + 5
        next.lastErrorKey = null
        next.currentErrorKey = null
        next.guidedErrorKey = null
        next.errorKeyHistory = []
        next.sameErrorStreak = 0
        next.telemetry.repeatErrorCount = 0
      }

      if (!isDecisionGateOpen(prev) && !isGuidedRecoveryInProgress(prev)) {
        next = recomputeStruggle(next, isAfk)
      }

      return next
    })
  }

  function processRunResult(prev: SimulationState, result: TaskRunResult): SimulationState {
    const runAttempts = prev.telemetry.runAttempts + 1
    const nextErrorKey = result.status === 'error' ? result.errorKey ?? null : null
    const historyWithCurrent =
      nextErrorKey === null
        ? prev.errorKeyHistory
        : [...prev.errorKeyHistory, nextErrorKey].slice(-ERROR_HISTORY_SIZE)
    const uniqueErrorCount = new Set(historyWithCurrent).size
    const sameErrorStreak =
      nextErrorKey !== null && prev.lastErrorKey === nextErrorKey ? prev.sameErrorStreak + 1 : 1

    let repeatErrorCount = prev.telemetry.repeatErrorCount
    if (result.status === 'success') {
      repeatErrorCount = 0
    } else if (nextErrorKey !== null) {
      if (prev.lastErrorKey === nextErrorKey) {
        repeatErrorCount += sameErrorStreak >= 3 ? 2 : 1
      } else if (uniqueErrorCount >= 3) {
        repeatErrorCount = Math.max(0, repeatErrorCount - 1)
      }
    }

    let next: SimulationState = {
      ...prev,
      telemetry: {
        ...prev.telemetry,
        runAttempts,
        repeatErrorCount: clamp(repeatErrorCount, 0, 14),
      },
      runStatus: result.status,
      runMessage: result.message,
      currentErrorKey: nextErrorKey,
      lastErrorKey: nextErrorKey,
      errorKeyHistory: result.status === 'error' && nextErrorKey !== null ? historyWithCurrent : [],
      sameErrorStreak: result.status === 'error' && nextErrorKey !== null ? sameErrorStreak : 0,
      highlightedLines: result.status === 'success' ? [4, 5] : [],
      proposedLines: [],
      nudgeVisible: result.status === 'success' ? false : prev.nudgeVisible,
      nudgeShownAtSimSecond: result.status === 'success' ? null : prev.nudgeShownAtSimSecond,
      thresholdStreak: result.status === 'success' ? 0 : prev.thresholdStreak,
      scene: result.status === 'success' ? 'recovery' : 'struggle',
      recoveryStableSince: result.status === 'success' ? prev.simSecond : null,
      flowRecovered: result.status === 'success',
      recovery: result.status === 'success' ? defaultRecoveryState : prev.recovery,
      firstRecoveryAt:
        result.status === 'success' && prev.firstStruggleAt !== null && prev.firstRecoveryAt === null
          ? prev.simSecond
          : prev.firstRecoveryAt,
    }

    next = recomputeStruggle(next, isAfk)
    return next
  }

  function onRun(options: HandlerOptions = {}) {
    if (!options.fromDemo) {
      markUserInteraction()
    }

    if (isAfk || decisionGateOpen || isGuidedRecoveryInProgress(sim)) {
      return
    }

    setSim((prev) => {
      if (isDecisionGateOpen(prev) || isGuidedRecoveryInProgress(prev)) {
        return prev
      }

      const result = task.run(prev.codeText)
      return processRunResult(prev, result)
    })
  }

  function onShowMe(options: HandlerOptions = {}) {
    if (!options.fromDemo) {
      markUserInteraction()
    }

    setIsShowMeTooltipOpen(false)

    setSim((prev) => {
      const decisionTime =
        prev.nudgeShownAtSimSecond === null ? 0 : Math.max(1, prev.simSecond - prev.nudgeShownAtSimSecond)

      const guidedContent = getGuidedContent(prev.currentErrorKey)
      const firstStep = guidedContent.guidedSteps[0] ?? fallbackGuidedContent.guidedSteps[0]

      return {
        ...prev,
        decisionChoice: 'show_me',
        timeToDecisionSec: decisionTime,
        guidedFixStartedAtSimSecond: prev.simSecond,
        guidedErrorKey: prev.currentErrorKey,
        nudgeVisible: false,
        nudgeShownAtSimSecond: null,
        runStatus: 'error',
        runMessage: firstStep.runMessage,
        highlightedLines: firstStep.highlightedLines,
        proposedLines: firstStep.proposedLines,
        recovery: {
          mode: 'guided',
          step: 1,
          totalSteps: guidedContent.guidedSteps.length,
          fixApplied: false,
          startedAtSimSecond: prev.simSecond,
        },
      }
    })
  }

  function onNotNow(options: HandlerOptions = {}) {
    if (!options.fromDemo) {
      markUserInteraction()
    }

    setIsShowMeTooltipOpen(false)

    setSim((prev) => {
      const decisionTime =
        prev.nudgeShownAtSimSecond === null ? 0 : Math.max(1, prev.simSecond - prev.nudgeShownAtSimSecond)
      const snoozeDuration = Math.min(40, 15 + prev.snoozeCount * 5)

      return {
        ...prev,
        nudgeVisible: false,
        nudgeShownAtSimSecond: null,
        snoozeUntil: prev.simSecond + snoozeDuration,
        snoozeCount: prev.snoozeCount + 1,
        thresholdStreak: 0,
        decisionChoice: 'not_now',
        timeToDecisionSec: decisionTime,
        guidedFixStartedAtSimSecond: null,
        timeInGuidedFixSec: 0,
        applyFixUsed: false,
        runMessage: `Pebble nudge snoozed for ${snoozeDuration} simulated seconds.`,
      }
    })
  }

  function onGuidedNextStep(options: HandlerOptions = {}) {
    if (!options.fromDemo) {
      markUserInteraction()
    }

    setSim((prev) => {
      if (!isGuidedRecoveryInProgress(prev)) {
        return prev
      }

      const activeSteps = getGuidedContent(prev.guidedErrorKey).guidedSteps
      const nextStep = clamp(prev.recovery.step + 1, 1, prev.recovery.totalSteps)
      const stepConfig = activeSteps[nextStep - 1] ?? activeSteps[activeSteps.length - 1]

      return {
        ...prev,
        runStatus: 'error',
        runMessage: stepConfig.runMessage,
        highlightedLines: stepConfig.highlightedLines,
        proposedLines: stepConfig.proposedLines,
        recovery: {
          ...prev.recovery,
          step: nextStep,
        },
      }
    })
  }

  function onGuidedBackStep(options: HandlerOptions = {}) {
    if (!options.fromDemo) {
      markUserInteraction()
    }

    setSim((prev) => {
      if (!isGuidedRecoveryInProgress(prev)) {
        return prev
      }

      const activeSteps = getGuidedContent(prev.guidedErrorKey).guidedSteps
      const previousStep = clamp(prev.recovery.step - 1, 1, prev.recovery.totalSteps)
      const stepConfig = activeSteps[previousStep - 1] ?? activeSteps[0]

      return {
        ...prev,
        runStatus: 'error',
        runMessage: stepConfig.runMessage,
        highlightedLines: stepConfig.highlightedLines,
        proposedLines: stepConfig.proposedLines,
        recovery: {
          ...prev.recovery,
          step: previousStep,
        },
      }
    })
  }

  function onGuidedApplyFix(options: HandlerOptions = {}) {
    if (!options.fromDemo) {
      markUserInteraction()
    }

    setSim((prev) => {
      if (!isGuidedRecoveryInProgress(prev)) {
        return prev
      }

      const activeErrorConfig = prev.guidedErrorKey ? task.errorKeyConfig[prev.guidedErrorKey] : null
      const patchedCode = activeErrorConfig?.applyPatch?.(prev.codeText) ?? task.solutionCode
      const runResult = task.run(patchedCode)
      const guidedDuration =
        prev.guidedFixStartedAtSimSecond === null
          ? 0
          : Math.max(1, prev.simSecond - prev.guidedFixStartedAtSimSecond)

      let next: SimulationState = {
        ...prev,
        codeText: patchedCode,
        usedHint: true,
        applyFixUsed: true,
        timeInGuidedFixSec: guidedDuration,
        recoveryEffectivenessScore: computeRecoveryEffectivenessScore(guidedDuration),
        recovery: {
          ...prev.recovery,
          step: prev.recovery.totalSteps,
          fixApplied: true,
        },
        telemetry: {
          ...prev.telemetry,
          repeatErrorCount: 0,
          backspaceBurstCount: Math.max(0, prev.telemetry.backspaceBurstCount - 1),
          idleSeconds: Math.max(0, prev.telemetry.idleSeconds - 2),
        },
      }

      next = processRunResult(next, runResult)

      if (runResult.status === 'success') {
        next.runStatus = 'success'
        next.runMessage = runResult.message
        next.highlightedLines = [4, 5]
        next.proposedLines = [4, 5]
        next.scene = 'recovery'
        next.recoveryStableSince = next.simSecond
        next.recovery = {
          mode: 'guided',
          step: prev.recovery.totalSteps,
          totalSteps: prev.recovery.totalSteps,
          fixApplied: true,
          startedAtSimSecond: prev.recovery.startedAtSimSecond,
        }
      }

      return next
    })
  }

  function onGuidedExit(options: HandlerOptions = {}) {
    if (!options.fromDemo) {
      markUserInteraction()
    }

    setSim((prev) => {
      if (!isGuidedRecoveryInProgress(prev)) {
        return prev
      }

      return {
        ...prev,
        recovery: defaultRecoveryState,
        guidedErrorKey: null,
        highlightedLines: [],
        proposedLines: [],
        runStatus: 'idle',
        runMessage: 'Guided fix closed. Continue independently or request a new nudge.',
        nudgeVisible: false,
        nudgeShownAtSimSecond: null,
        guidedFixStartedAtSimSecond: null,
        timeInGuidedFixSec: 0,
        applyFixUsed: false,
        snoozeUntil: prev.simSecond + 10,
        thresholdStreak: 0,
      }
    })
  }

  function onFinishSession(options: HandlerOptions = {}) {
    if (!options.fromDemo) {
      markUserInteraction()
    }

    setSim((prev) => {
      if (prev.scene !== 'recovery' || prev.runStatus !== 'success') {
        return prev
      }

      return completeSession(prev)
    })
  }

  function onReplay(options: HandlerOptions = {}) {
    if (autoplayDemoEnabled && !options.fromDemo) {
      resetDemoController(true)
      resetSessionState()
      return
    }

    if (!options.fromDemo) {
      markUserInteraction()
    }

    resetSessionState()
  }

  function onToggleReviewSolution() {
    if (!sim.sessionComplete) {
      return
    }

    if (isReviewSolutionOpen) {
      const restoreCode = reviewCodeBeforeSolutionRef.current
      reviewCodeBeforeSolutionRef.current = null
      setIsReviewSolutionOpen(false)
      if (restoreCode !== null) {
        setSim((prev) => ({
          ...prev,
          codeText: restoreCode,
        }))
      }
      return
    }

    reviewCodeBeforeSolutionRef.current = sim.codeText
    setIsReviewSolutionOpen(true)
    setSim((prev) => ({
      ...prev,
      codeText: task.solutionCode,
      highlightedLines: [],
      proposedLines: [],
    }))
  }

  const debugStatusLine = import.meta.env.DEV
    ? `Debug · task=${task.id} · demoStep=${autoplayDemoEnabled ? demoStep : 'off'} · stopped=${demoStoppedByUser ? 'yes' : 'no'} · nudge=${sim.nudgeVisible ? 'on' : 'off'} · guided=${sim.recovery.mode === 'guided' ? `${sim.recovery.step}/${sim.recovery.totalSteps}` : 'none'}`
    : null

  const phaseLabel =
    isGuidedRecoveryInProgress(sim)
      ? 'Guided recovery'
      : sim.scene === 'struggle'
        ? 'Struggle'
        : sim.scene === 'recovery'
          ? 'Recovery'
          : 'Complete'

  const nudgeGuidance = useMemo(
    () => getGuidedContent(sim.currentErrorKey),
    [getGuidedContent, sim.currentErrorKey],
  )
  const personalizedNudgeCopy = useMemo(
    () => personalizeNudgeCopy(nudgeGuidance.nudgeCopy, userProfile?.skillLevel ?? null),
    [nudgeGuidance.nudgeCopy, userProfile],
  )
  const requestedLanguageLabel = useMemo(() => getRequestedLanguageLabel(userProfile), [userProfile])
  const profileLabel = useMemo(() => {
    if (!userProfile) {
      return 'Profile not set'
    }

    return `${userProfile.skillLevel} • ${userProfile.goal} • ${getRuntimeLanguageLabel()}`
  }, [userProfile])
  const taskLesson = task.lesson ?? fallbackLesson
  const lessonItems = useMemo(() => {
    if (lessonTab === 'objectives') {
      return taskLesson.objectives
    }
    if (lessonTab === 'hints') {
      return taskLesson.hints
    }
    return taskLesson.commonMistakes
  }, [lessonTab, taskLesson.commonMistakes, taskLesson.hints, taskLesson.objectives])
  const moduleTasks = useMemo(() => {
    return taskList
      .filter((entry) => entry.module === task.module)
      .slice()
      .sort((left, right) => {
        const leftNumericId = Number(left.id)
        const rightNumericId = Number(right.id)
        const leftSortValue = Number.isNaN(leftNumericId) ? Number.MAX_SAFE_INTEGER : leftNumericId
        const rightSortValue = Number.isNaN(rightNumericId) ? Number.MAX_SAFE_INTEGER : rightNumericId
        if (leftSortValue !== rightSortValue) {
          return leftSortValue - rightSortValue
        }
        return left.id.localeCompare(right.id)
      })
  }, [task.module])
  const completedModuleTaskIds = useMemo(() => {
    const completedIds = new Set(getTaskProgress().completedTaskIds)
    if (sim.sessionComplete) {
      completedIds.add(task.id)
    }
    return completedIds
  }, [sim.sessionComplete, task.id])
  const moduleCompletedCount = useMemo(
    () => moduleTasks.filter((entry) => completedModuleTaskIds.has(entry.id)).length,
    [completedModuleTaskIds, moduleTasks],
  )
  const moduleTotalCount = moduleTasks.length
  const nextUnfinishedModuleTask = useMemo(
    () => moduleTasks.find((entry) => !completedModuleTaskIds.has(entry.id)) ?? null,
    [completedModuleTaskIds, moduleTasks],
  )
  const completionCtaPath = nextUnfinishedModuleTask ? `/session/${nextUnfinishedModuleTask.id}` : '/dashboard'
  const completionCtaLabel = nextUnfinishedModuleTask ? 'Next task' : 'Back to Dashboard'
  const activeGuidedSteps = useMemo(
    () => getGuidedContent(sim.guidedErrorKey).guidedSteps,
    [getGuidedContent, sim.guidedErrorKey],
  )

  const currentGuidedStep =
    sim.recovery.mode === 'guided' && sim.recovery.step > 0
      ? activeGuidedSteps[Math.min(sim.recovery.step - 1, activeGuidedSteps.length - 1)]
      : null

  const guidedSnippetLines =
    currentGuidedStep === null
      ? []
      : buildGuidedSnippetLines(sim.codeText, currentGuidedStep.proposedLines)

  const runBadgeVariant =
    sim.runStatus === 'success' ? 'success' : sim.runStatus === 'error' ? 'warning' : 'neutral'
  const mascotLine = useMemo(() => {
    if (sim.scene === 'complete') {
      return 'Want the next task?'
    }
    if (sim.scene === 'recovery') {
      return 'Nice, stabilize then finish.'
    }
    if (sim.recovery.mode === 'guided' && !sim.recovery.fixApplied) {
      return `Step ${sim.recovery.step}/${sim.recovery.totalSteps} - focus here.`
    }
    if (sim.nudgeVisible) {
      return 'Want a guided fix?'
    }
    return 'You are making progress. Try one small edit and run.'
  }, [sim.nudgeVisible, sim.recovery.fixApplied, sim.recovery.mode, sim.recovery.step, sim.recovery.totalSteps, sim.scene])
  const mascotData = useMemo(
    () => ({
      phase:
        sim.scene === 'struggle' ? 'Struggle' : sim.scene === 'recovery' ? 'Recovery' : 'Complete',
      currentTaskTitle: task.title,
      runStatus: sim.runStatus,
      runMessage: sim.runMessage,
      moduleProgress: {
        completedCount: moduleCompletedCount,
        totalCount: moduleTotalCount,
      },
      mascotLine,
      nudgeVisible: sim.nudgeVisible,
      guidedStep:
        sim.recovery.mode === 'guided' && !sim.recovery.fixApplied
          ? { current: sim.recovery.step, total: sim.recovery.totalSteps }
          : undefined,
      guidedActive: sim.recovery.mode === 'guided' && !sim.recovery.fixApplied,
      currentErrorKey: sim.currentErrorKey,
      codeText: sim.codeText,
      struggleScore: sim.struggleScore,
      repeatErrorCount: sim.telemetry.repeatErrorCount,
      errorHistory: sim.errorKeyHistory,
      isAfk,
      demoMode: autoplayDemoEnabled,
    }),
    [
      autoplayDemoEnabled,
      isAfk,
      mascotLine,
      sim.codeText,
      sim.currentErrorKey,
      sim.errorKeyHistory,
      moduleCompletedCount,
      moduleTotalCount,
      sim.nudgeVisible,
      sim.recovery,
      sim.runMessage,
      sim.runStatus,
      sim.scene,
      sim.struggleScore,
      sim.telemetry.repeatErrorCount,
      task.title,
    ],
  )

  return (
    <section
      ref={sessionSectionRef}
      className="page-enter grid gap-6 lg:grid-cols-[1.35fr_0.65fr]"
      onPointerDownCapture={handleSessionInteractionCapture}
      onKeyDownCapture={handleSessionInteractionCapture}
    >
      <Card className="min-h-[520px] space-y-4" padding="md" interactive>
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-2">
            <Badge variant="neutral">Mini IDE</Badge>
            <h1 className="text-2xl font-semibold tracking-[-0.015em] text-pebble-text-primary">
              Session {sessionId ?? '1'}
            </h1>
            <p className="text-xs text-pebble-text-muted">{task.title}</p>
            <Badge variant="neutral" className="max-w-full truncate">
              {profileLabel}
            </Badge>
            {requestedLanguageLabel && (
              <p className="text-xs text-pebble-text-muted">
                Requested language: {requestedLanguageLabel}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {autoplayDemoEnabled && !demoStoppedByUser && <Badge variant="success">Autoplay demo</Badge>}
            {autoplayDemoEnabled && !demoStoppedByUser && <Badge variant="neutral">Speed: Slow</Badge>}
            {autoplayDemoEnabled && demoStoppedByUser && <Badge variant="neutral">Demo paused</Badge>}
            <Badge variant={runBadgeVariant}>{sim.runStatus === 'idle' ? phaseLabel : sim.runStatus}</Badge>
            {sim.flowRecovered && <Badge variant="success">Flow recovered</Badge>}
            {isAfk && <Badge variant="neutral">AFK</Badge>}
            <Button
              size="sm"
              variant="primary"
              onClick={() => onRun()}
              disabled={isAfk || decisionGateOpen || isGuidedRecoveryInProgress(sim) || isReviewSolutionOpen}
            >
              Run
            </Button>
            <Button size="sm" variant="secondary" onClick={() => onReplay()}>
              {autoplayDemoEnabled ? 'Replay demo' : 'Replay'}
            </Button>
          </div>
        </header>

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-3">
            <p className="text-xs text-pebble-text-secondary">Typing cadence</p>
            <p className="mt-1 text-base font-semibold text-pebble-text-primary">
              {sim.telemetry.keysPerSecond.toFixed(1)} keys/s
            </p>
          </div>
          <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-3">
            <p className="text-xs text-pebble-text-secondary">Idle</p>
            <p className="mt-1 text-base font-semibold text-pebble-text-primary">
              {sim.telemetry.idleSeconds}s
            </p>
          </div>
          <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-3">
            <p className="text-xs text-pebble-text-secondary">Backspace bursts</p>
            <p className="mt-1 text-base font-semibold text-pebble-text-primary">
              {sim.telemetry.backspaceBurstCount}
            </p>
          </div>
          <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-3">
            <p className="text-xs text-pebble-text-secondary">Run attempts</p>
            <p className="mt-1 text-base font-semibold text-pebble-text-primary">
              {sim.telemetry.runAttempts}
            </p>
          </div>
          <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-3">
            <p className="text-xs text-pebble-text-secondary">Repeat errors</p>
            <p className="mt-1 text-base font-semibold text-pebble-text-primary">
              {sim.telemetry.repeatErrorCount}
            </p>
          </div>
          <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-3">
            <p className="text-xs text-pebble-text-secondary">Struggle score</p>
            <p className="mt-1 text-base font-semibold text-pebble-warning">{sim.struggleScore}/100</p>
          </div>
        </div>

        <CodeEditor
          value={sim.codeText}
          onChange={onEditorChange}
          highlightedLines={sim.highlightedLines}
          proposedLines={sim.proposedLines}
          readOnly={sim.sessionComplete || isGuidedRecoveryInProgress(sim) || isReviewSolutionOpen}
          onRunRequested={onRun}
          onEscape={isGuidedRecoveryInProgress(sim) ? onGuidedExit : undefined}
        />

        <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-4">
          <p className="text-xs text-pebble-text-secondary">Run output</p>
          <p className="mt-1 text-sm text-pebble-text-primary">{sim.runMessage}</p>
        </div>
      </Card>

      <Card className="space-y-4" padding="md" interactive>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-[-0.015em] text-pebble-text-primary">
            Cognitive recovery
          </h2>
          <p className="text-sm leading-relaxed text-pebble-text-secondary">
            Pebble watches live editing and run behavior, then nudges when struggle patterns persist.
          </p>
        </div>

        <Divider />

        <div className="space-y-3 rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-4">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-pebble-text-primary">Lesson</p>
            <Badge variant="neutral">{task.module}</Badge>
          </div>
          <div className="inline-flex rounded-xl border border-pebble-border/40 bg-pebble-overlay/[0.08] p-1">
            <button
              type="button"
              className={buttonClass(lessonTab === 'objectives' ? 'primary' : 'secondary', 'sm')}
              onClick={() => setLessonTab('objectives')}
            >
              Objectives
            </button>
            <button
              type="button"
              className={buttonClass(lessonTab === 'hints' ? 'primary' : 'secondary', 'sm')}
              onClick={() => setLessonTab('hints')}
            >
              Hints
            </button>
            <button
              type="button"
              className={buttonClass(lessonTab === 'mistakes' ? 'primary' : 'secondary', 'sm')}
              onClick={() => setLessonTab('mistakes')}
            >
              Mistakes
            </button>
          </div>
          <ul className="space-y-1.5 pl-4 text-sm text-pebble-text-secondary">
            {lessonItems.map((item) => (
              <li key={item} className="list-disc leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
          {lessonTab === 'objectives' && taskLesson.constraints && taskLesson.constraints.length > 0 && (
            <div className="rounded-lg border border-pebble-border/28 bg-pebble-overlay/[0.05] p-3">
              <p className="text-xs font-medium text-pebble-text-secondary">Constraints</p>
              <ul className="mt-1 space-y-1 pl-4 text-xs text-pebble-text-muted">
                {taskLesson.constraints.map((constraint) => (
                  <li key={constraint} className="list-disc">
                    {constraint}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {sim.nudgeVisible && (
          <div
            className="nudge-enter rounded-xl border border-pebble-accent/30 bg-pebble-accent/10 p-4"
          >
            <p className="text-sm font-semibold text-pebble-text-primary">Pebble nudge</p>
            <p className="mt-2 text-sm leading-relaxed text-pebble-text-secondary">
              {personalizedNudgeCopy}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <button
                ref={showMeButtonRef}
                type="button"
                className={buttonClass('primary', 'sm')}
                onClick={() => onShowMe()}
                onMouseEnter={showShowMeTooltip}
                onMouseLeave={hideShowMeTooltip}
                onFocus={showShowMeTooltip}
                onBlur={hideShowMeTooltip}
                aria-describedby={isShowMeTooltipOpen ? showMeTooltipId : undefined}
              >
                Show me
              </button>
              <button
                type="button"
                className={buttonClass('secondary', 'sm')}
                onClick={() => onNotNow()}
              >
                Not now
              </button>
            </div>
          </div>
        )}

        <GuidedFixPanel
          open={isGuidedRecoveryInProgress(sim) && currentGuidedStep !== null}
          step={sim.recovery.step}
          totalSteps={sim.recovery.totalSteps}
          title={currentGuidedStep?.title ?? ''}
          description={currentGuidedStep?.detail ?? ''}
          snippetLines={guidedSnippetLines}
          canGoBack={sim.recovery.step > 1}
          canGoNext={sim.recovery.step < sim.recovery.totalSteps}
          isAfk={isAfk}
          onApplyFix={onGuidedApplyFix}
          onNextStep={onGuidedNextStep}
          onBackStep={onGuidedBackStep}
          onExit={onGuidedExit}
        />

        {!sim.nudgeVisible && sim.scene === 'struggle' && sim.simSecond < sim.snoozeUntil && (
          <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-3">
            <p className="text-xs font-medium tracking-[0.01em] text-pebble-text-secondary">
              Snoozed · {sim.snoozeUntil - sim.simSecond}s remaining
            </p>
            <p className="mt-1 text-xs text-pebble-text-muted">
              Pebble will re-check after the timer expires.
            </p>
          </div>
        )}

        <div className="space-y-2 rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-4">
          <p className="text-sm font-medium text-pebble-text-primary">Session state</p>
          <p className="text-sm text-pebble-text-secondary">
            {isAfk
              ? 'AFK detected. Struggle signals are paused until activity resumes.'
              : sim.scene === 'complete'
                ? `Completed. Recovery time: ${sim.recoveryTimeSec ?? 0}s.`
                : isGuidedRecoveryInProgress(sim)
                  ? `Guided fix step ${sim.recovery.step}/${sim.recovery.totalSteps} is active.`
                  : sim.scene === 'recovery'
                    ? 'Recovery phase active. Success is stable and ready to finish.'
                    : 'Struggle phase active. Keep iterating and run when ready.'}
          </p>
        </div>

        {sim.recoveryEffectivenessScore > 0 && (
          <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-4">
            <p className="text-xs text-pebble-text-secondary">Guided recovery effectiveness</p>
            <p className="mt-1 text-sm font-medium text-pebble-text-primary">
              {sim.recoveryEffectivenessScore}/100 based on guided fix response time.
            </p>
          </div>
        )}

        {sim.scene === 'recovery' && sim.runStatus === 'success' && !sim.sessionComplete && (
          <Button size="sm" variant="primary" onClick={() => onFinishSession()}>
            Finish session
          </Button>
        )}

        {sim.sessionComplete && (
          <div className="space-y-3 rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-4">
            <p className="text-sm text-pebble-text-secondary">
              {moduleCompletedCount}/{moduleTotalCount} tasks completed in {task.module}.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="primary" onClick={() => navigate(completionCtaPath)}>
                {completionCtaLabel}
              </Button>
              <Button size="sm" variant="secondary" onClick={onToggleReviewSolution}>
                {isReviewSolutionOpen ? 'Back to your code' : 'Review solution'}
              </Button>
            </div>
          </div>
        )}

        <div className="rounded-xl border border-pebble-border/28 bg-pebble-overlay/[0.06] p-4">
          <p className="text-xs text-pebble-text-secondary">Demo pacing</p>
          <p className="mt-1 text-sm font-medium text-pebble-text-primary">
            {autoplayDemoEnabled
              ? 'Demo mode On. Session autoplay loops until you interact.'
              : demoMode
                ? 'Demo mode On. Autoplay is available for Session 1.'
              : 'Demo mode Off. Standard pacing and AFK windows are active.'}
          </p>
          {autoplayDemoEnabled && demoStoppedByUser && (
            <p className="mt-1 text-xs text-pebble-text-muted">Demo paused. You took over.</p>
          )}
          {debugStatusLine && <p className="mt-1 text-[11px] text-pebble-text-muted">{debugStatusLine}</p>}
        </div>

        <Link to="/dashboard" className={buttonClass('secondary', 'sm')}>
          Open insights
        </Link>
      </Card>

      <PebbleMascot data={mascotData} />

      {isShowMeTooltipOpen &&
        showMeTooltipPosition &&
        decisionGateOpen &&
        !isAfk && (
          <div
            id={showMeTooltipId}
            role="tooltip"
            className="coachmark-tip fixed z-[68] w-[320px] rounded-xl border border-pebble-border/45 bg-pebble-panel p-3 shadow-[0_16px_38px_rgba(2,8,23,0.32)] backdrop-blur-xl"
            style={{
              top: showMeTooltipPosition.top,
              left: showMeTooltipPosition.left,
            }}
          >
            <p className="text-xs font-semibold uppercase tracking-[0.05em] text-pebble-text-muted">
              Guided fix
            </p>
            <p className="mt-1 text-sm leading-relaxed text-pebble-text-secondary">
              Pebble will point to the failing line, explain the mistake, and apply the smallest
              safe edit so you can keep momentum.
            </p>
          </div>
        )}
    </section>
  )
}
