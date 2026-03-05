import { useMemo, useState } from 'react'
import { Badge } from '../ui/Badge'
import { useI18n } from '../../i18n/useI18n'

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
  const isUrdu = isRTL
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
        className="absolute inset-0 bg-black/45 backdrop-blur-sm transition-opacity opacity-100"
      />

      <aside
        dir="ltr"
        className="relative h-full w-[360px] max-w-[92vw] border-r border-pebble-border/30 bg-gradient-to-b from-pebble-panel/95 to-pebble-canvas/85 p-4 shadow-[0_24px_80px_rgba(2,8,23,0.38)] transition-transform duration-200 translate-x-0"
      >
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className={`text-xs uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>{t('units.curriculum')}</p>
              <h2 className={`text-lg font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{t('units.units')}</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.08] px-2.5 py-1 text-sm text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.16] hover:text-pebble-text-primary"
            >
              {t('actions.close')}
            </button>
          </div>

          <div className="space-y-2 rounded-2xl border border-pebble-border/30 bg-pebble-overlay/[0.06] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className={`text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{t('units.progress')}</p>
              <Badge variant="neutral">
                {completedCount}/{units.length}
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.08]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pebble-accent/85 to-sky-300/75 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <label className="space-y-1">
            <span className={`text-xs text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>{t('units.search')}</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t('units.searchPlaceholder')}
              dir={isUrdu ? 'rtl' : 'ltr'}
              className={`w-full rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.08] px-3 py-2 text-sm text-pebble-text-primary outline-none placeholder:text-pebble-text-muted focus:border-pebble-accent/45 ${
                isUrdu ? 'text-right' : ''
              }`}
            />
          </label>

          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
            {filteredUnits.map(({ unit, index }) => {
              const isCurrent = index === currentUnitIndex
              const isDone = completedUnitIds.includes(unit.id)

              return (
                <button
                  key={unit.id}
                  type="button"
                  className={`w-full rounded-xl border px-3 py-2 text-left transition ${
                    isCurrent
                      ? 'border-pebble-accent/45 bg-pebble-accent/12'
                      : 'border-pebble-border/30 bg-pebble-overlay/[0.06] hover:bg-pebble-overlay/[0.12]'
                  }`}
                  onClick={() => {
                    onSelectUnit(index)
                    onClose()
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs font-semibold ${
                        isDone
                          ? 'bg-pebble-success/25 text-pebble-success'
                          : isCurrent
                            ? 'bg-pebble-accent/30 text-pebble-text-primary'
                            : 'bg-pebble-overlay/[0.12] text-pebble-text-secondary'
                      }`}
                    >
                      {isDone ? '✓' : index + 1}
                    </span>
                    <p className={`text-sm font-medium text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{unit.title}</p>
                  </div>
                  <p className={`mt-1 text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{unit.concept}</p>
                </button>
              )
            })}
          </div>
        </div>
      </aside>
    </div>
  )
}
