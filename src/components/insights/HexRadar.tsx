import { useEffect, useMemo, useState } from 'react'
import type { RadarAxisKey, RadarScores } from '../../lib/analyticsDerivers'
import { useTheme } from '../../hooks/useTheme'

type HexRadarProps = {
  current: RadarScores
  previous: RadarScores
  axisOrder: RadarAxisKey[]
  axisLabels: Record<RadarAxisKey, string>
  currentLabel: string
  previousLabel: string
}

const SIZE = 400
const CENTER = SIZE / 2
const OUTER_RADIUS = 136
const RINGS = 5

function toPoint(index: number, total: number, score01: number) {
  const angle = (-Math.PI / 2) + (index / total) * Math.PI * 2
  const radius = OUTER_RADIUS * score01
  return {
    x: CENTER + Math.cos(angle) * radius,
    y: CENTER + Math.sin(angle) * radius,
  }
}

function pointsToPath(points: Array<{ x: number; y: number }>) {
  return points.map((point) => `${point.x},${point.y}`).join(' ')
}

export function HexRadar({
  current,
  previous,
  axisOrder,
  axisLabels,
  currentLabel,
  previousLabel,
}: HexRadarProps) {
  const { theme } = useTheme()
  const [reveal, setReveal] = useState(false)

  useEffect(() => {
    const timer = window.setTimeout(() => setReveal(true), 24)
    return () => window.clearTimeout(timer)
  }, [current, previous])

  const axisPoints = useMemo(
    () =>
      axisOrder.map((_, index) => toPoint(index, axisOrder.length, 1)),
    [axisOrder],
  )

  const ringPolygons = useMemo(
    () =>
      Array.from({ length: RINGS }, (_, ringIndex) => {
        const ratio = (ringIndex + 1) / RINGS
        return axisOrder.map((_, axisIndex) => toPoint(axisIndex, axisOrder.length, ratio))
      }),
    [axisOrder],
  )

  const currentPoints = useMemo(
    () =>
      axisOrder.map((key, index) => toPoint(index, axisOrder.length, Math.max(0, Math.min(1, current[key] / 100)))),
    [axisOrder, current],
  )
  const previousPoints = useMemo(
    () =>
      axisOrder.map((key, index) =>
        toPoint(index, axisOrder.length, Math.max(0, Math.min(1, previous[key] / 100))),
      ),
    [axisOrder, previous],
  )
  const chartStyle = useMemo(() => {
    const dark = theme === 'dark'
    return {
      gridStroke: dark ? 'rgba(var(--pebble-border), 0.3)' : 'rgba(var(--pebble-border), 0.24)',
      axisStroke: dark ? 'rgba(var(--pebble-border), 0.24)' : 'rgba(var(--pebble-border), 0.18)',
      currentFill: dark ? 'rgba(var(--pebble-accent), 0.22)' : 'rgba(var(--pebble-accent), 0.16)',
      currentStroke: dark ? 'rgba(var(--pebble-accent), 0.9)' : 'rgba(var(--pebble-accent), 0.76)',
      previousFill: dark ? 'rgba(var(--pebble-accent), 0.05)' : 'rgba(var(--pebble-accent), 0.04)',
      previousStroke: dark ? 'rgba(var(--pebble-accent), 0.52)' : 'rgba(var(--pebble-accent), 0.46)',
      labelFill: dark ? 'rgb(var(--pebble-text-secondary))' : 'rgb(var(--pebble-text-primary))',
      currentDotFill: dark ? 'rgba(var(--pebble-accent), 0.98)' : 'rgba(var(--pebble-accent), 0.86)',
      previousDotFill: dark ? 'rgba(var(--pebble-accent), 0.62)' : 'rgba(var(--pebble-accent), 0.52)',
      polygonFilter: dark ? 'drop-shadow(0 0 10px rgba(59,130,246,0.22))' : undefined,
    }
  }, [theme])

  return (
    <div className="rounded-2xl border border-pebble-border/30 bg-pebble-overlay/[0.05] p-3">
      <div className="mx-auto aspect-square w-full max-w-[560px]">
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
          {ringPolygons.map((ring, index) => (
            <polygon
              key={`ring-${index}`}
              points={pointsToPath(ring)}
              fill="none"
              stroke={chartStyle.gridStroke}
              strokeWidth={index === RINGS - 1 ? 1.3 : 1}
            />
          ))}

          {axisPoints.map((point, index) => (
            <line
              key={`axis-${index}`}
              x1={CENTER}
              y1={CENTER}
              x2={point.x}
              y2={point.y}
              stroke={chartStyle.axisStroke}
              strokeWidth="1"
            />
          ))}

          <polygon
            points={pointsToPath(previousPoints)}
            fill={chartStyle.previousFill}
            stroke={chartStyle.previousStroke}
            strokeDasharray="5 5"
            strokeWidth="1.35"
            strokeLinejoin="round"
            style={{
              opacity: reveal ? 1 : 0,
              transition: 'opacity 280ms ease',
            }}
          />

          <polygon
            points={pointsToPath(currentPoints)}
            fill={chartStyle.currentFill}
            stroke={chartStyle.currentStroke}
            strokeWidth="2.2"
            strokeLinejoin="round"
            style={{
              opacity: reveal ? 1 : 0,
              filter: chartStyle.polygonFilter,
              transformOrigin: '50% 50%',
              transform: reveal ? 'scale(1)' : 'scale(0.94)',
              transition: 'opacity 280ms ease, transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)',
            }}
          />

          {previousPoints.map((point, index) => (
            <circle
              key={`previous-dot-${index}`}
              cx={point.x}
              cy={point.y}
              r="2.4"
              fill={chartStyle.previousDotFill}
              stroke="rgba(var(--pebble-panel), 0.4)"
              strokeWidth="1"
              style={{
                opacity: reveal ? 1 : 0,
                transition: 'opacity 260ms ease',
              }}
            />
          ))}
          {currentPoints.map((point, index) => (
            <circle
              key={`current-dot-${index}`}
              cx={point.x}
              cy={point.y}
              r="2.8"
              fill={chartStyle.currentDotFill}
              stroke="rgba(var(--pebble-panel), 0.35)"
              strokeWidth="1"
              style={{
                opacity: reveal ? 1 : 0,
                transition: 'opacity 260ms ease',
              }}
            />
          ))}

          {axisPoints.map((point, index) => {
            const label = axisLabels[axisOrder[index]]
            const dx = point.x - CENTER
            const dy = point.y - CENTER
            const labelX = CENTER + dx * 1.17
            const labelY = CENTER + dy * 1.17
            return (
              <text
                key={`label-${axisOrder[index]}`}
                x={labelX}
                y={labelY}
                textAnchor={Math.abs(dx) < 8 ? 'middle' : dx > 0 ? 'start' : 'end'}
                dominantBaseline={Math.abs(dy) < 8 ? 'middle' : dy > 0 ? 'hanging' : 'auto'}
                fill={chartStyle.labelFill}
                fontSize="12"
                fontWeight="500"
              >
                {label}
              </text>
            )
          })}
        </svg>
      </div>

      <div className="mt-1 flex items-center justify-center gap-4 text-xs text-pebble-text-secondary">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-pebble-accent shadow-[0_0_8px_rgba(59,130,246,0.28)]" />
          {currentLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-pebble-accent/60 bg-pebble-accent/15" />
          {previousLabel}
        </span>
      </div>
    </div>
  )
}
