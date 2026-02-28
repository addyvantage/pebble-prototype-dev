import { Link } from 'react-router-dom'
import type { NextActionItem } from '../../lib/analyticsDerivers'
import { buttonClass } from '../ui/buttonStyles'

type NextTasksProps = {
  items: NextActionItem[]
  titleByUnitId: Record<string, string>
  labels: {
    empty: string
    continueAction: string
    syntaxAction: string
    debugAction: string
    complexityAction: string
    streakAction: string
    continueCta: string
  }
}

function rowCopy(
  row: NextActionItem,
  labels: NextTasksProps['labels'],
  titleByUnitId: Record<string, string>,
) {
  const unit = row.unitId ? titleByUnitId[row.unitId] ?? row.unitId : ''
  if (row.kind === 'continue-unit') {
    return {
      title: labels.continueAction,
      detail: unit,
      path: row.unitId ? `/session/1?unit=${row.unitId}` : '/session/1',
    }
  }
  if (row.kind === 'focus-syntax') {
    return { title: labels.syntaxAction, detail: unit, path: '/session/1' }
  }
  if (row.kind === 'focus-debug') {
    return { title: labels.debugAction, detail: unit, path: '/session/1' }
  }
  if (row.kind === 'raise-complexity') {
    return { title: labels.complexityAction, detail: unit, path: '/session/1' }
  }
  return { title: labels.streakAction, detail: unit, path: '/session/1' }
}

export function NextTasks({ items, titleByUnitId, labels }: NextTasksProps) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.05] p-3 text-sm text-pebble-text-secondary">
        {labels.empty}
      </div>
    )
  }

  return (
    <div className="space-y-2 rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.05] p-3">
      {items.slice(0, 3).map((row) => {
        const copy = rowCopy(row, labels, titleByUnitId)
        return (
          <div
            key={row.id}
            className="flex items-center justify-between gap-3 rounded-xl border border-pebble-border/28 bg-pebble-canvas/45 p-3"
          >
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-pebble-text-primary">{copy.title}</p>
              {copy.detail ? <p className="truncate text-xs text-pebble-text-secondary">{copy.detail}</p> : null}
            </div>
            <Link to={copy.path} className={`${buttonClass('secondary', 'sm')} shrink-0`}>
              {labels.continueCta}
            </Link>
          </div>
        )
      })}
    </div>
  )
}
