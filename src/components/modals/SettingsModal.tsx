import { useEffect } from 'react'
import { buttonClass } from '../ui/buttonStyles'
import { useTheme } from '../../hooks/useTheme'

type SettingsModalProps = {
  open: boolean
  demoMode: boolean
  onClose: () => void
  onDemoModeChange: (isEnabled: boolean) => void
  onResetLocalData: () => void
}

function segmentButtonClass(isActive: boolean) {
  return `rounded-lg px-3 py-1.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/40 ${
    isActive
      ? 'bg-pebble-overlay/16 text-pebble-text-primary'
      : 'text-pebble-text-secondary hover:bg-pebble-overlay/12 hover:text-pebble-text-primary'
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

  useEffect(() => {
    if (!open) {
      return
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', handleEscape)

    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', handleEscape)
    }
  }, [onClose, open])

  if (!open) {
    return null
  }

  return (
    <div
      role="presentation"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 px-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose()
        }
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        className="glass-panel soft-ring w-full max-w-[480px] space-y-6 border border-pebble-border/40 bg-pebble-panel/92 p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="settings-title" className="text-xl font-semibold text-pebble-text-primary">
              Settings
            </h2>
            <p className="mt-1 text-sm text-pebble-text-secondary">
              Customize your Pebble experience.
            </p>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-pebble-border/35 bg-pebble-overlay/8 text-pebble-text-secondary transition hover:bg-pebble-overlay/14 hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/40"
          >
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
              <path d="M5 5l10 10M15 5 5 15" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium text-pebble-text-primary">Theme</p>
            <div className="inline-flex rounded-xl border border-pebble-border/35 bg-pebble-overlay/7 p-1">
              <button
                type="button"
                onClick={() => setTheme('dark')}
                className={segmentButtonClass(theme === 'dark')}
              >
                Dark
              </button>
              <button
                type="button"
                onClick={() => setTheme('light')}
                className={segmentButtonClass(theme === 'light')}
              >
                Light
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-pebble-text-primary">Demo mode</p>
            <div className="inline-flex rounded-xl border border-pebble-border/35 bg-pebble-overlay/7 p-1">
              <button
                type="button"
                onClick={() => onDemoModeChange(true)}
                className={segmentButtonClass(demoMode)}
              >
                On
              </button>
              <button
                type="button"
                onClick={() => onDemoModeChange(false)}
                className={segmentButtonClass(!demoMode)}
              >
                Off
              </button>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-pebble-text-primary">Data</p>
            <button
              type="button"
              onClick={onResetLocalData}
              className={buttonClass('secondary')}
            >
              Reset local data
            </button>
            <p className="text-xs text-pebble-text-secondary">
              Clears Pebble local storage and reloads UI state.
            </p>
          </div>
        </div>
      </section>
    </div>
  )
}
