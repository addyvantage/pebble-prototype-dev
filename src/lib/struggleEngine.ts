export type StruggleLevel = 0 | 1 | 2 | 3

export type StruggleAssistAction = 'hint' | 'explain' | 'next' | 'solution'

export type StruggleContextSummary = {
  level: StruggleLevel
  runFailStreak: number
  timeStuckSeconds: number
  lastErrorType: string | null
}

type EditorChangeEvent = {
  type: 'EDITOR_CHANGE'
  ts?: number
  addedChars: number
  removedChars: number
  isDeletionHeavy?: boolean
}

type RunResultEvent = {
  type: 'RUN_RESULT'
  ts?: number
  passed: boolean
  errorType?: string | null
}

type SubmitResultEvent = {
  type: 'SUBMIT_RESULT'
  ts?: number
  passed: boolean
  errorType?: string | null
}

type ChatAssistUsedEvent = {
  type: 'CHAT_ASSIST_USED'
  ts?: number
  action: StruggleAssistAction
}

type DismissNudgeEvent = {
  type: 'DISMISS_NUDGE'
  ts?: number
}

type TickEvent = {
  type: 'TICK'
  ts?: number
}

export type StruggleEvent =
  | EditorChangeEvent
  | RunResultEvent
  | SubmitResultEvent
  | ChatAssistUsedEvent
  | DismissNudgeEvent
  | TickEvent

type RollingEdit = {
  ts: number
  addedChars: number
  removedChars: number
  isDeletionHeavy: boolean
}

export type StruggleEngineState = {
  level: StruggleLevel
  score: number
  reason?: string
  cooldownUntil: number
  nudgeVisible: boolean
  runFailStreak: number
  sameErrorCount: number
  lastErrorType: string | null
  timeStuckSeconds: number
  lastAssistAction: StruggleAssistAction | null
  lastAssistAt: number | null
}

export type StruggleEngine = {
  ingest: (event: StruggleEvent) => StruggleEngineState
  getState: () => StruggleEngineState
  getContextSummary: () => StruggleContextSummary
  reset: (ts?: number) => StruggleEngineState
}

const WINDOW_MS = 90_000
const L1_THRESHOLD = 35
const L2_THRESHOLD = 60
const L3_THRESHOLD = 85
const L1_HOLD_MS = 10_000
const L2_HOLD_MS = 15_000
const LEVEL_DOWN_HOLD_MS = 12_000
const DEFAULT_COOLDOWN_MS = 60_000

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function nowOr(ts?: number) {
  return typeof ts === 'number' ? ts : Date.now()
}

function levelDownThreshold(level: StruggleLevel) {
  if (level === 3) {
    return 70
  }
  if (level === 2) {
    return 46
  }
  if (level === 1) {
    return 24
  }
  return 0
}

function shouldCountAsMeaningfulProgress(input: EditorChangeEvent) {
  const net = input.addedChars - input.removedChars
  return net >= 10 || input.addedChars >= 18
}

export function createStruggleEngine(): StruggleEngine {
  let edits: RollingEdit[] = []

  let score = 0
  let level: StruggleLevel = 0
  let reason = ''
  let cooldownUntil = 0
  let nudgeVisible = false
  let runFailStreak = 0
  let sameErrorCount = 0
  let lastErrorType: string | null = null
  let lastMeaningfulProgressAt = Date.now()
  let lastAssistAction: StruggleAssistAction | null = null
  let lastAssistAt: number | null = null
  let lastShownLevel: StruggleLevel = 0
  let aboveL1Since: number | null = null
  let aboveL2Since: number | null = null
  let aboveL3Since: number | null = null
  let lowScoreSince: number | null = null

  function prune(ts: number) {
    edits = edits.filter((item) => ts - item.ts <= WINDOW_MS)
  }

  function recomputeScore(ts: number) {
    prune(ts)

    const totalAdded = edits.reduce((sum, item) => sum + item.addedChars, 0)
    const totalRemoved = edits.reduce((sum, item) => sum + item.removedChars, 0)
    const editCount = edits.length
    const deleteBursts = edits.reduce((sum, item) => sum + (item.isDeletionHeavy ? 1 : 0), 0)
    const netProgress = totalAdded - totalRemoved
    const thrashRatio = totalRemoved / Math.max(1, totalAdded)
    const timeStuckSeconds = Math.max(0, Math.floor((ts - lastMeaningfulProgressAt) / 1000))

    let raw = 0

    if (editCount >= 12) {
      raw += Math.min(20, editCount * 0.85)
    }

    if (thrashRatio > 1.1) {
      raw += Math.min(24, (thrashRatio - 1.1) * 20)
    }

    if (deleteBursts >= 4) {
      raw += Math.min(16, deleteBursts * 2.2)
    }

    if (timeStuckSeconds > 30) {
      raw += Math.min(26, (timeStuckSeconds - 30) * 0.7)
    }

    if (runFailStreak > 0) {
      raw += Math.min(34, runFailStreak * 7.5)
    }

    if (sameErrorCount > 1) {
      raw += Math.min(12, (sameErrorCount - 1) * 3.5)
    }

    if (netProgress >= 40 && thrashRatio < 0.9) {
      raw -= 12
    }

    if (lastAssistAction === 'solution' && lastAssistAt && ts - lastAssistAt < 45_000) {
      raw -= 16
    }

    score = clamp(Math.round(score * 0.58 + raw * 0.42), 0, 100)
    return {
      timeStuckSeconds,
      thrashRatio,
    }
  }

  function computeTargetLevel(ts: number, timeStuckSeconds: number) {
    if (score >= L1_THRESHOLD) {
      aboveL1Since = aboveL1Since ?? ts
    } else {
      aboveL1Since = null
    }

    if (score >= L2_THRESHOLD) {
      aboveL2Since = aboveL2Since ?? ts
    } else {
      aboveL2Since = null
    }

    if (score >= L3_THRESHOLD) {
      aboveL3Since = aboveL3Since ?? ts
    } else {
      aboveL3Since = null
    }

    const usedGuidanceBefore =
      lastAssistAction === 'hint' || lastAssistAction === 'explain' || lastAssistAction === 'next'
    const level3ByFailStreak = runFailStreak >= 5 && usedGuidanceBefore
    const level3Ready = Boolean(aboveL3Since) || level3ByFailStreak
    const level2Ready =
      (Boolean(aboveL2Since) && ts - (aboveL2Since ?? ts) >= L2_HOLD_MS) || runFailStreak >= 3
    const level1Ready = Boolean(aboveL1Since) && ts - (aboveL1Since ?? ts) >= L1_HOLD_MS

    if (level3Ready) {
      return 3 as const
    }
    if (level2Ready) {
      return 2 as const
    }
    if (level1Ready || timeStuckSeconds >= 45) {
      return 1 as const
    }
    return 0 as const
  }

  function applyHysteresis(targetLevel: StruggleLevel, ts: number) {
    if (targetLevel > level) {
      level = targetLevel
      lowScoreSince = null
      return
    }

    if (targetLevel < level) {
      const threshold = levelDownThreshold(level)
      if (score < threshold) {
        lowScoreSince = lowScoreSince ?? ts
        if (ts - lowScoreSince >= LEVEL_DOWN_HOLD_MS) {
          level = targetLevel
          lowScoreSince = null
        }
      } else {
        lowScoreSince = null
      }
    }
  }

  function maybeShowNudge(ts: number) {
    if (level === 0) {
      nudgeVisible = false
      return
    }

    if (nudgeVisible) {
      return
    }

    const canBypassCooldown = level > lastShownLevel
    if (ts < cooldownUntil && !canBypassCooldown) {
      return
    }

    nudgeVisible = true
    lastShownLevel = level
  }

  function stateSnapshot(ts = Date.now()): StruggleEngineState {
    return {
      level,
      score,
      reason,
      cooldownUntil,
      nudgeVisible,
      runFailStreak,
      sameErrorCount,
      lastErrorType,
      timeStuckSeconds: Math.max(0, Math.floor((ts - lastMeaningfulProgressAt) / 1000)),
      lastAssistAction,
      lastAssistAt,
    }
  }

  function ingest(event: StruggleEvent) {
    const ts = nowOr(event.ts)

    if (event.type === 'EDITOR_CHANGE') {
      const normalized: RollingEdit = {
        ts,
        addedChars: Math.max(0, event.addedChars),
        removedChars: Math.max(0, event.removedChars),
        isDeletionHeavy:
          Boolean(event.isDeletionHeavy) || event.removedChars > event.addedChars + 2,
      }
      edits.push(normalized)

      if (shouldCountAsMeaningfulProgress(event)) {
        lastMeaningfulProgressAt = ts
        score = clamp(score - 4, 0, 100)
      }
    } else if (event.type === 'RUN_RESULT' || event.type === 'SUBMIT_RESULT') {
      if (event.passed) {
        runFailStreak = 0
        sameErrorCount = 0
        lastErrorType = null
        score = clamp(score - 30, 0, 100)
        level = 0
        nudgeVisible = false
        cooldownUntil = Math.max(cooldownUntil, ts + 30_000)
        lastMeaningfulProgressAt = ts
      } else {
        runFailStreak += 1
        const nextError = event.errorType ?? null
        if (nextError && nextError === lastErrorType) {
          sameErrorCount += 1
        } else {
          sameErrorCount = 1
        }
        lastErrorType = nextError
        score = clamp(score + 14, 0, 100)
      }
    } else if (event.type === 'CHAT_ASSIST_USED') {
      lastAssistAction = event.action
      lastAssistAt = ts
      nudgeVisible = false
      if (event.action === 'hint') {
        cooldownUntil = Math.max(cooldownUntil, ts + 45_000)
        score = clamp(score - 10, 0, 100)
      } else if (event.action === 'explain' || event.action === 'next') {
        cooldownUntil = Math.max(cooldownUntil, ts + 60_000)
        score = clamp(score - 14, 0, 100)
      } else {
        cooldownUntil = Math.max(cooldownUntil, ts + 90_000)
        score = clamp(score - 24, 0, 100)
      }
    } else if (event.type === 'DISMISS_NUDGE') {
      nudgeVisible = false
      cooldownUntil = Math.max(cooldownUntil, ts + DEFAULT_COOLDOWN_MS)
      score = clamp(score - 8, 0, 100)
    }

    const { timeStuckSeconds, thrashRatio } = recomputeScore(ts)
    const targetLevel = computeTargetLevel(ts, timeStuckSeconds)
    applyHysteresis(targetLevel, ts)
    maybeShowNudge(ts)

    if (runFailStreak >= 5 && (lastAssistAction === 'hint' || lastAssistAction === 'explain' || lastAssistAction === 'next')) {
      reason = 'repeated_failures_after_guidance'
    } else if (thrashRatio > 1.3 && timeStuckSeconds > 35) {
      reason = 'high_edit_churn_low_progress'
    } else if (timeStuckSeconds > 60) {
      reason = 'long_stuck_duration'
    } else if (runFailStreak >= 3) {
      reason = 'run_fail_streak'
    } else {
      reason = ''
    }

    return stateSnapshot(ts)
  }

  function reset(ts = Date.now()) {
    edits = []
    score = 0
    level = 0
    reason = ''
    cooldownUntil = 0
    nudgeVisible = false
    runFailStreak = 0
    sameErrorCount = 0
    lastErrorType = null
    lastMeaningfulProgressAt = ts
    lastAssistAction = null
    lastAssistAt = null
    lastShownLevel = 0
    aboveL1Since = null
    aboveL2Since = null
    aboveL3Since = null
    lowScoreSince = null
    return stateSnapshot(ts)
  }

  return {
    ingest,
    getState: () => stateSnapshot(),
    getContextSummary: () => {
      const snapshot = stateSnapshot()
      return {
        level: snapshot.level,
        runFailStreak: snapshot.runFailStreak,
        timeStuckSeconds: snapshot.timeStuckSeconds,
        lastErrorType: snapshot.lastErrorType,
      }
    },
    reset,
  }
}
