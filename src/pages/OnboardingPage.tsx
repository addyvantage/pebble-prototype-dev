import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { Card } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import {
  languageMetadata,
  type PlacementLanguage,
  type PlacementLevel,
} from '../data/onboardingData'
import { getPebbleUserState, savePebbleOnboarding } from '../utils/pebbleUserState'

const levels: Array<{ id: PlacementLevel; label: string; subtitle: string }> = [
  {
    id: 'beginner',
    label: 'Beginner',
    subtitle: 'Learning syntax and core problem-solving patterns',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    subtitle: 'Comfortable coding independently with common algorithms',
  },
  {
    id: 'pro',
    label: 'Pro',
    subtitle: 'Targeting advanced interviews and production-level quality',
  },
]

function selectCardClass(isSelected: boolean) {
  return `rounded-2xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${
    isSelected
      ? 'border-pebble-accent/55 bg-pebble-accent/15 text-pebble-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.14)]'
      : 'border-pebble-border/28 bg-pebble-overlay/[0.05] text-pebble-text-secondary hover:border-pebble-border/45 hover:bg-pebble-overlay/[0.1] hover:text-pebble-text-primary'
  }`
}

export function OnboardingPage() {
  const navigate = useNavigate()
  const existingState = useMemo(() => getPebbleUserState(), [])

  const [level, setLevel] = useState<PlacementLevel | null>(existingState.onboarding?.level ?? null)
  const [language, setLanguage] = useState<PlacementLanguage | null>(existingState.onboarding?.language ?? null)

  const canContinue = Boolean(level && language)

  function handleContinue() {
    if (!level || !language) {
      return
    }

    savePebbleOnboarding({ language, level })
    navigate(`/placement?lang=${language}&level=${level}`)
  }

  return (
    <section className="page-enter mx-auto w-full max-w-6xl space-y-5">
      <Card padding="lg" className="relative overflow-hidden space-y-6" interactive>
        <div className="pointer-events-none absolute -top-24 right-[-4rem] h-56 w-56 rounded-full bg-pebble-accent/20 blur-3xl" />

        <div className="relative space-y-3">
          <Badge>Onboarding</Badge>
          <h1 className="text-balance text-4xl font-semibold tracking-[-0.02em] text-pebble-text-primary sm:text-5xl">
            Personalize your Pebble learning track
          </h1>
          <p className="max-w-3xl text-base leading-relaxed text-pebble-text-secondary sm:text-lg">
            Pick your level and language focus. We use this to generate a placement set and start
            you in the right unit.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full border border-pebble-border/35 bg-pebble-overlay/[0.08] px-3 py-1.5 text-xs text-pebble-text-secondary">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-pebble-accent/30 text-pebble-text-primary">1</span>
            <span>Choose level</span>
            <span className="text-pebble-text-muted">•</span>
            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-pebble-accent/30 text-pebble-text-primary">2</span>
            <span>Choose language</span>
          </div>
        </div>

        <Divider />

        <div className="space-y-6">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">Step 1</p>
            <h2 className="text-xl font-semibold text-pebble-text-primary">Select your current level</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {levels.map((item) => {
                const selected = level === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLevel(item.id)}
                    className={selectCardClass(selected)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-base font-semibold text-pebble-text-primary">{item.label}</p>
                      {selected && <Badge variant="success">Selected</Badge>}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed">{item.subtitle}</p>
                  </button>
                )
              })}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">Step 2</p>
            <h2 className="text-xl font-semibold text-pebble-text-primary">Select language focus</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {languageMetadata.map((item) => {
                const selected = language === item.id
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setLanguage(item.id)}
                    className={selectCardClass(selected)}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-lg font-semibold text-pebble-text-primary">{item.label}</p>
                      {selected && <Badge variant="success">Selected</Badge>}
                    </div>
                    <p className="mt-2 text-sm leading-relaxed text-pebble-text-secondary">
                      {item.purpose}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-pebble-border/24 pt-4">
          <p className="text-sm text-pebble-text-secondary">
            {canContinue ? 'Great. Continue to your placement set.' : 'Select both level and language to continue.'}
          </p>
          <Button onClick={handleContinue} disabled={!canContinue}>
            Continue
          </Button>
        </div>
      </Card>
    </section>
  )
}
