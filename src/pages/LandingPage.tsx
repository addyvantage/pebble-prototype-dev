import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import { buttonClass } from '../components/ui/buttonStyles'
import { getDemoMode, setDemoMode, subscribeDemoMode } from '../utils/demoMode'

const stats = [
  {
    label: 'Cognitive Breakpoints',
    value: 'Behavioral signals detect struggle without interruption.',
  },
  {
    label: 'Recovery Time',
    value: 'Time to regain stability is tracked across sessions.',
  },
  {
    label: 'Flow Stability',
    value: 'Session smoothness reflects confidence and rhythm.',
  },
]

const buildSteps = [
  {
    title: 'Observe',
    description: 'Pebble tracks cadence, idle bursts, and repeated errors while you code.',
  },
  {
    title: 'Detect',
    description: 'When struggle patterns persist, Pebble flags a cognitive breakpoint quietly.',
  },
  {
    title: 'Recover',
    description: 'You choose a gentle nudge or autonomous path to restore momentum.',
  },
]

export function LandingPage() {
  const initialDemoMode = useMemo(() => getDemoMode(), [])
  const [demoMode, setDemoModeState] = useState(initialDemoMode)

  useEffect(() => {
    return subscribeDemoMode((isEnabled) => {
      setDemoModeState(isEnabled)
    })
  }, [])

  function handleDemoModeChange() {
    const nextMode = !demoMode
    setDemoModeState(nextMode)
    setDemoMode(nextMode)
  }

  return (
    <section className="page-enter space-y-5">
      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <Card padding="lg" className="space-y-5" interactive>
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <Badge>Prototype preview</Badge>
              <button
                type="button"
                aria-label="Toggle demo mode"
                onClick={handleDemoModeChange}
                className="inline-flex items-center gap-2 rounded-full border border-pebble-border/35 bg-pebble-overlay/8 px-3 py-1.5 text-xs text-pebble-text-secondary transition hover:bg-pebble-overlay/14 hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/40"
              >
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    demoMode ? 'bg-pebble-success' : 'bg-pebble-text-muted'
                  }`}
                />
                Demo mode {demoMode ? 'On' : 'Off'}
              </button>
            </div>
            <h1 className="text-balance text-3xl font-semibold tracking-[-0.015em] text-pebble-text-primary sm:text-4xl">
              Pebble helps developers recover from struggle, quietly and respectfully.
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-pebble-text-secondary">
              This demo simulates an IDE session where Pebble tracks behavior,
              identifies cognitive breakpoints, and offers optional nudges that
              preserve momentum.
            </p>
          </div>

          <Divider />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Link to="/session/1" className={buttonClass('primary')}>
              Start session
            </Link>
            <Link to="/dashboard" className={buttonClass('secondary')}>
              View insights
            </Link>
          </div>
        </Card>

        <Card className="space-y-4" padding="md" interactive>
          <h2 className="text-balance text-2xl font-semibold tracking-[-0.015em] text-pebble-text-primary">
            Cognitive recovery focus
          </h2>
          <div className="space-y-3">
            {stats.map((item) => (
              <Card key={item.label} className="bg-pebble-secondary/60" padding="sm" interactive>
                <p className="text-base font-semibold text-pebble-text-primary">{item.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-pebble-text-secondary">
                  {item.value}
                </p>
              </Card>
            ))}
          </div>
        </Card>
      </div>

      <Card className="space-y-4" padding="md" interactive>
        <div className="space-y-1">
          <h2 className="text-xl font-semibold tracking-[-0.015em] text-pebble-text-primary">
            How Pebble works
          </h2>
          <p className="text-sm text-pebble-text-secondary">
            A lightweight loop designed to keep confidence high during difficult debugging moments.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {buildSteps.map((step, index) => (
            <Card key={step.title} className="bg-pebble-secondary/55" padding="sm" interactive>
              <Badge variant="neutral" className="w-fit">
                Step {index + 1}
              </Badge>
              <p className="mt-3 text-base font-semibold text-pebble-text-primary">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-pebble-text-secondary">
                {step.description}
              </p>
            </Card>
          ))}
        </div>
      </Card>
    </section>
  )
}
