import type { PlacementLanguage } from '../data/onboardingData'

const ANALYTICS_STORAGE_KEY = 'pebble.analytics.v1'
const ANALYTICS_EVENT_NAME = 'pebble:analytics-updated'
const ANALYTICS_MAX_EVENTS = 2000

export type AnalyticsErrorType =
  | 'syntax_error'
  | 'runtime_error'
  | 'wrong_answer'
  | 'time_limit'
  | 'api_failure'

type AnalyticsEventBase = {
  id: string
  ts: number
  unitId: string
  trackId: string
  language: PlacementLanguage
}

export type RunAnalyticsEvent = AnalyticsEventBase & {
  type: 'run'
  passed: boolean
  passCount: number
  total: number
  runtimeMs: number
  exitCode: number | null
  errorType?: AnalyticsErrorType
  attemptContextHash?: string
}

export type SubmitAnalyticsEvent = AnalyticsEventBase & {
  type: 'submit'
  accepted: boolean
  passCount: number
  total: number
  runtimeMs: number
  exitCode: number | null
  errorType?: AnalyticsErrorType
}

export type AssistAnalyticsEvent = AnalyticsEventBase & {
  type: 'assist'
  action: 'hint' | 'explain' | 'next'
}

export type PlacementSkipAnalyticsEvent = AnalyticsEventBase & {
  type: 'placement_skip'
  questionId: string
  questionIndex: number
}

export type AnalyticsEvent =
  | RunAnalyticsEvent
  | SubmitAnalyticsEvent
  | AssistAnalyticsEvent
  | PlacementSkipAnalyticsEvent

export type AnalyticsState = {
  version: 1
  updatedAt: number
  events: AnalyticsEvent[]
}

export type RunEventInput = Omit<RunAnalyticsEvent, 'type' | 'id' | 'ts'>
export type SubmitEventInput = Omit<SubmitAnalyticsEvent, 'type' | 'id' | 'ts'>
export type AssistEventInput = Omit<AssistAnalyticsEvent, 'type' | 'id' | 'ts'>
export type PlacementSkipEventInput = Omit<PlacementSkipAnalyticsEvent, 'type' | 'id' | 'ts'>

const EMPTY_STATE: AnalyticsState = {
  version: 1,
  updatedAt: 0,
  events: [],
}

let analyticsStateCache: AnalyticsState = EMPTY_STATE

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function emitAnalyticsUpdate() {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new CustomEvent(ANALYTICS_EVENT_NAME))
}

function readFromStorage(): AnalyticsState {
  if (typeof window === 'undefined') {
    return EMPTY_STATE
  }

  try {
    const raw = window.localStorage.getItem(ANALYTICS_STORAGE_KEY)
    if (!raw) {
      return EMPTY_STATE
    }

    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed) || !Array.isArray(parsed.events)) {
      return EMPTY_STATE
    }

    const events: AnalyticsEvent[] = []
    for (const item of parsed.events) {
      if (!isRecord(item) || typeof item.type !== 'string') {
        continue
      }

      const baseValid =
        typeof item.id === 'string' &&
        typeof item.ts === 'number' &&
        typeof item.unitId === 'string' &&
        typeof item.trackId === 'string' &&
        typeof item.language === 'string'

      if (!baseValid) {
        continue
      }

      const base: AnalyticsEventBase = {
        id: item.id as string,
        ts: item.ts as number,
        unitId: item.unitId as string,
        trackId: item.trackId as string,
        language: item.language as PlacementLanguage,
      }

      if (item.type === 'run') {
        if (
          typeof item.passed === 'boolean' &&
          typeof item.passCount === 'number' &&
          typeof item.total === 'number' &&
          typeof item.runtimeMs === 'number' &&
          (typeof item.exitCode === 'number' || item.exitCode === null)
        ) {
          events.push({
            ...base,
            type: 'run',
            passed: item.passed,
            passCount: item.passCount,
            total: item.total,
            runtimeMs: item.runtimeMs,
            exitCode: item.exitCode,
            errorType:
              typeof item.errorType === 'string' ? (item.errorType as AnalyticsErrorType) : undefined,
            attemptContextHash:
              typeof item.attemptContextHash === 'string' ? item.attemptContextHash : undefined,
          } satisfies RunAnalyticsEvent)
        }
        continue
      }

      if (item.type === 'submit') {
        if (
          typeof item.accepted === 'boolean' &&
          typeof item.passCount === 'number' &&
          typeof item.total === 'number' &&
          typeof item.runtimeMs === 'number' &&
          (typeof item.exitCode === 'number' || item.exitCode === null)
        ) {
          events.push({
            ...base,
            type: 'submit',
            accepted: item.accepted,
            passCount: item.passCount,
            total: item.total,
            runtimeMs: item.runtimeMs,
            exitCode: item.exitCode,
            errorType:
              typeof item.errorType === 'string' ? (item.errorType as AnalyticsErrorType) : undefined,
          } satisfies SubmitAnalyticsEvent)
        }
        continue
      }

      if (item.type === 'assist') {
        if (item.action === 'hint' || item.action === 'explain' || item.action === 'next') {
          events.push({
            ...base,
            type: 'assist',
            action: item.action,
          } satisfies AssistAnalyticsEvent)
        }
        continue
      }

      if (item.type === 'placement_skip') {
        if (typeof item.questionId === 'string' && typeof item.questionIndex === 'number') {
          events.push({
            ...base,
            type: 'placement_skip',
            questionId: item.questionId,
            questionIndex: item.questionIndex,
          } satisfies PlacementSkipAnalyticsEvent)
        }
      }
    }

    return {
      version: 1,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      events,
    }
  } catch {
    return EMPTY_STATE
  }
}

function saveToStorage(state: AnalyticsState) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(state))
  } catch {
    // Ignore quota issues in local demo mode.
  }
}

function appendEvent(event: AnalyticsEvent) {
  const current = analyticsStateCache
  const nextState: AnalyticsState = {
    version: 1,
    updatedAt: Date.now(),
    events: [...current.events, event].slice(-ANALYTICS_MAX_EVENTS),
  }
  analyticsStateCache = nextState
  saveToStorage(nextState)
  emitAnalyticsUpdate()
  return nextState
}

function buildEventId(prefix: string, ts: number) {
  return `${prefix}-${ts}-${Math.random().toString(36).slice(2, 8)}`
}

export function getAnalyticsState() {
  return analyticsStateCache
}

export function clearAnalyticsState() {
  if (typeof window === 'undefined') {
    return
  }
  window.localStorage.removeItem(ANALYTICS_STORAGE_KEY)
  analyticsStateCache = EMPTY_STATE
  emitAnalyticsUpdate()
}

export function subscribeAnalytics(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const onAnalyticsUpdate = () => {
    listener()
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== ANALYTICS_STORAGE_KEY) {
      return
    }
    analyticsStateCache = readFromStorage()
    listener()
  }

  window.addEventListener(ANALYTICS_EVENT_NAME, onAnalyticsUpdate)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(ANALYTICS_EVENT_NAME, onAnalyticsUpdate)
    window.removeEventListener('storage', onStorage)
  }
}

export function classifyErrorType(input: {
  passed: boolean
  timedOut?: boolean
  stderr?: string
  exitCode?: number | null
}): AnalyticsErrorType | undefined {
  if (input.passed) {
    return undefined
  }

  if (input.timedOut) {
    return 'time_limit'
  }

  const stderr = (input.stderr ?? '').toLowerCase()
  if (stderr.includes('failed to reach /api/run') || stderr.includes('runner returned an invalid response')) {
    return 'api_failure'
  }
  if (
    stderr.includes('syntaxerror') ||
    stderr.includes('syntax error') ||
    stderr.includes('unexpected token') ||
    stderr.includes('compilation') ||
    stderr.includes('javac')
  ) {
    return 'syntax_error'
  }
  if (
    stderr.includes('traceback') ||
    stderr.includes('exception') ||
    stderr.includes('runtimeerror') ||
    stderr.includes('segmentation fault') ||
    stderr.includes('nullpointer')
  ) {
    return 'runtime_error'
  }

  if (input.exitCode !== null && input.exitCode !== 0) {
    return 'runtime_error'
  }

  return 'wrong_answer'
}

function buildAttemptHash(input: {
  unitId: string
  trackId: string
  passCount: number
  total: number
  runtimeMs: number
}) {
  return `${input.unitId}:${input.trackId}:${input.passCount}/${input.total}:${Math.round(input.runtimeMs)}`
}

export function logRunEvent(input: RunEventInput) {
  const ts = Date.now()
  return appendEvent({
    ...input,
    type: 'run',
    id: buildEventId('run', ts),
    ts,
    attemptContextHash: input.attemptContextHash ?? buildAttemptHash(input),
  })
}

export function logSubmitEvent(input: SubmitEventInput) {
  const ts = Date.now()
  return appendEvent({
    ...input,
    type: 'submit',
    id: buildEventId('submit', ts),
    ts,
  })
}

export function logAssistEvent(input: AssistEventInput) {
  const ts = Date.now()
  return appendEvent({
    ...input,
    type: 'assist',
    id: buildEventId('assist', ts),
    ts,
  })
}

export function logPlacementSkipEvent(input: PlacementSkipEventInput) {
  const ts = Date.now()
  return appendEvent({
    ...input,
    type: 'placement_skip',
    id: buildEventId('placement-skip', ts),
    ts,
  })
}

export function seedDemoAnalyticsData(params: {
  language: PlacementLanguage
  trackId: string
  unitIds: string[]
}) {
  const current = analyticsStateCache
  if (current.events.length > 0 || params.unitIds.length === 0) {
    return current
  }

  const now = Date.now()
  const seeded: AnalyticsEvent[] = []

  for (let dayOffset = 27; dayOffset >= 0; dayOffset -= 1) {
    const unitId = params.unitIds[dayOffset % params.unitIds.length]
    const baseTs = now - dayOffset * 24 * 60 * 60 * 1000
    const total = 3
    const passCount = dayOffset % 4 === 0 ? 2 : 3
    const passed = passCount === total
    const runtimeMs = 520 + (dayOffset % 7) * 80 + (passed ? 0 : 140)

    seeded.push({
      id: buildEventId('run', baseTs),
      type: 'run',
      ts: baseTs,
      unitId,
      trackId: params.trackId,
      language: params.language,
      passCount,
      total,
      passed,
      runtimeMs,
      exitCode: passed ? 0 : 1,
      errorType: passed ? undefined : 'wrong_answer',
      attemptContextHash: buildAttemptHash({
        unitId,
        trackId: params.trackId,
        passCount,
        total,
        runtimeMs,
      }),
    } satisfies RunAnalyticsEvent)

    if (dayOffset % 2 === 0) {
      seeded.push({
        id: buildEventId('assist', baseTs + 60_000),
        type: 'assist',
        ts: baseTs + 60_000,
        unitId,
        trackId: params.trackId,
        language: params.language,
        action: dayOffset % 3 === 0 ? 'hint' : dayOffset % 3 === 1 ? 'explain' : 'next',
      } satisfies AssistAnalyticsEvent)
    }

    if (dayOffset % 3 !== 0) {
      seeded.push({
        id: buildEventId('submit', baseTs + 120_000),
        type: 'submit',
        ts: baseTs + 120_000,
        unitId,
        trackId: params.trackId,
        language: params.language,
        accepted: true,
        passCount: total,
        total,
        runtimeMs: Math.max(260, runtimeMs - 140),
        exitCode: 0,
      } satisfies SubmitAnalyticsEvent)
    }
  }

  const nextState: AnalyticsState = {
    version: 1,
    updatedAt: now,
    events: seeded.slice(-ANALYTICS_MAX_EVENTS),
  }
  analyticsStateCache = nextState
  saveToStorage(nextState)
  emitAnalyticsUpdate()
  return nextState
}

if (typeof window !== 'undefined') {
  analyticsStateCache = readFromStorage()
}
