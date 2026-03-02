import { Card } from '../ui/Card'

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
  return (
    <Card padding="sm" interactive className="space-y-1.5">
      <div className="space-y-0">
        <h2 className={`text-base font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{title}</h2>
        <p className={`text-sm text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {topics.map((entry) => {
          const selected = selectedTopics.includes(entry.id)
          return (
            <button
              key={entry.id}
              type="button"
              onClick={() => onToggleTopic(entry.id)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-all duration-150 ease-out hover:-translate-y-[0.5px] hover:shadow-[0_6px_16px_rgba(0,0,0,0.12)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${selected
                  ? 'border-pebble-accent/45 bg-pebble-accent/14 text-pebble-text-primary'
                  : 'border-pebble-border/35 bg-pebble-chip-surface text-pebble-text-secondary hover:border-pebble-border/50'
                }`}
            >
              <span>{entry.label}</span>
              <span
                className={`ltrSafe min-w-[26px] text-center rounded-full px-1.5 py-0.5 text-[11px] font-semibold leading-none shadow-[0_1px_0_rgba(255,255,255,0.06)] ${selected
                    ? 'border border-pebble-accent/30 bg-pebble-accent/20 text-pebble-text-primary'
                    : 'border border-pebble-border/20 bg-pebble-canvas text-pebble-text-muted'
                  }`}
              >
                {formatCount(entry.count)}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
