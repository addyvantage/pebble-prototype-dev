import { safeGetJSON, safeSetJSON } from './safeStorage'

const SOLVED_PROBLEMS_STORAGE_KEY = 'pebble.solvedProblems.v1'
const SOLVED_PROBLEMS_EVENT = 'pebble:solved-problems-updated'
const MAX_SOLVED_ENTRIES = 500

export type SolvedProblemEntry = {
  solvedAt: number
  attempts: number
}

export type SolvedProblemsMap = Record<string, SolvedProblemEntry>

let solvedProblemsCache: SolvedProblemsMap = {}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function emitUpdate() {
  if (typeof window === 'undefined') {
    return
  }
  window.dispatchEvent(new CustomEvent(SOLVED_PROBLEMS_EVENT))
}

function compactSolvedMap(map: SolvedProblemsMap) {
  const rows = Object.entries(map).sort(
    (left, right) => (right[1]?.solvedAt ?? 0) - (left[1]?.solvedAt ?? 0),
  )
  return Object.fromEntries(rows.slice(0, MAX_SOLVED_ENTRIES)) as SolvedProblemsMap
}

export function loadSolvedProblems(): SolvedProblemsMap {
  return solvedProblemsCache
}

function readSolvedProblemsFromStorage(): SolvedProblemsMap {
  const parsed = safeGetJSON<unknown>(SOLVED_PROBLEMS_STORAGE_KEY, null)
  if (!isRecord(parsed)) {
    return {}
  }

  const next: SolvedProblemsMap = {}
  for (const [problemId, value] of Object.entries(parsed)) {
    if (!isRecord(value)) {
      continue
    }
    const legacySolvedAtISO = typeof value.solvedAtISO === 'string' ? Date.parse(value.solvedAtISO) : NaN
    const solvedAt = typeof value.solvedAt === 'number'
      ? value.solvedAt
      : Number.isFinite(legacySolvedAtISO)
        ? legacySolvedAtISO
        : 0
    const attempts = typeof value.attempts === 'number' ? value.attempts : 0
    if (attempts <= 0 && solvedAt <= 0) {
      continue
    }
    next[problemId] = {
      solvedAt,
      attempts: Math.max(1, attempts || (solvedAt > 0 ? 1 : 0)),
    }
  }

  return compactSolvedMap(next)
}

function saveSolvedProblemsToStorage(map: SolvedProblemsMap) {
  if (!safeSetJSON(SOLVED_PROBLEMS_STORAGE_KEY, map, { maxBytes: 40 * 1024, silent: true })) {
    const lighter = Object.fromEntries(Object.entries(map).slice(0, 240)) as SolvedProblemsMap
    safeSetJSON(SOLVED_PROBLEMS_STORAGE_KEY, lighter, { maxBytes: 20 * 1024, silent: true })
  }
}

export function saveSolvedProblems(map: SolvedProblemsMap) {
  solvedProblemsCache = compactSolvedMap(map)
  saveSolvedProblemsToStorage(solvedProblemsCache)
  emitUpdate()
}

export function markProblemAttempt(problemId: string, solved: boolean) {
  const current = loadSolvedProblems()
  const existing = current[problemId]
  const next: SolvedProblemsMap = {
    ...current,
    [problemId]: {
      solvedAt: solved ? Date.now() : existing?.solvedAt ?? 0,
      attempts: (existing?.attempts ?? 0) + 1,
    },
  }

  saveSolvedProblems(next)
  return next[problemId]
}

export function subscribeSolvedProblems(listener: () => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const onSolvedProblemsUpdate = () => {
    listener()
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key && event.key !== SOLVED_PROBLEMS_STORAGE_KEY) {
      return
    }
    solvedProblemsCache = readSolvedProblemsFromStorage()
    listener()
  }

  window.addEventListener(SOLVED_PROBLEMS_EVENT, onSolvedProblemsUpdate)
  window.addEventListener('storage', onStorage)

  return () => {
    window.removeEventListener(SOLVED_PROBLEMS_EVENT, onSolvedProblemsUpdate)
    window.removeEventListener('storage', onStorage)
  }
}

if (typeof window !== 'undefined') {
  solvedProblemsCache = readSolvedProblemsFromStorage()
}
