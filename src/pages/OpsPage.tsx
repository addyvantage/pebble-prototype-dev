import { useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Activity, AlertTriangle, Clock, FileText, Route, Share2, Shield, Wifi } from 'lucide-react'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useAuth } from '../hooks/useAuth'
import { apiFetch } from '../lib/apiUrl'

// ── Types ──────────────────────────────────────────────────────────────────────
interface MetricSummary {
    key: string
    count: number
    avg: number
    p95: number
    min: number
    max: number
    errorRate: number
    samples: number[]
}

interface OpsSnapshot {
    agentResponseMs: MetricSummary | null
    reportGenMs: MetricSummary | null
    snapshotMs: MetricSummary | null
    journeyUpdateMs: MetricSummary | null
    analyticsMs: MetricSummary | null
    apiErrorRate: number
    totalRequests: number
    updatedAt: string
}

const ADMIN_TOKEN = (import.meta as any).env?.VITE_ADMIN_TOKEN ?? 'dev-admin'

// ── SVG Sparkline ─────────────────────────────────────────────────────────────
function Sparkline({ samples, color = '#6366f1' }: { samples: number[]; color?: string }) {
    if (samples.length < 2) {
        return <div className="h-10 flex items-center justify-center text-[11px] text-pebble-text-muted">No data</div>
    }
    const w = 160
    const h = 40
    const min = Math.min(...samples)
    const max = Math.max(...samples)
    const range = max - min || 1
    const pts = samples.map((v, i) => {
        const x = (i / (samples.length - 1)) * w
        const y = h - ((v - min) / range) * (h - 4) - 2
        return `${x},${y}`
    })
    return (
        <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
            <polyline
                points={pts.join(' ')}
                fill="none"
                stroke={color}
                strokeWidth={1.5}
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity={0.8}
            />
            <polyline
                points={[`0,${h}`, ...pts, `${w},${h}`].join(' ')}
                fill={color}
                opacity={0.08}
                stroke="none"
            />
        </svg>
    )
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
    label,
    metric,
    icon: Icon,
    color = 'indigo',
    unit = 'ms',
}: {
    label: string
    metric: MetricSummary | null | number
    icon: React.ElementType
    color?: string
    unit?: string
}) {
    const accentMap: Record<string, string> = {
        indigo: 'bg-indigo-500/10 text-indigo-400',
        violet: 'bg-violet-500/10 text-violet-400',
        sky: 'bg-sky-500/10 text-sky-400',
        amber: 'bg-amber-500/10 text-amber-400',
        rose: 'bg-rose-500/10 text-rose-400',
        emerald: 'bg-emerald-500/10 text-emerald-400',
    }

    const isNumber = typeof metric === 'number'
    const avg = isNumber ? metric : (metric?.avg ?? null)
    const p95 = isNumber ? null : (metric?.p95 ?? null)
    const errRate = isNumber ? null : (metric?.errorRate ?? null)
    const samples = isNumber ? [] : (metric?.samples ?? [])

    return (
        <Card className="relative overflow-hidden p-4" interactive>
            <div className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full bg-pebble-accent/5 blur-2xl" />
            <div className="relative space-y-3">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${accentMap[color] ?? accentMap.indigo}`}>
                            <Icon className="h-3.5 w-3.5" />
                        </div>
                        <p className="text-[12px] font-semibold uppercase tracking-[0.07em] text-pebble-text-muted">{label}</p>
                    </div>
                    {errRate !== null && (
                        <span className={`text-[11px] font-medium ${errRate > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                            {errRate}% err
                        </span>
                    )}
                </div>

                <div className="flex items-end gap-3">
                    <div>
                        <p className="text-2xl font-bold tracking-tight text-pebble-text-primary">
                            {avg !== null ? `${avg}` : '—'}
                        </p>
                        <p className="text-[11px] text-pebble-text-muted">
                            avg {unit}{p95 !== null ? ` · p95 ${p95}${unit}` : ''}
                        </p>
                    </div>
                    {samples.length > 1 && <Sparkline samples={samples} />}
                </div>
            </div>
        </Card>
    )
}

// ── OpsPage ───────────────────────────────────────────────────────────────────
export function OpsPage() {
    const { isAdmin, isAuthenticated, isLoading } = useAuth()
    const [data, setData] = useState<OpsSnapshot | null>(null)
    const [polling, setPolling] = useState(false)
    const [lastError, setLastError] = useState<string | null>(null)
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const fetchMetrics = async () => {
        try {
            const r = await apiFetch('/api/admin/ops-metrics', {
                headers: { 'X-Admin-Token': ADMIN_TOKEN },
            })
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            const json = await r.json()
            if (json.ok && json.data) {
                setData(json.data as OpsSnapshot)
                setPolling(true)
                setLastError(null)
            }
        } catch (e) {
            setLastError(String(e))
            setPolling(false)
        }
    }

    useEffect(() => {
        if (!isAdmin) return
        void fetchMetrics()
        intervalRef.current = setInterval(() => { void fetchMetrics() }, 5000)
        return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
    }, [isAdmin])

    if (isLoading) {
        return <div className="flex min-h-[40vh] items-center justify-center text-pebble-text-secondary">Loading…</div>
    }
    if (!isAuthenticated || !isAdmin) {
        return <Navigate to="/" replace />
    }

    return (
        <div className="page-enter mx-auto max-w-4xl px-4 pb-8 pt-4 space-y-4">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-pebble-accent/30 bg-pebble-accent/15">
                        <Shield className="h-5 w-5 text-pebble-accent" />
                    </div>
                    <div>
                        <h1 className="text-xl font-bold tracking-tight text-pebble-text-primary">Admin Ops</h1>
                        <p className="text-[13px] text-pebble-text-secondary">Real-time backend observability</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {polling ? (
                        <Badge variant="success" className="flex items-center gap-1.5 text-[11.5px]">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Live Ops
                        </Badge>
                    ) : (
                        <Badge variant="warning" className="text-[11.5px]">Offline</Badge>
                    )}
                    {lastError && <span className="text-[11.5px] text-rose-400">{lastError}</span>}
                </div>
            </div>

            {/* Summary bar */}
            {data && (
                <div className="flex flex-wrap gap-3 rounded-xl border border-pebble-border/20 bg-pebble-overlay/[0.04] px-4 py-3">
                    <div className="flex items-center gap-1.5">
                        <Route className="h-3.5 w-3.5 text-pebble-text-muted" />
                        <span className="text-[12.5px] text-pebble-text-secondary">
                            <span className="font-semibold text-pebble-text-primary">{data.totalRequests}</span> total requests
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-pebble-text-muted" />
                        <span className="text-[12.5px] text-pebble-text-secondary">
                            <span className={`font-semibold ${data.apiErrorRate > 10 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                {data.apiErrorRate}%
                            </span>{' '}
                            API error rate
                        </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Wifi className="h-3.5 w-3.5 text-pebble-text-muted" />
                        <span className="text-[12.5px] text-pebble-text-secondary">
                            Updated{' '}
                            <span className="font-semibold text-pebble-text-primary">
                                {new Date(data.updatedAt).toLocaleTimeString()}
                            </span>
                        </span>
                    </div>
                </div>
            )}

            {/* KPI Grid */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <KpiCard
                    label="Agent Response Time"
                    metric={data?.agentResponseMs ?? null}
                    icon={Activity}
                    color="indigo"
                />
                <KpiCard
                    label="PDF Generation Time"
                    metric={data?.reportGenMs ?? null}
                    icon={FileText}
                    color="violet"
                />
                <KpiCard
                    label="Snapshot Creation"
                    metric={data?.snapshotMs ?? null}
                    icon={Share2}
                    color="sky"
                />
                <KpiCard
                    label="Journey Update Latency"
                    metric={data?.journeyUpdateMs ?? null}
                    icon={Clock}
                    color="amber"
                />
                <KpiCard
                    label="Analytics Query Time"
                    metric={data?.analyticsMs ?? null}
                    icon={Activity}
                    color="emerald"
                />
                <KpiCard
                    label="API Error Rate"
                    metric={data?.apiErrorRate ?? null}
                    icon={AlertTriangle}
                    color="rose"
                    unit="%"
                />
            </div>

            {!data && (
                <div className="rounded-xl border border-pebble-border/25 bg-pebble-overlay/[0.04] p-8 text-center">
                    <p className="text-sm text-pebble-text-muted">Waiting for metrics…</p>
                </div>
            )}
        </div>
    )
}
