import { Button } from '../ui/Button'
import { useI18n } from '../../i18n/useI18n'
import type { StruggleLevel } from '../../lib/struggleEngine'

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
    <div className="pointer-events-none absolute inset-x-3 bottom-[4.1rem] z-20">
      <div className="pointer-events-auto rounded-xl border border-pebble-border/40 bg-pebble-panel/88 px-3 py-2 shadow-[0_12px_28px_rgba(2,8,23,0.35)] backdrop-blur-md">
        <p className={`text-xs font-medium text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>{message}</p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {level === 1 ? (
            <Button
              size="sm"
              className="h-7 px-2.5 text-xs"
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
                className="h-7 px-2.5 text-xs"
                onClick={() => onAction('explain')}
                disabled={busy}
              >
                {t('coach.explain')}
              </Button>
              <Button
                variant="secondary"
                size="sm"
                className="h-7 px-2.5 text-xs"
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
              className="h-7 px-2.5 text-xs"
              onClick={() => onAction('solution')}
              disabled={busy}
            >
              {t('chat.nudge.solution')}
            </Button>
          ) : null}
          <Button
            variant="secondary"
            size="sm"
            className="h-7 px-2.5 text-xs"
            onClick={onDismiss}
            disabled={busy}
          >
            {t('chat.nudge.dismiss')}
          </Button>
        </div>
      </div>
    </div>
  )
}

export type { StruggleNudgeAction }
