import { useMemo, useState } from 'react'
import { Badge } from '../ui/Badge'

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

  return (
    <div
      className={`fixed inset-0 z-50 transition ${
        open ? 'pointer-events-auto' : 'pointer-events-none'
      }`}
      aria-hidden={!open}
    >
      <button
        type="button"
        onClick={onClose}
        className={`absolute inset-0 bg-black/55 backdrop-blur-sm transition-opacity ${
          open ? 'opacity-100' : 'opacity-0'
        }`}
      />

      <aside
        className={`relative h-full w-[360px] max-w-[92vw] border-r border-white/10 bg-gradient-to-b from-[#0f1728] to-[#0a101d] p-4 shadow-[0_24px_80px_rgba(0,0,0,0.45)] transition-transform duration-200 ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-full min-h-0 flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.08em] text-white/45">Curriculum</p>
              <h2 className="text-lg font-semibold text-white">Units</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-sm text-white/70 transition hover:bg-white/10 hover:text-white"
            >
              Close
            </button>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-white/60">Progress</p>
              <Badge variant="neutral">
                {completedCount}/{units.length}
              </Badge>
            </div>
            <div className="h-2 overflow-hidden rounded-full border border-white/10 bg-white/[0.05]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-pebble-accent/85 to-sky-300/75 transition-all"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          <label className="space-y-1">
            <span className="text-xs text-white/50">Search units</span>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Loops, arrays, strings..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none placeholder:text-white/35 focus:border-pebble-accent/45"
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
                      : 'border-white/10 bg-white/[0.03] hover:bg-white/[0.08]'
                  }`}
                  onClick={() => {
                    onSelectUnit(index)
                    onClose()
                  }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold ${
                        isDone
                          ? 'bg-pebble-success/25 text-pebble-success'
                          : isCurrent
                            ? 'bg-pebble-accent/30 text-white'
                            : 'bg-white/10 text-white/60'
                      }`}
                    >
                      {isDone ? '✓' : index + 1}
                    </span>
                    <p className="text-sm font-medium text-white">{unit.title}</p>
                  </div>
                  <p className="mt-1 text-xs text-white/60">{unit.concept}</p>
                </button>
              )
            })}
          </div>
        </div>
      </aside>
    </div>
  )
}
