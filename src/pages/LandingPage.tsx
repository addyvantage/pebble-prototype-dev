import { Bot, Compass, Gauge, Sparkles, Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '../components/ui/Badge'
import { Card } from '../components/ui/Card'
import { Component as EtheralShadow } from '../components/ui/etheral-shadow'
import { buttonClass } from '../components/ui/buttonStyles'
import { TextShimmer } from '../components/ui/text-shimmer'
import { useI18n } from '../i18n/useI18n'
import { useTheme } from '../hooks/useTheme'
import { getRecentActivity } from '../lib/recentStore'
import { getProblemById } from '../data/problemsBank'
import { getLocalizedProblem } from '../i18n/problemContent'
import { TodayPlanCard } from '../components/home/TodayPlanCard'
import { RecommendedNextCard } from '../components/home/RecommendedNextCard'

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function LandingPage() {
  const { t, lang } = useI18n()
  const { theme } = useTheme()
  const isUrdu = lang === 'ur'

  const etherealColor = theme === 'dark'
    ? 'rgba(120, 170, 255, 0.22)'
    : 'rgba(59, 130, 246, 0.30)'

  const recent = getRecentActivity()
  const recentProblem = recent ? getProblemById(recent.problemId) : null
  const localizedRecent = recentProblem ? getLocalizedProblem(recentProblem, lang) : null

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

  const bentoCardClass =
    'group relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(.2,.8,.2,1)] hover:-translate-y-[4px] border border-pebble-border/15 hover:border-pebble-border/30 bg-pebble-overlay/[0.03] hover:bg-pebble-overlay/[0.05] backdrop-blur-2xl shadow-[0_4px_24px_rgba(0,0,0,0.02)] hover:shadow-[0_24px_48px_-12px_rgba(0,0,0,0.18)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/50'


  return (
    <section className="page-enter h-full min-h-0 overflow-y-auto lg:overflow-hidden">
      <div className="flex h-full min-h-0 flex-col gap-1.5 lg:grid lg:grid-rows-[minmax(0,1fr)_auto_auto] lg:gap-1.5">
        <Card className="relative w-full min-h-0 overflow-hidden rounded-none p-3 xl:p-3.5" interactive>
          <div className="pointer-events-none absolute inset-0 z-0">
            <EtheralShadow
              className="absolute inset-0"
              color={etherealColor}
              animation={{ scale: 62, speed: 78 }}
              noise={theme === 'dark'
                ? { opacity: 0.28, scale: 1.35 }
                : { opacity: 0.10, scale: 1.15 }}
              sizing="fill"
              showTitle={false}
            />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1200px] px-6">
            <div className="grid h-full min-h-0 gap-3 lg:grid-cols-[1.18fr_0.82fr] lg:gap-3 xl:gap-4">
              <div className="flex min-h-0 flex-col justify-center gap-3 xl:gap-3.5">
              <Badge className="w-fit">{t('landing.badge')}</Badge>

              <div className="headline-shimmer">
                <h1
                  className={`max-w-[38ch] text-balance text-3xl font-semibold tracking-tight leading-[1.1] md:text-4xl lg:text-[3.05rem] xl:text-[3.3rem] ${isUrdu ? 'rtlText' : ''}`}
                >
                  <TextShimmer
                    duration={6}
                    spread={1.8}
                    className="font-bold pb-[0.3em]"
                  >
                    {t('landing.headline')}
                  </TextShimmer>
                </h1>
              </div>
              <p className={`max-w-[66ch] text-[13.5px] leading-relaxed text-pebble-text-secondary sm:text-[14.5px] ${isUrdu ? 'rtlText' : ''}`}>
                {t('landing.subheadline')}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <Link to="/onboarding" className={buttonClass('primary')}>
                  {t('landing.tryPebble')}
                </Link>
                <Link to="/session/1" className={buttonClass('secondary')}>
                  {t('landing.openSession')}
                </Link>
              </div>

              <div className="flex flex-wrap gap-2 pt-1">
                {trustChips.map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2.5 py-0.5 text-[11.5px] font-medium text-pebble-text-secondary"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

              <div className="flex min-h-0 items-center lg:justify-end">
                <div className="w-full max-w-[620px] rounded-[14px] border border-pebble-border/34 bg-pebble-overlay/[0.08] p-2.5 shadow-[0_20px_48px_rgba(2,8,23,0.2)] lg:p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className={`text-[13px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>
                    {t('landing.previewLabel')}
                  </p>
                  <span className="rounded-full border border-pebble-border/30 bg-pebble-overlay/[0.08] px-2 py-0.5 text-[10.5px] uppercase tracking-[0.06em] text-pebble-text-secondary">
                    {t('landing.previewUsingRun')}
                  </span>
                </div>

                <div className="mt-1.5 space-y-1.5">
                  <div className="rounded-[10px] border border-pebble-border/30 bg-pebble-canvas/80 p-2">
                    <div className="mb-1.5 flex items-center justify-between text-[13px] text-pebble-text-muted">
                      <span>{t('landing.previewUnit')}</span>
                      <span>{t('landing.previewTests')}</span>
                    </div>
                    <pre dir="ltr" className="ltrSafe overflow-hidden rounded-[6px] border border-pebble-border/22 bg-pebble-canvas/90 p-1.5 font-mono text-[13px] leading-snug text-pebble-text-secondary">{`def two_sum(nums, target):\n    seen = {}\n    # TODO\n    return -1, -1`}</pre>
                    <div className="mt-1.5 inline-flex rounded-full border border-pebble-warning/35 bg-pebble-warning/15 px-2 py-0.5 text-[11px] font-medium text-pebble-warning">
                      {t('landing.previewFail')}
                    </div>
                  </div>

                  <div className="rounded-[10px] border border-pebble-border/30 bg-pebble-overlay/[0.08] p-2">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-pebble-accent/28 text-[11px] font-semibold text-pebble-text-primary">
                        P
                      </span>
                      <p className={`text-[13px] font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
                        {t('landing.previewCoach')}
                      </p>
                    </div>
                    <p className={`mt-1 text-[13.5px] leading-relaxed text-pebble-text-secondary line-clamp-2 ${isUrdu ? 'rtlText' : ''}`}>
                      {t('landing.previewCoachHint')}
                    </p>
                  </div>
                </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-[1.12fr_0.88fr] lg:gap-4">
          <TodayPlanCard />
          <div className="flex flex-col gap-4">
            <Card className="relative overflow-hidden p-3 flex flex-col justify-center bg-pebble-overlay/[0.05]" interactive>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pebble-accent/15 text-pebble-accent shrink-0">
                    <Play className="h-4 w-4" aria-hidden="true" />
                  </div>
                  {localizedRecent ? (
                    <div className="space-y-0.5 min-w-0">
                      <p className={`text-[12.5px] font-semibold text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                        {t('home.continue.title')}
                      </p>
                      <p className={`text-[14.5px] font-medium text-pebble-text-primary truncate ${isUrdu ? 'rtlText' : ''}`}>
                        {localizedRecent.title}
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-0.5 min-w-0">
                      <p className={`text-[12.5px] font-semibold text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                        {t('home.continue.title')}
                      </p>
                      <p className={`text-[14px] text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
                        {t('home.continue.empty.title')}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex shrink-0">
                  {localizedRecent ? (
                    <Link to={`/session?problem=${localizedRecent.id}`} className={classNames(buttonClass('primary'), "px-3 py-1.5 text-[13px]")}>
                      {t('home.continue.resume')}
                    </Link>
                  ) : (
                    <Link to="/problems" className={classNames(buttonClass('primary'), "px-3 py-1.5 text-[13px]")}>
                      {t('home.continue.empty.cta')}
                    </Link>
                  )}
                </div>
              </div>
            </Card>
            <RecommendedNextCard className="flex-1" />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {bentoCards.map((card) => {
            const Icon = card.icon
            return (
              <Card key={card.title} padding="sm" className={`h-full p-8 lg:p-10 ${bentoCardClass} min-h-[160px] flex items-center`} interactive>
                {/* Premium floating glass interior elements */}
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 rounded-[inherit] transition-opacity duration-500 opacity-0 group-hover:opacity-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.12),inset_0_-1px_1px_rgba(0,0,0,0.05)] [background-image:linear-gradient(135deg,rgba(255,255,255,0.08)_0%,transparent_40%,transparent_70%,rgba(0,0,0,0.04)_100%)]">
                  {/* Subtle corner glow */}
                  <span className="absolute -right-12 -top-12 block h-32 w-32 rounded-full bg-pebble-accent/10 blur-[40px] transition-opacity duration-500 opacity-0 group-hover:opacity-100" />
                </span>

                {/* Diagonal floating sheen */}
                <span aria-hidden="true" className="pointer-events-none absolute inset-0 transition-transform duration-1000 ease-[cubic-bezier(.2,.8,.2,1)] translate-x-[-150%] opacity-0 group-hover:opacity-100 group-hover:translate-x-[150%] bg-gradient-to-tr from-transparent via-white/[0.06] to-transparent" />

                <div className="relative z-10 flex items-center gap-5">
                  <span className="shrink-0 flex h-16 w-16 relative items-center justify-center rounded-[14px] border border-pebble-border/20 bg-pebble-overlay/[0.04] text-pebble-text-secondary shadow-[inset_0_1px_0_rgba(255,255,255,0.06),0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-500 group-hover:bg-pebble-overlay/[0.08] group-hover:border-pebble-border/40 group-hover:text-pebble-accent group-hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_20px_rgba(0,0,0,0.12)]">
                    <span className="absolute inset-0 rounded-[14px] bg-pebble-accent/20 blur-[10px] transition-opacity duration-500 opacity-0 group-hover:opacity-100" />
                    <Icon className="relative z-10 h-8 w-8 transition-transform duration-500 group-hover:scale-[1.15]" aria-hidden="true" />
                  </span>
                  <div className="space-y-2.5 min-w-0">
                    <h3 className={`text-[19px] font-semibold tracking-tight text-pebble-text-primary transition-colors duration-500 group-hover:text-pebble-accent ${isUrdu ? 'rtlText' : ''}`}>{card.title}</h3>
                    <p className={`text-[15px] leading-relaxed text-pebble-text-secondary transition-colors duration-500 group-hover:text-pebble-text-primary/95 ${isUrdu ? 'rtlText' : ''}`}>{card.detail}</p>
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
