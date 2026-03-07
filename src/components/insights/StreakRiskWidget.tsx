/**
 * Phase 9: Streak Risk Widget
 *
 * Displays a SageMaker-powered (or local heuristic) risk score for the user's
 * streak. Computes features from local analytics events and sends them to the
 * backend /api/risk/* endpoints.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { AlertTriangle, RefreshCw, ShieldCheck, TrendingUp } from 'lucide-react'
import { Card } from '../ui/Card'
import { getAnalyticsState, subscribeAnalytics } from '../../lib/analyticsStore'
import {
  dateKeyForTimeZone,
  selectCurrentStreak,
  selectDailyCompletions,
} from '../../lib/analyticsDerivers'
import type { AnalyticsEvent, AssistAnalyticsEvent, RunAnalyticsEvent, SubmitAnalyticsEvent } from '../../lib/analyticsStore'
import { apiFetch, optionalApiRoutesAvailable } from '../../lib/apiUrl'
import { localHeuristicRisk, type RiskFeatures, type RiskLabel, type RiskResult } from '../../lib/riskModel'
import { useI18n } from '../../i18n/useI18n'
import { getProductCopy } from '../../i18n/productCopy'

type RiskData = RiskResult & {
  computedAt: string
  weekStart?: string
}

// ── Feature extraction from local analytics ──────────────────────────────────

const DAY_MS = 24 * 60 * 60 * 1000

function isSuccess(e: RunAnalyticsEvent | SubmitAnalyticsEvent) {
  return e.type === 'run' ? e.passed : e.accepted
}

function extractRiskFeatures(events: AnalyticsEvent[]): RiskFeatures {
  const now = Date.now()
  const last7Start = now - 7 * DAY_MS
  const last14Start = now - 14 * DAY_MS

  const attempts = events.filter(
    (e): e is RunAnalyticsEvent | SubmitAnalyticsEvent =>
      (e.type === 'run' || e.type === 'submit') && e.ts >= last7Start,
  )
  const assists = events.filter(
    (e): e is AssistAnalyticsEvent => e.type === 'assist' && e.ts >= last7Start,
  )

  const solvesLast7 = attempts.filter(
    (e) => e.type === 'submit' && (e as SubmitAnalyticsEvent).accepted,
  ).length

  // Days with at least one completion
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  const dailyMap = selectDailyCompletions(events, tz)
  const todayKey = dateKeyForTimeZone(now, tz)
  const streakDays = selectCurrentStreak(dailyMap, todayKey).streak

  const activeDaySet = new Set<string>()
  for (const e of attempts) {
    activeDaySet.add(dateKeyForTimeZone(e.ts, tz))
  }
  const daysActiveLast7 = activeDaySet.size

  // Guidance reliance
  const guidanceRelianceLast7 = attempts.length > 0
    ? assists.length / attempts.length
    : 0

  // Breakpoints (3+ consecutive failures)
  let streak = 0
  let breakpoints = 0
  for (const e of [...attempts].sort((a, b) => a.ts - b.ts)) {
    if (isSuccess(e)) {
      if (streak >= 3) breakpoints++
      streak = 0
    } else {
      streak++
    }
  }

  // Avg recovery time (ms from first fail to success on same problem)
  let totalRecoveryMs = 0
  let recoveryCount = 0
  const pendingByUnit = new Map<string, number>()
  for (const e of [...attempts].sort((a, b) => a.ts - b.ts)) {
    if (!isSuccess(e)) {
      if (!pendingByUnit.has(e.unitId)) pendingByUnit.set(e.unitId, e.ts)
    } else {
      const startTs = pendingByUnit.get(e.unitId)
      if (startTs !== undefined) {
        totalRecoveryMs += e.ts - startTs
        recoveryCount++
        pendingByUnit.delete(e.unitId)
      }
    }
  }
  const avgRecoveryTimeMsLast7 = recoveryCount > 0 ? totalRecoveryMs / recoveryCount : 0

  // Late night sessions (22:00–04:00)
  const lateNightSessionsLast7 = attempts.filter((e) => {
    const h = new Date(e.ts).getHours()
    return h >= 22 || h < 4
  }).length

  // Trend: compare pass rate last 7 vs previous 7
  const prev7Attempts = events.filter(
    (e): e is RunAnalyticsEvent | SubmitAnalyticsEvent =>
      (e.type === 'run' || e.type === 'submit') &&
      e.ts >= last14Start && e.ts < last7Start,
  )
  const last7PassRate = attempts.length > 0
    ? attempts.filter(isSuccess).length / attempts.length
    : 0
  const prev7PassRate = prev7Attempts.length > 0
    ? prev7Attempts.filter(isSuccess).length / prev7Attempts.length
    : last7PassRate

  const diff = last7PassRate - prev7PassRate
  const trendDirection =
    diff > 0.08 ? 'improving' : diff < -0.08 ? 'worsening' : 'stable'

  return {
    streakDays,
    daysActiveLast7,
    avgRecoveryTimeMsLast7,
    guidanceRelianceLast7: Math.min(1, guidanceRelianceLast7),
    autonomyRateLast7: Math.max(0, 1 - guidanceRelianceLast7),
    breakpointsLast7: breakpoints,
    solvesLast7,
    lateNightSessionsLast7,
    trendDirection,
  }
}

// ── Risk score pill (styles only — labels are localized inside the component) ──

const LABEL_STYLES: Record<RiskLabel, { bg: string; text: string }> = {
  low: { bg: 'bg-emerald-500/15 border-emerald-500/30', text: 'text-emerald-700 dark:text-emerald-400' },
  medium: { bg: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-700 dark:text-amber-400' },
  high: { bg: 'bg-red-500/15 border-red-500/30', text: 'text-red-700 dark:text-red-400' },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function StreakRiskWidget() {
  const { lang } = useI18n()
  const riskCopy = getProductCopy(lang).insights?.streakRisk ?? {}
  const analyticsState = useSyncExternalStore(subscribeAnalytics, getAnalyticsState, getAnalyticsState)
  const [riskData, setRiskData] = useState<RiskData | null>(null)
  const [loading, setLoading] = useState(true)
  const [recomputing, setRecomputing] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const optionalRoutesEnabled = optionalApiRoutesAvailable()

  const features = useMemo(
    () => extractRiskFeatures(analyticsState.events),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [analyticsState.updatedAt],
  )

  const userId = 'anonymous' // matches offline dev default

  // Fetch current stored result on mount; auto-recompute if none exists
  useEffect(() => {
    mountedRef.current = true
    setLoading(true)
    if (!optionalRoutesEnabled) {
      setRiskData(localHeuristicRisk(features))
      setErrorMsg(null)
      setLoading(false)
      return () => { mountedRef.current = false }
    }
    apiFetch('/api/risk/current', { headers: { 'x-user-id': userId } })
      .then(async (r) => {
        if (!r.ok) {
          throw new Error(`risk_current_unavailable_${r.status}`)
        }
        return r.json() as Promise<{ ok: boolean; data: RiskData | null }>
      })
      .then((d) => {
        if (!mountedRef.current) return
        if (d.ok && d.data) {
          setRiskData(d.data)
          setLoading(false)
        } else {
          // No stored result — auto-compute on first load
          // Capture current features snapshot to avoid stale closure
          const currentFeatures = features
          setRecomputing(true)
          apiFetch('/api/risk/recompute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
            body: JSON.stringify({ features: currentFeatures }),
          })
            .then(async (r2) => {
              if (!r2.ok) {
                throw new Error(`risk_recompute_unavailable_${r2.status}`)
              }
              return r2.json() as Promise<{ ok: boolean; data: RiskData }>
            })
            .then((d2) => {
              if (mountedRef.current && d2.ok && d2.data) setRiskData(d2.data)
            })
            .catch(() => {
              if (mountedRef.current) {
                setRiskData(localHeuristicRisk(currentFeatures))
                setErrorMsg(null)
              }
            })
            .finally(() => {
              if (mountedRef.current) { setRecomputing(false); setLoading(false) }
            })
        }
      })
      .catch(() => {
        if (mountedRef.current) {
          setRiskData(localHeuristicRisk(features))
          setLoading(false)
          setErrorMsg(null)
        }
      })
    return () => { mountedRef.current = false }
    // Run once on mount only — features are snapshotted inside
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleRecompute = useCallback(async () => {
    setRecomputing(true)
    setErrorMsg(null)
    try {
      if (!optionalRoutesEnabled) {
        setRiskData(localHeuristicRisk(features))
        return
      }
      const res = await apiFetch('/api/risk/recompute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId },
        body: JSON.stringify({ features }),
      })
      if (!res.ok) throw new Error(`Server error ${res.status}`)
      const d = await res.json() as { ok: boolean; data: RiskData }
      if (mountedRef.current && d.ok && d.data) setRiskData(d.data)
      else if (mountedRef.current) setRiskData(localHeuristicRisk(features))
    } catch {
      if (mountedRef.current) {
        setRiskData(localHeuristicRisk(features))
        setErrorMsg(null)
      }
    } finally {
      if (mountedRef.current) { setRecomputing(false); setLoading(false) }
    }
  }, [features, optionalRoutesEnabled, userId])

  const LABEL_CONFIG: Record<RiskLabel, { bg: string; text: string; label: string }> = {
    low: { ...LABEL_STYLES.low, label: riskCopy.low ?? 'Low Risk' },
    medium: { ...LABEL_STYLES.medium, label: riskCopy.medium ?? 'Medium Risk' },
    high: { ...LABEL_STYLES.high, label: riskCopy.high ?? 'High Risk' },
  }

  const cfg = riskData ? LABEL_CONFIG[riskData.label] : null

  const LabelIcon =
    riskData?.label === 'high'
      ? AlertTriangle
      : riskData?.label === 'medium'
        ? TrendingUp
        : ShieldCheck

  return (
    <Card padding="sm" interactive className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-base font-semibold text-pebble-text-primary">{riskCopy.title ?? 'Streak Risk'}</p>
          <p className="text-sm text-pebble-text-secondary">
            {riskData?.model === 'sagemaker' ? (riskCopy.subtitleCloud ?? 'SageMaker · 7-day forecast') : (riskCopy.subtitleLocal ?? '7-day forecast')}
          </p>
        </div>
        <button
          onClick={handleRecompute}
          disabled={recomputing || loading}
          className="flex items-center gap-1.5 rounded-lg border border-pebble-border/40 bg-pebble-chip-surface/60 px-2.5 py-1 text-xs font-medium text-pebble-text-secondary transition hover:border-pebble-border hover:text-pebble-text-primary disabled:opacity-40"
          title={riskCopy.recomputeTitle ?? 'Recompute risk score'}
        >
          <RefreshCw className={`h-3 w-3 ${recomputing ? 'animate-spin' : ''}`} />
          {recomputing ? (riskCopy.computing ?? 'Computing…') : (riskCopy.recompute ?? 'Recompute')}
        </button>
      </div>

      {loading && !riskData ? (
        <div className="flex items-center gap-2 text-sm text-pebble-text-secondary">
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
          {riskCopy.computingBody ?? 'Computing risk score…'}
        </div>
      ) : riskData && cfg ? (
        <>
          {/* Score pill */}
          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-semibold ${cfg.bg} ${cfg.text}`}
            >
              <LabelIcon className="h-3.5 w-3.5" />
              {riskData.score}/100 · {cfg.label}
            </span>
            <span className="text-xs text-pebble-text-muted">
              {riskData.model === 'sagemaker' ? (riskCopy.sagemaker ?? '⚡ SageMaker') : (riskCopy.local ?? '🔧 Local model')}
            </span>
          </div>

          {/* First factor as 1-line explanation */}
          {riskData.factors[0] && (
            <p className="text-sm text-pebble-text-secondary">{riskData.factors[0]}</p>
          )}

          {/* Recommended actions */}
          {riskData.actions.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-[0.06em] text-pebble-text-muted">
                {riskCopy.actions ?? 'Recommended actions'}
              </p>
              <ul className="space-y-1">
                {riskData.actions.slice(0, 3).map((action, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-pebble-text-secondary"
                  >
                    <span className={`mt-0.5 inline-block h-4 w-4 shrink-0 rounded-full text-center text-[10px] font-bold leading-4 ${cfg.bg} ${cfg.text}`}>
                      {i + 1}
                    </span>
                    {action}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      ) : errorMsg ? (
        <p className="text-sm text-red-400">{errorMsg}</p>
      ) : (
        <p className="text-sm text-pebble-text-secondary">
          {riskCopy.empty ?? 'No risk data yet — click Recompute to generate.'}
        </p>
      )}
    </Card>
  )
}
