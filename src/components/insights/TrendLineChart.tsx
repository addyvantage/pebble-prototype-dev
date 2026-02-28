import { useMemo } from 'react'
import type { InsightTrendPoint } from '../../lib/analyticsDerivers'

type TrendLineChartProps = {
  data: InsightTrendPoint[]
  flowLabel: string
  loadLabel: string
}

const WIDTH = 760
const HEIGHT = 240
const PADDING_X = 28
const PADDING_Y = 22

function toPolyline(values: number[]) {
  if (values.length === 0) {
    return ''
  }

  const chartWidth = WIDTH - PADDING_X * 2
  const chartHeight = HEIGHT - PADDING_Y * 2
  return values
    .map((value, index) => {
      const x = PADDING_X + (index / Math.max(1, values.length - 1)) * chartWidth
      const y = HEIGHT - PADDING_Y - (value / 100) * chartHeight
      return `${x},${y}`
    })
    .join(' ')
}

export function TrendLineChart({ data, flowLabel, loadLabel }: TrendLineChartProps) {
  const flowValues = useMemo(() => data.map((point) => point.flowStability), [data])
  const loadValues = useMemo(() => data.map((point) => point.cognitiveLoad), [data])
  const flowPath = useMemo(() => toPolyline(flowValues), [flowValues])
  const loadPath = useMemo(() => toPolyline(loadValues), [loadValues])

  return (
    <div className="space-y-3 rounded-2xl border border-pebble-border/30 bg-pebble-overlay/[0.05] p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-pebble-text-secondary">
        <div className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-pebble-accent" />
          {flowLabel}
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-pebble-text-secondary/80" />
          {loadLabel}
        </div>
      </div>

      <div className="rounded-xl border border-pebble-border/25 bg-pebble-canvas/55 p-2">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-52 w-full">
          {[0, 1, 2, 3, 4].map((index) => {
            const y = PADDING_Y + (index / 4) * (HEIGHT - PADDING_Y * 2)
            return (
              <line
                key={`grid-${index}`}
                x1={PADDING_X}
                y1={y}
                x2={WIDTH - PADDING_X}
                y2={y}
                stroke="rgba(var(--pebble-border), 0.18)"
                strokeWidth="1"
              />
            )
          })}
          <polyline
            points={loadPath}
            fill="none"
            stroke="rgba(var(--pebble-text-secondary), 0.82)"
            strokeWidth="2"
            strokeDasharray="5 4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <polyline
            points={flowPath}
            fill="none"
            stroke="rgba(var(--pebble-accent), 0.92)"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>

      {data.length > 0 ? (
        <div className="flex items-center justify-between text-[11px] text-pebble-text-muted">
          <span>{data[0].label}</span>
          <span>{data[data.length - 1].label}</span>
        </div>
      ) : null}
    </div>
  )
}
