import { BrainCircuit, CheckCircle2, ChevronRight, Code2, Flag, GraduationCap, Route, Sparkles, Target } from 'lucide-react'
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import {
  languageMetadata,
  type PlacementLanguage,
  type PlacementLevel,
} from '../data/onboardingData'
import { getPebbleUserState, savePebbleOnboarding } from '../utils/pebbleUserState'

const levels: Array<{ id: PlacementLevel; label: string; subtitle: string; outcome: string; icon: typeof GraduationCap }> = [
  {
    id: 'beginner',
    label: 'Beginner',
    subtitle: 'Learning syntax and core problem-solving patterns',
    outcome: 'Start with guided reps, lower friction, and fast confidence wins.',
    icon: GraduationCap,
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    subtitle: 'Comfortable coding independently with common algorithms',
    outcome: 'Focus on consistency, cleaner execution, and sharper debugging.',
    icon: Target,
  },
  {
    id: 'pro',
    label: 'Pro',
    subtitle: 'Targeting advanced interviews and production-level quality',
    outcome: 'Lean into stronger runtime judgment and higher-signal recovery loops.',
    icon: Flag,
  },
]

function summaryValue(value: string | null) {
  return value ?? 'Not selected yet'
}

function selectCardClass(isSelected: boolean) {
  return [
    'group relative overflow-hidden rounded-[22px] border p-4 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45',
    isSelected
      ? 'border-pebble-accent/60 bg-pebble-accent/14 text-pebble-text-primary shadow-[0_18px_38px_rgba(37,99,235,0.16),inset_0_1px_0_rgba(255,255,255,0.2)]'
      : 'border-pebble-border/24 bg-pebble-overlay/[0.05] text-pebble-text-secondary hover:-translate-y-[1px] hover:border-pebble-border/42 hover:bg-pebble-overlay/[0.10] hover:text-pebble-text-primary',
  ].join(' ')
}

function compactOutcome(levelLabel: string | null, languageLabel: string | null) {
  if (levelLabel && languageLabel) {
    return `Pebble will start you on a ${levelLabel.toLowerCase()} path in ${languageLabel}, with placement pacing and coach help tuned from the first session.`
  }
  if (levelLabel) {
    return `Pebble will tune the path depth around a ${levelLabel.toLowerCase()} starting point once you confirm a coding language.`
  }
  if (languageLabel) {
    return `Pebble will shape the editor, solutions, and guidance around ${languageLabel} once you confirm your current level.`
  }
  return 'Choose your level and language to preview the starting path Pebble will build for you.'
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const existingState = useMemo(() => getPebbleUserState(), [])

  const [level, setLevel] = useState<PlacementLevel | null>(existingState.onboarding?.level ?? null)
  const [language, setLanguage] = useState<PlacementLanguage | null>(existingState.onboarding?.language ?? null)
  const [showAllLanguages, setShowAllLanguages] = useState(false)

  const selectedLevel = levels.find((item) => item.id === level) ?? null
  const selectedLanguage = languageMetadata.find((item) => item.id === language) ?? null
  const canContinue = Boolean(level && language)
  const visibleLanguages = showAllLanguages ? languageMetadata : languageMetadata.slice(0, 4)

  function handleContinue() {
    if (!level || !language) return
    savePebbleOnboarding({ language, level })
    navigate(`/placement?lang=${language}&level=${level}`)
  }

  return (
    <section className="page-enter mx-auto w-full max-w-[1500px] px-3 pb-5 pt-3 lg:px-4">
      <div className="onboarding-stage relative rounded-[32px] px-6 pb-4.5 pt-5.5 sm:px-7 sm:pt-6.5 lg:px-9 lg:pb-5">
        <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-pebble-accent/16 blur-3xl" />
        <div className="pointer-events-none absolute -left-24 bottom-[-7rem] h-80 w-80 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative space-y-5 lg:space-y-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-[760px] space-y-3">
              <Badge>Onboarding</Badge>
              <div className="space-y-2.5">
                <h1 className="max-w-[18ch] text-balance text-[2.2rem] font-semibold tracking-[-0.03em] text-pebble-text-primary sm:text-[2.6rem] lg:text-[2.95rem]">
                  Personalize your Pebble learning track
                </h1>
                <p className="max-w-[62ch] text-[15px] leading-6 text-pebble-text-secondary sm:text-base">
                  Choose your current level and preferred language so Pebble can start you at the right depth from day one.
                </p>
              </div>
            </div>

            <div className="onboarding-stage-muted rounded-[24px] px-4 py-4 lg:max-w-[360px]">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pebble-text-muted">
                Placement-aligned setup
              </p>
              <div className="mt-3 grid gap-2.5">
                <div className="flex items-start gap-2.5">
                  <BrainCircuit className="mt-0.5 h-4 w-4 text-pebble-accent" />
                  <p className="text-sm leading-6 text-pebble-text-secondary">
                    Pebble adapts your first units, coaching depth, and placement pacing from this setup.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <Sparkles className="mt-0.5 h-4 w-4 text-pebble-accent" />
                  <p className="text-sm leading-6 text-pebble-text-secondary">
                    Your selections shape runtime hints, solution language, and the first recovery loop you see.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.34fr)_minmax(340px,0.66fr)] lg:gap-4.5">
            <div className="space-y-4.5">
              <section className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pebble-text-muted">
                      Step 1 · Current level
                    </p>
                    <h2 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-pebble-text-primary">
                      Select your current level
                    </h2>
                  </div>
                  {selectedLevel ? (
                    <span className="rounded-full border border-pebble-accent/42 bg-pebble-accent/14 px-3 py-1.5 text-[11px] font-semibold text-pebble-accent">
                      {selectedLevel.label} selected
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-2.5 md:grid-cols-3">
                  {levels.map((item) => {
                    const selected = level === item.id
                    const Icon = item.icon
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLevel(item.id)}
                        className={selectCardClass(selected)}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-pebble-overlay/[0.08] to-transparent" />
                        <div className="relative flex items-start justify-between gap-3">
                          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${
                            selected
                              ? 'border-pebble-accent/45 bg-pebble-accent/18 text-pebble-accent'
                              : 'border-pebble-border/22 bg-pebble-overlay/[0.08] text-pebble-text-secondary'
                          }`}>
                            <Icon className="h-4.5 w-4.5" />
                          </span>
                          {selected ? (
                            <span className="rounded-full border border-pebble-accent/45 bg-pebble-accent/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-pebble-accent">
                              Selected
                            </span>
                          ) : null}
                        </div>
                        <div className="relative mt-3.5 space-y-1.5">
                          <p className="text-[1.02rem] font-semibold text-pebble-text-primary">{item.label}</p>
                          <p className="text-[13px] leading-5.5 text-pebble-text-secondary">{item.subtitle}</p>
                          {selected ? <p className="pt-0.5 text-[12px] leading-5 text-pebble-text-muted">{item.outcome}</p> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </section>

              <section className="space-y-2">
                <div className="flex items-end justify-between gap-3">
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-pebble-text-muted">
                      Step 2 · Language focus
                    </p>
                    <h2 className="text-[1.45rem] font-semibold tracking-[-0.02em] text-pebble-text-primary">
                      Select language focus
                    </h2>
                  </div>
                  {selectedLanguage ? (
                    <span className="rounded-full border border-pebble-accent/42 bg-pebble-accent/14 px-3 py-1.5 text-[11px] font-semibold text-pebble-accent">
                      {selectedLanguage.label} selected
                    </span>
                  ) : null}
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                  {visibleLanguages.map((item) => {
                    const selected = language === item.id
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setLanguage(item.id)}
                        className={selectCardClass(selected)}
                      >
                        <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-pebble-overlay/[0.08] to-transparent" />
                        <div className="relative flex items-start justify-between gap-3">
                          <span className={`inline-flex h-10 w-10 items-center justify-center rounded-2xl border ${
                            selected
                              ? 'border-pebble-accent/45 bg-pebble-accent/18 text-pebble-accent'
                              : 'border-pebble-border/22 bg-pebble-overlay/[0.08] text-pebble-text-secondary'
                          }`}>
                            <Code2 className="h-4.5 w-4.5" />
                          </span>
                          {selected ? (
                            <span className="rounded-full border border-pebble-accent/45 bg-pebble-accent/18 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.06em] text-pebble-accent">
                              Selected
                            </span>
                          ) : null}
                        </div>
                        <div className="relative mt-3.5 space-y-1.5">
                          <p className="text-[1.02rem] font-semibold text-pebble-text-primary">{item.label}</p>
                          <p className="text-[13px] leading-5 text-pebble-text-secondary">{item.purpose}</p>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {languageMetadata.length > 4 ? (
                  <button
                    type="button"
                    onClick={() => setShowAllLanguages((prev) => !prev)}
                    className="inline-flex items-center gap-2 rounded-full border border-pebble-border/24 bg-pebble-overlay/[0.06] px-3.5 py-1.5 text-xs font-medium text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.12] hover:text-pebble-text-primary"
                  >
                    {showAllLanguages ? 'Show fewer languages' : 'Show all languages'}
                    <ChevronRight className={`h-3.5 w-3.5 transition ${showAllLanguages ? 'rotate-90' : ''}`} />
                  </button>
                ) : null}
              </section>
            </div>

            <aside className="onboarding-stage-strong rounded-[28px] p-4.5 lg:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-pebble-text-muted">
                    Selection preview
                  </p>
                  <h3 className="mt-2 text-xl font-semibold text-pebble-text-primary">
                    Your starting path
                  </h3>
                </div>
                <span className="rounded-full border border-pebble-border/28 bg-pebble-overlay/[0.08] px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-pebble-text-secondary">
                  2-step setup
                </span>
              </div>

              <div className="mt-3.5 space-y-2.5">
                <div className="onboarding-stage-muted rounded-[22px] p-4">
                  <div className="grid gap-3">
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-pebble-text-muted">Level</span>
                      <span className="font-semibold text-pebble-text-primary">{summaryValue(selectedLevel?.label ?? null)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-pebble-text-muted">Language</span>
                      <span className="font-semibold text-pebble-text-primary">{summaryValue(selectedLanguage?.label ?? null)}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">
                    What you&apos;ll get
                  </p>
                  <div className="grid gap-2">
                    {[
                      'Weekly placement set tuned to your level.',
                      'Guided units with clear test-driven checkpoints.',
                      'Pebble Coach hints that adapt to your struggle pattern.',
                    ].map((item) => (
                      <div key={item} className="onboarding-stage-muted flex items-start gap-2.5 rounded-[18px] px-3.5 py-2.5">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-pebble-accent" />
                        <p className="text-[13px] leading-5.5 text-pebble-text-secondary">{item}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-[22px] border border-pebble-accent/22 bg-pebble-accent/10 px-4 py-3.5">
                  <div className="flex items-start gap-2.5">
                    <Route className="mt-0.5 h-4.5 w-4.5 shrink-0 text-pebble-accent" />
                    <div className="space-y-1.5">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-accent">
                        Starting path outcome
                      </p>
                      <p className="text-[14px] leading-6 text-pebble-text-primary">
                        {compactOutcome(selectedLevel?.label ?? null, selectedLanguage?.label ?? null)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="sticky bottom-0 z-10 -mx-6 border-t border-pebble-border/20 bg-pebble-panel/92 px-6 py-2.5 backdrop-blur-md sm:-mx-7 sm:px-7 lg:-mx-9 lg:px-9">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-pebble-text-muted">
                  Ready to continue
                </p>
                <p className="text-sm leading-6 text-pebble-text-secondary">
                  {canContinue ? 'Great. Continue to your placement set.' : 'Select both level and language to continue.'}
                </p>
              </div>
              <Button
                onClick={handleContinue}
                disabled={!canContinue}
                className="h-11 rounded-2xl px-5 text-sm font-semibold"
              >
                Continue
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
