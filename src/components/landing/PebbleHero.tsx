import { Link } from 'react-router-dom'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { Component as EtheralShadow } from '../ui/etheral-shadow'
import { InteractiveGradientButton } from '../ui/interactive-gradient-button'
import { AnimatedProductPreview } from './AnimatedProductPreview'

type PebbleHeroProps = {
  theme: 'light' | 'dark'
  isUrdu: boolean
  badgeText: string
  headline: string
  subheadline: string
  tryPebbleLabel: string
  openSessionLabel: string
  trustChips: string[]
  previewLabel: string
  previewUsingRun: string
  previewUnit: string
  previewCoach: string
  tryPebbleCtaClass: string
  openSessionCtaClass: string
}

function classNames(...values: Array<string | undefined>) {
  return values.filter(Boolean).join(' ')
}

export function PebbleHero({
  theme,
  isUrdu,
  badgeText,
  headline,
  subheadline,
  tryPebbleLabel,
  openSessionLabel,
  trustChips,
  previewLabel,
  previewUsingRun,
  previewUnit,
  previewCoach,
  tryPebbleCtaClass,
  openSessionCtaClass,
}: PebbleHeroProps) {
  const renderHeadlineLines = (lineClassName = '') => (
    headlineLines.length > 1
      ? headlineLines.map((line) => (
        <span key={`${line}-${lineClassName || 'base'}`} className={classNames('block lg:whitespace-nowrap', lineClassName)}>
          {line}
        </span>
      ))
      : (
        <span className={lineClassName}>
          {headline}
        </span>
      )
  )
  const etherealColor = theme === 'dark'
    ? 'rgba(114, 149, 220, 0.16)'
    : 'rgba(86, 138, 232, 0.24)'
  const heroGridLineClass = theme === 'dark'
    ? 'bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]'
    : 'bg-[linear-gradient(to_right,rgba(61,85,126,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(61,85,126,0.08)_1px,transparent_1px)]'
  const stageCardClass = theme === 'dark'
    ? 'border-[rgba(193,209,236,0.22)] bg-[linear-gradient(154deg,rgba(26,37,61,0.995)_0%,rgba(20,29,49,0.996)_54%,rgba(13,21,39,0.998)_100%)] shadow-[0_38px_92px_rgba(0,3,13,0.58),inset_0_1px_0_rgba(228,238,255,0.08)]'
    : 'border-[rgba(140,163,203,0.34)] bg-[linear-gradient(152deg,rgba(244,248,255,0.998)_0%,rgba(235,242,253,0.999)_56%,rgba(227,237,251,1)_100%)] shadow-[0_28px_66px_rgba(53,77,118,0.18),inset_0_1px_0_rgba(255,255,255,0.96)]'
  const headlineLines = headline.split('\n')
  const headlineClass = theme === 'dark'
    ? 'text-[hsl(220_28%_96%)]'
    : 'text-[hsl(223_36%_16%)]'
  const subheadlineClass = theme === 'dark'
    ? 'text-[hsl(220_18%_82%)]'
    : 'text-[hsl(221_28%_30%)]'
  const trustChipClass = theme === 'dark'
    ? 'pebble-chip border-white/12 text-[hsl(220_18%_88%)]'
    : 'pebble-chip text-[hsl(221_24%_32%)]'

  return (
    <Card className="landing-hero-shell relative w-full overflow-hidden rounded-[30px] px-3 py-5 md:px-5 md:py-6 lg:px-7 lg:py-9 xl:px-10 xl:py-10" interactive>
      <div className="pointer-events-none absolute inset-0 z-0">
        <EtheralShadow
          className="absolute inset-0"
          color={etherealColor}
          animation={{ scale: 62, speed: 78 }}
          noise={theme === 'dark'
            ? { opacity: 0.24, scale: 1.34 }
            : { opacity: 0.14, scale: 1.16 }}
          sizing="fill"
          showTitle={false}
        />
        <div className={`absolute inset-0 ${heroGridLineClass} bg-[size:84px_84px] opacity-20 [mask-image:radial-gradient(circle_at_center,black,transparent_88%)]`} />
        <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-pebble-bg/68 via-pebble-bg/28 to-transparent" />
        <div className="absolute left-[14%] top-[8%] h-[18rem] w-[18rem] rounded-full bg-pebble-accent/10 blur-[110px] dark:bg-pebble-accent/10" />
        <div className="absolute right-[10%] top-[18%] h-[20rem] w-[20rem] rounded-full bg-pebble-accent/14 blur-[128px] dark:bg-pebble-accent/12" />
        <div className="absolute inset-x-[18%] top-[16%] h-[15rem] rounded-full bg-[rgba(96,165,250,0.15)] blur-[95px] dark:hidden" />
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1280px]">
        <div className="mx-auto flex w-full max-w-[1060px] flex-col items-center text-center">
          <Badge className="w-fit">{badgeText}</Badge>

          <h1
            className={classNames(
              'hero-headline-shimmer mt-5 max-w-[31ch] text-balance text-[2.2rem] font-extrabold tracking-[-0.04em] leading-[1.06] sm:max-w-[33ch] sm:text-[2.8rem] lg:max-w-[36ch] lg:text-[3.6rem] xl:max-w-[37ch] xl:text-[4rem]',
              headlineClass,
              isUrdu ? 'rtlText' : '',
            )}
          >
            <span className="hero-headline-shimmer-base">
              {renderHeadlineLines()}
            </span>
            <span
              aria-hidden="true"
              className={classNames(
                'hero-headline-shimmer-overlay pointer-events-none absolute inset-0 select-none',
                theme === 'dark' ? 'hero-headline-shimmer-overlay-dark' : 'hero-headline-shimmer-overlay-light',
              )}
            >
              {renderHeadlineLines('hero-headline-shimmer-line')}
            </span>
          </h1>

          <p className={classNames(`mt-5 max-w-[60ch] text-[14.5px] leading-[1.86] sm:text-[15.5px] ${subheadlineClass}`, isUrdu ? 'rtlText' : '')}>
            {subheadline}
          </p>

          <div className="mt-7 flex flex-wrap items-center justify-center gap-3.5">
            <InteractiveGradientButton asChild className={tryPebbleCtaClass}>
              <Link to="/onboarding">
                {tryPebbleLabel}
              </Link>
            </InteractiveGradientButton>
            <Link to="/session/1" className={openSessionCtaClass}>
              {openSessionLabel}
            </Link>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5 sm:gap-3">
            {trustChips.map((chip) => (
              <span
                key={chip}
                className={classNames(
                  'rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium',
                  trustChipClass,
                )}
              >
                {chip}
              </span>
            ))}
          </div>

          <div className="mt-6 h-px w-full max-w-[560px] bg-gradient-to-r from-transparent via-pebble-border/35 to-transparent" />
        </div>

        <div className="mx-auto mt-10 w-full max-w-[1140px] sm:mt-11">
          <div className="relative">
            <div className="pointer-events-none absolute -inset-x-6 -inset-y-6 rounded-[36px] bg-pebble-accent/10 blur-3xl" />
            <div className={`relative rounded-[24px] border p-4 md:p-5 lg:p-6 ${stageCardClass}`}>
              <AnimatedProductPreview
                theme={theme}
                isUrdu={isUrdu}
                previewLabel={previewLabel}
                previewUsingRun={previewUsingRun}
                previewUnit={previewUnit}
                previewCoach={previewCoach}
              />
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
