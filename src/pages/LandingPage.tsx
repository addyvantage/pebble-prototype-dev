import { Bot, Compass, Gauge, Sparkles } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { buttonClass } from '../components/ui/buttonStyles'
import { useI18n } from '../i18n/useI18n'

export function LandingPage() {
  const { t, lang } = useI18n()
  const isUrdu = lang === 'ur'

  const trustChips = [t('landing.trust1'), t('landing.trust2'), t('landing.trust3')]
  const bentoCards = [
    {
      icon: Compass,
      title: t('landing.how1Title'),
      detail: t('landing.how1Detail'),
    },
    {
      icon: Gauge,
      title: t('landing.how2Title'),
      detail: t('landing.how2Detail'),
    },
    {
      icon: Bot,
      title: t('landing.how3Title'),
      detail: t('landing.how3Detail'),
    },
    {
      icon: Sparkles,
      title: t('landing.why2Title'),
      detail: t('landing.why2Copy'),
    },
  ]

  return (
    <section className="page-enter h-full min-h-0 overflow-y-auto lg:overflow-hidden">
      <div className="flex h-full min-h-0 flex-col gap-2.5 lg:grid lg:grid-rows-[minmax(0,1fr)_auto] lg:gap-3">
        <Card className="relative min-h-0 overflow-hidden p-4 lg:p-5" interactive>
          <div className="pointer-events-none absolute -left-24 -top-24 h-64 w-64 rounded-full bg-pebble-accent/18 blur-3xl" />
          <div className="pointer-events-none absolute -right-12 -top-16 h-56 w-56 rounded-full bg-sky-400/12 blur-3xl" />

          <div className="relative grid h-full min-h-0 gap-4 lg:grid-cols-[1.12fr_0.88fr] lg:gap-[18px]">
            <div className="flex min-h-0 flex-col justify-center gap-3.5">
              <Badge className="w-fit">{t('landing.badge')}</Badge>

              <div className="space-y-2.5">
                <h1 className={`max-w-[18ch] text-balance text-3xl font-semibold tracking-[-0.02em] text-pebble-text-primary sm:text-4xl xl:text-[3.25rem] ${isUrdu ? 'rtlText' : ''}`}>
                  {t('landing.headline')}
                </h1>
                <p className={`max-w-[58ch] text-sm leading-relaxed text-pebble-text-secondary sm:text-[15px] ${isUrdu ? 'rtlText' : ''}`}>
                  {t('landing.subheadline')}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5 pt-0.5">
                <Link to="/onboarding" className={buttonClass('primary')}>
                  {t('landing.tryPebble')}
                </Link>
                <Link to="/session/1" className={buttonClass('secondary')}>
                  {t('landing.openDemo')}
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 pt-0.5">
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

            <div className="flex min-h-0 items-center lg:justify-end">
              <div className="w-full max-w-[560px] rounded-2xl border border-pebble-border/34 bg-pebble-overlay/[0.08] p-4 shadow-[0_20px_48px_rgba(2,8,23,0.2)] lg:p-[18px]">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>
                    {t('landing.previewLabel')}
                  </p>
                  <span className="rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.08] px-2 py-0.5 text-[10px] uppercase tracking-[0.06em] text-pebble-text-secondary">
                    {t('landing.previewUsingRun')}
                  </span>
                </div>

                <div className="mt-2.5 space-y-2.5">
                  <div className="rounded-xl border border-pebble-border/30 bg-pebble-canvas/80 p-3">
                    <div className="mb-2 flex items-center justify-between text-[11px] text-pebble-text-muted">
                      <span>{t('landing.previewUnit')}</span>
                      <span>{t('landing.previewTests')}</span>
                    </div>
                    <pre dir="ltr" className="ltrSafe overflow-hidden rounded-lg border border-pebble-border/22 bg-pebble-canvas/90 p-2 font-mono text-[11px] leading-relaxed text-pebble-text-secondary">{`def two_sum(nums, target):\n    seen = {}\n    # TODO\n    return -1, -1`}</pre>
                    <div className="mt-2 inline-flex rounded-full border border-pebble-warning/35 bg-pebble-warning/15 px-2 py-0.5 text-[10px] font-medium text-pebble-warning">
                      {t('landing.previewFail')}
                    </div>
                  </div>

                  <div className="rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.08] p-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pebble-accent/28 text-xs font-semibold text-pebble-text-primary">
                        P
                      </span>
                      <p className={`text-xs font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
                        {t('landing.previewCoach')}
                      </p>
                    </div>
                    <p className={`mt-2 text-xs leading-relaxed text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                      {t('landing.previewCoachHint')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {bentoCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title} padding="sm" className="h-full min-h-[118px] bg-pebble-overlay/[0.05]" interactive>
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-pebble-border/34 bg-pebble-overlay/[0.12] text-pebble-text-primary">
                    <Icon className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="space-y-1">
                    <p className={`text-sm font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>{card.title}</p>
                    <p className={`text-xs leading-relaxed text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>{card.detail}</p>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      </div>
    </section>
  )
}
