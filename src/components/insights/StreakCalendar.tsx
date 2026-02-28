import { Check, ChevronLeft, ChevronRight, Flame, Trophy } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useI18n } from '../../i18n/useI18n'
import { getLanguageOption } from '../../i18n/languages'
import {
  selectMonthGrid,
  type DailyCompletionMap,
} from '../../lib/analyticsDerivers'

type StreakCalendarProps = {
  dailyMap: DailyCompletionMap
  streak: number
  longest: number
  isTodayComplete: boolean
  timeZone: string
  className?: string
}

const WEEKDAY_BASE = new Date(Date.UTC(2024, 0, 1))

function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setUTCDate(base.getUTCDate() + days)
  return next
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function StreakCalendar({
  dailyMap,
  streak,
  longest,
  isTodayComplete,
  timeZone,
  className,
}: StreakCalendarProps) {
  const { t, lang, isRTL } = useI18n()
  const locale = getLanguageOption(lang).locale
  const [cursor, setCursor] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })

  const monthGrid = useMemo(
    () => selectMonthGrid(dailyMap, cursor.getFullYear(), cursor.getMonth(), timeZone),
    [cursor, dailyMap, timeZone],
  )

  const weekdayLabels = useMemo(
    () =>
      Array.from({ length: 7 }, (_, index) =>
        new Intl.DateTimeFormat(locale, {
          weekday: 'short',
          timeZone: 'UTC',
        }).format(addDays(WEEKDAY_BASE, index)),
      ),
    [locale],
  )

  const monthLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(locale, {
        month: 'long',
        year: 'numeric',
        timeZone,
      }).format(cursor),
    [cursor, locale, timeZone],
  )
  const completedDays = useMemo(
    () => Object.values(dailyMap).filter((entry) => entry.completed).length,
    [dailyMap],
  )

  return (
    <div className={classNames('space-y-2.5', className)}>
      <div className="flex items-start justify-between gap-2">
        <div className="space-y-0.5">
          <p className={`text-sm font-semibold text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>
            {t('insights.streakCalendar.title')}
          </p>
          <p className={`text-[11px] text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
            {t('insights.streakCalendar.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-pebble-border/35 bg-pebble-overlay/[0.08] text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.14] hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
            aria-label={t('insights.calendar.prevMonth')}
          >
            <ChevronLeft className="h-3 w-3" aria-hidden="true" />
          </button>
          <p className={`w-[94px] text-center text-[11px] font-medium text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-pebble-border/35 bg-pebble-overlay/[0.08] text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.14] hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
            aria-label={t('insights.calendar.nextMonth')}
          >
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
          </button>
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

      <div className="space-y-1.5 rounded-xl border border-pebble-border/25 bg-pebble-canvas/55 p-2">
        <div className="grid grid-cols-7 gap-1">
          {weekdayLabels.map((label) => (
            <span
              key={label}
              className={`text-center text-[11px] font-medium text-pebble-text-muted ${isRTL ? 'rtlText' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {monthGrid.weeks.flat().map((day) => (
            <div
              key={day.key}
              title={
                day.isComplete
                  ? t('insights.calendar.completedCount', { count: day.count })
                  : t('insights.calendar.none')
              }
              className={`relative flex h-7 w-7 items-center justify-center rounded-lg border text-[12px] font-medium transition sm:h-8 sm:w-8 ${day.isComplete
                ? 'border-pebble-success/40 bg-pebble-success/18 text-pebble-success'
                : 'border-pebble-border/25 bg-pebble-overlay/[0.05] text-pebble-text-secondary hover:bg-pebble-overlay/[0.1]'
              } ${day.isInMonth ? '' : 'opacity-40'} ${day.isToday ? 'ring-2 ring-pebble-accent/35' : ''}`}
            >
              <span className="ltrSafe">{day.dayNumber}</span>
            </div>
          ))}
        </div>

        {completedDays === 0 ? (
          <p className={`text-xs text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
            {t('insights.streakCalendar.empty')}
          </p>
        ) : null}
      </div>
    </div>
  )
}
