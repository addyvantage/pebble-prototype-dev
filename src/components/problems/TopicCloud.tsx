import { Card } from '../ui/Card'

type TopicEntry = {
  topic: string
  count: number
}

type TopicCloudProps = {
  topics: TopicEntry[]
  selectedTopics: string[]
  onToggleTopic: (topic: string) => void
  title: string
  subtitle: string
  isUrdu: boolean
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
    <Card padding="sm" interactive className="space-y-3">
      <div className="space-y-1">
        <h2 className={`text-base font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{title}</h2>
        <p className={`text-sm text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{subtitle}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {topics.map((entry) => {
          const selected = selectedTopics.includes(entry.topic)
          return (
            <button
              key={entry.topic}
              type="button"
              onClick={() => onToggleTopic(entry.topic)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${
                selected
                  ? 'border-pebble-accent/45 bg-pebble-accent/14 text-pebble-text-primary'
                  : 'border-pebble-border/32 bg-pebble-overlay/[0.07] text-pebble-text-secondary hover:bg-pebble-overlay/[0.14]'
              }`}
            >
              <span className="ltrSafe">{entry.topic}</span>
              <span className="ltrSafe rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.08] px-1.5 py-0.5 text-[10px] text-pebble-text-muted">
                {entry.count}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}
