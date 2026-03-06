import { useEffect } from 'react'
import { ChevronDown, DatabaseZap, Globe2, MoonStar, SunMedium } from 'lucide-react'
import { useTheme } from '../../hooks/useTheme'
import { buttonClass } from '../ui/buttonStyles'
import { LANGUAGES } from '../../i18n/languages'
import { useI18n } from '../../i18n/useI18n'
import { LanguageSelect } from '../ui/LanguageSelect'

type SettingsModalProps = {
  open: boolean
  onClose: () => void
  onResetLocalData: () => void
}

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

function segmentButtonClass(isActive: boolean) {
  const activeClass = 'bg-pebble-panel text-pebble-text-primary shadow-[0_12px_24px_rgba(2,8,23,0.18)] ring-1 ring-pebble-border/30'
  return `inline-flex h-11 items-center justify-center gap-2 rounded-[16px] px-4 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 ${isActive
    ? `${activeClass} scale-[1.01]`
    : 'bg-transparent text-pebble-text-secondary hover:text-pebble-text-primary'
    }`
}

export function SettingsModal({
  open,
  onClose,
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

  const isDark = theme === 'dark'
  const modalSurfaceClass =
    theme === 'light'
      ? 'pebble-panel-float border-pebble-border/28 bg-transparent'
      : 'border border-[rgba(150,168,205,0.22)] bg-[hsl(228_27%_21%)] shadow-[0_32px_90px_rgba(2,8,23,0.54),0_8px_28px_rgba(8,15,35,0.26)]'
  const sectionSurfaceClass = isDark
    ? 'rounded-[22px] border border-[rgba(160,177,212,0.2)] bg-[linear-gradient(180deg,rgba(72,82,112,0.38)_0%,rgba(56,65,92,0.3)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]'
    : 'rounded-[22px] border border-pebble-border/24 bg-pebble-overlay/[0.05] px-4 py-4'
  const iconSurfaceClass = isDark
    ? 'inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-[rgba(160,177,212,0.2)] bg-[rgba(255,255,255,0.045)] text-pebble-accent'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-pebble-border/24 bg-pebble-overlay/[0.08] text-pebble-accent'
  const segmentedRailClass = isDark
    ? 'grid grid-cols-2 rounded-[18px] border border-[rgba(160,177,212,0.22)] bg-[rgba(255,255,255,0.04)] p-1.5'
    : 'grid grid-cols-2 rounded-[18px] border border-pebble-border/32 bg-pebble-overlay/[0.08] p-1.5'
  const closeButtonClass = isDark
    ? 'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-[rgba(160,177,212,0.22)] bg-[rgba(255,255,255,0.04)] text-pebble-text-secondary transition hover:bg-[rgba(255,255,255,0.08)] hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/40'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-pebble-border/30 bg-pebble-overlay/8 text-pebble-text-secondary transition hover:bg-pebble-overlay/14 hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/40'
  const destructiveSectionClass = isDark
    ? 'rounded-[22px] border border-[rgba(229,94,124,0.24)] bg-[linear-gradient(180deg,rgba(107,41,58,0.22)_0%,rgba(78,33,46,0.18)_100%)] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]'
    : 'rounded-[22px] border border-rose-400/18 bg-rose-500/[0.04] px-4 py-4'
  const destructiveIconClass = isDark
    ? 'inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-[rgba(229,94,124,0.24)] bg-[rgba(229,94,124,0.12)] text-rose-300'
    : 'inline-flex h-10 w-10 items-center justify-center rounded-[14px] border border-rose-400/22 bg-rose-500/[0.08] text-rose-600 dark:text-rose-300'

  return (
    <div
      role="presentation"
      className={`fixed inset-0 z-50 flex items-center justify-center px-4 ${
        isDark ? 'bg-[rgba(4,8,18,0.62)] backdrop-blur-[3px]' : 'bg-black/42 backdrop-blur-[2px]'
      }`}
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
        className={`soft-ring w-full max-w-[540px] space-y-7 rounded-[28px] p-7 ${isDark ? '' : 'backdrop-blur-2xl'} ${modalSurfaceClass}`}
        style={{
          backgroundImage:
            theme === 'light'
              ? 'linear-gradient(180deg, rgba(248,251,255,0.99) 0%, rgba(236,242,252,0.96) 100%)'
              : 'linear-gradient(180deg, rgba(58,67,95,0.96) 0%, rgba(40,48,72,0.98) 100%)',
        }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1.5">
            <p className={`text-[11px] font-semibold uppercase tracking-[0.12em] text-pebble-text-muted ${isUrdu ? 'rtlText' : ''}`}>
              Workspace preferences
            </p>
            <h2 id="settings-title" className={`text-[1.35rem] font-semibold tracking-[-0.02em] text-pebble-text-primary ${isUrdu ? 'rtlText' : ''}`}>
              {t('settings.title')}
            </h2>
            <p className={`max-w-[38ch] text-sm leading-6 text-pebble-text-secondary ${isUrdu ? 'rtlText' : ''}`}>
              {t('settings.subtitle')}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('settings.closeAria')}
            onClick={onClose}
            className={closeButtonClass}
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

        <div className="space-y-5">
          <section className={sectionSurfaceClass}>
            <div className="mb-3 flex items-start gap-3">
              <span className={iconSurfaceClass}>
                <Globe2 className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-pebble-text-primary">{t('settings.language')}</p>
                <p className="text-xs leading-5 text-pebble-text-secondary">Choose the app language Pebble should use across the interface.</p>
              </div>
            </div>
            <div className="relative">
              <LanguageSelect
                label=""
                value={lang}
                onChange={setLang}
                options={LANGUAGES}
              />
              <ChevronDown className="pointer-events-none absolute right-3 top-[calc(50%+2px)] h-4 w-4 -translate-y-1/2 text-pebble-text-muted" />
            </div>
          </section>

          <section className={sectionSurfaceClass}>
            <div className="mb-3 flex items-start gap-3">
              <span className={iconSurfaceClass}>
                {theme === 'dark' ? <MoonStar className="h-4.5 w-4.5" /> : <SunMedium className="h-4.5 w-4.5" />}
              </span>
              <div>
                <p className="text-sm font-semibold text-pebble-text-primary">{t('settings.theme')}</p>
                <p className="text-xs leading-5 text-pebble-text-secondary">Switch between Pebble’s dark and light workspace styles.</p>
              </div>
            </div>
            <div className={segmentedRailClass}>
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={segmentButtonClass(theme === 'dark')}
              >
                <MoonStar className="h-4 w-4" />
                {t('settings.themeDark')}
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={segmentButtonClass(theme === 'light')}
              >
                <SunMedium className="h-4 w-4" />
                {t('settings.themeLight')}
              </button>
            </div>
          </section>

          <section className={destructiveSectionClass}>
            <div className="mb-3 flex items-start gap-3">
              <span className={destructiveIconClass}>
                <DatabaseZap className="h-4.5 w-4.5" />
              </span>
              <div>
                <p className="text-sm font-semibold text-pebble-text-primary">{t('settings.data')}</p>
                <p className="text-xs leading-5 text-pebble-text-secondary">
                  {t('settings.resetLocalDataHint')}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onResetLocalData}
              className={`${buttonClass('secondary')} h-11 rounded-2xl border-rose-400/28 bg-rose-500/[0.08] px-4 text-sm font-semibold text-rose-700 hover:bg-rose-500/[0.12] dark:border-rose-400/30 dark:bg-rose-500/[0.10] dark:text-rose-200`}
            >
              {t('settings.resetLocalData')}
            </button>
          </section>
        </div>
      </section>
    </div>
  )
}
