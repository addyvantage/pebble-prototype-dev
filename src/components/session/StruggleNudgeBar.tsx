import { Button } from '../ui/Button'
import { useI18n } from '../../i18n/useI18n'
import type { StruggleLevel } from '../../lib/struggleEngine'
import { Lightbulb } from 'lucide-react'

type StruggleNudgeAction = 'hint' | 'explain' | 'next' | 'solution'

type StruggleNudgeBarProps = {
  level: Exclude<StruggleLevel, 0>
  visible: boolean
  busy?: boolean
  onAction: (action: StruggleNudgeAction) => void
  onDismiss: () => void
}

export function StruggleNudgeBar({
  level,
  visible,
  busy = false,
  onAction,
  onDismiss,
}: StruggleNudgeBarProps) {
  const { t, isRTL } = useI18n()

  if (!visible) {
    return null
  }

  const message =
    level === 1
      ? t('chat.nudge.level1')
      : level === 2
        ? t('chat.nudge.level2')
        : t('chat.nudge.level3')

  return (
    <div className="rounded-xl border border-pebble-border/34 bg-pebble-overlay/[0.10] p-2.5 shadow-[0_8px_22px_rgba(2,8,23,0.22)] backdrop-blur-sm">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-pebble-accent/35 bg-pebble-accent/16 text-pebble-accent">
          <Lightbulb className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <p className={`text-[12px] font-semibold leading-4 text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>{t('chat.needNudge')}</p>
          <p className={`mt-0.5 text-[11px] leading-5 text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>{message}</p>
        </div>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
        <Button
          variant="secondary"
          size="sm"
          className="h-[26px] px-2.5 text-[11px]"
          onClick={onDismiss}
          disabled={busy}
        >
          {t('chat.nudge.dismiss')}
        </Button>
        <div className="flex flex-wrap items-center gap-1.5">
          {level === 1 ? (
            <Button
              size="sm"
              className="h-[26px] px-3 text-[11px]"
              onClick={() => onAction('hint')}
              disabled={busy}
            >
              {t('coach.hint')}
            </Button>
          ) : null}
          {level === 2 ? (
            <>
              <Button
                size="sm"
                className="h-[26px] px-3 text-[11px]"
                onClick={() => onAction('explain')}
                disabled={busy}
              >
                {t('coach.explain')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-[26px] px-3 text-[11px]"
                onClick={() => onAction('next')}
                disabled={busy}
              >
                {t('coach.nextStep')}
              </Button>
            </>
          ) : null}
          {level === 3 ? (
            <Button
              size="sm"
              className="h-[26px] px-3 text-[11px]"
              onClick={() => onAction('solution')}
              disabled={busy}
            >
              {t('chat.nudge.solution')}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export type { StruggleNudgeAction }
