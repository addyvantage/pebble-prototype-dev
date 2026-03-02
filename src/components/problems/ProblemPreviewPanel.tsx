import { ChevronRight, Clock3, X } from 'lucide-react'
import { useEffect } from 'react'
import { Button } from '../ui/Button'
import { DifficultyPill } from '../ui/DifficultyPill'
import { useTheme } from '../../hooks/useTheme'
import type { ProblemDefinition, ProblemLanguage } from '../../data/problemsBank'

type ProblemPreviewPanelProps = {
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
  minuteSuffix: string
  isUrdu: boolean
}

export function ProblemPreviewPanel({
  open,
  problem,
  selectedLanguage,
  onLanguageChange,
  onClose,
  onStart,
  labels,
  difficultyLabels,
  languageLabels,
  minuteSuffix,
  isUrdu,
}: ProblemPreviewPanelProps) {
  const { theme } = useTheme()

  useEffect(() => {
    if (!open) {
      return
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    function onEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', onEsc)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onEsc)
    }
  }, [onClose, open])

  if (!open || !problem) {
    return null
  }

  const surfaceClass = theme === 'light'
    ? 'border border-pebble-border/20 bg-pebble-panel/88 shadow-[0_16px_48px_rgba(55,72,110,0.12)] backdrop-blur-2xl [background-image:linear-gradient(180deg,rgba(241,245,252,0.96)_0%,rgba(228,234,246,0.85)_100%)]'
    : 'border border-white/12 bg-slate-950/70 shadow-[0_32px_80px_rgba(2,8,23,0.5)] backdrop-blur-2xl [background-image:linear-gradient(180deg,rgba(255,255,255,0.14)_0%,rgba(255,255,255,0.04)_100%)]'

  const panelContent = (
    <div className="flex h-full min-h-0 flex-col">
      <header className="sticky top-0 z-10 border-b border-pebble-border/25 bg-[rgba(var(--pebble-panel),0.86)] px-4 py-3 backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className={`text-xs uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>
              {labels.preview}
            </p>
            <h3 className={`truncate text-lg font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{problem.title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={labels.close}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-pebble-border/34 bg-pebble-overlay/[0.1] text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.18] hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </header>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
        <p className={`text-sm text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{problem.statement.summary}</p>

        <div className="flex flex-wrap items-center gap-2">
          <DifficultyPill
            difficulty={problem.difficulty}
            label={difficultyLabels[problem.difficulty]}
            className="px-2.5 py-1 text-xs"
          />
          <span className="inline-flex items-center gap-1 rounded-full border border-pebble-border/32 bg-pebble-overlay/[0.08] px-2 py-0.5 text-xs text-pebble-text-secondary">
            <Clock3 className="h-3.5 w-3.5" aria-hidden="true" />
            <span>
              <span className="ltrSafe">{problem.timeEstimateMinutes ?? problem.estimatedMinutes}</span>{' '}
              <span>{minuteSuffix}</span>
            </span>
          </span>
          <span className="ltrSafe rounded-full border border-pebble-border/32 bg-pebble-overlay/[0.08] px-2 py-0.5 text-xs text-pebble-text-secondary">
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
                className={`rounded-lg border px-2.5 py-1 text-xs transition ${selectedLanguage === language
                    ? 'border-pebble-accent/45 bg-pebble-accent/14 text-pebble-text-primary'
                    : 'border-pebble-border/32 bg-pebble-overlay/[0.07] text-pebble-text-secondary hover:bg-pebble-overlay/[0.14]'
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
                className={`rounded-full border border-pebble-border/32 bg-pebble-overlay/[0.08] px-2.5 py-1 text-xs text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}
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

      <footer className="border-t border-pebble-border/25 p-4">
        <Button type="button" onClick={onStart} className="w-full justify-center gap-2">
          {labels.start}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </footer>
    </div>
  )

  return (
    <div className="fixed inset-0 z-[90]">
      <div
        className={`absolute inset-0 backdrop-blur-md ${theme === 'light' ? 'bg-pebble-panel/50' : 'bg-black/40'
          }`}
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="absolute inset-0 flex justify-end p-0 sm:p-3">
        <aside
          className={`h-full w-full max-w-[520px] overflow-hidden rounded-none sm:rounded-2xl ${surfaceClass}`}
          role="dialog"
          aria-modal="true"
          aria-label={labels.preview}
        >
          {panelContent}
        </aside>
      </div>
    </div>
  )
}
