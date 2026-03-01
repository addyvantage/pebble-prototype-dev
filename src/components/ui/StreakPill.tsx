import { Flame } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useI18n } from '../../i18n/useI18n'

type StreakPillProps = {
  streak: number
  isTodayComplete?: boolean
  compact?: boolean
}

export function StreakPill({ streak, isTodayComplete = false, compact = false }: StreakPillProps) {
  const { t, isRTL } = useI18n()
  const [pulse, setPulse] = useState(false)
  const prevCompleteRef = useRef(isTodayComplete)

  useEffect(() => {
    if (isTodayComplete && !prevCompleteRef.current) {
      setPulse(true)
      const timer = window.setTimeout(() => setPulse(false), 600)
      prevCompleteRef.current = isTodayComplete
      return () => window.clearTimeout(timer)
    }
    prevCompleteRef.current = isTodayComplete
  }, [isTodayComplete])

  if (compact) {
    const active = isTodayComplete || streak > 0
    return (
      <div
        className={`relative inline-flex flex-col items-center justify-center h-11 min-w-11 rounded-xl border border-pebble-border/35 bg-pebble-overlay/8 hover:bg-pebble-overlay/14 transition-colors ${isRTL ? 'rtlText' : ''}`}
      >
        <span className="relative flex items-center justify-center mt-[-1px]">
          <Flame
            className={`h-[22px] w-[22px] transition-all duration-300 ${active ? 'text-pebble-warning' : 'text-pebble-text-muted'}`}
            fill={active ? 'currentColor' : 'none'}
            strokeWidth={active ? 1.5 : 2}
            aria-hidden="true"
            style={{ filter: active ? 'drop-shadow(0 0 6px currentColor)' : 'none' }}
          />
          {pulse && active ? (
            <span className="pointer-events-none absolute inset-0 rounded-full border border-pebble-warning/40 animate-[streak-ring_600ms_ease-out]" />
          ) : null}
        </span>
        <span className="text-pebble-text-primary font-semibold text-[12px] leading-none mt-[2px]">
          {streak}
        </span>
      </div>
    )
  }

  const isActive = streak > 0

  return (
    <div
      className={`relative inline-flex h-10 items-center justify-center gap-2.5 rounded-xl border px-3 transition-all duration-300 ${isActive
        ? 'border-pebble-border/35 bg-pebble-overlay/[0.08] shadow-sm text-pebble-text-primary'
        : 'border-pebble-border/20 bg-pebble-overlay/[0.04] text-pebble-text-secondary'
        } ${isRTL ? 'rtlText' : ''}`}
    >
      <span
        className={`relative inline-flex h-6 w-6 items-center justify-center rounded-full transition-all duration-300 ${isActive
          ? 'border border-pebble-warning/35 bg-pebble-warning/18 text-pebble-warning'
          : 'border border-pebble-border/25 bg-transparent text-pebble-text-muted/80'
          } ${pulse ? 'animate-[streak-pop_600ms_ease-out]' : ''}`}
      >
        <Flame
          className="h-4 w-4 transition-all duration-300"
          fill={isActive ? 'currentColor' : 'none'}
          strokeWidth={isActive ? 1.5 : 2}
          aria-hidden="true"
          style={{ filter: isActive ? 'drop-shadow(0 0 6px currentColor)' : 'none' }}
        />
        {pulse && isActive ? (
          <span className="pointer-events-none absolute inset-0 rounded-full border border-pebble-warning/40 animate-[streak-ring_600ms_ease-out]" />
        ) : null}
      </span>

      <span className="inline-flex items-center gap-1.5 pt-[1px]">
        <span className="text-[13px] font-medium opacity-90">{t('insights.streak.label')}</span>
        <span className={`ltrSafe font-bold text-[14px] sm:text-[15px] ${isActive ? 'text-pebble-text-primary' : 'text-pebble-text-muted/80'}`}>{streak}</span>
      </span>
    </div>
  )
}
