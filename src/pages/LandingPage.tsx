import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Divider } from '../components/ui/Divider'
import { buttonClass } from '../components/ui/buttonStyles'

const highlights = [
  {
    title: 'AI mentor that stays in context',
    detail: 'Pebble watches your edits and run output to coach without breaking flow.',
  },
  {
    title: 'Real code runner',
    detail: 'Run Python, JavaScript, C++, and Java with one consistent execution contract.',
  },
  {
    title: 'Adaptive learning path',
    detail: 'Onboarding and placement align your starting unit to your current skill level.',
  },
]

export function LandingPage() {
  return (
    <section className="page-enter space-y-6">
      <Card padding="lg" className="relative overflow-hidden" interactive>
        <div className="pointer-events-none absolute -left-28 -top-20 h-64 w-64 rounded-full bg-pebble-accent/20 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-0 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

        <div className="relative grid gap-8 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-5">
            <Badge>Pebble Learning Loop</Badge>
            <div className="space-y-3">
              <h1 className="text-balance text-4xl font-semibold tracking-[-0.02em] text-pebble-text-primary sm:text-5xl">
                Learn coding with a calm mentor, real runtime feedback, and a path that adapts.
              </h1>
              <p className="max-w-2xl text-base leading-relaxed text-pebble-text-secondary sm:text-lg">
                Pebble combines guided coaching with actual execution so every lesson feels practical,
                focused, and personalized from the first session.
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
          </div>

          <div className="rounded-2xl border border-pebble-border/32 bg-pebble-overlay/[0.06] p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">
              Core features
            </p>
            <div className="mt-3 space-y-3">
              {highlights.map((item) => (
                <div
                  key={item.title}
                  className="rounded-xl border border-pebble-border/26 bg-pebble-overlay/[0.07] p-3"
                >
                  <p className="text-sm font-semibold text-pebble-text-primary">{item.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-pebble-text-secondary">{item.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      <Card padding="md" interactive className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-[-0.015em] text-pebble-text-primary">
            Start in three steps
          </h2>
          <p className="text-sm text-pebble-text-secondary">
            Pick your profile, complete a quick placement, and jump into a focused coding session.
          </p>
        </div>
        <Divider />
        <div className="grid gap-3 sm:grid-cols-3">
          <Card padding="sm" className="bg-pebble-overlay/[0.06]" interactive>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-pebble-text-muted">01</p>
            <p className="mt-2 text-base font-semibold text-pebble-text-primary">Onboarding</p>
            <p className="mt-1 text-sm text-pebble-text-secondary">Choose your level and preferred language focus.</p>
          </Card>
          <Card padding="sm" className="bg-pebble-overlay/[0.06]" interactive>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-pebble-text-muted">02</p>
            <p className="mt-2 text-base font-semibold text-pebble-text-primary">Placement</p>
            <p className="mt-1 text-sm text-pebble-text-secondary">Answer five quick checks to determine your start unit.</p>
          </Card>
          <Card padding="sm" className="bg-pebble-overlay/[0.06]" interactive>
            <p className="text-xs font-medium uppercase tracking-[0.08em] text-pebble-text-muted">03</p>
            <p className="mt-2 text-base font-semibold text-pebble-text-primary">Session</p>
            <p className="mt-1 text-sm text-pebble-text-secondary">Run code, get guidance, and build momentum.</p>
          </Card>
        </div>
      </Card>
    </section>
  )
}
