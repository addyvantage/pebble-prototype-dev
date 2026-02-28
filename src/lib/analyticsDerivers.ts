import type { CurriculumUnit } from '../content/pathLoader'
import type { UnitProgressMap } from './progressStore'
import type { SubmissionsByUnit } from './submissionsStore'
import type {
  AnalyticsErrorType,
  AnalyticsEvent,
  AssistAnalyticsEvent,
  RunAnalyticsEvent,
  SubmitAnalyticsEvent,
} from './analyticsStore'

export type InsightKpis = {
  recoveryEffectiveness: number
  avgRecoveryTimeSec: number
  breakpointsWeek: number
  guidanceReliancePct: number
  autonomyRatePct: number
  streakDays: number
}

export type InsightTrendPoint = {
  isoDate: string
  label: string
  flowStability: number
  cognitiveLoad: number
}

export type RadarAxisKey =
  | 'speed'
  | 'accuracy'
  | 'consistency'
  | 'autonomy'
  | 'debugging'
  | 'complexity'

export type RadarScores = Record<RadarAxisKey, number>

export type IssueProfileItem = {
  type: AnalyticsErrorType
  count: number
  ratioPct: number
}

export type GrowthLedgerItem = {
  id: string
  ts: number
  kind: 'breakthrough' | 'stability' | 'autonomy'
  unitId: string
  failuresBeforeSuccess: number
  recoverySec: number
  impactScore: number
}

export type NextActionItem = {
  id: string
  kind: 'continue-unit' | 'focus-syntax' | 'focus-debug' | 'raise-complexity' | 'maintain-streak'
  unitId?: string
}

export type InsightsDerived = {
  kpis: InsightKpis
  trend30d: InsightTrendPoint[]
  radarCurrent: RadarScores
  radarPrevious: RadarScores
  issueProfile: IssueProfileItem[]
  growthLedger: GrowthLedgerItem[]
  nextActions: NextActionItem[]
}

const DAY_MS = 24 * 60 * 60 * 1000

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number, digits = 1) {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

function normalize100(value: number) {
  return clamp(Math.round(value), 0, 100)
}

function asRunAttempt(event: AnalyticsEvent): RunAnalyticsEvent | SubmitAnalyticsEvent | null {
  if (event.type === 'run' || event.type === 'submit') {
    return event
  }
  return null
}

function isSuccess(event: RunAnalyticsEvent | SubmitAnalyticsEvent) {
  return event.type === 'run' ? event.passed : event.accepted
}

function pickRecent<T extends { ts: number }>(rows: T[], fromTs: number, limit?: number) {
  const filtered = rows.filter((row) => row.ts >= fromTs)
  if (typeof limit === 'number') {
    return filtered.slice(-limit)
  }
  return filtered
}

function dayBucket(ts: number) {
  const date = new Date(ts)
  date.setHours(0, 0, 0, 0)
  return date.getTime()
}

function runtimeStats(attempts: Array<RunAnalyticsEvent | SubmitAnalyticsEvent>) {
  const runtimes = attempts.map((attempt) => Math.max(1, attempt.runtimeMs))
  if (runtimes.length === 0) {
    return { median: 0, mean: 0, variance: 0, stdDev: 0, cv: 0 }
  }

  const sorted = [...runtimes].sort((a, b) => a - b)
  const median = sorted[Math.floor(sorted.length / 2)]
  const mean = runtimes.reduce((sum, value) => sum + value, 0) / runtimes.length
  const variance =
    runtimes.reduce((sum, value) => sum + (value - mean) ** 2, 0) / Math.max(1, runtimes.length)
  const stdDev = Math.sqrt(variance)
  const cv = mean > 0 ? stdDev / mean : 0
  return { median, mean, variance, stdDev, cv }
}

function computeRecoverySeries(attemptsAsc: Array<RunAnalyticsEvent | SubmitAnalyticsEvent>) {
  type PendingFailure = {
    startTs: number
    failCount: number
    unitId: string
  }

  const pendingByUnit = new Map<string, PendingFailure>()
  const recoveries: Array<{
    unitId: string
    startTs: number
    endTs: number
    failCount: number
    recoverySec: number
  }> = []

  for (const attempt of attemptsAsc) {
    const success = isSuccess(attempt)
    const pending = pendingByUnit.get(attempt.unitId)

    if (!success) {
      if (pending) {
        pendingByUnit.set(attempt.unitId, {
          ...pending,
          failCount: pending.failCount + 1,
        })
      } else {
        pendingByUnit.set(attempt.unitId, {
          unitId: attempt.unitId,
          startTs: attempt.ts,
          failCount: 1,
        })
      }
      continue
    }

    if (!pending) {
      continue
    }

    const recoverySec = Math.max(1, (attempt.ts - pending.startTs) / 1000)
    recoveries.push({
      unitId: attempt.unitId,
      startTs: pending.startTs,
      endTs: attempt.ts,
      failCount: pending.failCount,
      recoverySec,
    })
    pendingByUnit.delete(attempt.unitId)
  }

  return recoveries
}

function computeStreakDays(successAttempts: Array<RunAnalyticsEvent | SubmitAnalyticsEvent>, nowTs: number) {
  const successDays = new Set(successAttempts.map((attempt) => dayBucket(attempt.ts)))
  let streak = 0
  let cursor = dayBucket(nowTs)

  while (successDays.has(cursor)) {
    streak += 1
    cursor -= DAY_MS
  }

  return streak
}

function computeBreakpoints(
  attemptsAsc: Array<RunAnalyticsEvent | SubmitAnalyticsEvent>,
  minTs: number,
) {
  let streak = 0
  let breakpoints = 0

  for (const attempt of attemptsAsc) {
    if (attempt.ts < minTs) {
      continue
    }

    if (isSuccess(attempt)) {
      if (streak >= 2) {
        breakpoints += 1
      }
      streak = 0
    } else {
      streak += 1
    }
  }

  return breakpoints
}

function computeIssueProfile(rows: RunAnalyticsEvent[]) {
  const keys: AnalyticsErrorType[] = [
    'syntax_error',
    'runtime_error',
    'wrong_answer',
    'time_limit',
    'api_failure',
  ]
  const total = rows.length
  return keys.map((key) => {
    const count = rows.filter((row) => row.errorType === key).length
    return {
      type: key,
      count,
      ratioPct: total > 0 ? round((count / total) * 100) : 0,
    }
  })
}

function buildRadarScores(input: {
  attempts30d: Array<RunAnalyticsEvent | SubmitAnalyticsEvent>
  recoveries30d: ReturnType<typeof computeRecoverySeries>
  completedCount: number
  totalUnits: number
  guidanceReliancePct: number
  passRatePct: number
  streakDays: number
}) {
  const runtime = runtimeStats(input.attempts30d.filter((attempt) => isSuccess(attempt)))
  const allSuccessRuntimes = input.attempts30d
    .filter((attempt) => isSuccess(attempt))
    .map((attempt) => attempt.runtimeMs)
  const runtimeMin = allSuccessRuntimes.length > 0 ? Math.min(...allSuccessRuntimes) : 200
  const runtimeMax = allSuccessRuntimes.length > 0 ? Math.max(...allSuccessRuntimes) : 1200

  const speed =
    runtime.median > 0
      ? normalize100(100 - ((runtime.median - runtimeMin) / Math.max(1, runtimeMax - runtimeMin)) * 75)
      : 38

  const accuracy = normalize100(input.passRatePct)
  const variancePenalty = clamp(runtime.cv * 100, 0, 100)
  const consistency = normalize100(input.streakDays * 8 + (100 - variancePenalty) * 0.55)
  const autonomy = normalize100(100 - input.guidanceReliancePct)

  const avgFailuresBeforeSuccess =
    input.recoveries30d.length > 0
      ? input.recoveries30d.reduce((sum, item) => sum + item.failCount, 0) / input.recoveries30d.length
      : 2.8
  const debugging = normalize100(100 - avgFailuresBeforeSuccess * 17)

  const completionRatio =
    input.totalUnits > 0 ? clamp((input.completedCount / input.totalUnits) * 100, 0, 100) : 0
  const last10 = input.attempts30d.slice(-10)
  const prev10 = input.attempts30d.slice(-20, -10)
  const last10Pass = last10.length > 0 ? (last10.filter((item) => isSuccess(item)).length / last10.length) * 100 : 0
  const prev10Pass = prev10.length > 0 ? (prev10.filter((item) => isSuccess(item)).length / prev10.length) * 100 : last10Pass
  const improvementBoost = clamp(last10Pass - prev10Pass, -20, 20)
  const complexity = normalize100(completionRatio * 0.7 + 30 + improvementBoost)

  return {
    speed,
    accuracy,
    consistency,
    autonomy,
    debugging,
    complexity,
  } satisfies RadarScores
}

function buildTrend30d(
  attemptsAsc: Array<RunAnalyticsEvent | SubmitAnalyticsEvent>,
  assistsAsc: AssistAnalyticsEvent[],
  nowTs: number,
) {
  const trend: InsightTrendPoint[] = []

  for (let index = 29; index >= 0; index -= 1) {
    const dayStart = dayBucket(nowTs) - index * DAY_MS
    const dayEnd = dayStart + DAY_MS
    const windowStart = dayStart - 6 * DAY_MS

    const windowAttempts = attemptsAsc.filter(
      (attempt) => attempt.ts >= windowStart && attempt.ts < dayEnd,
    )
    const windowAssists = assistsAsc.filter(
      (assist) => assist.ts >= windowStart && assist.ts < dayEnd,
    )

    const passRate =
      windowAttempts.length > 0
        ? (windowAttempts.filter((attempt) => isSuccess(attempt)).length / windowAttempts.length) * 100
        : 0
    const runtime = runtimeStats(windowAttempts)
    const variancePenalty = clamp(runtime.cv * 100, 0, 100)
    const guidanceReliance =
      windowAttempts.length > 0 ? (windowAssists.length / windowAttempts.length) * 100 : 0

    const flowStability = normalize100(passRate * 0.58 + (100 - variancePenalty) * 0.42)
    const cognitiveLoad = normalize100((100 - passRate) * 0.55 + variancePenalty * 0.3 + guidanceReliance * 0.15)

    const date = new Date(dayStart)
    trend.push({
      isoDate: date.toISOString(),
      label: `${date.getMonth() + 1}/${date.getDate()}`,
      flowStability,
      cognitiveLoad,
    })
  }

  return trend
}

function buildGrowthLedger(
  attemptsAsc: Array<RunAnalyticsEvent | SubmitAnalyticsEvent>,
  submissionsByUnit: SubmissionsByUnit,
) {
  const recoveries = computeRecoverySeries(attemptsAsc)
  const latestRecoveries = recoveries
    .slice(-10)
    .reverse()
    .map((item) => ({
      id: `recovery-${item.unitId}-${item.endTs}`,
      ts: item.endTs,
      kind: 'breakthrough' as const,
      unitId: item.unitId,
      failuresBeforeSuccess: item.failCount,
      recoverySec: round(item.recoverySec),
      impactScore: normalize100(100 - item.failCount * 12 - item.recoverySec * 0.08),
    }))

  const stabilityRows: GrowthLedgerItem[] = []
  for (const [unitId, submissions] of Object.entries(submissionsByUnit)) {
    const acceptedRows = submissions.filter((row) => row.status === 'accepted').slice(0, 2)
    if (acceptedRows.length < 2) {
      continue
    }
    const latest = acceptedRows[0]
    const previous = acceptedRows[1]
    if (latest.runtimeMs >= previous.runtimeMs) {
      continue
    }
    stabilityRows.push({
      id: `stability-${unitId}-${latest.timestamp}`,
      ts: latest.timestamp,
      kind: 'stability',
      unitId,
      failuresBeforeSuccess: 0,
      recoverySec: 0,
      impactScore: normalize100(55 + ((previous.runtimeMs - latest.runtimeMs) / Math.max(1, previous.runtimeMs)) * 60),
    })
  }

  return [...latestRecoveries, ...stabilityRows]
    .sort((left, right) => right.ts - left.ts)
    .slice(0, 12)
}

function buildNextActions(input: {
  units: CurriculumUnit[]
  unitProgress: UnitProgressMap
  issueProfile: IssueProfileItem[]
  streakDays: number
}) {
  const actions: NextActionItem[] = []
  const nextUnit = input.units.find((unit) => !input.unitProgress[unit.id]?.completed)
  if (nextUnit) {
    actions.push({
      id: `continue-${nextUnit.id}`,
      kind: 'continue-unit',
      unitId: nextUnit.id,
    })
  }

  const syntaxCount = input.issueProfile.find((item) => item.type === 'syntax_error')?.count ?? 0
  if (syntaxCount > 0) {
    actions.push({
      id: 'syntax-reset',
      kind: 'focus-syntax',
    })
  }

  const debugCount = input.issueProfile.find((item) => item.type === 'runtime_error')?.count ?? 0
  if (debugCount > 0) {
    actions.push({
      id: 'debug-drill',
      kind: 'focus-debug',
    })
  }

  if ((nextUnit ? 0 : 1) && input.units.length > 0) {
    actions.push({
      id: 'complexity-push',
      kind: 'raise-complexity',
      unitId: input.units[Math.min(input.units.length - 1, 7)]?.id,
    })
  }

  if (input.streakDays < 4) {
    actions.push({
      id: 'maintain-streak',
      kind: 'maintain-streak',
    })
  }

  return actions.slice(0, 4)
}

export function deriveInsights(input: {
  events: AnalyticsEvent[]
  unitProgress: UnitProgressMap
  submissionsByUnit: SubmissionsByUnit
  units: CurriculumUnit[]
  nowTs?: number
}): InsightsDerived {
  const nowTs = input.nowTs ?? Date.now()
  const attemptsAsc = input.events
    .map(asRunAttempt)
    .filter((item): item is RunAnalyticsEvent | SubmitAnalyticsEvent => item !== null)
    .sort((left, right) => left.ts - right.ts)
  const runsAsc = input.events
    .filter((event): event is RunAnalyticsEvent => event.type === 'run')
    .sort((left, right) => left.ts - right.ts)
  const assistsAsc = input.events
    .filter((event): event is AssistAnalyticsEvent => event.type === 'assist')
    .sort((left, right) => left.ts - right.ts)

  const last30dTs = nowTs - 30 * DAY_MS
  const last7dTs = nowTs - 7 * DAY_MS
  const attempts30d = pickRecent(attemptsAsc, last30dTs)
  const assists30d = pickRecent(assistsAsc, last30dTs)
  const runs30d = pickRecent(runsAsc, last30dTs)
  const attemptsForPassRate = attempts30d.slice(-30)

  const passRatePct =
    attemptsForPassRate.length > 0
      ? (attemptsForPassRate.filter((item) => isSuccess(item)).length / attemptsForPassRate.length) * 100
      : 0

  const recoveries30d = computeRecoverySeries(attempts30d)
  const avgRecoveryTimeSec =
    recoveries30d.length > 0
      ? round(
          recoveries30d.reduce((sum, item) => sum + item.recoverySec, 0) /
          recoveries30d.length,
        )
      : 0

  const breakpointsWeek = computeBreakpoints(attemptsAsc, last7dTs)
  const guidanceReliancePct =
    attempts30d.length > 0 ? round((assists30d.length / attempts30d.length) * 100) : 0
  const autonomyRatePct = round(100 - guidanceReliancePct)
  const streakDays = computeStreakDays(
    attemptsAsc.filter((attempt) => isSuccess(attempt)),
    nowTs,
  )

  const runtime30d = runtimeStats(attempts30d)
  const variancePenalty = clamp(runtime30d.cv * 100, 0, 100)
  const flowStabilityScore = normalize100(passRatePct * 0.56 + (100 - variancePenalty) * 0.44)
  const cognitiveLoadScore = normalize100(
    (100 - passRatePct) * 0.5 + variancePenalty * 0.35 + breakpointsWeek * 4,
  )

  const avgFailuresBeforeRecovery =
    recoveries30d.length > 0
      ? recoveries30d.reduce((sum, item) => sum + item.failCount, 0) / recoveries30d.length
      : 2.5
  const recoveryEffectiveness = normalize100(
    100 - avgRecoveryTimeSec * 0.7 - avgFailuresBeforeRecovery * 10 + autonomyRatePct * 0.15,
  )

  const radarCurrent = buildRadarScores({
    attempts30d,
    recoveries30d,
    completedCount: Object.values(input.unitProgress).filter((item) => item.completed).length,
    totalUnits: input.units.length,
    guidanceReliancePct,
    passRatePct,
    streakDays,
  })
  const attemptsPrevWindow = attemptsAsc.filter(
    (attempt) => attempt.ts >= nowTs - 60 * DAY_MS && attempt.ts < last30dTs,
  )
  const recoveriesPrev = computeRecoverySeries(attemptsPrevWindow)
  const assistsPrev = assistsAsc.filter(
    (assist) => assist.ts >= nowTs - 60 * DAY_MS && assist.ts < last30dTs,
  )
  const prevPassRate =
    attemptsPrevWindow.length > 0
      ? (attemptsPrevWindow.filter((attempt) => isSuccess(attempt)).length / attemptsPrevWindow.length) * 100
      : passRatePct
  const prevGuidance =
    attemptsPrevWindow.length > 0 ? (assistsPrev.length / attemptsPrevWindow.length) * 100 : guidanceReliancePct

  const radarPrevious = buildRadarScores({
    attempts30d: attemptsPrevWindow,
    recoveries30d: recoveriesPrev,
    completedCount: Math.max(
      0,
      Object.values(input.unitProgress).filter((item) => item.completed).length - 1,
    ),
    totalUnits: input.units.length,
    guidanceReliancePct: prevGuidance,
    passRatePct: prevPassRate,
    streakDays: Math.max(0, streakDays - 2),
  })

  const issueProfile = computeIssueProfile(runs30d.filter((row) => !row.passed))
  const growthLedger = buildGrowthLedger(attemptsAsc, input.submissionsByUnit)
  const nextActions = buildNextActions({
    units: input.units,
    unitProgress: input.unitProgress,
    issueProfile,
    streakDays,
  })

  return {
    kpis: {
      recoveryEffectiveness,
      avgRecoveryTimeSec,
      breakpointsWeek,
      guidanceReliancePct,
      autonomyRatePct,
      streakDays,
    },
    trend30d: buildTrend30d(attemptsAsc, assistsAsc, nowTs).map((item) => ({
      ...item,
      flowStability: item.flowStability || flowStabilityScore,
      cognitiveLoad: item.cognitiveLoad || cognitiveLoadScore,
    })),
    radarCurrent,
    radarPrevious,
    issueProfile,
    growthLedger,
    nextActions,
  }
}
