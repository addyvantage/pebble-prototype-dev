export type RecentActivity = {
    problemId: string
    timestamp: number
}

const RECENT_KEY = 'pebble.recent.v1'

let cachedActivity: RecentActivity | null = null
let initialized = false

export function getRecentActivity(): RecentActivity | null {
    if (!initialized) {
        try {
            const raw = localStorage.getItem(RECENT_KEY)
            if (raw) {
                cachedActivity = JSON.parse(raw) as RecentActivity
            }
        } catch {
            cachedActivity = null
        }
        initialized = true
    }
    return cachedActivity
}

export function setRecentActivity(problemId: string) {
    try {
        const data: RecentActivity = { problemId, timestamp: Date.now() }
        localStorage.setItem(RECENT_KEY, JSON.stringify(data))
        cachedActivity = data
    } catch {
        // Ignore
    }
}
