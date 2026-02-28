import { useEffect, useMemo, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Card } from '../ui/Card'

type KpiCardProps = {
  title: string
  value: number
  suffix?: string
  trend?: string
  icon: LucideIcon
}

function useCountUp(target: number, durationMs = 480) {
  const [display, setDisplay] = useState(target)

  useEffect(() => {
    const startValue = display
    const diff = target - startValue
    if (Math.abs(diff) < 0.1) {
      setDisplay(target)
      return
    }

    const startTs = performance.now()
    let frameId = 0
    const tick = (ts: number) => {
      const progress = Math.min(1, (ts - startTs) / durationMs)
      const eased = 1 - (1 - progress) ** 3
      setDisplay(startValue + diff * eased)
      if (progress < 1) {
        frameId = requestAnimationFrame(tick)
      }
    }

    frameId = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frameId)
    // intentionally reads previous display to animate between updates
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs])

  return display
}

export function KpiCard({ title, value, suffix, trend, icon: Icon }: KpiCardProps) {
  const animatedValue = useCountUp(value)
  const formattedValue = useMemo(() => {
    if (Math.abs(animatedValue) >= 100) {
      return Math.round(animatedValue).toString()
    }
    return animatedValue.toFixed(1).replace(/\.0$/, '')
  }, [animatedValue])

  return (
    <Card padding="sm" interactive className="space-y-3 bg-pebble-overlay/[0.04]">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-pebble-text-secondary">{title}</p>
        <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-pebble-border/35 bg-pebble-overlay/[0.08] text-pebble-text-primary">
          <Icon className="h-4 w-4" aria-hidden="true" />
        </span>
      </div>
      <p className="text-2xl font-semibold text-pebble-text-primary">
        {formattedValue}
        {suffix ? <span className="ml-1 text-sm font-medium text-pebble-text-secondary">{suffix}</span> : null}
      </p>
      {trend ? <p className="text-xs text-pebble-text-secondary">{trend}</p> : <div className="h-[18px]" />}
    </Card>
  )
}
