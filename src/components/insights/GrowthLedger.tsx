import type { GrowthLedgerItem } from '../../lib/analyticsDerivers'

type GrowthLedgerProps = {
  rows: GrowthLedgerItem[]
  labels: {
    timestamp: string
    note: string
    impact: string
    status: string
    empty: string
    noteBreakthrough: string
    noteStability: string
    noteAutonomy: string
  }
  statusLabels: {
    breakthrough: string
    stability: string
    autonomy: string
  }
  unitLabelById: Record<string, string>
}

function formatTemplate(
  template: string,
  vars: Record<string, string | number>,
) {
  return template.replace(/\{([a-zA-Z0-9_]+)\}/g, (_, key: string) => {
    if (!(key in vars)) {
      return `{${key}}`
    }
    return String(vars[key])
  })
}

function formatTime(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(ts))
}

function statusClass(kind: GrowthLedgerItem['kind']) {
  if (kind === 'breakthrough') {
    return 'border-pebble-success/40 bg-pebble-success/15 text-pebble-success'
  }
  if (kind === 'stability') {
    return 'border-pebble-accent/40 bg-pebble-accent/16 text-pebble-text-primary'
  }
  return 'border-pebble-warning/40 bg-pebble-warning/15 text-pebble-warning'
}

export function GrowthLedger({
  rows,
  labels,
  statusLabels,
  unitLabelById,
}: GrowthLedgerProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-pebble-border/30 bg-pebble-overlay/[0.05] p-4 text-sm text-pebble-text-secondary">
        {labels.empty}
      </div>
    )
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-pebble-border/30 bg-pebble-overlay/[0.05] p-2">
      <table className="w-full min-w-[680px] border-separate border-spacing-y-2 text-sm">
        <thead>
          <tr className="text-left text-xs text-pebble-text-muted">
            <th className="px-2 py-1 font-medium">{labels.timestamp}</th>
            <th className="px-2 py-1 font-medium">{labels.note}</th>
            <th className="px-2 py-1 font-medium">{labels.impact}</th>
            <th className="px-2 py-1 font-medium">{labels.status}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status =
              row.kind === 'breakthrough'
                ? statusLabels.breakthrough
                : row.kind === 'stability'
                  ? statusLabels.stability
                  : statusLabels.autonomy
            const unitTitle = unitLabelById[row.unitId] ?? row.unitId
            const note =
              row.kind === 'breakthrough'
                ? formatTemplate(labels.noteBreakthrough, {
                    unit: unitTitle,
                    attempts: row.failuresBeforeSuccess,
                    seconds: row.recoverySec,
                  })
                : row.kind === 'stability'
                  ? formatTemplate(labels.noteStability, { unit: unitTitle })
                  : formatTemplate(labels.noteAutonomy, { unit: unitTitle })

            return (
              <tr key={row.id} className="rounded-xl border border-pebble-border/25 bg-pebble-canvas/45">
                <td className="rounded-l-xl px-2 py-2 text-pebble-text-secondary">{formatTime(row.ts)}</td>
                <td className="px-2 py-2 text-pebble-text-primary">{note}</td>
                <td className="px-2 py-2 text-pebble-text-secondary">{row.impactScore}/100</td>
                <td className="rounded-r-xl px-2 py-2">
                  <span className={`rounded-full border px-2 py-0.5 text-xs ${statusClass(row.kind)}`}>
                    {status}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
