type TodayPlanState = {
    date: string
    checks: [boolean, boolean, boolean]
}

type RecommendedNextState = {
    date: string
    problemId: string
}

type SkippedProblemsState = {
    date: string
    problemIds: string[]
}

function getTodayString(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function loadTodayPlan(): TodayPlanState {
    const today = getTodayString()
    try {
        const raw = localStorage.getItem('pebble.todayPlan.v1')
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<TodayPlanState>
            if (parsed.date === today && Array.isArray(parsed.checks) && parsed.checks.length === 3) {
                return parsed as TodayPlanState
            }
        }
    } catch {
        // Ignore parse errors
    }
    return {
        date: today,
        checks: [false, false, false],
    }
}

export function saveTodayPlan(state: TodayPlanState): void {
    try {
        localStorage.setItem('pebble.todayPlan.v1', JSON.stringify(state))
    } catch {
        // Ignore storage errors
    }
}

export function loadRecommendedNext(): RecommendedNextState | null {
    const today = getTodayString()
    try {
        const raw = localStorage.getItem('pebble.recommendedNext.v1')
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<RecommendedNextState>
            if (parsed.date === today && typeof parsed.problemId === 'string') {
                return parsed as RecommendedNextState
            }
        }
    } catch {
        // Ignore parse errors
    }
    return null
}

export function saveRecommendedNext(state: RecommendedNextState): void {
    try {
        localStorage.setItem('pebble.recommendedNext.v1', JSON.stringify(state))
    } catch {
        // Ignore storage errors
    }
}

export function loadSkippedProblems(): SkippedProblemsState {
    const today = getTodayString()
    try {
        const raw = localStorage.getItem('pebble.skippedProblems.v1')
        if (raw) {
            const parsed = JSON.parse(raw) as Partial<SkippedProblemsState>
            if (parsed.date === today && Array.isArray(parsed.problemIds)) {
                return parsed as SkippedProblemsState
            }
        }
    } catch {
        // Ignore parse errors
    }
    return { date: today, problemIds: [] }
}

export function saveSkippedProblems(state: SkippedProblemsState): void {
    try {
        localStorage.setItem('pebble.skippedProblems.v1', JSON.stringify(state))
    } catch {
        // Ignore storage errors
    }
}

export function getRecommendedNext(
    fallbackProblems: readonly { id: string; topics: string[]; difficulty: string }[],
    recentProblemId: string | null,
    isProblemSolved: (id: string) => boolean,
    forceShuffle: boolean = false
): string | null {
    const cached = loadRecommendedNext()
    const skippedState = loadSkippedProblems()

    // Only return cached if it's the same day, we successfully loaded it, we are not forcing a shuffle, 
    // it was not just solved, and it's not in the skipped list.
    if (!forceShuffle && cached && !isProblemSolved(cached.problemId) && !skippedState.problemIds.includes(cached.problemId)) {
        return cached.problemId
    }

    const today = getTodayString()

    // Filter out solved and skipped problems
    let candidatePool = fallbackProblems.filter(p => !isProblemSolved(p.id) && !skippedState.problemIds.includes(p.id))

    if (candidatePool.length === 0) {
        // Run out of problems
        return null
    }
    let chosenId = candidatePool[0]!.id

    if (recentProblemId) {
        const recentProblem = fallbackProblems.find((p) => p.id === recentProblemId)
        if (recentProblem && recentProblem.topics.length > 0) {
            const recentTopics = new Set(recentProblem.topics)
            const sameTopicProblems = candidatePool.filter(
                (p) => p.id !== recentProblemId && p.topics.some((t) => recentTopics.has(t))
            )
            if (sameTopicProblems.length > 0) {
                // Sort by difficulty (easy first)
                const scored = sameTopicProblems.map(p => ({
                    id: p.id,
                    score: p.difficulty === 'EASY' ? 2 : p.difficulty === 'MEDIUM' ? 1 : 0
                })).sort((a, b) => b.score - a.score)

                // Pick top tied score deterministically
                const highestScore = scored[0]!.score
                const topCandidates = scored.filter(s => s.score === highestScore)

                let hash = 0
                for (let i = 0; i < today.length; i++) {
                    hash = (hash << 5) - hash + today.charCodeAt(i)
                }
                if (forceShuffle) {
                    hash += Date.now() // randomize if shuffling physically
                }
                chosenId = topCandidates[Math.abs(hash) % topCandidates.length]!.id
            }
        }
    }

    if (!recentProblemId || chosenId === candidatePool[0]!.id) {
        // Fallback: Pick deterministically from pool
        let hash = 0
        for (let i = 0; i < today.length; i++) {
            hash = (hash << 5) - hash + today.charCodeAt(i)
        }
        if (forceShuffle) {
            hash += Date.now()
        }
        const idx = Math.abs(hash) % candidatePool.length
        chosenId = candidatePool[idx]?.id ?? chosenId
    }

    saveRecommendedNext({ date: today, problemId: chosenId })
    return chosenId
}
