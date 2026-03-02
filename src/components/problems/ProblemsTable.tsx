import { CheckCircle2, ChevronRight, Circle } from 'lucide-react'
import type { ProblemDefinition } from '../../data/problemsBank'
import { DifficultyPill } from '../ui/DifficultyPill'

const SHARED_GRID =
  'grid grid-cols-[64px_minmax(0,1fr)_130px_140px_100px] gap-4 items-center px-4'

type ProblemsTableProps = {
  rows: ProblemDefinition[]
  solvedMap: Record<string, { solvedAt: number; attempts: number }>
  emptyLabel: string
  openLabel: string
  headings: {
    index: string
    title: string
    difficulty: string
    acceptance: string
    action: string
  }
  difficultyLabels: Record<ProblemDefinition['difficulty'], string>
  onOpenProblem: (problem: ProblemDefinition) => void
  isUrdu: boolean
}

export function ProblemsTable({
  rows,
  solvedMap,
  emptyLabel,
  openLabel,
  headings,
  difficultyLabels,
  onOpenProblem,
  isUrdu,
}: ProblemsTableProps) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-pebble-border/28 bg-pebble-overlay/[0.04] p-6 text-center text-sm text-pebble-text-secondary">
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-pebble-border/28 bg-pebble-overlay/[0.04]">
      <div
        className={`${SHARED_GRID} border-b border-pebble-border/25 bg-pebble-canvas/70 py-3 text-sm font-medium text-pebble-text-secondary`}
      >
        <span className="ltrSafe text-center">{headings.index}</span>
        <span className={isUrdu ? 'rtlText' : ''}>{headings.title}</span>
        <span>{headings.difficulty}</span>
        <span className="ltrSafe">{headings.acceptance}</span>
        <span className={isUrdu ? 'rtlText text-center' : 'text-center'}>{headings.action}</span>
      </div>

      <div className="max-h-[460px] overflow-y-auto">
        {rows.map((problem) => {
          const solved = Boolean(solvedMap[problem.id]?.solvedAt)
          return (
            <button
              key={problem.id}
              type="button"
              onClick={() => onOpenProblem(problem)}
              className={`${SHARED_GRID} w-full border-b border-pebble-border/20 py-2.5 text-left transition hover:bg-pebble-overlay/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45`}
            >
              <span className="inline-flex w-full items-center justify-center">
                {solved ? (
                  <CheckCircle2 className="h-4 w-4 text-pebble-success" aria-hidden="true" />
                ) : (
                  <Circle className="h-4 w-4 text-pebble-text-muted" aria-hidden="true" />
                )}
              </span>

              <span className="min-w-0 space-y-1">
                <span className={`block truncate text-sm font-medium text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
                  {problem.title}
                </span>
                <span className="flex flex-wrap gap-1">
                  {problem.topics.slice(0, 3).map((topic) => (
                    <span
                      key={`${problem.id}-${topic}`}
                      className={`rounded-full border border-pebble-border/30 bg-pebble-chip-surface/60 px-2 py-0.5 text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}
                    >
                      {topic}
                    </span>
                  ))}
                </span>
              </span>

              <DifficultyPill
                difficulty={problem.difficulty}
                label={difficultyLabels[problem.difficulty]}
                className="w-fit px-2.5 py-1 text-xs"
              />

              <span className="ltrSafe text-sm text-pebble-text-secondary">{problem.acceptanceRate}%</span>

              <span className="inline-flex w-full items-center justify-center gap-1 text-sm text-pebble-text-secondary">
                {openLabel}
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
