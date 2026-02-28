import { ChevronRight, Clock3, X } from 'lucide-react'
import { Button } from '../ui/Button'
import type { ProblemDefinition, ProblemLanguage } from '../../data/problemsBank'

type ProblemPreviewDrawerProps = {
  open: boolean
  problem: ProblemDefinition | null
  selectedLanguage: ProblemLanguage
  onLanguageChange: (language: ProblemLanguage) => void
  onClose: () => void
  onStart: () => void
  labels: {
    preview: string
    start: string
    language: string
    time: string
    skills: string
    close: string
  }
  difficultyLabels: Record<ProblemDefinition['difficulty'], string>
  languageLabels: Record<ProblemLanguage, string>
  isUrdu: boolean
}

export function ProblemPreviewDrawer({
  open,
  problem,
  selectedLanguage,
  onLanguageChange,
  onClose,
  onStart,
  labels,
  difficultyLabels,
  languageLabels,
  isUrdu,
}: ProblemPreviewDrawerProps) {
  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/40 backdrop-blur-sm transition ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
      />
      <aside
        className={`fixed right-0 top-0 z-50 h-full w-[min(560px,95vw)] border-l border-pebble-border/35 bg-pebble-panel/96 shadow-[0_20px_60px_rgba(2,8,23,0.4)] transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}
        aria-hidden={!open}
      >
        <div className="flex h-full min-h-0 flex-col">
          <div className="flex items-center justify-between border-b border-pebble-border/25 px-4 py-3">
            <div>
              <p className={`text-xs uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>{labels.preview}</p>
              <h3 className={`text-lg font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{problem?.title ?? ''}</h3>
            </div>
            <button
              type="button"
              className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-pebble-border/34 bg-pebble-overlay/[0.08] text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.14]"
              onClick={onClose}
              aria-label={labels.close}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {problem ? (
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
              <p className={`text-sm text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{problem.statement.summary}</p>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex rounded-full border px-2 py-0.5 text-xs ${
                    problem.difficulty === 'Easy'
                      ? 'border-pebble-success/35 bg-pebble-success/12 text-pebble-success'
                      : problem.difficulty === 'Medium'
                        ? 'border-pebble-warning/35 bg-pebble-warning/12 text-pebble-warning'
                        : 'border-rose-400/35 bg-rose-400/12 text-rose-300'
                  }`}
                >
                  {difficultyLabels[problem.difficulty]}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-pebble-border/32 bg-pebble-overlay/[0.06] px-2 py-0.5 text-xs text-pebble-text-secondary">
                  <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="ltrSafe">{problem.estimatedMinutes}m</span>
                </span>
                <span className="ltrSafe rounded-full border border-pebble-border/32 bg-pebble-overlay/[0.06] px-2 py-0.5 text-xs text-pebble-text-secondary">
                  {problem.acceptanceRate}%
                </span>
              </div>

              <section className="space-y-1.5">
                <p className={`text-xs uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>{labels.language}</p>
                <div className="flex flex-wrap gap-1.5">
                  {problem.languageSupport.map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => onLanguageChange(language)}
                      className={`rounded-lg border px-2.5 py-1 text-xs transition ${
                        selectedLanguage === language
                          ? 'border-pebble-accent/45 bg-pebble-accent/14 text-pebble-text-primary'
                          : 'border-pebble-border/32 bg-pebble-overlay/[0.06] text-pebble-text-secondary hover:bg-pebble-overlay/[0.12]'
                      }`}
                    >
                      {languageLabels[language]}
                    </button>
                  ))}
                </div>
              </section>

              <section className="space-y-1.5">
                <p className={`text-xs uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>{labels.skills}</p>
                <div className="flex flex-wrap gap-1.5">
                  {problem.keySkills.map((skill) => (
                    <span
                      key={`${problem.id}-${skill}`}
                      className={`rounded-full border border-pebble-border/32 bg-pebble-overlay/[0.07] px-2.5 py-1 text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              </section>

              <section className="space-y-1.5">
                <p className={`text-xs uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>{labels.time}</p>
                <p className={`text-sm text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{problem.statement.description}</p>
              </section>
            </div>
          ) : null}

          <div className="border-t border-pebble-border/25 p-4">
            <Button type="button" onClick={onStart} className="w-full justify-center gap-2" disabled={!problem}>
              {labels.start}
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </aside>
    </>
  )
}
