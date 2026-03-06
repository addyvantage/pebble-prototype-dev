import { useMemo, useState } from 'react'
import { Badge } from '../ui/Badge'
import { useI18n } from '../../i18n/useI18n'
import { useTheme } from '../../hooks/useTheme'

type UnitNavItem = {
  id: string
  title: string
  concept: string
}

type UnitsDrawerProps = {
  open: boolean
  units: UnitNavItem[]
  currentUnitIndex: number
  completedUnitIds: string[]
  onClose: () => void
  onSelectUnit: (index: number) => void
}

export function UnitsDrawer({
  open,
  units,
  currentUnitIndex,
  completedUnitIds,
  onClose,
  onSelectUnit,
}: UnitsDrawerProps) {
  const { t, isRTL } = useI18n()
  const { theme } = useTheme()
  const isUrdu = isRTL
  const isDark = theme === 'dark'
  const [query, setQuery] = useState('')

  const filteredUnits = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase()
    if (!normalizedQuery) {
      return units.map((unit, index) => ({ unit, index }))
    }

    return units
      .map((unit, index) => ({ unit, index }))
      .filter(({ unit }) => {
        return (
          unit.title.toLowerCase().includes(normalizedQuery) ||
          unit.concept.toLowerCase().includes(normalizedQuery)
        )
      })
  }, [query, units])

  const completedCount = units.filter((unit) => completedUnitIds.includes(unit.id)).length
  const progressPercent = units.length > 0 ? Math.round((completedCount / units.length) * 100) : 0

  if (!open) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 transition pointer-events-auto"
    >
      <button
        type="button"
        onClick={onClose}
        className={`absolute inset-0 backdrop-blur-[2px] transition-opacity opacity-100 ${
          isDark
            ? 'bg-[rgba(7,11,20,0.52)]'
            : 'bg-[rgba(179,194,222,0.34)]'
        }`}
      />

      <aside
        dir="ltr"
        className={`relative h-full w-[376px] max-w-[92vw] border-r p-5 backdrop-blur-xl shadow-[0_24px_80px_rgba(2,8,23,0.38),inset_0_1px_0_rgba(255,255,255,0.10)] transition-transform duration-200 translate-x-0 ${
          isDark
            ? 'border-white/12 bg-[linear-gradient(180deg,rgba(24,31,52,0.88)_0%,rgba(19,24,40,0.88)_100%)]'
            : 'border-[rgba(120,141,178,0.58)] bg-[linear-gradient(180deg,rgba(250,252,255,0.88)_0%,rgba(244,247,255,0.86)_100%)]'
        }`}
      >
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs uppercase tracking-[0.08em] text-pebble-text-secondary dark:text-[hsl(220_12%_78%)] ${isUrdu ? 'rtlText' : ''}`}>{t('units.curriculum')}</p>
              <h2 className={`text-lg font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{t('units.units')}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className={`rounded-xl border px-2.5 py-1 text-sm text-pebble-text-primary transition ${
                isDark
                  ? 'border-white/16 bg-white/[0.06] hover:bg-white/[0.11]'
                  : 'border-[rgba(120,141,178,0.52)] bg-white/56 hover:bg-white/72'
              }`}
            >
              {t('actions.close')}
            </button>
          </div>

          <div className={`space-y-3 rounded-[22px] border p-4 shadow-[0_10px_24px_rgba(2,8,23,0.12),inset_0_1px_0_rgba(255,255,255,0.16)] ${
            isDark
              ? 'border-white/16 bg-[rgba(39,49,74,0.62)]'
              : 'border-[rgba(120,141,178,0.48)] bg-[rgba(255,255,255,0.68)]'
          }`}>
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs text-pebble-text-primary dark:text-[hsl(220_20%_92%)] ${isUrdu ? 'rtlText' : ''}`}>{t('units.progress')}</p>
              <Badge variant="neutral" className={`${isDark ? 'border-white/22 bg-white/[0.10] text-[hsl(220_20%_92%)]' : 'border-[rgba(120,141,178,0.44)] bg-white/80 text-[rgba(23,37,64,0.94)]'}`}>
                {completedCount}/{units.length}
              </Badge>
            </div>
            <div className={`h-2 overflow-hidden rounded-full border ${
              isDark
                ? 'border-white/16 bg-[rgba(17,23,39,0.62)]'
                : 'border-[rgba(120,141,178,0.38)] bg-[rgba(227,236,250,0.92)]'
            }`}>
              <div
                className="h-full rounded-full bg-gradient-to-r from-pebble-accent/85 to-sky-300/75 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <label className="space-y-1">
            <span className={`text-xs text-pebble-text-secondary dark:text-[hsl(220_12%_78%)] ${isUrdu ? 'rtlText' : ''}`}>{t('units.search')}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('units.searchPlaceholder')}
              dir={isUrdu ? 'rtl' : 'ltr'}
              className={`w-full rounded-2xl border px-3.5 py-2.5 text-sm text-pebble-text-primary outline-none placeholder:text-pebble-text-secondary dark:placeholder:text-[hsl(220_12%_72%)] focus:border-pebble-accent/55 focus-visible:ring-2 focus-visible:ring-pebble-accent/35 focus-visible:ring-offset-0 ${
                isDark
                  ? 'border-white/16 bg-[rgba(41,51,75,0.74)]'
                  : 'border-[rgba(120,141,178,0.48)] bg-[rgba(255,255,255,0.76)]'
              } ${
                isUrdu ? 'text-right' : ''
              }`}
            />
          </label>

          <div className="pebble-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredUnits.map(({ unit, index }) => {
              const isCurrent = index === currentUnitIndex
              const isDone = completedUnitIds.includes(unit.id)

              return (
                <button
                  key={unit.id}
                  type="button"
                  className={`w-full rounded-2xl border px-3.5 py-3 text-left transition ${
                    isCurrent
                      ? isDark
                        ? 'border-pebble-accent/65 bg-[rgba(74,124,255,0.18)] shadow-[inset_0_1px_0_rgba(170,205,255,0.12)]'
                        : 'border-pebble-accent/58 bg-[rgba(89,138,255,0.14)] shadow-[inset_0_1px_0_rgba(255,255,255,0.74)]'
                      : isDark
                        ? 'border-white/10 bg-[rgba(34,42,64,0.66)] hover:bg-[rgba(44,53,77,0.78)]'
                        : 'border-[rgba(120,141,178,0.36)] bg-[rgba(255,255,255,0.56)] hover:bg-[rgba(255,255,255,0.74)]'
                  }`}
                  onClick={() => {
                    onSelectUnit(index)
                    onClose()
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold ${
                        isDone
                          ? isDark
                            ? 'bg-emerald-300/24 text-emerald-100'
                            : 'bg-emerald-500/22 text-emerald-700'
                          : isCurrent
                            ? isDark
                              ? 'bg-pebble-accent/40 text-[hsl(220_20%_95%)]'
                              : 'bg-pebble-accent/28 text-[rgba(20,35,66,0.95)]'
                            : isDark
                              ? 'bg-white/[0.10] text-[hsl(220_12%_78%)]'
                              : 'bg-white/70 text-pebble-text-secondary'
                      }`}
                    >
                      {isDone ? '✓' : index + 1}
                    </span>
                    <p className={`text-sm font-medium text-pebble-text-primary dark:text-[hsl(220_20%_92%)] ${isUrdu ? 'rtlText' : ''}`}>{unit.title}</p>
                  </div>
                    <p className={`mt-1.5 text-xs leading-5 text-pebble-text-secondary dark:text-[hsl(220_12%_74%)] ${isUrdu ? 'rtlText' : ''}`}>{unit.concept}</p>
                </button>
              )
            })}
          </div>
        </div>
      </aside>
    </div>
  )
}
