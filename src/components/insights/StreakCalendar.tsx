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
}

const WEEKDAY_BASE = new Date(Date.UTC(2024, 0, 1))

function addDays(base: Date, days: number) {
  const next = new Date(base)
  next.setUTCDate(base.getUTCDate() + days)
  return next
}

export function StreakCalendar({
  dailyMap,
  streak,
  longest,
  isTodayComplete,
  timeZone,
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
    <div className="space-y-2 rounded-2xl border border-pebble-border/30 bg-pebble-overlay/[0.05] p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-0.5">
          <p className={`text-sm font-semibold text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>
            {t('insights.streakCalendar.title')}
          </p>
          <p className={`text-xs text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
            {t('insights.streakCalendar.subtitle')}
          </p>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-1">
          <span className="inline-flex items-center gap-1 rounded-full border border-pebble-warning/35 bg-pebble-warning/12 px-2 py-0.5 text-[11px] text-pebble-warning">
            <Flame className="h-3 w-3" aria-hidden="true" />
            <span className="ltrSafe font-semibold">{streak}</span>
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2 py-0.5 text-[11px] text-pebble-text-secondary">
            <Trophy className="h-3 w-3" aria-hidden="true" />
            <span className={isRTL ? 'rtlText' : ''}>{t('insights.streak.longest')}</span>
            <span className="ltrSafe font-semibold text-pebble-text-primary">{longest}</span>
          </span>
          {isTodayComplete ? (
            <span className="inline-flex items-center gap-1 rounded-full border border-pebble-success/35 bg-pebble-success/12 px-2 py-0.5 text-[11px] text-pebble-success">
              <Check className="h-3 w-3" aria-hidden="true" />
              <span className={isRTL ? 'rtlText' : ''}>{t('insights.streak.todayDone')}</span>
            </span>
          ) : null}
        </div>
      </div>

      <div className="space-y-1.5 rounded-xl border border-pebble-border/25 bg-pebble-canvas/55 p-2">
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-pebble-border/35 bg-pebble-overlay/[0.08] text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.14] hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
            aria-label={t('insights.calendar.prevMonth')}
          >
            <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <p className={`text-xs font-medium text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>
            {monthLabel}
          </p>
          <button
            type="button"
            onClick={() => setCursor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))}
            className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-pebble-border/35 bg-pebble-overlay/[0.08] text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.14] hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
            aria-label={t('insights.calendar.nextMonth')}
          >
            <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {weekdayLabels.map((label) => (
            <span
              key={label}
              className={`text-center text-[10px] font-medium text-pebble-text-muted ${isRTL ? 'rtlText' : ''}`}
            >
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-0.5">
          {monthGrid.weeks.flat().map((day) => (
            <div
              key={day.key}
              title={
                day.isComplete
                  ? t('insights.calendar.completedCount', { count: day.count })
                  : t('insights.calendar.none')
              }
              className={`relative flex h-[26px] w-[26px] items-center justify-center rounded-md border text-[10px] transition ${
                day.isComplete
                  ? 'border-pebble-success/45 bg-pebble-success/20 text-pebble-success shadow-[0_0_0_1px_rgba(74,222,128,0.15)]'
                  : 'border-pebble-border/25 bg-pebble-overlay/[0.06] text-pebble-text-secondary'
              } ${day.isInMonth ? '' : 'opacity-45'} ${day.isToday ? 'ring-1 ring-pebble-accent/45' : ''}`}
            >
              <span className="ltrSafe">{day.dayNumber}</span>
              {day.isComplete ? (
                <span className="pointer-events-none absolute bottom-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-pebble-success" />
              ) : null}
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
