import { CheckCircle2, ChevronRight, Circle, Lock, Sparkles } from 'lucide-react'
import type { ProblemDefinition } from '../../data/problemsBank'

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
      <div className="grid grid-cols-[56px_minmax(0,1fr)_110px_140px_88px] items-center border-b border-pebble-border/25 bg-pebble-overlay/[0.08] px-3 py-2 text-[11px] uppercase tracking-[0.08em] text-pebble-text-muted">
        <span className="ltrSafe">{headings.index}</span>
        <span className={isUrdu ? 'rtlText' : ''}>{headings.title}</span>
        <span>{headings.difficulty}</span>
        <span className="ltrSafe">{headings.acceptance}</span>
        <span className={isUrdu ? 'rtlText' : ''}>{headings.action}</span>
      </div>

      <div className="max-h-[460px] overflow-y-auto">
        {rows.map((problem) => {
          const solved = Boolean(solvedMap[problem.id]?.solvedAt)
          return (
            <button
              key={problem.id}
              type="button"
              onClick={() => onOpenProblem(problem)}
              className="grid w-full grid-cols-[56px_minmax(0,1fr)_110px_140px_88px] items-center gap-2 border-b border-pebble-border/20 px-3 py-3 text-left transition hover:bg-pebble-overlay/[0.1] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
            >
              <span className="inline-flex items-center justify-center">
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
                      className="ltrSafe rounded-full border border-pebble-border/28 bg-pebble-overlay/[0.07] px-2 py-0.5 text-[10px] text-pebble-text-secondary"
                    >
                      {topic}
                    </span>
                  ))}
                  {problem.premium ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-pebble-warning/32 bg-pebble-warning/12 px-2 py-0.5 text-[10px] text-pebble-warning">
                      <Sparkles className="h-3 w-3" aria-hidden="true" />
                      <Lock className="h-3 w-3" aria-hidden="true" />
                    </span>
                  ) : null}
                </span>
              </span>

              <span
                className={`inline-flex w-fit rounded-full border px-2 py-0.5 text-xs ${
                  problem.difficulty === 'Easy'
                    ? 'border-pebble-success/35 bg-pebble-success/12 text-pebble-success'
                    : problem.difficulty === 'Medium'
                      ? 'border-pebble-warning/35 bg-pebble-warning/12 text-pebble-warning'
                      : 'border-rose-400/35 bg-rose-400/12 text-rose-300'
                }`}
              >
                {difficultyLabels[problem.difficulty]}
              </span>

              <span className="ltrSafe text-sm text-pebble-text-secondary">{problem.acceptanceRate}%</span>

              <span className="inline-flex items-center justify-center gap-1 text-sm text-pebble-text-secondary">
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
