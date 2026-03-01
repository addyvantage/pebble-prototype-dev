// stopwatchStore.ts — Lightweight localStorage persistence for per-session stopwatch state.

export interface StopwatchState {
    elapsedMs: number
    isRunning: boolean
    lastStartEpochMs: number | null // epoch when last started, for drift-free elapsed calculation
    updatedAt: number
}

const DEFAULT_STATE: StopwatchState = {
    elapsedMs: 0,
    isRunning: false,
    lastStartEpochMs: null,
    updatedAt: Date.now(),
}

export function makeStopwatchKey(id: string): string {
    return `pebble.stopwatch.v1:${id}`
}

export function loadStopwatch(key: string): StopwatchState {
    try {
        const raw = localStorage.getItem(key)
        if (!raw) return { ...DEFAULT_STATE }
        const parsed = JSON.parse(raw) as StopwatchState
        // If it was running when saved, compute elapsed since lastStartEpochMs
        if (parsed.isRunning && parsed.lastStartEpochMs) {
            const extra = Date.now() - parsed.lastStartEpochMs
            return { ...parsed, elapsedMs: parsed.elapsedMs + extra, lastStartEpochMs: Date.now() }
        }
        return parsed
    } catch {
        return { ...DEFAULT_STATE }
    }
}

export function saveStopwatch(key: string, state: StopwatchState): void {
    try {
        localStorage.setItem(key, JSON.stringify({ ...state, updatedAt: Date.now() }))
    } catch {
        // localStorage may be unavailable — fail silently
    }
}
