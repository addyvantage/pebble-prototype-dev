import { createPortal } from 'react-dom'
import { useTheme } from '../../hooks/useTheme'
import { buttonClass } from '../ui/buttonStyles'
import { useI18n } from '../../i18n/useI18n'

type ProfileMenuProps = {
  open: boolean
  anchorRect: DOMRect | null
  userName: string
  personaSummary: string
  onSignOut: () => void
  onRequestClose: () => void
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export function ProfileMenu({
  open,
  anchorRect,
  userName,
  personaSummary,
  onSignOut,
  onRequestClose,
}: ProfileMenuProps) {
  const { theme } = useTheme()
  const { t, isRTL } = useI18n()

  if (!open || !anchorRect || typeof window === 'undefined') {
    return null
  }

  const viewportWidth = window.innerWidth
  const viewportHeight = window.innerHeight

  const viewportPadding = 8
  const panelWidth = Math.min(352, viewportWidth - viewportPadding * 2)
  const panelHeightEstimate = 260
  const belowTop = anchorRect.bottom + 8
  const aboveTop = anchorRect.top - panelHeightEstimate - 8
  const top =
    belowTop + panelHeightEstimate <= viewportHeight - viewportPadding
      ? belowTop
      : clamp(aboveTop, viewportPadding, viewportHeight - panelHeightEstimate - viewportPadding)
  const left = clamp(
    anchorRect.right - panelWidth,
    viewportPadding,
    viewportWidth - panelWidth - viewportPadding,
  )

  const shellClass =
    theme === 'light'
      ? 'border border-pebble-border/25 shadow-[0_12px_40px_rgba(55,72,110,0.15)]'
      : 'border border-pebble-border/42 shadow-[0_22px_54px_rgba(2,8,23,0.34)]'

  const baseLayerClass = theme === 'light' ? 'bg-pebble-panel' : 'bg-pebble-panel'

  return createPortal(
    <div
      data-profile-menu-root="true"
      role="menu"
      className={`fixed z-[100] isolate overflow-hidden rounded-xl backdrop-blur-xl ${shellClass}`}
      style={{
        top,
        left,
        width: panelWidth,
      }}
    >
      <div className={`absolute inset-0 ${baseLayerClass}`} />
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            theme === 'light'
              ? 'linear-gradient(180deg, rgba(241,245,252,0.98) 0%, rgba(228,234,246,0.94) 100%)'
              : 'linear-gradient(180deg, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.03) 100%)',
        }}
      />

      <div className="relative max-h-[70vh] overflow-auto p-4">
        <div className="space-y-1.5">
          <p className={`text-xs uppercase tracking-[0.06em] text-pebble-text-muted ${isRTL ? 'rtlText' : ''}`}>{t('profile.signedInAs')}</p>
          <p className={`break-words text-base font-semibold leading-6 text-pebble-text-primary ${isRTL ? 'rtlText' : ''}`}>
            {userName}
          </p>
        </div>

        <div className="mt-3 rounded-lg border border-pebble-border/24 bg-pebble-overlay/[0.06] px-3 py-2.5">
          <p className={`text-xs font-medium uppercase tracking-[0.05em] text-pebble-text-muted ${isRTL ? 'rtlText' : ''}`}>
            {t('profile.persona')}
          </p>
          <p className={`mt-1 whitespace-normal break-words text-sm leading-6 text-pebble-text-secondary ${isRTL ? 'rtlText' : ''}`}>
            {personaSummary}
          </p>
        </div>

        <div className="my-3 border-t border-pebble-border/28" />

        <button
          type="button"
          onClick={() => {
            onSignOut()
            onRequestClose()
          }}
          className={`${buttonClass('secondary', 'sm')} w-full`}
        >
          {t('profile.signOut')}
        </button>
      </div>
    </div>,
    document.body,
  )
}
