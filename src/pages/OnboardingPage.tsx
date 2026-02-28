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

function optionClass(isActive: boolean) {
  return `rounded-xl border px-4 py-3 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${
    isActive
      ? 'border-pebble-accent/45 bg-pebble-accent/14 text-pebble-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
      : 'border-pebble-border/30 bg-pebble-overlay/[0.05] text-pebble-text-secondary hover:border-pebble-border/45 hover:bg-pebble-overlay/[0.1] hover:text-pebble-text-primary'
  }`
}

const levels: Array<{ id: PlacementLevel; label: string; subtitle: string }> = [
  {
    id: 'beginner',
    label: 'Beginner',
    subtitle: 'New to coding fundamentals',
  },
  {
    id: 'intermediate',
    label: 'Intermediate',
    subtitle: 'Comfortable with problem solving',
  },
  {
    id: 'pro',
    label: 'Pro',
    subtitle: 'Ready for advanced interview-style work',
  },
]

export function OnboardingPage() {
  const navigate = useNavigate()
  const existingState = useMemo(() => getPebbleUserState(), [])

  const [level, setLevel] = useState<PlacementLevel>(existingState.onboarding?.level ?? 'beginner')
  const [language, setLanguage] = useState<PlacementLanguage>(existingState.onboarding?.language ?? 'python')

  function handleContinue() {
    savePebbleOnboarding({ language, level })
    navigate(`/placement?lang=${language}&level=${level}`)
  }

  return (
    <section className="page-enter mx-auto w-full max-w-5xl space-y-5">
      <Card padding="lg" className="space-y-5" interactive>
        <div className="space-y-2">
          <Badge>Onboarding</Badge>
          <h1 className="text-balance text-3xl font-semibold tracking-[-0.015em] text-pebble-text-primary sm:text-4xl">
            Set your learning starting point
          </h1>
          <p className="max-w-2xl text-sm leading-relaxed text-pebble-text-secondary sm:text-base">
            Choose your current level and preferred language. Pebble will use this to personalize
            your placement and session path.
          </p>
        </div>

        <Divider />

        <div className="space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">Step 1</p>
            <h2 className="text-lg font-semibold text-pebble-text-primary">Choose level</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {levels.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLevel(item.id)}
                  className={optionClass(level === item.id)}
                >
                  <p className="text-sm font-semibold">{item.label}</p>
                  <p className="mt-1 text-xs">{item.subtitle}</p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">Step 2</p>
            <h2 className="text-lg font-semibold text-pebble-text-primary">Choose language focus</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {languageMetadata.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setLanguage(item.id)}
                  className={optionClass(language === item.id)}
                >
                  <p className="text-base font-semibold">{item.label}</p>
                  <p className="mt-1 text-sm">{item.purpose}</p>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleContinue}>Continue</Button>
        </div>
      </Card>
    </section>
  )
}
