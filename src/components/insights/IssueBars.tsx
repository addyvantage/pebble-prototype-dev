import type { AnalyticsErrorType } from '../../lib/analyticsStore'
import type { IssueProfileItem } from '../../lib/analyticsDerivers'

type IssueBarsProps = {
  rows: IssueProfileItem[]
  labels: Record<AnalyticsErrorType, string>
}

export function IssueBars({ rows, labels }: IssueBarsProps) {
  const maxCount = Math.max(1, ...rows.map((row) => row.count))

  return (
    <div className="space-y-3 rounded-2xl border border-pebble-border/30 bg-pebble-overlay/[0.05] p-4">
      {rows.map((row) => (
        <div key={row.type} className="space-y-1.5">
          <div className="flex items-center justify-between gap-2 text-xs">
            <p className="font-medium text-pebble-text-primary">{labels[row.type]}</p>
            <p className="text-pebble-text-secondary">
              {row.count} • {row.ratioPct}%
            </p>
          </div>
          <div className="h-2.5 rounded-full border border-pebble-border/25 bg-pebble-canvas/50">
            <div
              className="h-full rounded-full bg-gradient-to-r from-pebble-accent/85 to-sky-300/70 transition-all duration-300"
              style={{ width: `${(row.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
