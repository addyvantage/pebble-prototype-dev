import {
  activityLedger,
  cognitiveLoadTrend30d,
  flowTrend30d,
  recoveryByIssue,
  summaryMetrics,
} from '../data/mockInsights'
import { storageKeys } from './storageKeys'

const DEFAULT_USER_ID = 'local_user'

export type MemoryLedgerStatus = 'resolved' | 'guided' | 'stabilized'

export type MemoryLedgerEntry = {
  id: string
  timestamp: string
  note: string
  impact: string
  status: MemoryLedgerStatus
  breakpointsResolved: number
}

export type PebbleMemory = {
  userId: string
  sessionsCompleted: number
  bestFlowStability: number
  avgRecoveryTimeSec: number
  hintDependencyRate: number
  strengths: string[]
  focusAreas: string[]
  breakpointsThisMonth: number
  flowTrend30d: Array<{ day: string; value: number }>
  cognitiveLoadTrend30d: Array<{ day: string; value: number }>
  recoveryByIssue: Array<{
    issue: 'Syntax errors' | 'API failures' | 'Logic issues'
    avgRecoverySec: number
    autonomousRecoveryRate: number
  }>
  recentSessions: Array<{
    timestamp: string
    flowStability: number
    recoveryTimeSec: number
    hintIntensity: number
    breakpoints: number
  }>
  thenVsNowEntries: MemoryLedgerEntry[]
}

type SessionCompletionInput = {
  usedHint: boolean
  nudgeShown: boolean
  flowStability: number
  recoveryTimeSec: number
  breakpointsResolved: number
  repeatErrorCount: number
  autonomousRecovery: boolean
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

function round(value: number) {
  return Math.round(value * 10) / 10
}

function formatDay(timestamp: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
  }).format(new Date(timestamp))
}

function seedMemory(userId: string): PebbleMemory {
  const sessionBaseline = [
    { timestamp: '2026-02-11T14:00:00Z', flowStability: 77, recoveryTimeSec: 92, hintIntensity: 0.6, breakpoints: 4 },
    { timestamp: '2026-02-13T10:30:00Z', flowStability: 78, recoveryTimeSec: 88, hintIntensity: 0.55, breakpoints: 4 },
    { timestamp: '2026-02-15T16:25:00Z', flowStability: 79, recoveryTimeSec: 84, hintIntensity: 0.5, breakpoints: 3 },
    { timestamp: '2026-02-17T09:18:00Z', flowStability: 80, recoveryTimeSec: 82, hintIntensity: 0.45, breakpoints: 3 },
    { timestamp: '2026-02-19T13:42:00Z', flowStability: 81, recoveryTimeSec: 80, hintIntensity: 0.42, breakpoints: 3 },
    { timestamp: '2026-02-21T11:07:00Z', flowStability: 82, recoveryTimeSec: 78, hintIntensity: 0.38, breakpoints: 2 },
    { timestamp: '2026-02-23T15:55:00Z', flowStability: 84, recoveryTimeSec: 76, hintIntensity: 0.34, breakpoints: 2 },
    { timestamp: '2026-02-24T09:42:00Z', flowStability: 85, recoveryTimeSec: 74, hintIntensity: 0.32, breakpoints: 2 },
  ]

  return {
    userId,
    sessionsCompleted: sessionBaseline.length,
    bestFlowStability: summaryMetrics.flowStability.value,
    avgRecoveryTimeSec: summaryMetrics.recoveryTime.value,
    hintDependencyRate: summaryMetrics.hintDependency.value,
    strengths: ['Loop debugging', 'Autonomous recovery'],
    focusAreas: ['API schema tracing', 'Edge-case planning'],
    breakpointsThisMonth: summaryMetrics.breakpoints.value,
    flowTrend30d: flowTrend30d,
    cognitiveLoadTrend30d: cognitiveLoadTrend30d,
    recoveryByIssue,
    recentSessions: sessionBaseline,
    thenVsNowEntries: activityLedger.map((entry) => ({
      ...entry,
    })),
  }
}

function isMemory(value: unknown): value is PebbleMemory {
  return Boolean(
    value &&
      typeof value === 'object' &&
      'sessionsCompleted' in value &&
      'bestFlowStability' in value &&
      'thenVsNowEntries' in value &&
      'recentSessions' in value,
  )
}

export function getPebbleMemory(userId = DEFAULT_USER_ID) {
  if (typeof window === 'undefined') {
    return seedMemory(userId)
  }

  const raw = window.localStorage.getItem(storageKeys.memory)
  if (!raw) {
    const seeded = seedMemory(userId)
    window.localStorage.setItem(storageKeys.memory, JSON.stringify(seeded))
    return seeded
  }

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!isMemory(parsed)) {
      throw new Error('Invalid memory payload')
    }
    return parsed
  } catch {
    const seeded = seedMemory(userId)
    window.localStorage.setItem(storageKeys.memory, JSON.stringify(seeded))
    return seeded
  }
}

function savePebbleMemory(memory: PebbleMemory) {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.setItem(storageKeys.memory, JSON.stringify(memory))
}

function uniqueTags(tags: string[]) {
  return Array.from(new Set(tags)).slice(0, 5)
}

export function updatePebbleMemoryAfterSession(
  input: SessionCompletionInput,
  userId = DEFAULT_USER_ID,
) {
  const memory = getPebbleMemory(userId)
  const nextSessions = memory.sessionsCompleted + 1

  const hintIntensity = input.usedHint ? 1 : input.nudgeShown ? 0.3 : 0

  const avgRecoveryTimeSec = round(
    (memory.avgRecoveryTimeSec * memory.sessionsCompleted + input.recoveryTimeSec) /
      nextSessions,
  )

  const hintValue = hintIntensity * 100
  const hintDependencyRate = round(
    (memory.hintDependencyRate * memory.sessionsCompleted + hintValue) / nextSessions,
  )

  const bestFlowStability = Math.max(memory.bestFlowStability, input.flowStability)
  const breakpointsThisMonth = clamp(
    memory.breakpointsThisMonth - (input.autonomousRecovery ? 1 : 0),
    8,
    40,
  )

  const timestamp = new Date().toISOString()
  const day = formatDay(timestamp)
  const nextFlowTrend = [...memory.flowTrend30d, { day, value: input.flowStability }].slice(-30)
  const nextLoadValue = clamp(100 - input.flowStability + 16, 32, 78)
  const nextLoadTrend = [
    ...memory.cognitiveLoadTrend30d,
    { day, value: nextLoadValue },
  ].slice(-30)

  const recoveryByIssueNext = memory.recoveryByIssue.map((entry) => {
    const modifier =
      entry.issue === 'Logic issues'
        ? input.usedHint
          ? -1
          : -3
        : entry.issue === 'Syntax errors'
          ? -2
          : -1

    return {
      ...entry,
      avgRecoverySec: clamp(entry.avgRecoverySec + modifier, 42, 140),
      autonomousRecoveryRate: clamp(
        round(entry.autonomousRecoveryRate + (input.autonomousRecovery ? 0.01 : -0.005)),
        0.42,
        0.9,
      ),
    }
  })

  const note = input.usedHint
    ? 'Applied Pebble hint and stabilized loop logic'
    : input.nudgeShown
      ? 'Skipped nudge and recovered autonomously'
      : 'Maintained flow without nudge'
  const impact = input.usedHint
    ? `Guided recovery in ${input.recoveryTimeSec}s, repeat errors: ${input.repeatErrorCount}`
    : input.nudgeShown
      ? `Autonomous recovery in ${input.recoveryTimeSec}s after breakpoint`
      : `Stable completion in ${input.recoveryTimeSec}s with no hint reliance`

  const newEntry: MemoryLedgerEntry = {
    id: `ledger-${Date.now()}`,
    timestamp,
    note,
    impact,
    status: input.usedHint ? 'guided' : input.nudgeShown ? 'resolved' : 'stabilized',
    breakpointsResolved: input.breakpointsResolved,
  }

  const nextStrengths = input.autonomousRecovery
    ? uniqueTags([...memory.strengths, 'Autonomous recovery', 'Run resilience'])
    : uniqueTags([...memory.strengths, 'Concept uptake'])

  const nextFocus = input.usedHint
    ? uniqueTags([...memory.focusAreas, 'Independent retry confidence'])
    : uniqueTags(memory.focusAreas.filter((tag) => tag !== 'Independent retry confidence'))

  const nextRecentSessions = [
    ...memory.recentSessions,
    {
      timestamp,
      flowStability: input.flowStability,
      recoveryTimeSec: input.recoveryTimeSec,
      hintIntensity,
      breakpoints: input.breakpointsResolved,
    },
  ].slice(-40)

  const nextMemory: PebbleMemory = {
    ...memory,
    userId,
    sessionsCompleted: nextSessions,
    bestFlowStability: bestFlowStability,
    avgRecoveryTimeSec,
    hintDependencyRate,
    strengths: nextStrengths,
    focusAreas: nextFocus,
    breakpointsThisMonth,
    flowTrend30d: nextFlowTrend,
    cognitiveLoadTrend30d: nextLoadTrend,
    recoveryByIssue: recoveryByIssueNext,
    recentSessions: nextRecentSessions,
    thenVsNowEntries: [newEntry, ...memory.thenVsNowEntries].slice(0, 10),
  }

  savePebbleMemory(nextMemory)
  return nextMemory
}
