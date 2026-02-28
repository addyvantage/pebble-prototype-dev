import { Card } from '../ui/Card'
import { Badge } from '../ui/Badge'
import type { PlacementMcqQuestion } from '../../data/placementBank'

type McqQuestionCardProps = {
  question: PlacementMcqQuestion
  questionNumber: number
  selectedIndex: number | null
  onSelect: (optionIndex: number) => void
}

function optionClass(isSelected: boolean) {
  return `w-full rounded-2xl border px-4 py-3 text-left text-sm font-medium transition ${
    isSelected
      ? 'border-pebble-accent/50 bg-pebble-accent/14 text-pebble-text-primary shadow-[0_10px_24px_rgba(2,8,23,0.2)]'
      : 'border-pebble-border/30 bg-pebble-overlay/[0.05] text-pebble-text-secondary hover:border-pebble-border/45 hover:bg-pebble-overlay/[0.1] hover:text-pebble-text-primary'
  }`
}

export function McqQuestionCard({
  question,
  questionNumber,
  selectedIndex,
  onSelect,
}: McqQuestionCardProps) {
  return (
    <Card padding="lg" className="space-y-5" interactive>
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">
            Multiple choice
          </p>
          <Badge variant="neutral">{question.difficulty}</Badge>
        </div>
        <h2 className="text-balance text-2xl font-semibold tracking-[-0.01em] text-pebble-text-primary sm:text-[1.9rem]">
          {questionNumber}. {question.prompt}
        </h2>
      </div>

      <div className="grid gap-3">
        {question.options.map((option, index) => (
          <button
            key={option}
            type="button"
            className={optionClass(selectedIndex === index)}
            onClick={() => onSelect(index)}
          >
            <span className="mr-2 text-pebble-text-muted">{String.fromCharCode(65 + index)}.</span>
            {option}
          </button>
        ))}
      </div>
    </Card>
  )
}
