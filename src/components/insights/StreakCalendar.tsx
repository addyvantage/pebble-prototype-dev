import { Check, Flame, Trophy } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useI18n } from '../../i18n/useI18n'
import type { DailyCompletionMap } from '../../lib/analyticsDerivers'
import { useCodingDaysStore } from '../../lib/codingDaysStore'
import { Calendar } from '../ui/calendar'

type StreakCalendarProps = {
  dailyMap: DailyCompletionMap
  streak: number
  longest: number
  isTodayComplete: boolean
  timeZone: string
  className?: string
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

// Helper: get YYYY-MM-DD from a local Date
function toDateKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function isSameDay(a: Date, b: Date) {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

function isPast(target: Date, today: Date) {
  const t = new Date(target)
  t.setHours(0, 0, 0, 0)
  const now = new Date(today)
  now.setHours(0, 0, 0, 0)
  return t < now
}

export function StreakCalendar({
  streak,
  longest,
  isTodayComplete,
  className,
}: StreakCalendarProps) {
  const { t, isRTL } = useI18n()
  const { codedDaysSet, refreshCodedDays } = useCodingDaysStore()
  const [today, setToday] = useState(new Date())
  // Track the initial today for the month — never changes navigation
  const baseMonth = useRef(today)

  useEffect(() => {
    refreshCodedDays()
    const id = window.setInterval(() => setToday(new Date()), 60_000)
    return () => window.clearInterval(id)
  }, [refreshCodedDays])

  const modifiers = useMemo(() => {
    // coded = any day user coded (includes today if isTodayComplete)
    const coded = (d: Date) => {
      if (isTodayComplete && isSameDay(d, today)) return true
      return codedDaysSet.has(toDateKey(d))
    }

    // pastCoded = past day AND coded (today excluded — today uses `coded`)
    const pastCoded = (d: Date) => {
      if (isSameDay(d, today)) return false
      if (!isPast(d, today)) return false
      return codedDaysSet.has(toDateKey(d))
    }

    // pastNotCoded = past day AND not coded
    const pastNotCoded = (d: Date) => {
      if (isSameDay(d, today)) return false
      if (!isPast(d, today)) return false
      return !codedDaysSet.has(toDateKey(d))
    }

    // Disable ALL days so clicks do nothing / no blue selection
    const disabled = () => true

    return { coded, pastCoded, pastNotCoded, disabled }
  }, [codedDaysSet, today, isTodayComplete])

  const modifiersClassNames = {
    // Green glow + tint for coded / today-done days — strong readable text
    coded:
      '!bg-emerald-500/18 !border-green-400/45 !text-pebble-text-primary font-semibold ' +
      'shadow-[inset_0_0_0_1px_rgba(74,222,128,0.55),0_0_0_1.5px_rgba(74,222,128,0.40),0_0_14px_6px_rgba(74,222,128,0.28),0_6px_20px_rgba(74,222,128,0.15)]',

    // Duller green for past coded — still readable via pebble-text-primary, slightly dimmed
    pastCoded:
      '!bg-emerald-500/10 !border-emerald-500/18 !text-pebble-text-primary ' +
      'shadow-[0_0_0_1px_rgba(16,185,129,0.12)] !opacity-80',

    // Dull grey for past non-coded
    pastNotCoded:
      '!bg-pebble-overlay/[0.03] !border-pebble-border/15 ' +
      '!text-pebble-text-muted !opacity-60',

    // Disable visual: no pointer, no hover effect
    disabled: 'cursor-default pointer-events-none',
  }

  return (
    <div
      className={classNames(
        'space-y-4 rounded-2xl border border-pebble-border/40 bg-pebble-canvas/60 backdrop-blur-md p-4 w-full mx-auto max-w-[380px]',
        className
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className={`text-sm font-semibold text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>
            {t('insights.streakCalendar.title')}
          </p>
          <p className={`text-[11px] text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
            {t('insights.streakCalendar.subtitle')}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="inline-flex items-center gap-1 rounded-full border border-pebble-warning/35 bg-pebble-warning/12 px-2 py-0.5 text-[10px] text-pebble-warning">
          <Flame className="h-2.5 w-2.5" aria-hidden="true" />
          <span className="ltrSafe font-semibold">{streak}</span>
        </span>
        <span className="inline-flex items-center gap-1 rounded-full border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2 py-0.5 text-[10px] text-pebble-text-secondary">
          <Trophy className="h-2.5 w-2.5" aria-hidden="true" />
          <span className={isRTL ? 'rtlText' : ''}>{t('insights.streak.longest')}</span>
          <span className="ltrSafe font-semibold text-pebble-text-primary">{longest}</span>
        </span>
        {isTodayComplete ? (
          <span className="inline-flex items-center gap-1 rounded-full border border-pebble-success/35 bg-pebble-success/12 px-2 py-0.5 text-[10px] text-pebble-success">
            <Check className="h-2.5 w-2.5" aria-hidden="true" />
            <span className={isRTL ? 'rtlText' : ''}>{t('insights.streak.todayDone')}</span>
          </span>
        ) : null}
      </div>

      <div className="pt-2">
        <div className="relative overflow-hidden rounded-2xl border border-pebble-border/25 bg-pebble-overlay/[0.03] p-1.5 sm:p-2">
          <Calendar
            month={baseMonth.current}
            disableNavigation
            showOutsideDays={false}
            modifiers={modifiers}
            modifiersClassNames={modifiersClassNames}
            className="w-full flex justify-center"
          />
        </div>
      </div>
    </div>
  )
}
