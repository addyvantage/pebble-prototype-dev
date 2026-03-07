import { ChevronDown, Sparkles } from 'lucide-react'
import { useMemo, useState } from 'react'
import { Card } from '../ui/Card'
import { useTheme } from '../../hooks/useTheme'

type TopicEntry = {
  id: string
  label: string
  count: number
}

type TopicCloudProps = {
  topics: TopicEntry[]
  selectedTopics: string[]
  onToggleTopic: (topicId: string) => void
  title: string
  subtitle: string
  isUrdu: boolean
}

function formatCount(n: number) {
  if (n <= 99) return String(n)
  return '99+'
}

export function TopicCloud({
  topics,
  selectedTopics,
  onToggleTopic,
  title,
  subtitle,
  isUrdu,
}: TopicCloudProps) {
  const { theme } = useTheme()
  const isDark = theme === 'dark'
  const [expanded, setExpanded] = useState(false)
  const featuredTopics = useMemo(() => topics.slice(0, 12), [topics])
  const hiddenCount = Math.max(0, topics.length - featuredTopics.length)
  const visibleTopics = expanded ? topics : featuredTopics
  const eyebrowPillClass = isDark
    ? 'inline-flex items-center gap-2 rounded-full border border-[rgba(132,168,255,0.28)] bg-[linear-gradient(180deg,rgba(20,31,62,0.88)_0%,rgba(14,24,49,0.92)_100%)] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[hsl(218_85%_92%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_10px_24px_rgba(8,15,35,0.24)] transition-colors duration-150 hover:border-[rgba(144,182,255,0.4)] hover:text-[hsl(220_100%_96%)]'
    : 'inline-flex items-center gap-2 rounded-full border border-[rgba(88,122,196,0.18)] bg-[linear-gradient(180deg,rgba(250,252,255,0.98)_0%,rgba(240,246,255,0.94)_100%)] px-3 py-1.5 text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[hsl(222_34%_34%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82),0_8px_22px_rgba(89,109,148,0.08)] transition-colors duration-150 hover:border-[rgba(88,122,196,0.28)] hover:text-[hsl(222_36%_28%)]'
  const eyebrowIconClass = isDark ? 'h-3.5 w-3.5 text-[hsl(216_92%_74%)]' : 'h-3.5 w-3.5 text-[hsl(220_82%_56%)]'

  return (
    <Card padding="sm" interactive className="problems-subsection-shell space-y-3 rounded-[28px] p-4 md:p-5">
      <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className={`pebble-section-label ${eyebrowPillClass}`}>
            <Sparkles className={eyebrowIconClass} aria-hidden="true" />
            Topic intelligence
          </div>
          <div className="space-y-0.5">
            <h2 className={`text-[1.02rem] font-semibold tracking-tight text-pebble-text-primary md:text-[1.1rem] ${isUrdu ? 'rtlText' : ''}`}>{title}</h2>
            <p className={`max-w-[58ch] text-[13px] leading-[1.6] text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{subtitle}</p>
          </div>
        </div>
        <div className="pebble-chip rounded-full px-2.5 py-0.5 text-[10.5px] font-medium">
          {selectedTopics.length}/{topics.length}
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {visibleTopics.map((entry) => {
          const selected = selectedTopics.includes(entry.id)
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onToggleTopic(entry.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium transition-all duration-150 ease-out hover:-translate-y-[0.5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${selected
                  ? isDark
                    ? 'border-pebble-accent/52 bg-pebble-accent/18 text-[hsl(220_20%_94%)] shadow-[0_12px_24px_rgba(15,23,42,0.24)]'
                    : 'border-pebble-accent/46 bg-pebble-accent/14 text-[hsl(223_34%_22%)] shadow-[0_12px_24px_rgba(55,72,110,0.10)]'
                  : isDark
                    ? 'border-pebble-border/24 bg-pebble-chip-surface/60 text-[hsl(220_16%_84%)] hover:border-pebble-border/38 hover:bg-pebble-chip-surface/78'
                    : 'border-pebble-border/24 bg-white/74 text-[hsl(221_22%_40%)] hover:border-pebble-border/38 hover:bg-white/92'
                }`}
            >
              <span>{entry.label}</span>
              <span
                className={`ltrSafe min-w-[28px] text-center rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold leading-none ${selected
                    ? isDark
                      ? 'border border-pebble-accent/34 bg-pebble-accent/20 text-[hsl(220_20%_94%)]'
                      : 'border border-pebble-accent/30 bg-pebble-accent/18 text-[hsl(223_34%_24%)]'
                    : isDark
                      ? 'border border-pebble-border/20 bg-pebble-canvas/78 text-[hsl(220_12%_68%)]'
                      : 'border border-pebble-border/18 bg-[rgba(228,234,246,0.95)] text-[hsl(220_18%_46%)]'
                  }`}
              >
                {formatCount(entry.count)}
              </span>
            </button>
          )
        })}
        {hiddenCount > 0 ? (
          <button
            type="button"
            onClick={() => setExpanded((current) => !current)}
            className={`pebble-control inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11.5px] font-medium transition-all duration-150 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${
              isDark
                ? 'text-[hsl(220_16%_84%)]'
                : 'text-[hsl(221_24%_36%)]'
            }`}
          >
            <ChevronDown className={`h-3.5 w-3.5 transition ${expanded ? 'rotate-180' : ''}`} aria-hidden="true" />
            <span>{expanded ? '−' : '+'}{hiddenCount}</span>
          </button>
        ) : null}
      </div>
    </Card>
  )
}
