import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Bot, CheckCheck, CircleAlert, Rocket, User, X } from 'lucide-react'
import {
  clearNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  useNotifications,
  type NotificationCategory,
  type NotificationItem,
} from '../../lib/notificationsStore'
import { useTheme } from '../../hooks/useTheme'

export type NotificationCenterProps = {
  open: boolean
  onClose: () => void
}

type NotificationFilter = 'all' | NotificationCategory

const FILTERS: Array<{ id: NotificationFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'coach', label: 'Coach' },
  { id: 'progress', label: 'Progress' },
  { id: 'system', label: 'System' },
]

function formatRelativeTime(timestamp: number) {
  const deltaSeconds = Math.round((timestamp - Date.now()) / 1000)
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

  const absSeconds = Math.abs(deltaSeconds)
  if (absSeconds < 60) {
    return rtf.format(deltaSeconds, 'second')
  }
  const minutes = Math.round(deltaSeconds / 60)
  if (Math.abs(minutes) < 60) {
    return rtf.format(minutes, 'minute')
  }
  const hours = Math.round(minutes / 60)
  if (Math.abs(hours) < 24) {
    return rtf.format(hours, 'hour')
  }
  const days = Math.round(hours / 24)
  return rtf.format(days, 'day')
}

function categoryIcon(category: NotificationCategory) {
  if (category === 'coach') {
    return Bot
  }
  if (category === 'progress') {
    return Rocket
  }
  return User
}

function semanticTone(item: NotificationItem) {
  const text = `${item.title} ${item.message}`.toLowerCase()

  if (item.category === 'coach') {
    return {
      accent: 'coach',
      row: item.read
        ? 'border-sky-500/18 bg-sky-500/[0.04] hover:border-sky-500/28 hover:bg-sky-500/[0.07] dark:border-sky-400/16 dark:bg-sky-400/[0.06] dark:hover:border-sky-400/28 dark:hover:bg-sky-400/[0.10]'
        : 'border-sky-500/30 bg-sky-500/[0.10] shadow-[0_14px_34px_rgba(37,99,235,0.12)] hover:border-sky-500/42 hover:bg-sky-500/[0.14] dark:border-sky-400/30 dark:bg-sky-400/[0.14] dark:hover:border-sky-300/38 dark:hover:bg-sky-400/[0.18]',
      icon: 'border-sky-500/24 bg-sky-500/[0.10] text-sky-700 dark:border-sky-400/24 dark:bg-sky-400/[0.16] dark:text-sky-100',
      strip: 'bg-sky-500/70 dark:bg-sky-400/80',
    }
  }

  if (text.includes('fail') || text.includes('incorrect') || text.includes('error')) {
    return {
      accent: 'fail',
      row: item.read
        ? 'border-rose-500/18 bg-rose-500/[0.04] hover:border-rose-500/28 hover:bg-rose-500/[0.07] dark:border-rose-400/16 dark:bg-rose-400/[0.06] dark:hover:border-rose-400/28 dark:hover:bg-rose-400/[0.10]'
        : 'border-rose-500/30 bg-rose-500/[0.10] shadow-[0_14px_34px_rgba(190,24,93,0.10)] hover:border-rose-500/42 hover:bg-rose-500/[0.14] dark:border-rose-400/30 dark:bg-rose-400/[0.14] dark:hover:border-rose-300/38 dark:hover:bg-rose-400/[0.18]',
      icon: 'border-rose-500/24 bg-rose-500/[0.10] text-rose-700 dark:border-rose-400/24 dark:bg-rose-400/[0.16] dark:text-rose-100',
      strip: 'bg-rose-500/70 dark:bg-rose-400/80',
    }
  }

  if (text.includes('unlock') || text.includes('streak') || text.includes('milestone')) {
    return {
      accent: 'unlock',
      row: item.read
        ? 'border-violet-500/18 bg-violet-500/[0.04] hover:border-violet-500/28 hover:bg-violet-500/[0.07] dark:border-violet-400/16 dark:bg-violet-400/[0.06] dark:hover:border-violet-400/28 dark:hover:bg-violet-400/[0.10]'
        : 'border-violet-500/28 bg-violet-500/[0.09] shadow-[0_14px_34px_rgba(109,40,217,0.12)] hover:border-violet-500/40 hover:bg-violet-500/[0.13] dark:border-violet-400/28 dark:bg-violet-400/[0.14] dark:hover:border-violet-300/36 dark:hover:bg-violet-400/[0.18]',
      icon: 'border-violet-500/24 bg-violet-500/[0.10] text-violet-700 dark:border-violet-400/24 dark:bg-violet-400/[0.16] dark:text-violet-100',
      strip: 'bg-violet-500/70 dark:bg-violet-400/80',
    }
  }

  if (text.includes('accepted') || text.includes('complete') || text.includes('passed')) {
    return {
      accent: 'success',
      row: item.read
        ? 'border-emerald-500/18 bg-emerald-500/[0.04] hover:border-emerald-500/28 hover:bg-emerald-500/[0.07] dark:border-emerald-400/16 dark:bg-emerald-400/[0.06] dark:hover:border-emerald-400/28 dark:hover:bg-emerald-400/[0.10]'
        : 'border-emerald-500/28 bg-emerald-500/[0.09] shadow-[0_14px_34px_rgba(5,150,105,0.10)] hover:border-emerald-500/40 hover:bg-emerald-500/[0.13] dark:border-emerald-400/28 dark:bg-emerald-400/[0.14] dark:hover:border-emerald-300/36 dark:hover:bg-emerald-400/[0.18]',
      icon: 'border-emerald-500/24 bg-emerald-500/[0.10] text-emerald-700 dark:border-emerald-400/24 dark:bg-emerald-400/[0.16] dark:text-emerald-100',
      strip: 'bg-emerald-500/70 dark:bg-emerald-400/80',
    }
  }

  return {
    accent: 'neutral',
    row: item.read
      ? 'border-slate-500/16 bg-slate-500/[0.04] hover:border-slate-500/24 hover:bg-slate-500/[0.06] dark:border-white/[0.08] dark:bg-white/[0.04] dark:hover:border-white/[0.14] dark:hover:bg-white/[0.07]'
      : 'border-slate-500/24 bg-slate-500/[0.07] shadow-[0_12px_28px_rgba(55,72,110,0.08)] hover:border-slate-500/34 hover:bg-slate-500/[0.10] dark:border-white/[0.12] dark:bg-white/[0.07] dark:hover:border-white/[0.18] dark:hover:bg-white/[0.10]',
    icon: 'border-slate-500/22 bg-slate-500/[0.08] text-slate-700 dark:border-white/[0.14] dark:bg-white/[0.08] dark:text-[hsl(220_18%_88%)]',
    strip: 'bg-slate-500/55 dark:bg-white/45',
  }
}

function NotificationRow({
  item,
  onSelect,
}: {
  item: NotificationItem
  onSelect: (item: NotificationItem) => void
}) {
  const Icon = categoryIcon(item.category)
  const tone = semanticTone(item)

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      className={`group relative overflow-hidden flex w-full items-start gap-3 rounded-[20px] border px-4 py-3.5 text-left transition duration-200 ${tone.row}`}
    >
      <span className={`absolute inset-y-3 left-0 w-[3px] rounded-full ${tone.strip}`} />
      <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] border ${tone.icon}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-start justify-between gap-3">
          <span className="truncate text-[13.5px] font-semibold tracking-[0.01em] text-pebble-text-primary">{item.title}</span>
          <span className="shrink-0 pt-0.5 text-[11px] font-medium text-pebble-text-muted">{formatRelativeTime(item.createdAt)}</span>
        </span>
        <span className="mt-1.5 line-clamp-2 block text-[12.5px] leading-5 text-pebble-text-secondary">{item.message}</span>
      </span>
    </button>
  )
}

function EmptyState() {
  return (
    <div className="rounded-[22px] border border-pebble-border/24 bg-pebble-overlay/[0.05] px-4 py-8 text-center dark:border-white/[0.08] dark:bg-[hsl(222_24%_20%)]">
      <div className="mx-auto inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-pebble-border/24 bg-pebble-overlay/[0.08] text-pebble-text-secondary">
        <Bell className="h-4 w-4" />
      </div>
      <p className="mt-3 text-sm font-semibold text-pebble-text-primary dark:text-[hsl(220_20%_92%)]">You&apos;re all caught up.</p>
      <p className="mt-1 text-xs leading-5 text-pebble-text-secondary dark:text-[hsl(220_12%_70%)]">Run a solution or start a unit to see updates.</p>
    </div>
  )
}

function PanelContent({
  filter,
  onFilterChange,
  onClose,
  showClose,
}: {
  filter: NotificationFilter
  onFilterChange: (filter: NotificationFilter) => void
  onClose: () => void
  showClose: boolean
}) {
  const navigate = useNavigate()
  const { theme } = useTheme()
  const { items } = useNotifications()

  const unreadCount = useMemo(
    () => items.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [items],
  )

  const filteredItems = useMemo(() => {
    if (filter === 'all') {
      return items
    }
    return items.filter((item) => item.category === filter)
  }, [filter, items])

  function handleSelect(item: NotificationItem) {
    if (!item.read) {
      markNotificationRead(item.id)
    }
    if (item.actionRoute) {
      navigate(item.actionRoute)
    }
    onClose()
  }

  const actionButtonBaseClass =
    'inline-flex h-9 items-center justify-center gap-1.5 rounded-2xl border px-3.5 text-[11.5px] font-semibold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'

  return (
    <div
      className={`pebble-panel-float relative flex max-h-[min(78vh,560px)] min-h-[440px] w-full flex-col rounded-[24px] px-4 py-4 ${
        theme === 'dark'
          ? 'isolate overflow-hidden border-white/[0.08] bg-[linear-gradient(180deg,rgba(24,30,47,0.99)_0%,rgba(19,24,38,0.99)_100%)]'
          : 'isolate overflow-hidden border-pebble-border/30 bg-[linear-gradient(180deg,rgba(251,253,255,0.995)_0%,rgba(243,247,255,0.99)_100%)]'
      }`}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-pebble-overlay/[0.06] via-transparent to-transparent" />
      <div className="pebble-shell-subtle rounded-[20px] px-3.5 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="pebble-control inline-flex h-9 w-9 items-center justify-center rounded-[14px] px-0 text-pebble-text-secondary">
            <Bell className="h-4 w-4" aria-hidden="true" />
          </span>
          <div>
              <p className="text-[15px] font-semibold text-pebble-text-primary">Notifications</p>
              <p className="text-[11px] font-medium text-pebble-text-muted">{unreadCount} unread</p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => markAllNotificationsRead()}
              className={`${actionButtonBaseClass} pebble-control text-pebble-text-secondary`}
            >
              <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
              Mark all
            </button>
            <button
              type="button"
              onClick={() => clearNotifications()}
              className={`${actionButtonBaseClass} border-rose-400/26 bg-rose-500/[0.08] text-rose-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.10)] hover:border-rose-400/44 hover:bg-rose-500/[0.13] dark:border-[rgba(255,102,102,0.30)] dark:bg-[rgba(255,92,92,0.11)] dark:text-[rgba(255,140,140,0.98)] dark:hover:border-[rgba(255,120,120,0.44)] dark:hover:bg-[rgba(255,92,92,0.16)]`}
            >
              <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />
              Clear
            </button>
            {showClose ? (
              <button
                type="button"
                onClick={onClose}
                className={`${actionButtonBaseClass} pebble-control h-9 w-9 px-0 text-pebble-text-secondary`}
                aria-label="Close notifications"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <div className="pebble-segment-rail mt-3 rounded-[18px] p-1">
        <div className="flex items-center gap-1">
        {FILTERS.map((entry) => {
          const active = filter === entry.id
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onFilterChange(entry.id)}
              className={`inline-flex h-9 flex-1 items-center justify-center rounded-[14px] px-2.5 text-[12px] font-semibold transition ${
                active
                  ? 'border border-pebble-accent/38 bg-pebble-accent/14 text-pebble-text-primary shadow-[0_10px_18px_rgba(37,99,235,0.14)] dark:bg-[rgba(90,140,255,0.16)] dark:text-[hsl(220_20%_95%)]'
                  : 'text-pebble-text-secondary dark:text-[hsl(220_10%_74%)] hover:bg-pebble-overlay/[0.12] hover:text-pebble-text-primary dark:hover:bg-white/[0.07] dark:hover:text-[hsl(220_20%_92%)]'
              }`}
            >
              {entry.label}
            </button>
          )
        })}
        </div>
      </div>

      <div className="pebble-scrollbar mt-3 min-h-0 flex-1 overflow-y-auto pr-1">
        <div className="space-y-2.5">
          {filteredItems.length === 0
            ? <EmptyState />
            : filteredItems.map((item) => (
              <NotificationRow key={item.id} item={item} onSelect={handleSelect} />
            ))}
        </div>
      </div>
    </div>
  )
}

export function NotificationCenter({ open, onClose }: NotificationCenterProps) {
  const [filter, setFilter] = useState<NotificationFilter>('all')

  if (!open) {
    return null
  }

  return (
    <>
      <div
        className="absolute right-0 top-[calc(100%+0.65rem)] z-[260] hidden w-[380px] lg:block"
        data-notification-center-root="true"
      >
        <PanelContent
          filter={filter}
          onFilterChange={setFilter}
          onClose={onClose}
          showClose={false}
        />
      </div>

      <div
        className="fixed inset-0 z-[260] lg:hidden"
        role="dialog"
        aria-modal="true"
        aria-label="Notifications panel"
        data-notification-center-root="true"
      >
        <button
          type="button"
          aria-label="Close notifications"
          className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
          onClick={onClose}
        />
        <div className="absolute inset-x-0 bottom-0 max-h-[84vh] rounded-t-[24px] border border-pebble-border/35 bg-pebble-panel/96 p-3 shadow-[0_-16px_48px_rgba(2,8,23,0.38)]">
          <PanelContent
            filter={filter}
            onFilterChange={setFilter}
            onClose={onClose}
            showClose
          />
        </div>
      </div>
    </>
  )
}
