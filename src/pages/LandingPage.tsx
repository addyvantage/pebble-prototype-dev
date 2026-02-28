import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { buttonClass } from '../components/ui/buttonStyles'

const trustChips = [
  'Runs real code',
  'Placement-based start',
  'AI mentor in context',
]

const howItWorks = [
  {
    title: 'Personalize your start',
    detail: 'Pick level and language, then get a weekly-stable placement set tailored to your profile.',
  },
  {
    title: 'Solve clear tasks',
    detail: 'Each unit has explicit goals, examples, and tests so you always know what success looks like.',
  },
  {
    title: 'Recover faster with Pebble',
    detail: 'Pebble uses your latest run output and code context to provide focused hints and next steps.',
  },
]

const valueCards = [
  {
    title: 'Assessment that feels fair',
    copy: 'Question sets rotate weekly, stay deterministic per user profile, and combine concept checks with real coding.',
  },
  {
    title: 'LeetCode-style rigor, better UX',
    copy: 'Integrated run feedback, task clarity, and in-context coaching replace trial-and-error thrash.',
  },
  {
    title: 'Progress memory across sessions',
    copy: 'Language, level, current unit, and chat summary persist so momentum carries between study sessions.',
  },
]

export function LandingPage() {
  return (
    <section className="page-enter space-y-7">
      <Card padding="lg" className="relative overflow-hidden" interactive>
        <div className="pointer-events-none absolute -left-24 -top-20 h-64 w-64 rounded-full bg-pebble-accent/18 blur-3xl" />
        <div className="pointer-events-none absolute -right-16 bottom-[-5rem] h-72 w-72 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative grid gap-7 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <Badge>Pebble learning platform</Badge>
            <div className="space-y-3">
              <h1 className="text-balance text-4xl font-semibold tracking-[-0.02em] text-pebble-text-primary sm:text-5xl">
                Premium coding practice with real runtime feedback and mentor-level guidance.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-pebble-text-secondary sm:text-lg">
                Pebble combines path-based curriculum, weekly rotating placement, and in-context AI
                coaching so every session is focused, measurable, and calm.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link to="/onboarding" className={buttonClass('primary')}>
                Try Pebble
              </Link>
              <Link to="/session/1" className={buttonClass('secondary')}>
                Open Demo Session
              </Link>
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {trustChips.map((chip) => (
                <span
                  key={chip}
                  className="rounded-full border border-pebble-border/35 bg-pebble-overlay/[0.08] px-3 py-1 text-xs font-medium text-pebble-text-secondary"
                >
                  {chip}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-pebble-border/32 bg-pebble-overlay/[0.06] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">
              Product preview
            </p>
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-pebble-border/30 bg-pebble-canvas/75 p-3">
                <div className="mb-2 flex items-center justify-between text-[11px] text-pebble-text-muted">
                  <span>Unit: Two Sum</span>
                  <span>Tests: 2/3</span>
                </div>
                <pre className="overflow-hidden rounded-lg border border-pebble-border/22 bg-pebble-canvas/90 p-2 font-mono text-[11px] leading-relaxed text-pebble-text-secondary">{`def two_sum(nums, target):\n    seen = {}\n    # TODO\n    return -1, -1`}</pre>
                <div className="mt-2 inline-flex rounded-full border border-pebble-warning/35 bg-pebble-warning/15 px-2 py-0.5 text-[10px] font-medium text-pebble-warning">
                  Fail #2 expected: 1 2 got: -1 -1
                </div>
              </div>

              <div className="rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.08] p-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pebble-accent/28 text-xs font-semibold text-pebble-text-primary">P</span>
                  <p className="text-xs font-semibold text-pebble-text-primary">Pebble coach</p>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-pebble-text-secondary">
                  Try storing each visited value in a map. On each step, check whether target - current
                  is already seen and return both indices immediately.
                </p>
                <div className="mt-2 inline-flex rounded-full border border-pebble-border/35 px-2 py-0.5 text-[10px] uppercase tracking-[0.04em] text-pebble-text-muted">
                  Using your run output
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      <Card padding="md" className="space-y-4" interactive>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-[-0.015em] text-pebble-text-primary">How it works</h2>
          <p className="text-sm text-pebble-text-secondary">A practical loop built for consistency and measurable growth.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {howItWorks.map((step, index) => (
            <Card key={step.title} padding="sm" className="bg-pebble-overlay/[0.06]" interactive>
              <p className="text-xs font-medium uppercase tracking-[0.08em] text-pebble-text-muted">Step {index + 1}</p>
              <p className="mt-2 text-base font-semibold text-pebble-text-primary">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-pebble-text-secondary">{step.detail}</p>
            </Card>
          ))}
        </div>
      </Card>

      <Card padding="md" className="space-y-4" interactive>
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-[-0.015em] text-pebble-text-primary">Why Pebble wins</h2>
          <p className="text-sm text-pebble-text-secondary">Built for learners who want depth, speed, and confidence.</p>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          {valueCards.map((card) => (
            <Card key={card.title} padding="sm" className="bg-pebble-overlay/[0.06]" interactive>
              <p className="text-base font-semibold text-pebble-text-primary">{card.title}</p>
              <p className="mt-2 text-sm leading-relaxed text-pebble-text-secondary">{card.copy}</p>
            </Card>
          ))}
        </div>
      </Card>

      <footer className="rounded-2xl border border-pebble-border/26 bg-pebble-overlay/[0.05] px-4 py-3 text-xs text-pebble-text-muted">
        Pebble • Curriculum-driven coding practice with in-context AI mentoring.
      </footer>
    </section>
  )
}
