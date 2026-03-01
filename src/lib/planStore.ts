import type { PlanResponse } from '../api/plan'

export interface PlanState {
    date: string
    plan: PlanResponse | null
    completedTasks: string[]
}

export interface PlanHistory {
    date: string
    completedAny: boolean
    totalEffortScore: number
}

const PLAN_KEY = 'pebble.plan.v1'
const HISTORY_KEY = 'pebble.plan.history.v1'

function getTodayString(): string {
    const now = new Date()
    const year = now.getFullYear()
    const month = String(now.getMonth() + 1).padStart(2, '0')
    const day = String(now.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
}

export function loadDailyPlan(): PlanState {
    const today = getTodayString()
    try {
        const raw = localStorage.getItem(PLAN_KEY)
        if (raw) {
            const parsed = JSON.parse(raw) as PlanState
            if (parsed.date === today) {
                return parsed
            }
        }
    } catch {
        // ignore
    }
    return { date: today, plan: null, completedTasks: [] }
}

export function saveDailyPlan(state: PlanState) {
    try {
        localStorage.setItem(PLAN_KEY, JSON.stringify(state))
    } catch {
        // ignore
    }
}

export function loadPlanHistory(): PlanHistory[] {
    try {
        const raw = localStorage.getItem(HISTORY_KEY)
        if (raw) {
            return JSON.parse(raw) as PlanHistory[]
        }
    } catch { }
    return []
}

export function savePlanHistory(history: PlanHistory[]) {
    try {
        localStorage.setItem(HISTORY_KEY, JSON.stringify(history))
    } catch { }
}

export function toggleTaskDone(taskId: string): PlanState {
    const state = loadDailyPlan()
    if (!state.plan) return state

    if (state.completedTasks.includes(taskId)) {
        state.completedTasks = state.completedTasks.filter((id) => id !== taskId)
    } else {
        state.completedTasks.push(taskId)
    }
    saveDailyPlan(state)
    updateHistoryForToday(state)
    return state
}

function updateHistoryForToday(state: PlanState) {
    const history = loadPlanHistory()
    const today = state.date
    const existingIdx = history.findIndex((h) => h.date === today)

    const completedAny = state.completedTasks.length > 0
    const effort = computeEffortScore(state.plan, state.completedTasks)

    if (existingIdx >= 0) {
        history[existingIdx] = { date: today, completedAny, totalEffortScore: effort }
    } else {
        history.push({ date: today, completedAny, totalEffortScore: effort })
    }
    savePlanHistory(history)
}

export function computeEffortScore(plan: PlanResponse | null, completedTasks: string[]): number {
    if (!plan) return 0
    if (plan.tasks.length === 0) return 0

    let maxEffort = 0
    let achievedEffort = 0

    for (const t of plan.tasks) {
        maxEffort += t.effort
        if (completedTasks.includes(t.id)) {
            achievedEffort += t.effort
        }
    }

    if (maxEffort === 0) return 0

    return Math.round((achievedEffort / maxEffort) * 100)
}

export function computeStreak(): number {
    const history = loadPlanHistory()
    if (history.length === 0) return 0

    // Sort descending by date
    history.sort((a, b) => b.date.localeCompare(a.date))

    let streak = 0

    const todayStr = getTodayString()
    const todayHist = history.find((h) => h.date === todayStr)

    if (todayHist && todayHist.completedAny) {
        streak = 1
    }

    for (let i = 1; i <= history.length; i++) {
        const pastDate = new Date()
        pastDate.setDate(pastDate.getDate() - i)
        const year = pastDate.getFullYear()
        const month = String(pastDate.getMonth() + 1).padStart(2, '0')
        const day = String(pastDate.getDate()).padStart(2, '0')
        const dateStr = `${year}-${month}-${day}`

        const hist = history.find((h) => h.date === dateStr)
        if (hist && hist.completedAny) {
            if (streak === 0 && i === 1) {
                streak = 1
            } else if (streak > 0) {
                streak++
            }
        } else {
            break
        }
    }

    return streak
}
