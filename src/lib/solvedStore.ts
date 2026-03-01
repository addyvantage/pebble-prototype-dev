type SolvedRecord = {
    solvedAtISO: string
}

const SOLVED_KEY = 'pebble.solvedProblems.v1'

export function getSolvedMap(): Record<string, SolvedRecord> {
    try {
        const raw = localStorage.getItem(SOLVED_KEY)
        if (raw) {
            return JSON.parse(raw) as Record<string, SolvedRecord>
        }
    } catch {
        // Ignore parse errors, return empty map
    }
    return {}
}

export function isProblemSolved(problemId: string): boolean {
    if (!problemId) return false
    const map = getSolvedMap()
    return Boolean(map[problemId])
}

export function markProblemSolved(problemId: string): void {
    if (!problemId) return
    const map = getSolvedMap()
    if (!map[problemId]) {
        map[problemId] = {
            solvedAtISO: new Date().toISOString(),
        }
        try {
            localStorage.setItem(SOLVED_KEY, JSON.stringify(map))
        } catch {
            // Ignore storage errors on quota hit
        }
    }
}

export function clearSolvedMap(): void {
    localStorage.removeItem(SOLVED_KEY)
}
