import { CheckCircle2, ChevronRight, Circle } from 'lucide-react'
import type { ProblemDefinition } from '../../data/problemsBank'
import { DifficultyPill } from '../ui/DifficultyPill'
import { useTheme } from '../../hooks/useTheme'

const SHARED_GRID =
  'grid grid-cols-[52px_minmax(0,1.55fr)_120px_84px_112px] gap-4 items-center px-4 md:px-5'

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
  const { theme } = useTheme()
  const isDark = theme === 'dark'

  if (rows.length === 0) {
    return (
      <div className={`rounded-[24px] border p-8 text-center text-sm ${
        isDark
          ? 'border-pebble-border/22 bg-pebble-overlay/[0.05] text-[hsl(220_16%_80%)]'
          : 'border-pebble-border/20 bg-white/68 text-[hsl(221_22%_40%)]'
      }`}>
        {emptyLabel}
      </div>
    )
  }

  return (
    <div className={`overflow-hidden rounded-[26px] border ${
      isDark
        ? 'border-pebble-border/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(255,255,255,0.012)_100%)] shadow-[0_18px_40px_rgba(0,0,0,0.20)]'
        : 'border-pebble-border/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(244,248,255,0.98)_100%)] shadow-[0_18px_34px_rgba(55,72,110,0.08)]'
    }`}>
      <div
        className={`${SHARED_GRID} border-b py-3.5 text-[11.5px] font-semibold uppercase tracking-[0.08em] ${
          isDark
            ? 'border-pebble-border/18 bg-pebble-overlay/[0.06] text-[hsl(220_12%_72%)]'
            : 'border-pebble-border/14 bg-[rgba(228,234,246,0.78)] text-[hsl(221_18%_42%)]'
        }`}
      >
        <span className="ltrSafe text-center">{headings.index}</span>
        <span className={isUrdu ? 'rtlText' : ''}>{headings.title}</span>
        <span>{headings.difficulty}</span>
        <span className="ltrSafe">{headings.acceptance}</span>
        <span className={isUrdu ? 'rtlText text-center' : 'text-center'}>{headings.action}</span>
      </div>

      <div className="max-h-[560px] overflow-y-auto pebble-scrollbar p-2.5">
        {rows.map((problem) => {
          const solved = Boolean(solvedMap[problem.id]?.solvedAt)
          return (
            <button
              key={problem.id}
              type="button"
              onClick={() => onOpenProblem(problem)}
              className={`${SHARED_GRID} mb-2 w-full rounded-[18px] border py-3.5 text-left transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${
                isDark
                  ? 'border-pebble-border/16 bg-pebble-overlay/[0.05] hover:-translate-y-[1px] hover:border-pebble-accent/28 hover:bg-pebble-accent/[0.07] hover:shadow-[0_14px_28px_rgba(0,0,0,0.18)]'
                  : 'border-pebble-border/16 bg-white/70 hover:-translate-y-[1px] hover:border-pebble-accent/26 hover:bg-[rgba(236,243,255,0.96)] hover:shadow-[0_12px_24px_rgba(55,72,110,0.08)]'
              }`}
            >
              <span className="inline-flex w-full items-center justify-center">
                {solved ? (
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                    isDark ? 'bg-emerald-400/14 text-emerald-200' : 'bg-emerald-500/12 text-emerald-700'
                  }`}>
                    <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                  </span>
                ) : (
                  <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${
                    isDark ? 'bg-pebble-overlay/[0.04] text-[hsl(220_12%_62%)]' : 'bg-[rgba(228,234,246,0.8)] text-[hsl(220_16%_52%)]'
                  }`}>
                    <Circle className="h-4 w-4" aria-hidden="true" />
                  </span>
                )}
              </span>

                <span className="min-w-0 space-y-1.5">
                <span className={`block truncate text-[15px] font-semibold tracking-[-0.01em] text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
                  {problem.title}
                </span>
                <span className="flex flex-wrap gap-1.5">
                  {problem.topics.slice(0, 3).map((topic) => (
                    <span
                      key={`${problem.id}-${topic}`}
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium ${isUrdu ? 'rtlText' : ''} ${
                        isDark
                          ? 'border-pebble-border/22 bg-pebble-chip-surface/52 text-[hsl(220_16%_82%)]'
                          : 'border-pebble-border/20 bg-[rgba(232,238,249,0.92)] text-[hsl(221_18%_38%)]'
                      }`}
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

              <span className={`ltrSafe text-sm font-medium ${isDark ? 'text-[hsl(220_18%_88%)]' : 'text-[hsl(221_24%_30%)]'}`}>{problem.acceptanceRate}%</span>

              <span className={`inline-flex w-full items-center justify-center gap-1 rounded-full border px-3 py-1.5 text-sm font-medium ${
                isDark
                  ? 'border-pebble-accent/26 bg-pebble-accent/12 text-[hsl(220_18%_92%)]'
                  : 'border-pebble-accent/24 bg-pebble-accent/10 text-[hsl(223_28%_28%)]'
              }`}>
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
