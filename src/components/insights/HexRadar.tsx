import { useEffect, useMemo, useState } from 'react'
import type { RadarAxisKey, RadarScores } from '../../lib/analyticsDerivers'
import { useTheme } from '../../hooks/useTheme'

type HexRadarProps = {
  current: RadarScores
  previous: RadarScores
  axisOrder: RadarAxisKey[]
  axisLabels: Record<RadarAxisKey, string>
  className?: string
}

const SIZE = 360
const CENTER = SIZE / 2
const OUTER_RADIUS = 120
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

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function HexRadar({
  current,
  previous,
  axisOrder,
  axisLabels,
  className,
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
      gridStroke: dark ? 'rgba(var(--pebble-border), 0.25)' : 'rgba(var(--pebble-border), 0.22)',
      boundaryStroke: dark ? 'rgba(var(--pebble-border), 0.46)' : 'rgba(var(--pebble-border), 0.38)',
      axisStroke: dark ? 'rgba(var(--pebble-border), 0.22)' : 'rgba(var(--pebble-border), 0.2)',
      currentFill: dark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.18)',
      currentStroke: dark ? 'rgba(255, 255, 255, 0.74)' : 'rgba(15, 23, 42, 0.66)',
      previousStroke: dark ? 'rgba(var(--pebble-accent), 0.58)' : 'rgba(var(--pebble-accent), 0.52)',
      labelFill: dark ? 'rgba(var(--pebble-text-secondary), 0.98)' : 'rgba(var(--pebble-text-secondary), 0.94)',
      currentDotFill: dark ? 'rgba(255, 255, 255, 0.95)' : 'rgba(15, 23, 42, 0.9)',
      currentDotStroke: dark ? 'rgba(var(--pebble-canvas), 0.9)' : 'rgba(var(--pebble-canvas), 0.85)',
      centerDot: dark ? 'rgba(var(--pebble-border), 0.8)' : 'rgba(var(--pebble-border), 0.85)',
      polygonFilter: dark ? 'drop-shadow(0 0 10px rgba(248,250,252,0.16))' : 'drop-shadow(0 2px 8px rgba(15,23,42,0.1))',
    }
  }, [theme])

  return (
    <div className={classNames('h-full w-full', className)}>
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full">
        {ringPolygons.map((ring, index) => (
          <polygon
            key={`ring-${index}`}
            points={pointsToPath(ring)}
            fill="none"
            stroke={index === RINGS - 1 ? chartStyle.boundaryStroke : chartStyle.gridStroke}
            strokeWidth={index === RINGS - 1 ? 1.55 : 1}
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
            strokeWidth={1}
          />
        ))}

        <polygon
          points={pointsToPath(previousPoints)}
          fill="none"
          stroke={chartStyle.previousStroke}
          strokeDasharray="5 5"
          strokeWidth="1.6"
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
          strokeWidth="2.1"
          strokeLinejoin="round"
          style={{
            opacity: reveal ? 1 : 0,
            filter: chartStyle.polygonFilter,
            transformOrigin: '50% 50%',
            transform: reveal ? 'scale(1)' : 'scale(0.96)',
            transition: 'opacity 280ms ease, transform 420ms cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        />

        {currentPoints.map((point, index) => (
          <circle
            key={`current-dot-${index}`}
            cx={point.x}
            cy={point.y}
            r="3"
            fill={chartStyle.currentDotFill}
            stroke={chartStyle.currentDotStroke}
            strokeWidth="1.4"
            style={{
              opacity: reveal ? 1 : 0,
              transition: 'opacity 260ms ease',
            }}
          />
        ))}

        <circle cx={CENTER} cy={CENTER} r="2.6" fill={chartStyle.centerDot} />

        {axisPoints.map((point, index) => {
          const label = axisLabels[axisOrder[index]]
          const dx = point.x - CENTER
          const dy = point.y - CENTER
          const labelX = CENTER + dx * 1.2
          const labelY = CENTER + dy * 1.2
          return (
            <text
              key={`label-${axisOrder[index]}`}
              x={labelX}
              y={labelY}
              textAnchor={Math.abs(dx) < 8 ? 'middle' : dx > 0 ? 'start' : 'end'}
              dominantBaseline={Math.abs(dy) < 8 ? 'middle' : dy > 0 ? 'hanging' : 'auto'}
              fill={chartStyle.labelFill}
              fontSize="12"
              fontWeight="600"
            >
              {label}
            </text>
          )
        })}
      </svg>
    </div>
  )
}
