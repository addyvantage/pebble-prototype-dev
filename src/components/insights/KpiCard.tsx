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
    <Card padding="none" interactive className="flex min-h-[108px] flex-col justify-between space-y-2 bg-pebble-overlay/[0.04] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.06em] text-pebble-text-muted">{title}</p>
        <Icon className="h-4 w-4 text-pebble-text-secondary" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[1.65rem] font-bold leading-none tracking-tight text-pebble-text-primary">
          <span className="ltrSafe">{formattedValue}</span>
          {suffix ? <span className="ml-1 text-xs font-medium tracking-normal text-pebble-text-secondary">{suffix}</span> : null}
        </p>
        {trend ? <p className="mt-1 text-xs text-pebble-text-secondary">{trend}</p> : <div className="h-4" />}
      </div>
    </Card>
  )
}
