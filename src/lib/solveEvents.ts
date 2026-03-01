import { safeGetJSON, safeSetJSON } from './safeStorage'

const SOLVED_EVENTS_KEY = 'pebble.solveEvents.v1'
const MAX_EVENTS = 1000

export type SolveEvent = {
    ts: number
    problemId: string
    verdict: 'accepted' | 'rejected' | 'partial'
}

type SolveEventsState = {
    version: 1
    events: SolveEvent[]
}

const EMPTY_STATE: SolveEventsState = {
    version: 1,
    events: [],
}

function readEvents(): SolveEventsState {
    const parsed = safeGetJSON<unknown>(SOLVED_EVENTS_KEY, null)
    if (!parsed || typeof parsed !== 'object') {
        return EMPTY_STATE
    }

    const state = parsed as Record<string, unknown>
    if (state.version !== 1 || !Array.isArray(state.events)) {
        return EMPTY_STATE
    }

    return {
        version: 1,
        events: state.events as SolveEvent[],
    }
}

function writeEvents(state: SolveEventsState) {
    safeSetJSON(SOLVED_EVENTS_KEY, state, { silent: true })
}

export function logSolveEvent(event: Omit<SolveEvent, 'ts'>) {
    if (typeof window === 'undefined') return

    // We only care about Accepted results for the GitHub-style contribution graph
    if (event.verdict !== 'accepted') return

    const state = readEvents()

    // Add new event
    state.events.push({
        ...event,
        ts: Date.now()
    })

    // Trim if it gets too large
    if (state.events.length > MAX_EVENTS) {
        state.events = state.events.slice(-MAX_EVENTS)
    }

    writeEvents(state)

    // Dispatch an event so the heatmap can update dynamically
    window.dispatchEvent(new CustomEvent('pebble:solve-events-updated'))
}

/**
 * Returns a map of YYYY-MM-DD -> total_problem_count linearly.
 */
export function getContributionsMap(): Record<string, number> {
    const state = readEvents()

    const dailyCounts: Record<string, number> = {}

    for (const event of state.events) {
        if (event.verdict !== 'accepted') continue

        // Using local date formatting strictly
        const date = new Date(event.ts)
        const year = date.getFullYear()
        const month = String(date.getMonth() + 1).padStart(2, '0')
        const day = String(date.getDate()).padStart(2, '0')
        const dateKey = `${year}-${month}-${day}`

        // Accrue raw sums
        dailyCounts[dateKey] = (dailyCounts[dateKey] ?? 0) + 1
    }

    return dailyCounts
}
