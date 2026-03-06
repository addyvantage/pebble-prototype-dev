import { loadSolvedProblems, saveSolvedProblems, type SolvedProblemsMap } from './solvedProblemsStore'

export type SolvedRecord = {
  solvedAt: number
  solvedAtISO: string
  attempts: number
}

export function getSolvedMap(): Record<string, SolvedRecord> {
  const solved = loadSolvedProblems()
  const normalized: Record<string, SolvedRecord> = {}
  for (const [problemId, entry] of Object.entries(solved)) {
    const solvedAt = entry?.solvedAt ?? 0
    if (solvedAt <= 0) {
      continue
    }
    normalized[problemId] = {
      solvedAt,
      solvedAtISO: new Date(solvedAt).toISOString(),
      attempts: Math.max(1, entry?.attempts ?? 0),
    }
  }
  return normalized
}

export function isProblemSolved(problemId: string): boolean {
  if (!problemId) return false
  return (loadSolvedProblems()[problemId]?.solvedAt ?? 0) > 0
}

export function markProblemSolved(problemId: string): void {
  if (!problemId) return
  const current = loadSolvedProblems()
  const existing = current[problemId]
  if ((existing?.solvedAt ?? 0) > 0) {
    return
  }

  const solvedAt = Date.now()
  const next: SolvedProblemsMap = {
    ...current,
    [problemId]: {
      solvedAt,
      attempts: Math.max(1, existing?.attempts ?? 0),
    },
  }
  saveSolvedProblems(next)
}

export function clearSolvedMap(): void {
  saveSolvedProblems({})
}
