import { useMemo } from 'react'
import type { InsightTrendPoint } from '../../lib/analyticsDerivers'

type TrendLineChartProps = {
  data: InsightTrendPoint[]
  flowLabel: string
  loadLabel: string
}

const WIDTH = 760
const HEIGHT = 190
const PADDING_X = 24
const PADDING_Y = 18

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
  const hasData = data.length > 0
  const placeholderPath = useMemo(() => toPolyline([42, 44, 43, 45, 44, 46, 45]), [])

  return (
    <div className="space-y-2.5 rounded-xl border border-pebble-border/26 bg-pebble-overlay/[0.05] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-pebble-text-secondary">
        <div className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-pebble-accent" />
          {flowLabel}
        </div>
        <div className="inline-flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-pebble-text-secondary/80" />
          {loadLabel}
        </div>
      </div>

      <div className="relative rounded-xl border border-pebble-border/20 bg-pebble-canvas/55 p-1.5">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-44 w-full sm:h-48">
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
          {[0, 1, 2, 3, 4, 5].map((index) => {
            const x = PADDING_X + (index / 5) * (WIDTH - PADDING_X * 2)
            return (
              <line
                key={`x-grid-${index}`}
                x1={x}
                y1={PADDING_Y}
                x2={x}
                y2={HEIGHT - PADDING_Y}
                stroke="rgba(var(--pebble-border), 0.1)"
                strokeWidth="1"
              />
            )
          })}

          <line
            x1={PADDING_X}
            y1={HEIGHT - PADDING_Y}
            x2={WIDTH - PADDING_X}
            y2={HEIGHT - PADDING_Y}
            stroke="rgba(var(--pebble-border), 0.4)"
            strokeWidth="1"
          />
          <line
            x1={PADDING_X}
            y1={PADDING_Y}
            x2={PADDING_X}
            y2={HEIGHT - PADDING_Y}
            stroke="rgba(var(--pebble-border), 0.4)"
            strokeWidth="1"
          />

          {hasData ? (
            <>
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
                strokeWidth="2.3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          ) : (
            <polyline
              points={placeholderPath}
              fill="none"
              stroke="rgba(var(--pebble-border), 0.34)"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="4 5"
            />
          )}
        </svg>
        {!hasData ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className="px-6 text-center text-xs font-medium text-pebble-text-muted">
              Run tests and submit to populate this chart
            </p>
          </div>
        ) : null}
      </div>

      {hasData ? (
        <div className="flex items-center justify-between text-[11px] text-pebble-text-muted">
          <span>{data[0].label}</span>
          <span>{data[data.length - 1].label}</span>
        </div>
      ) : null}
    </div>
  )
}
