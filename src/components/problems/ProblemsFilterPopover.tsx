import { Check, ChevronDown, Filter, RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { ProblemLanguage } from '../../data/problemsBank'
import { Button } from '../ui/Button'

export type ProblemsFilterState = {
  status: 'all' | 'solved' | 'unsolved'
  difficulty: 'any' | 'easy' | 'medium' | 'hard'
  language: 'any' | ProblemLanguage
  matchMode: 'any' | 'all'
  topics: string[]
}

type ProblemsFilterPopoverProps = {
  value: ProblemsFilterState
  onApply: (next: ProblemsFilterState) => void
  onReset: () => void
  topicOptions: string[]
  labels: {
    filter: string
    status: string
    difficulty: string
    topic: string
    language: string
    matchMode: string
    all: string
    solved: string
    unsolved: string
    anyDifficulty: string
    easy: string
    medium: string
    hard: string
    anyLanguage: string
    apply: string
    reset: string
    anyMatch: string
    allMatch: string
    languagePython: string
    languageJavaScript: string
    languageJava: string
    languageCpp: string
    languageSql: string
  }
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(' ')
}

const LANGUAGE_ORDER: ProblemLanguage[] = ['python', 'javascript', 'java', 'sql']

export function ProblemsFilterPopover({
  value,
  onApply,
  onReset,
  topicOptions,
  labels,
}: ProblemsFilterPopoverProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<ProblemsFilterState>(value)
  const rootRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (open) {
      setDraft(value)
    }
  }, [open, value])

  useEffect(() => {
    if (!open) {
      return
    }

    function onOutside(event: MouseEvent | TouchEvent) {
      const target = event.target as Node | null
      if (!target) {
        return
      }
      if (rootRef.current?.contains(target)) {
        return
      }
      setOpen(false)
    }

    function onEsc(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setOpen(false)
      }
    }

    window.addEventListener('mousedown', onOutside)
    window.addEventListener('touchstart', onOutside)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('mousedown', onOutside)
      window.removeEventListener('touchstart', onOutside)
      window.removeEventListener('keydown', onEsc)
    }
  }, [open])

  function toggleTopic(topic: string) {
    setDraft((prev) => {
      const hasTopic = prev.topics.includes(topic)
      const topics = hasTopic
        ? prev.topics.filter((item) => item !== topic)
        : [...prev.topics, topic]
      return { ...prev, topics }
    })
  }

  const languageLabels: Record<ProblemLanguage, string> = {
    python: labels.languagePython,
    javascript: labels.languageJavaScript,
    java: labels.languageJava,
    cpp: labels.languageCpp,
    sql: labels.languageSql,
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="inline-flex h-10 items-center gap-2 rounded-xl border border-pebble-border/32 bg-pebble-overlay/[0.08] px-3 text-sm text-pebble-text-primary transition hover:bg-pebble-overlay/[0.14] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45"
      >
        <Filter className="h-4 w-4" aria-hidden="true" />
        {labels.filter}
        <ChevronDown className={classNames('h-4 w-4 transition', open && 'rotate-180')} aria-hidden="true" />
      </button>

      <div
        className={classNames(
          'absolute right-0 top-[calc(100%+8px)] z-30 w-[min(92vw,420px)] origin-top rounded-2xl border border-pebble-border/34 bg-pebble-panel/95 p-3 shadow-[0_20px_60px_rgba(2,8,23,0.35)] backdrop-blur-xl transition duration-150',
          open ? 'pointer-events-auto scale-100 opacity-100' : 'pointer-events-none scale-[0.98] opacity-0',
        )}
        role="dialog"
        aria-label={labels.filter}
      >
        <div className="max-h-[380px] space-y-3 overflow-y-auto pr-1">
          <FilterSection title={labels.status}>
            <Segment
              options={[
                { id: 'all', label: labels.all },
                { id: 'solved', label: labels.solved },
                { id: 'unsolved', label: labels.unsolved },
              ]}
              value={draft.status}
              onChange={(status) => setDraft((prev) => ({ ...prev, status: status as ProblemsFilterState['status'] }))}
            />
          </FilterSection>

          <FilterSection title={labels.difficulty}>
            <Segment
              options={[
                { id: 'any', label: labels.anyDifficulty },
                { id: 'easy', label: labels.easy },
                { id: 'medium', label: labels.medium },
                { id: 'hard', label: labels.hard },
              ]}
              value={draft.difficulty}
              onChange={(difficulty) => setDraft((prev) => ({
                ...prev,
                difficulty: difficulty as ProblemsFilterState['difficulty'],
              }))}
            />
          </FilterSection>

          <FilterSection title={labels.language}>
            <div className="flex flex-wrap gap-1.5">
              <SmallChip
                active={draft.language === 'any'}
                onClick={() => setDraft((prev) => ({ ...prev, language: 'any' }))}
              >
                {labels.anyLanguage}
              </SmallChip>
              {LANGUAGE_ORDER.map((language) => (
                <SmallChip
                  key={language}
                  active={draft.language === language}
                  onClick={() => setDraft((prev) => ({ ...prev, language }))}
                >
                  {languageLabels[language]}
                </SmallChip>
              ))}
            </div>
          </FilterSection>

          <FilterSection title={labels.matchMode}>
            <Segment
              options={[
                { id: 'any', label: labels.anyMatch },
                { id: 'all', label: labels.allMatch },
              ]}
              value={draft.matchMode}
              onChange={(matchMode) => setDraft((prev) => ({ ...prev, matchMode: matchMode as ProblemsFilterState['matchMode'] }))}
            />
          </FilterSection>

          <FilterSection title={labels.topic}>
            <div className="flex max-h-36 flex-wrap gap-1.5 overflow-y-auto rounded-xl border border-pebble-border/25 bg-pebble-overlay/[0.04] p-2">
              {topicOptions.map((topic) => {
                const selected = draft.topics.includes(topic)
                return (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => toggleTopic(topic)}
                    className={classNames(
                      'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition',
                      selected
                        ? 'border-pebble-accent/45 bg-pebble-accent/16 text-pebble-text-primary'
                        : 'border-pebble-border/30 bg-pebble-overlay/[0.06] text-pebble-text-secondary hover:bg-pebble-overlay/[0.12]',
                    )}
                  >
                    {selected ? <Check className="h-3 w-3" aria-hidden="true" /> : null}
                    <span className="ltrSafe">{topic}</span>
                  </button>
                )
              })}
            </div>
          </FilterSection>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-pebble-border/25 pt-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              onReset()
              setOpen(false)
            }}
            className="gap-1.5"
          >
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
            {labels.reset}
          </Button>

          <Button
            type="button"
            onClick={() => {
              onApply(draft)
              setOpen(false)
            }}
          >
            {labels.apply}
          </Button>
        </div>
      </div>
    </div>
  )
}

function FilterSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-1.5">
      <h4 className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">{title}</h4>
      {children}
    </section>
  )
}

function Segment({
  options,
  value,
  onChange,
}: {
  options: Array<{ id: string; label: string }>
  value: string
  onChange: (id: string) => void
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          className={classNames(
            'rounded-lg border px-2.5 py-1 text-xs transition',
            value === option.id
              ? 'border-pebble-accent/45 bg-pebble-accent/16 text-pebble-text-primary'
              : 'border-pebble-border/30 bg-pebble-overlay/[0.06] text-pebble-text-secondary hover:bg-pebble-overlay/[0.12]',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function SmallChip({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(
        'rounded-full border px-2.5 py-1 text-xs transition',
        active
          ? 'border-pebble-accent/45 bg-pebble-accent/16 text-pebble-text-primary'
          : 'border-pebble-border/30 bg-pebble-overlay/[0.06] text-pebble-text-secondary hover:bg-pebble-overlay/[0.12]',
      )}
    >
      {children}
    </button>
  )
}
