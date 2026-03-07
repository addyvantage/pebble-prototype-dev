import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import {
  Activity,
  Brain,
  Compass,
  Flame,
  Gauge,
  HandHelping,
  Sparkles,
  Target,
  Timer,
  Workflow,
} from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { KpiCard } from '../components/insights/KpiCard'
import { HexRadar } from '../components/insights/HexRadar'
import { IssueBars } from '../components/insights/IssueBars'
import { GrowthLedger } from '../components/insights/GrowthLedger'
import { NextTasks } from '../components/insights/NextTasks'
import { StreakCalendar } from '../components/insights/StreakCalendar'
import { ProblemContributionsHeatmap } from '../components/insights/ProblemContributionsHeatmap'
import { StreakRiskWidget } from '../components/insights/StreakRiskWidget'
import { WeeklyRecapWidget } from '../components/insights/WeeklyRecapWidget'
import { getPebbleUserState } from '../utils/pebbleUserState'
import { useI18n } from '../i18n/useI18n'
import { loadCurriculumPath, type CurriculumUnit } from '../content/pathLoader'
import { getLocalizedUnitCopy } from '../i18n/unitContent'
import {
  getAnalyticsState,
  subscribeAnalytics,
} from '../lib/analyticsStore'
import {
  dateKeyForTimeZone,
  deriveInsights,
  selectCurrentStreak,
  selectDailyCompletions,
  selectLongestStreak,
} from '../lib/analyticsDerivers'
import { loadUnitProgress } from '../lib/progressStore'
import { apiFetch, optionalApiRoutesAvailable } from '../lib/apiUrl'
import { loadSubmissions } from '../lib/submissionsStore'
import { useLiveMentalState } from '../lib/useLiveMentalState'
import type { PlacementLanguage } from '../data/onboardingData'

type CohortData = {
  avgRecoveryTime: Record<string, number>
  autonomyRate: Record<string, number>
  breakpointsPerCohort: Record<string, number>
}

const RADAR_AXIS_ORDER = [
  'speed',
  'accuracy',
  'consistency',
  'autonomy',
  'debugging',
  'complexity',
] as const

export function DashboardPage() {
  const { t, lang, isRTL } = useI18n()
  const proseClass = isRTL ? 'rtlText' : ''
  const [units, setUnits] = useState<CurriculumUnit[]>([])
  const [unitsLoading, setUnitsLoading] = useState(true)
  const [nowTick, setNowTick] = useState(() => Date.now())

  const analyticsState = useSyncExternalStore(subscribeAnalytics, getAnalyticsState, getAnalyticsState)
  const pebbleState = useMemo(() => getPebbleUserState(), [analyticsState.updatedAt])
  const selectedLanguage: PlacementLanguage = useMemo(() => {
    return (
      pebbleState.curriculum?.selectedLanguage ??
      pebbleState.placement?.language ??
      pebbleState.onboarding?.language ??
      'python'
    )
  }, [pebbleState])
  useEffect(() => {
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    let mounted = true
    setUnitsLoading(true)
    void loadCurriculumPath(selectedLanguage)
      .then((rows) => {
        if (!mounted) {
          return
        }
        setUnits(rows)
      })
      .catch(() => {
        if (!mounted) {
          return
        }
        setUnits([])
      })
      .finally(() => {
        if (mounted) {
          setUnitsLoading(false)
        }
      })

    return () => {
      mounted = false
    }
  }, [selectedLanguage])

  const unitProgress = useMemo(() => loadUnitProgress(), [analyticsState.updatedAt])
  const submissions = useMemo(() => loadSubmissions(), [analyticsState.updatedAt])
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const dailyCompletions = useMemo(
    () => selectDailyCompletions(analyticsState.events, timeZone),
    [analyticsState.events, timeZone],
  )
  const todayKey = useMemo(() => dateKeyForTimeZone(nowTick, timeZone), [nowTick, timeZone])
  const streakStats = useMemo(
    () => selectCurrentStreak(dailyCompletions, todayKey),
    [dailyCompletions, todayKey],
  )
  const longestStreak = useMemo(() => selectLongestStreak(dailyCompletions), [dailyCompletions])

  const derived = useMemo(
    () =>
      deriveInsights({
        events: analyticsState.events,
        unitProgress,
        submissionsByUnit: submissions,
        units,
      }),
    [analyticsState.events, submissions, unitProgress, units],
  )

  const hasLiveData = analyticsState.events.some((event) => event.type === 'run' || event.type === 'submit')

  // ── Phase 5: Cohort Analytics ──────────────────────────────────────────────
  const [cohortData, setCohortData] = useState<CohortData | null>(null)
  useEffect(() => {
    if (!optionalApiRoutesAvailable()) {
      return
    }
    let mounted = true
    apiFetch('/api/analytics/cohort')
      .then(async (r) => {
        if (!r.ok) {
          return null
        }
        return r.json() as Promise<{ ok?: boolean; data?: CohortData }>
      })
      .then(d => {
        if (mounted && d?.ok && d.data) setCohortData(d.data as CohortData)
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  // ── Phase 4: Live Mental Presence ─────────────────────────────────────────
  // We subscribe to 'anonymous' to match the offline fallback default user.
  const { connected: liveConnected, latestUpdate } = useLiveMentalState('anonymous')

  // Overlay state that merges live deltas/absolutes over the synchronous derived state
  const [liveKpis, setLiveKpis] = useState(derived.kpis)

  useEffect(() => {
    setLiveKpis(derived.kpis)
  }, [derived.kpis])

  useEffect(() => {
    if (latestUpdate) {
      setLiveKpis(prev => ({
        ...prev,
        recoveryEffectiveness: latestUpdate.recoveryEffectiveness ?? prev.recoveryEffectiveness,
        avgRecoveryTimeSec: latestUpdate.timeToRecover ?? prev.avgRecoveryTimeSec,
        breakpointsWeek: prev.breakpointsWeek + (latestUpdate.breakpointIncrement ?? 0),
        guidanceReliancePct: Math.max(0, Math.min(100, prev.guidanceReliancePct + (latestUpdate.guidanceRelianceDelta ?? 0))),
        autonomyRatePct: Math.max(0, Math.min(100, prev.autonomyRatePct + (latestUpdate.autonomyDelta ?? 0))),
        streakDays: prev.streakDays + (latestUpdate.streakDelta ?? 0),
      }))
    }
  }, [latestUpdate])

  const localizedUnitTitles = useMemo(() => {
    const map: Record<string, string> = {}
    for (const unit of units) {
      map[unit.id] = getLocalizedUnitCopy(unit, lang).title
    }
    return map
  }, [lang, units])

  const axisLabels = useMemo(
    () => ({
      speed: t('insights.axis.speed'),
      accuracy: t('insights.axis.accuracy'),
      consistency: t('insights.axis.consistency'),
      autonomy: t('insights.axis.autonomy'),
      debugging: t('insights.axis.debugging'),
      complexity: t('insights.axis.complexity'),
    }),
    [t],
  )

  const issueLabels = useMemo(
    () => ({
      syntax_error: t('insights.issue.syntax'),
      runtime_error: t('insights.issue.runtime'),
      wrong_answer: t('insights.issue.logic'),
      time_limit: t('insights.issue.timeLimit'),
      api_failure: t('insights.issue.api'),
    }),
    [t],
  )

  return (
    <section className="page-enter space-y-3 pb-2">
      <Card padding="sm" interactive className="space-y-2.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Badge>{t('insights.hero.chipGrowth')}</Badge>
          <div className="flex items-center gap-2">
            {cohortData && (
              <Badge className="animate-pulse bg-emerald-500/15 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                <Sparkles className="mr-1 inline-block h-3 w-3" />
                {t('insights.live.dataSource')}
              </Badge>
            )}
            <Badge variant="neutral">{t('insights.hero.chipLast7')}</Badge>
            {liveConnected ? (
              <Badge className="animate-pulse bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-400">
                <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-emerald-700 dark:bg-emerald-400" />
                {t('insights.live.label')}
              </Badge>
            ) : (
              <Badge variant={hasLiveData ? 'success' : 'neutral'}>{t('insights.hero.chipLive')}</Badge>
            )}
          </div>
        </div>
        <h1 className={`text-3xl font-semibold tracking-[-0.02em] text-pebble-text-primary ${proseClass}`}>
          {t('insights.hero.title')}
        </h1>
        <p className={`max-w-3xl text-sm text-pebble-text-secondary sm:text-base ${proseClass}`}>
          {t('insights.hero.subtitle')}
        </p>
      </Card>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        <KpiCard
          title={t('insights.kpi.recoveryEffectiveness')}
          value={liveKpis.recoveryEffectiveness}
          suffix="/100"
          icon={Sparkles}
        />
        <KpiCard
          title={t('insights.kpi.avgRecoveryTime')}
          value={cohortData?.avgRecoveryTime?.['Medium'] ?? liveKpis.avgRecoveryTimeSec}
          suffix={t('insights.units.sec')}
          icon={Timer}
        />
        <KpiCard
          title={t('insights.kpi.breakpoints')}
          value={cohortData?.breakpointsPerCohort?.['Intermediate'] ?? liveKpis.breakpointsWeek}
          icon={Workflow}
        />
        <KpiCard
          title={t('insights.kpi.guidanceReliance')}
          value={liveKpis.guidanceReliancePct}
          suffix="%"
          icon={HandHelping}
        />
        <KpiCard
          title={t('insights.kpi.autonomyRate')}
          value={cohortData?.autonomyRate?.[selectedLanguage] ?? liveKpis.autonomyRatePct}
          suffix="%"
          icon={Compass}
        />
        <KpiCard
          title={t('insights.kpi.streak')}
          value={liveKpis.streakDays}
          suffix={t('insights.units.days')}
          icon={Flame}
        />
      </div>

      {/* Row 1: Skill shape + Streak calendar */}
      <div className="grid w-full grid-cols-1 gap-4 lg:grid-cols-[1fr_520px] lg:items-end">
        <Card
          padding="sm"
          interactive
          className="flex flex-col gap-3"
        >
          <div className="mr-auto w-full max-w-[460px] text-center">
            <p className={`text-base font-semibold text-pebble-text-primary ${proseClass}`}>
              {t('insights.radar.title')}
            </p>
            <p className={`text-sm text-pebble-text-secondary ${proseClass}`}>{t('insights.radar.subtitle')}</p>
          </div>
          <div className="relative mr-auto flex aspect-square w-full max-w-[460px] items-center justify-center rounded-xl border border-pebble-border/30 bg-pebble-chip-surface/50 p-3 pb-10">
            <HexRadar
              current={derived.radarCurrent}
              previous={derived.radarPrevious}
              axisOrder={[...RADAR_AXIS_ORDER]}
              axisLabels={axisLabels}
              className="h-full w-full"
            />
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-4 text-xs text-pebble-text-secondary whitespace-nowrap">
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-pebble-text-primary/65" />
                {t('insights.radar.current')}
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-pebble-accent/40" />
                {t('insights.radar.previous')}
              </span>
            </div>
          </div>
        </Card>

        <Card padding="sm" interactive className="flex flex-col">
          <StreakCalendar
            dailyMap={dailyCompletions}
            streak={streakStats.streak}
            longest={longestStreak.longest}
            isTodayComplete={streakStats.isTodayComplete}
            timeZone={timeZone}
          />
        </Card>
      </div>

      {/* Row 2: Issue profile + Next actions */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <Card padding="sm" interactive className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className={`text-base font-semibold text-pebble-text-primary ${proseClass}`}>
                {t('insights.issue.title')}
              </p>
              <p className={`text-sm text-pebble-text-secondary ${proseClass}`}>{t('insights.issue.subtitle')}</p>
            </div>
            <Brain className="h-4 w-4 text-pebble-text-secondary" aria-hidden="true" />
          </div>
          <IssueBars rows={derived.issueProfile} labels={issueLabels} />
        </Card>

        <Card padding="sm" interactive className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className={`text-base font-semibold text-pebble-text-primary ${proseClass}`}>
                {t('insights.next.title')}
              </p>
              <p className={`text-sm text-pebble-text-secondary ${proseClass}`}>{t('insights.next.subtitle')}</p>
            </div>
            <Target className="h-4 w-4 text-pebble-text-secondary" aria-hidden="true" />
          </div>
          <NextTasks
            items={derived.nextActions}
            titleByUnitId={localizedUnitTitles}
            labels={{
              empty: t('insights.next.empty'),
              continueAction: t('insights.next.continueUnit'),
              syntaxAction: t('insights.next.focusSyntax'),
              debugAction: t('insights.next.focusDebugging'),
              complexityAction: t('insights.next.raiseComplexity'),
              streakAction: t('insights.next.maintainStreak'),
              continueCta: t('insights.next.continueCta'),
            }}
          />
        </Card>
      </div>

      <div className="grid gap-3 xl:grid-cols-12">
        <div className="xl:col-span-12">
          <ProblemContributionsHeatmap />
        </div>
      </div>

      <Card padding="sm" interactive className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className={`text-base font-semibold text-pebble-text-primary ${proseClass}`}>{t('insights.ledger.title')}</p>
            <p className={`text-sm text-pebble-text-secondary ${proseClass}`}>{t('insights.ledger.subtitle')}</p>
          </div>
          <Gauge className="h-4 w-4 text-pebble-text-secondary" aria-hidden="true" />
        </div>
        <GrowthLedger
          rows={derived.growthLedger}
          unitLabelById={localizedUnitTitles}
          labels={{
            timestamp: t('insights.ledger.timestamp'),
            note: t('insights.ledger.note'),
            impact: t('insights.ledger.impact'),
            status: t('insights.ledger.status'),
            empty: t('insights.empty.description'),
            noteBreakthrough: t('insights.ledger.noteBreakthrough'),
            noteStability: t('insights.ledger.noteStability'),
            noteAutonomy: t('insights.ledger.noteAutonomy'),
          }}
          statusLabels={{
            breakthrough: t('insights.ledger.statusBreakthrough'),
            stability: t('insights.ledger.statusStability'),
            autonomy: t('insights.ledger.statusAutonomy'),
          }}
        />
      </Card>

      {/* Phase 9: Premium AWS Demo — SageMaker Risk + Polly Recap */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <StreakRiskWidget />
        <WeeklyRecapWidget trackLanguage={selectedLanguage} />
      </div>

      {!hasLiveData && !unitsLoading ? (
        <Card padding="sm" interactive className="space-y-3 text-center">
          <Activity className="mx-auto h-5 w-5 text-pebble-text-secondary" aria-hidden="true" />
          <p className="text-base font-semibold text-pebble-text-primary">{t('insights.empty.title')}</p>
          <p className="text-sm text-pebble-text-secondary">{t('insights.empty.description')}</p>
        </Card>
      ) : null}
    </section>
  )
}
