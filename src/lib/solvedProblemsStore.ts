const SOLVED_PROBLEMS_STORAGE_KEY = 'pebble.solvedProblems.v1'
const SOLVED_PROBLEMS_EVENT = 'pebble:solved-problems-updated'

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

export function loadSolvedProblems(): SolvedProblemsMap {
  return solvedProblemsCache
}

function readSolvedProblemsFromStorage(): SolvedProblemsMap {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(SOLVED_PROBLEMS_STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as unknown
    if (!isRecord(parsed)) {
      return {}
    }

    const next: SolvedProblemsMap = {}
    for (const [problemId, value] of Object.entries(parsed)) {
      if (!isRecord(value)) {
        continue
      }
      const solvedAt = typeof value.solvedAt === 'number' ? value.solvedAt : 0
      const attempts = typeof value.attempts === 'number' ? value.attempts : 0
      if (attempts <= 0 && solvedAt <= 0) {
        continue
      }
      next[problemId] = {
        solvedAt,
        attempts: Math.max(1, attempts || (solvedAt > 0 ? 1 : 0)),
      }
    }

    return next
  } catch {
    return {}
  }
}

export function saveSolvedProblems(map: SolvedProblemsMap) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SOLVED_PROBLEMS_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Ignore quota errors in prototype mode.
  }

  solvedProblemsCache = { ...map }
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
