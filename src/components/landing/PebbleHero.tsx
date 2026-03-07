import { Link } from 'react-router-dom'
import { AlertTriangle, ArrowRight, Sparkles } from 'lucide-react'
import { Badge } from '../ui/Badge'
import { Card } from '../ui/Card'
import { StatusPill } from '../ui/StatusPill'
import { Component as EtheralShadow } from '../ui/etheral-shadow'
import { InteractiveGradientButton } from '../ui/interactive-gradient-button'

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
  previewTests: string
  previewFail: string
  previewCoach: string
  previewCoachHint: string
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
  previewTests,
  previewFail,
  previewCoach,
  previewCoachHint,
  tryPebbleCtaClass,
  openSessionCtaClass,
}: PebbleHeroProps) {
  const etherealColor = theme === 'dark'
    ? 'rgba(114, 149, 220, 0.16)'
    : 'rgba(86, 138, 232, 0.24)'
  const heroGridLineClass = theme === 'dark'
    ? 'bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.03)_1px,transparent_1px)]'
    : 'bg-[linear-gradient(to_right,rgba(61,85,126,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(61,85,126,0.08)_1px,transparent_1px)]'
  const stageCardClass = theme === 'dark'
    ? 'border-[rgba(193,209,236,0.22)] bg-[linear-gradient(154deg,rgba(26,37,61,0.995)_0%,rgba(20,29,49,0.996)_54%,rgba(13,21,39,0.998)_100%)] shadow-[0_38px_92px_rgba(0,3,13,0.58),inset_0_1px_0_rgba(228,238,255,0.08)]'
    : 'border-[rgba(140,163,203,0.34)] bg-[linear-gradient(152deg,rgba(244,248,255,0.998)_0%,rgba(235,242,253,0.999)_56%,rgba(227,237,251,1)_100%)] shadow-[0_28px_66px_rgba(53,77,118,0.18),inset_0_1px_0_rgba(255,255,255,0.96)]'
  const panelOutlineClass = theme === 'dark'
    ? 'border-[rgba(255,255,255,0.09)]'
    : 'border-[rgba(129,144,174,0.58)]'
  const codePanelClass = theme === 'dark'
    ? 'bg-[linear-gradient(180deg,rgba(24,34,58,0.98)_0%,rgba(20,29,49,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    : 'bg-[linear-gradient(160deg,rgba(234,241,252,0.98)_0%,rgba(226,236,249,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]'
  const coachPanelClass = theme === 'dark'
    ? 'bg-[linear-gradient(180deg,rgba(27,37,60,0.98)_0%,rgba(22,31,51,0.98)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    : 'bg-[linear-gradient(165deg,rgba(236,243,253,0.98)_0%,rgba(226,236,249,0.99)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)]'
  const previewStoryClass = theme === 'dark'
    ? 'border-pebble-accent/14 bg-[linear-gradient(180deg,rgba(59,130,246,0.08)_0%,rgba(255,255,255,0.02)_100%)]'
    : 'border-pebble-accent/14 bg-[linear-gradient(180deg,rgba(59,130,246,0.06)_0%,rgba(255,255,255,0.74)_100%)]'
  const previewStepClass = theme === 'dark'
    ? 'border-pebble-border/18 bg-pebble-canvas/34'
    : 'border-pebble-border/20 bg-white/58'
  const storyLabelClass = theme === 'dark'
    ? 'text-[hsl(220_20%_94%)]'
    : 'text-[hsl(223_32%_20%)]'
  const storyMetaClass = theme === 'dark'
    ? 'text-[hsl(220_14%_74%)]'
    : 'text-[hsl(221_22%_38%)]'
  const recoveryBoxClass = theme === 'dark'
    ? 'border-pebble-accent/20 bg-pebble-accent/10'
    : 'border-pebble-accent/22 bg-pebble-accent/8'
  const editorSurfaceClass = theme === 'dark'
    ? 'bg-[hsl(222_22%_26%)] text-[hsl(220_20%_92%)]'
    : 'bg-[hsl(220_38%_97%)] text-[hsl(224_34%_18%)]'
  const editorCommentClass = theme === 'dark'
    ? 'text-[hsl(220_12%_65%)]'
    : 'text-[hsl(220_18%_50%)]'
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
              'mt-5 max-w-[31ch] text-balance text-[2.2rem] font-extrabold tracking-[-0.04em] leading-[1.06] sm:max-w-[33ch] sm:text-[2.8rem] lg:max-w-[36ch] lg:text-[3.6rem] xl:max-w-[37ch] xl:text-[4rem]',
              headlineClass,
              isUrdu ? 'rtlText' : '',
            )}
          >
            {headlineLines.length > 1
              ? headlineLines.map((line) => (
                <span key={line} className="block lg:whitespace-nowrap">
                  {line}
                </span>
              ))
              : headline}
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
              <div className="flex items-center justify-between gap-2">
                <p className={classNames('text-[13px] font-semibold uppercase tracking-[0.08em] text-pebble-text-secondary', isUrdu ? 'rtlText' : '')}>
                  {previewLabel}
                </p>
                <span className="pebble-chip rounded-full px-2.5 py-1 text-[10.5px] uppercase tracking-[0.06em] text-pebble-text-primary">
                  {previewUsingRun}
                </span>
              </div>

              <div className={`mt-4 rounded-[18px] border px-3.5 py-3 ${previewStoryClass}`}>
                <div className="grid gap-2.5 md:grid-cols-[1fr_auto_1fr_auto_1fr] md:items-center">
                  <div className={`rounded-[14px] border px-3 py-2.5 ${previewStepClass}`}>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-3.5 w-3.5 text-amber-500" aria-hidden="true" />
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${storyMetaClass}`}>Fail isolated</p>
                    </div>
                    <p className={`mt-1 text-[12.5px] font-medium ${storyLabelClass}`}>Case #2 returns `-1, -1`.</p>
                  </div>
                  <ArrowRight className="mx-auto hidden h-3.5 w-3.5 text-pebble-text-muted md:block" aria-hidden="true" />
                  <div className={`rounded-[14px] border px-3 py-2.5 ${previewStepClass}`}>
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5 text-pebble-accent" aria-hidden="true" />
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${storyMetaClass}`}>Coach grounded</p>
                    </div>
                    <p className={`mt-1 text-[12.5px] font-medium ${storyLabelClass}`}>Pebble points to complement order.</p>
                  </div>
                  <ArrowRight className="mx-auto hidden h-3.5 w-3.5 text-pebble-text-muted md:block" aria-hidden="true" />
                  <div className={`rounded-[14px] border px-3 py-2.5 ${previewStepClass}`}>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-pebble-accent/16 text-[9px] font-bold text-pebble-accent">3</span>
                      <p className={`text-[11px] font-semibold uppercase tracking-[0.08em] ${storyMetaClass}`}>Next step</p>
                    </div>
                    <p className={`mt-1 text-[12.5px] font-medium ${storyLabelClass}`}>Check before storing and rerun.</p>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(0,0.95fr)]">
                <div className={`min-w-0 rounded-[16px] border p-4 md:p-4.5 ${panelOutlineClass} ${codePanelClass}`}>
                  <div className="mb-3 flex items-center justify-between text-[13px] text-pebble-text-primary">
                    <span className="font-medium">{previewUnit}</span>
                    <span className="pebble-chip rounded-full px-2 py-0.5 text-[11px]">
                      {previewTests}
                    </span>
                  </div>

                  <pre
                    dir="ltr"
                    className={`ltrSafe min-w-0 overflow-hidden rounded-[10px] border ${panelOutlineClass} ${editorSurfaceClass} p-3 font-mono text-[13px] leading-[1.7]`}
                  >
                    <code>
                      <span className="block">def two_sum(nums, target):</span>
                      <span className="block">    seen = &#123;&#125;</span>
                      <span className={`block ${editorCommentClass}`}>    # check complement before insert</span>
                      <span className="block">    return -1, -1</span>
                    </code>
                  </pre>

                  <div className="mt-3 grid gap-2.5 md:grid-cols-[1fr_auto] md:items-center">
                    <StatusPill variant="fail" showIcon className="max-w-full whitespace-normal break-words leading-tight">
                      {previewFail}
                    </StatusPill>
                    <span className="pebble-chip-strong rounded-full px-2.5 py-1 text-[11px] font-medium">
                      Runtime feedback
                    </span>
                  </div>
                  <div className={`mt-3 rounded-[12px] border px-3 py-2.5 text-[12px] leading-[1.6] ${recoveryBoxClass}`}>
                    <p className="font-medium text-pebble-text-primary">Failure signal</p>
                    <p className="mt-1 text-pebble-text-secondary">The current flow stores first and misses the already-seen complement on case #2.</p>
                  </div>
                </div>

                <div className={`min-w-0 rounded-[16px] border p-4 md:p-4.5 ${panelOutlineClass} ${coachPanelClass}`}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                    <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-pebble-accent/28 text-[11px] font-semibold text-pebble-text-primary shadow-[0_6px_12px_rgba(55,72,110,0.10)]">
                      P
                    </span>
                      <p className={classNames('text-[13px] font-semibold text-pebble-text-primary dark:text-[hsl(220_20%_94%)]', isUrdu ? 'rtlText' : '')}>
                        {previewCoach}
                      </p>
                    </div>
                    <span className="pebble-chip rounded-full px-2.5 py-0.5 text-[10px] font-medium uppercase tracking-[0.08em]">
                      In context
                    </span>
                  </div>

                  <p className={classNames('mt-3 text-[13.5px] leading-[1.76] text-pebble-text-secondary dark:text-[hsl(220_15%_78%)]', isUrdu ? 'rtlText' : '')}>
                    {previewCoachHint}
                  </p>

                  <div className={classNames(`mt-3.5 rounded-[10px] border ${panelOutlineClass} bg-pebble-overlay/[0.08] px-3 py-2.5 text-[12px] leading-[1.6] text-pebble-text-secondary`, isUrdu ? 'rtlText' : '')}>
                    <p className="font-medium text-pebble-text-primary">Suggested fix</p>
                    <p className="mt-1">Check whether `target - current` is already in `seen`, then return immediately.</p>
                  </div>

                  <div className={classNames(`mt-3 rounded-[10px] border ${recoveryBoxClass} px-3 py-2.5 text-[12px] leading-[1.6] text-pebble-text-secondary`, isUrdu ? 'rtlText' : '')}>
                    Recovery loop: run → inspect fail case → apply one fix → rerun.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
