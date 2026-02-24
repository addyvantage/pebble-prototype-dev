import { useMemo } from 'react'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import { getDemoMode } from '../utils/demoMode'
import { getPebbleMemory, type MemoryLedgerStatus } from '../utils/pebbleMemory'

const chartWidth = 640
const chartHeight = 220
const chartPadding = 20

const legendItems = [
  { label: 'Flow stability', color: '#3B82F6' },
  { label: 'Cognitive load', color: '#94A3B8' },
]

const statusToBadge: Record<MemoryLedgerStatus, 'success' | 'warning' | 'neutral'> = {
  resolved: 'success',
  guided: 'warning',
  stabilized: 'neutral',
}

function toPath(values: number[]) {
  const min = 30
  const max = 95
  const usableWidth = chartWidth - chartPadding * 2
  const usableHeight = chartHeight - chartPadding * 2

  return values
    .map((value, index) => {
      const x = chartPadding + (index / (values.length - 1)) * usableWidth
      const normalized = (value - min) / (max - min)
      const y = chartHeight - chartPadding - normalized * usableHeight
      return `${x},${y}`
    })
    .join(' ')
}

function formatLedgerTime(timestamp: string) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(timestamp))
}

function formatTrend(current: number, previous: number, unit = '') {
  const delta = Math.round((current - previous) * 10) / 10
  const sign = delta >= 0 ? '+' : ''
  return `${sign}${delta}${unit}`
}

export function DashboardPage() {
  const memory = useMemo(() => getPebbleMemory('local_user'), [])
  const demoMode = useMemo(() => getDemoMode(), [])

  const flowValues = memory.flowTrend30d.map((point) => point.value)
  const loadValues = memory.cognitiveLoadTrend30d.map((point) => point.value)
  const flowPath = toPath(flowValues)
  const loadPath = toPath(loadValues)

  const latestSession = memory.recentSessions[memory.recentSessions.length - 1]
  const previousSession =
    memory.recentSessions.length > 1
      ? memory.recentSessions[memory.recentSessions.length - 2]
      : undefined

  const currentFlow = flowValues[flowValues.length - 1] ?? memory.bestFlowStability
  const previousFlow =
    flowValues[Math.max(0, flowValues.length - 8)] ??
    flowValues[Math.max(0, flowValues.length - 2)] ??
    currentFlow

  const currentLoad = loadValues[loadValues.length - 1] ?? 0
  const previousLoad =
    loadValues[Math.max(0, loadValues.length - 8)] ??
    loadValues[Math.max(0, loadValues.length - 2)] ??
    currentLoad

  const currentRecovery = latestSession?.recoveryTimeSec ?? memory.avgRecoveryTimeSec
  const previousRecovery = previousSession?.recoveryTimeSec ?? currentRecovery

  const currentHintDependency =
    (latestSession?.hintIntensity ?? memory.hintDependencyRate / 100) * 100
  const previousHintDependency =
    (previousSession?.hintIntensity ?? memory.hintDependencyRate / 100) * 100

  const currentBreakpoints = latestSession?.breakpoints ?? memory.breakpointsThisMonth
  const previousBreakpoints = previousSession?.breakpoints ?? currentBreakpoints

  const maxRecovery = Math.max(...memory.recoveryByIssue.map((entry) => entry.avgRecoverySec))

  return (
    <section className="page-enter space-y-6">
      <Card className="space-y-4" padding="md" interactive>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Badge>Growth memory</Badge>
          <Badge variant={demoMode ? 'success' : 'neutral'}>
            Demo mode {demoMode ? 'On' : 'Off'}
          </Badge>
        </div>
        <h1 className="text-balance text-3xl font-semibold tracking-[-0.015em] text-pebble-text-primary sm:text-[2rem]">
          Recovery insights dashboard
        </h1>
        <p className="max-w-3xl text-sm leading-relaxed text-pebble-text-secondary sm:text-base">
          Personalized metrics track cognitive recovery quality, not only correctness,
          and preserve your improvement pattern across sessions.
        </p>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Card className="space-y-3" padding="sm" interactive>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-pebble-text-secondary">Flow stability</p>
            <Badge variant="success">{formatTrend(currentFlow, previousFlow, '%')}</Badge>
          </div>
          <Divider />
          <p className="text-3xl font-semibold text-pebble-text-primary">
            {currentFlow}
          </p>
          <p className="text-sm leading-relaxed text-pebble-text-secondary">
            Best observed stability: {memory.bestFlowStability}, across {memory.sessionsCompleted}{' '}
            sessions.
          </p>
        </Card>

        <Card className="space-y-3" padding="sm" interactive>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-pebble-text-secondary">Recovery time</p>
            <Badge variant="success">{formatTrend(currentRecovery, previousRecovery, 's')}</Badge>
          </div>
          <Divider />
          <p className="text-3xl font-semibold text-pebble-text-primary">
            {currentRecovery}
            <span className="ml-1 text-xl font-medium text-pebble-text-secondary">sec</span>
          </p>
          <p className="text-sm leading-relaxed text-pebble-text-secondary">
            Rolling average: {memory.avgRecoveryTimeSec}s from breakpoint to stability.
          </p>
        </Card>

        <Card className="space-y-3" padding="sm" interactive>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-pebble-text-secondary">Breakpoints</p>
            <Badge variant="success">
              {formatTrend(currentBreakpoints, previousBreakpoints)}
            </Badge>
          </div>
          <Divider />
          <p className="text-3xl font-semibold text-pebble-text-primary">
            {currentBreakpoints}
          </p>
          <p className="text-sm leading-relaxed text-pebble-text-secondary">
            Latest session breakpoints, month total: {memory.breakpointsThisMonth}.
          </p>
        </Card>

        <Card className="space-y-3" padding="sm" interactive>
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium text-pebble-text-secondary">Guidance reliance</p>
            <Badge variant="success">
              {formatTrend(currentHintDependency, previousHintDependency, '%')}
            </Badge>
          </div>
          <Divider />
          <p className="text-3xl font-semibold text-pebble-text-primary">
            {Math.round(currentHintDependency * 10) / 10}
            <span className="ml-1 text-xl font-medium text-pebble-text-secondary">%</span>
          </p>
          <p className="text-sm leading-relaxed text-pebble-text-secondary">
            Latest session reliance on guidance.
          </p>
          <p className="text-xs text-pebble-text-secondary">
            Rolling reliance across sessions: {memory.hintDependencyRate}%.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="space-y-4" padding="md" interactive>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-base font-semibold text-pebble-text-primary">30-day recovery trend</p>
            <div className="flex items-center gap-3">
              {legendItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-xs text-pebble-text-secondary">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  {item.label}
                </div>
              ))}
            </div>
          </div>
          <p className="text-xs text-pebble-text-secondary">
            7-day change, flow {formatTrend(currentFlow, previousFlow, '%')}, cognitive load{' '}
            {formatTrend(currentLoad, previousLoad, '%')}.
          </p>
          <div className="rounded-xl border border-white/10 bg-[#060D22]/85 p-3">
            <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="h-52 w-full">
              {[0, 1, 2, 3].map((index) => {
                const y = chartPadding + (index * (chartHeight - chartPadding * 2)) / 3
                return (
                  <line
                    key={index}
                    x1={chartPadding}
                    y1={y}
                    x2={chartWidth - chartPadding}
                    y2={y}
                    stroke="rgba(148,163,184,0.18)"
                    strokeWidth="1"
                  />
                )
              })}
              <polyline
                fill="none"
                stroke="#3B82F6"
                strokeWidth="2.25"
                points={flowPath}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <polyline
                fill="none"
                stroke="#94A3B8"
                strokeWidth="2"
                points={loadPath}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeDasharray="4 4"
              />
            </svg>
          </div>
          <div className="flex items-center justify-between text-xs text-pebble-text-muted">
            <span>{memory.flowTrend30d[0]?.day ?? 'Start'}</span>
            <span>{memory.flowTrend30d[memory.flowTrend30d.length - 1]?.day ?? 'Now'}</span>
          </div>
        </Card>

        <Card className="space-y-4" padding="md" interactive>
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-semibold text-pebble-text-primary">
              Recovery profile by issue type
            </p>
            <Badge variant="neutral">Autonomous recovery rate</Badge>
          </div>
          <div className="space-y-4">
            {memory.recoveryByIssue.map((entry) => (
              <div key={entry.issue} className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-pebble-text-primary">{entry.issue}</p>
                  <p className="text-xs text-pebble-text-secondary">
                    {entry.avgRecoverySec}s avg, {Math.round(entry.autonomousRecoveryRate * 100)}%
                  </p>
                </div>
                <div className="h-2.5 rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-pebble-accent/75"
                    style={{
                      width: `${(entry.avgRecoverySec / maxRecovery) * 100}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4" padding="md" interactive>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-base font-semibold text-pebble-text-primary">Growth ledger</p>
            <p className="text-sm text-pebble-text-secondary">
              Then vs now memory, based on completed sessions.
            </p>
          </div>
          <Badge variant="success">
            {memory.thenVsNowEntries.reduce(
              (total, entry) => total + entry.breakpointsResolved,
              0,
            )}{' '}
            breakpoints resolved
          </Badge>
        </div>
        <Divider />
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs text-pebble-text-muted">
                <th className="px-3 py-1 font-medium">Timestamp</th>
                <th className="px-3 py-1 font-medium">Recovery note</th>
                <th className="px-3 py-1 font-medium">Impact</th>
                <th className="px-3 py-1 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {memory.thenVsNowEntries.map((entry) => (
                <tr
                  key={entry.id}
                  className="rounded-xl border border-white/10 bg-white/[0.03]"
                >
                  <td className="rounded-l-xl px-3 py-2 text-pebble-text-secondary">
                    {formatLedgerTime(entry.timestamp)}
                  </td>
                  <td className="px-3 py-2 text-pebble-text-primary">{entry.note}</td>
                  <td className="px-3 py-2 text-pebble-text-secondary">{entry.impact}</td>
                  <td className="rounded-r-xl px-3 py-2">
                    <Badge variant={statusToBadge[entry.status]}>{entry.status}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </section>
  )
}
