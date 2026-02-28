import { useEffect } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { buttonClass } from '../ui/buttonStyles'
import { LANGUAGES } from '../../i18n/languages'
import { useI18n } from '../../i18n/useI18n'
import { LanguageSelect } from '../ui/LanguageSelect'

type SettingsModalProps = {
  open: boolean
  demoMode: boolean
  onClose: () => void
  onDemoModeChange: (isEnabled: boolean) => void
  onResetLocalData: () => void
}

type SegmentTone = 'default' | 'accent' | 'neutral'

const BODY_LOCK_COUNT_ATTR = 'data-pebble-scroll-lock-count'
const BODY_PREVIOUS_OVERFLOW_ATTR = 'data-pebble-scroll-lock-overflow'

function lockBodyScroll() {
  const body = document.body
  const lockCount = Number(body.getAttribute(BODY_LOCK_COUNT_ATTR) ?? '0')

  if (lockCount === 0) {
    body.setAttribute(BODY_PREVIOUS_OVERFLOW_ATTR, body.style.overflow || '')
    body.style.overflow = 'hidden'
  }

  body.setAttribute(BODY_LOCK_COUNT_ATTR, String(lockCount + 1))
}

function unlockBodyScroll() {
  const body = document.body
  const lockCount = Number(body.getAttribute(BODY_LOCK_COUNT_ATTR) ?? '0')
  const nextCount = Math.max(0, lockCount - 1)

  if (nextCount === 0) {
    const previousOverflow = body.getAttribute(BODY_PREVIOUS_OVERFLOW_ATTR) ?? ''
    body.style.overflow = previousOverflow
    body.removeAttribute(BODY_LOCK_COUNT_ATTR)
    body.removeAttribute(BODY_PREVIOUS_OVERFLOW_ATTR)
    return
  }

  body.setAttribute(BODY_LOCK_COUNT_ATTR, String(nextCount))
}

function segmentButtonClass(isActive: boolean, tone: SegmentTone = 'default') {
  const activeClass =
    tone === 'accent'
      ? 'bg-pebble-accent/90 text-white shadow-[0_1px_8px_rgba(2,8,23,0.22)] ring-1 ring-pebble-accent/35'
      : tone === 'neutral'
        ? 'bg-pebble-panel text-pebble-text-primary shadow-[0_1px_8px_rgba(2,8,23,0.16)] ring-1 ring-pebble-border/35'
        : 'bg-pebble-panel text-pebble-text-primary shadow-[0_1px_8px_rgba(2,8,23,0.16)] ring-1 ring-pebble-border/35'

  return `rounded-lg px-4 py-1.5 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${
    isActive
      ? `${activeClass} scale-[1.01]`
      : 'bg-transparent text-pebble-text-secondary hover:text-pebble-text-primary'
  }`
}

export function SettingsModal({
  open,
  demoMode,
  onClose,
  onDemoModeChange,
  onResetLocalData,
}: SettingsModalProps) {
  const { theme, setTheme } = useTheme()
  const { lang, setLang, t, isRTL } = useI18n()
  const isUrdu = isRTL

  useEffect(() => {
    if (!open) {
      return
    }

    lockBodyScroll()

    return () => {
      unlockBodyScroll()
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      return
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  const modalSurfaceClass =
    theme === 'light'
      ? 'border border-slate-300/70 bg-white/[0.86] shadow-[0_24px_56px_rgba(15,23,42,0.18)]'
      : 'border border-pebble-border/40 bg-pebble-panel/92 shadow-glass'

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/42 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        dir="ltr"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className={`soft-ring w-full max-w-[500px] space-y-6 rounded-2xl p-6 backdrop-blur-2xl ${modalSurfaceClass}`}
        style={{
          backgroundImage:
            theme === 'light'
              ? 'linear-gradient(180deg, rgba(255,255,255,0.96) 0%, rgba(241,247,255,0.9) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.03) 100%)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="settings-title" className={`text-xl font-semibold text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
              {t('settings.title')}
            </h2>
            <p className={`mt-1 text-sm text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
              {t('settings.subtitle')}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('settings.closeAria')}
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-pebble-border/35 bg-pebble-overlay/8 text-pebble-text-secondary transition hover:bg-pebble-overlay/14 hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/40"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
              <path
                d="M5 5l10 10M15 5 5 15"
                stroke="currentColor"
                strokeWidth="1.35"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <LanguageSelect
            label={t('settings.language')}
            value={lang}
            onChange={setLang}
            options={LANGUAGES}
          />

          <div className="space-y-2">
            <p className="text-sm font-medium text-pebble-text-primary">{t('settings.theme')}</p>
            <div className="inline-flex rounded-xl border border-pebble-border/40 bg-pebble-overlay/[0.08] p-1">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={segmentButtonClass(theme === 'dark', 'default')}
              >
                {t('settings.themeDark')}
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={segmentButtonClass(theme === 'light', 'default')}
              >
                {t('settings.themeLight')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-pebble-text-primary">{t('settings.demoMode')}</p>
            <div className="inline-flex rounded-xl border border-pebble-border/40 bg-pebble-overlay/[0.08] p-1">
              <button
                type="button"
                onClick={() => onDemoModeChange(true)}
                className={segmentButtonClass(demoMode, 'accent')}
              >
                {t('actions.on')}
              </button>
              <button
                type="button"
                onClick={() => onDemoModeChange(false)}
                className={segmentButtonClass(!demoMode, 'neutral')}
              >
                {t('actions.off')}
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-pebble-text-primary">{t('settings.data')}</p>
            <button type="button" onClick={onResetLocalData} className={buttonClass('secondary')}>
              {t('settings.resetLocalData')}
            </button>
            <p className="text-xs text-pebble-text-secondary">
              {t('settings.resetLocalDataHint')}
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
