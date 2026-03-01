import { buttonClass } from '../ui/buttonStyles'
import { useI18n } from '../../i18n/useI18n'

type GuidedFixPanelProps = {
  open: boolean
  step: number
  totalSteps: number
  title: string
  description: string
  snippetLines: string[]
  canGoBack: boolean
  canGoNext: boolean
  isAfk: boolean
  onApplyFix: () => void
  onNextStep: () => void
  onBackStep: () => void
  onExit: () => void
}

export function GuidedFixPanel({
  open,
  step,
  totalSteps,
  title,
  description,
  snippetLines,
  canGoBack,
  canGoNext,
  isAfk,
  onApplyFix,
  onNextStep,
  onBackStep,
  onExit,
}: GuidedFixPanelProps) {
  const { t } = useI18n()

  if (!open) {
    return null
  }

  return (
    <aside className="nudge-enter space-y-3 rounded-xl border border-pebble-accent/30 bg-pebble-accent/10 p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-pebble-text-primary">{t('guidedFix.title')}</p>
        <span className="rounded-full border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2.5 py-1 text-xs font-medium text-pebble-text-secondary">
          {t('guidedFix.step', { step, total: totalSteps })}
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-sm font-medium text-pebble-text-primary">{title}</p>
        <p className="text-sm leading-relaxed text-pebble-text-secondary">{description}</p>
      </div>

      <div className="rounded-lg border border-pebble-border/28 bg-pebble-canvas/85 p-3 font-mono text-xs leading-relaxed text-pebble-text-secondary">
        {snippetLines.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>

      {isAfk && (
        <p className="text-xs text-pebble-text-secondary">
          {t('guidedFix.afkPaused')}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className={buttonClass('primary', 'sm')} onClick={onApplyFix}>
          {t('guidedFix.applyFix')}
        </button>
        <button
          type="button"
          className={buttonClass('secondary', 'sm')}
          onClick={onNextStep}
          disabled={!canGoNext}
        >
          {t('guidedFix.nextStep')}
        </button>
        <button
          type="button"
          className={buttonClass('secondary', 'sm')}
          onClick={onBackStep}
          disabled={!canGoBack}
        >
          {t('guidedFix.back')}
        </button>
        <button type="button" className={buttonClass('secondary', 'sm')} onClick={onExit}>
          {t('guidedFix.exit')}
        </button>
      </div>
    </aside>
  )
}
