import { useMemo, useSyncExternalStore } from 'react'
import { Card } from '../ui/Card'
import { Activity, Flame, Sparkles } from 'lucide-react'
import { useI18n } from '../../i18n/useI18n'
import { getAnalyticsState, subscribeAnalytics } from '../../lib/analyticsStore'
import { PebbleCalendarHeatmap, type HeatmapDatum, type HeatmapLevel } from './PebbleCalendarHeatmap'

function levelFromCount(count: number): HeatmapLevel {
    if (count <= 0) return 0
    if (count <= 4) return 1
    if (count <= 9) return 2
    return 3
}

export function ProblemContributionsHeatmap() {
    const { t, isRTL } = useI18n()
    const analyticsState = useSyncExternalStore(subscribeAnalytics, getAnalyticsState, getAnalyticsState)
    // dailySolved is the single source of truth: persisted in pebble.analytics.v1,
    // incremented on every run.passed or submit.accepted — same gate as "Today done".
    const dailyMap = analyticsState.dailySolved

    // Generate grid data for the last 365 days
    const { data, totalSolves, maxStreak, maxDayCount, maxDayDate } = useMemo(() => {
        const end = new Date()
        const endLocal = new Date(end.getFullYear(), end.getMonth(), end.getDate())
        const startLocal = new Date(endLocal)
        startLocal.setDate(startLocal.getDate() - 364)

        const newData: HeatmapDatum[] = []
        let runningTotal = 0
        let currentStreak = 0
        let maxStreak = 0
        let maxDayCount = 0
        let maxDayDate: Date | null = null

        for (let i = 0; i < 365; i++) {
            const d = new Date(startLocal)
            d.setDate(startLocal.getDate() + i)
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`

            const count = dailyMap[key] ?? 0

            runningTotal += count
            if (count > 0) {
                currentStreak++
                if (currentStreak > maxStreak) {
                    maxStreak = currentStreak
                }
                if (count > maxDayCount) {
                    maxDayCount = count
                    maxDayDate = new Date(d)
                }
            } else {
                currentStreak = 0
            }

            newData.push({ date: d, count, level: levelFromCount(count) })
        }

        return {
            data: newData,
            totalSolves: runningTotal,
            maxStreak,
            maxDayCount,
            maxDayDate
        }
    }, [dailyMap])

    // Labels
    const title = t('insights.contributions.title')
    const subtitle = t('insights.contributions.subtitle')

    const statTotal = t('insights.contributions.stats.total')
    const statBestStreak = t('insights.contributions.stats.bestStreak')
    const statMostActive = t('insights.contributions.stats.mostActive')
    const statDays = t('insights.contributions.stats.days')
    const statSolves = t('insights.contributions.stats.solves')

    // Fallback simple date string for the most active day
    const mostActiveDateStr = maxDayDate
        ? maxDayDate.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
        : '-'

    return (
        <Card className="grid overflow-hidden bg-pebble-chip-surface/30 xl:grid-cols-[minmax(0,1fr)_280px]">
            {/* Left Side: Heatmap */}
            <div className="min-w-0 p-5 pb-4 lg:p-6">
                <div className="mb-6">
                    <h3 className={`text-base font-semibold text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>
                        {title}
                    </h3>
                    <p className={`text-sm text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
                        {subtitle}
                    </p>
                </div>

                <div className="w-full min-w-0 overflow-x-auto pb-4 scrollbar-hide" dir="ltr">
                    <PebbleCalendarHeatmap
                        data={data}
                        labels={{
                            less: t('insights.contributions.legendLess'),
                            more: t('insights.contributions.legendMore'),
                            solveSingular: t('insights.contributions.stats.solves'),
                            solvePlural: t('insights.contributions.stats.solves'),
                        }}
                    />
                </div>
            </div>

            {/* Right Side: Highlights Panel */}
            <div className="w-full border-t border-pebble-border/25 bg-pebble-canvas/60 p-6 xl:min-w-[280px] xl:border-l xl:border-t-0">
                <div className="flex h-full flex-col justify-center gap-7">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-pebble-text-secondary mb-1">
                        <Activity className="w-4 h-4" />
                        <span className="text-xs font-medium uppercase tracking-wider">{statTotal}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-semibold text-pebble-text-primary tracking-tight">{totalSolves}</span>
                        <span className="text-sm text-pebble-text-muted">{statSolves}</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-pebble-text-secondary mb-1">
                        <Flame className="w-4 h-4 text-orange-500/80" />
                        <span className="text-xs font-medium uppercase tracking-wider">{statBestStreak}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-semibold text-pebble-text-primary tracking-tight">{maxStreak}</span>
                        <span className="text-sm text-pebble-text-muted">{statDays}</span>
                    </div>
                </div>

                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-pebble-text-secondary mb-1">
                        <Sparkles className="w-4 h-4 text-indigo-400" />
                        <span className="text-xs font-medium uppercase tracking-wider">{statMostActive}</span>
                    </div>
                    <div className="flex items-baseline gap-1.5">
                        <span className="text-3xl font-semibold text-pebble-text-primary tracking-tight">{maxDayCount}</span>
                        <span className="text-sm text-pebble-text-muted">{statSolves}</span>
                    </div>
                    <p className="text-xs text-pebble-text-muted mt-1">{mostActiveDateStr}</p>
                </div>
                </div>
            </div>
        </Card>
    )
}
