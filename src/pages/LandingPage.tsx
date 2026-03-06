import { Play } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { buttonClass } from '../components/ui/buttonStyles'
import { useI18n } from '../i18n/useI18n'
import { useTheme } from '../hooks/useTheme'
import { getRecentActivity } from '../lib/recentStore'
import { getProblemById } from '../data/problemsBank'
import { getLocalizedProblem } from '../i18n/problemContent'
import { TodayPlanCard } from '../components/home/TodayPlanCard'
import { RecommendedNextCard } from '../components/home/RecommendedNextCard'
import { FeatureGrid } from '../components/home/FeatureGrid'
import { SiteFooter } from '../components/layout/SiteFooter'
import { FooterSeparator } from '../components/home/FooterSeparator'
import { PebbleHero } from '../components/landing/PebbleHero'

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function LandingPage() {
  const { t, lang } = useI18n()
  const { theme } = useTheme()
  const isUrdu = lang === 'ur'

  const continueSurfaceClass = theme === 'dark'
    ? 'landing-secondary-card border-pebble-border/24'
    : 'landing-secondary-card border-pebble-border/26'
  const recommendedSurfaceClass = theme === 'dark'
    ? 'landing-primary-card border-pebble-accent/22'
    : 'landing-primary-card border-pebble-accent/22'

  const recent = getRecentActivity()
  const recentProblem = recent ? getProblemById(recent.problemId) : null
  const localizedRecent = recentProblem ? getLocalizedProblem(recentProblem, lang) : null
  const recentTimeAgo = recent
    ? (() => {
        const diffMinutes = Math.max(1, Math.round((Date.now() - recent.timestamp) / 60000))
        if (diffMinutes < 60) return `${diffMinutes}m ago`
        const diffHours = Math.round(diffMinutes / 60)
        if (diffHours < 24) return `${diffHours}h ago`
        return `${Math.round(diffHours / 24)}d ago`
      })()
    : null

  const trustChips = [t('landing.trust1'), t('landing.trust2'), t('landing.trust3')]
  const tryPebbleCtaClass = 'inline-flex min-w-[184px] h-[52px] items-center justify-center gap-2 rounded-full px-8 text-[18px] font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] transition-[background-color,border-color,box-shadow,transform] duration-150 ease-out'
  const openSessionCtaClass = 'inline-flex h-[44px] items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold tracking-tight border border-[#B9C8E8] bg-[#F5F8FF] text-[#1B2A4A] shadow-[0_1px_0_rgba(255,255,255,0.92)_inset,0_10px_24px_rgba(15,23,42,0.08)] hover:-translate-y-[1px] hover:bg-[#F9FBFF] hover:border-[#9FB6E6] hover:text-[#13223F] hover:shadow-[0_1px_0_rgba(255,255,255,0.96)_inset,0_12px_26px_rgba(15,23,42,0.10)] dark:bg-[#0B1220] dark:border-[#2E4A7A] dark:text-[#EAF0FF] dark:shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_10px_28px_rgba(0,0,0,0.45)] dark:hover:-translate-y-[1px] dark:hover:bg-[#0F182B] dark:hover:border-[#4167A4] dark:hover:text-[#F3F7FF] dark:hover:shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_12px_30px_rgba(0,0,0,0.52)] transition-[background-color,border-color,box-shadow,color,transform] duration-150 ease-out focus-visible:ring-[#4F8BFF]/45 dark:focus-visible:ring-[#8DB6FF]/55 focus-visible:ring-offset-[#F5F8FF] dark:focus-visible:ring-offset-[#0B1220]'

  return (
    <section className="page-enter min-h-0">
      <div className="flex min-h-0 flex-col gap-6 lg:gap-7">
        <PebbleHero
          theme={theme}
          isUrdu={isUrdu}
          badgeText={t('landing.badge')}
          headline={lang === 'en'
            ? 'Elite coding practice with real runtime feedback\nand mentor-level guidance.'
            : t('landing.headline')}
          subheadline={t('landing.subheadline')}
          tryPebbleLabel={t('landing.tryPebble')}
          openSessionLabel={t('landing.openSession')}
          trustChips={trustChips}
          previewLabel={t('landing.previewLabel')}
          previewUsingRun={t('landing.previewUsingRun')}
          previewUnit={t('landing.previewUnit')}
          previewTests={t('landing.previewTests')}
          previewFail={t('landing.previewFail')}
          previewCoach={t('landing.previewCoach')}
          previewCoachHint={t('landing.previewCoachHint')}
          tryPebbleCtaClass={tryPebbleCtaClass}
          openSessionCtaClass={openSessionCtaClass}
        />

        <section className="landing-subsection mt-3 rounded-[32px] px-3 py-5 sm:px-4 sm:py-6 lg:px-5 lg:py-7">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pebble-overlay/60 to-transparent" />
          <div className="pointer-events-none absolute left-[-8%] top-0 h-40 w-40 rounded-full bg-pebble-accent/10 blur-3xl" />
          <div className="pointer-events-none absolute right-[-6%] bottom-[-10%] h-44 w-44 rounded-full bg-pebble-accent/8 blur-3xl" />
          <div className="relative grid grid-cols-1 gap-5 lg:grid-cols-[1.08fr_0.92fr] lg:gap-6">
            <TodayPlanCard />
            <div className="flex flex-col gap-5">
            <Card className={`relative flex flex-col overflow-hidden rounded-[24px] p-5 ${continueSurfaceClass}`} interactive>
              <div className="mb-4 flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-pebble-accent/22 bg-pebble-accent/12 text-pebble-accent">
                    <Play className="h-4 w-4" aria-hidden="true" />
                  </div>
                  {localizedRecent ? (
                    <div className="min-w-0 space-y-1.5">
                      <p className={`text-[12px] font-semibold uppercase tracking-[0.08em] text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                        {t('home.continue.title')}
                      </p>
                      <p className={`truncate text-[1rem] font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
                        {localizedRecent.title}
                      </p>
                      <p className={`text-[12.5px] leading-[1.68] text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                        Resume the thread, rerun the last failing case, and close the loop while context is still warm.
                      </p>
                    </div>
                  ) : (
                    <div className="min-w-0 space-y-1.5">
                      <p className={`text-[12px] font-semibold uppercase tracking-[0.08em] text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                        {t('home.continue.title')}
                      </p>
                      <p className={`text-[1rem] font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
                        {t('home.continue.empty.title')}
                      </p>
                      <p className={`text-[12.5px] leading-[1.68] text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                        Pick a first problem and Pebble will keep your runtime context ready to continue next time.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {localizedRecent ? (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-pebble-accent/24 bg-pebble-accent/10 px-2 py-0.5 text-[10.5px] font-medium text-pebble-accent">
                    {recentProblem?.difficulty}
                  </span>
                  {localizedRecent.topics.slice(0, 1).map((topic) => (
                    <span key={topic} className="rounded-full border border-pebble-border/24 bg-pebble-overlay/[0.05] px-2 py-0.5 text-[10.5px] font-medium text-pebble-text-secondary">
                      {topic}
                    </span>
                  ))}
                  {recentTimeAgo ? (
                    <span className="rounded-full border border-pebble-border/24 bg-pebble-overlay/[0.05] px-2 py-0.5 text-[10.5px] font-medium text-pebble-text-secondary">
                      {t('home.continue.lastOpened', { timeAgo: recentTimeAgo })}
                    </span>
                  ) : null}
                </div>
              ) : (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  {['Guided warm-up', 'Real runtime checks', 'Coach in context'].map((label) => (
                    <span key={label} className="rounded-full border border-pebble-border/24 bg-pebble-overlay/[0.05] px-2 py-0.5 text-[10.5px] font-medium text-pebble-text-secondary">
                      {label}
                    </span>
                  ))}
                </div>
              )}

              <div className="mt-auto flex items-center justify-between gap-3 rounded-[16px] border border-pebble-border/18 bg-pebble-overlay/[0.04] px-3 py-3">
                <p className={`text-[12px] leading-[1.6] text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
                  {localizedRecent ? 'Jump straight back into the same unit and keep your recovery loop short.' : 'Start a first session and Pebble will build your continuation context automatically.'}
                </p>
                <div className="shrink-0">
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
            <RecommendedNextCard className={`flex-1 ${recommendedSurfaceClass}`} />
          </div>
          </div>
        </section>

        <FeatureGrid />

        <FooterSeparator />
        <SiteFooter />
      </div>
    </section>
  )
}
