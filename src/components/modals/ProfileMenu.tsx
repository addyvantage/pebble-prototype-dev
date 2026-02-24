import { buttonClass } from '../ui/buttonStyles'

type ProfileMenuProps = {
  open: boolean
  userName: string
  personaSummary: string
  onSignOut: () => void
}

export function ProfileMenu({
  open,
  userName,
  personaSummary,
  onSignOut,
}: ProfileMenuProps) {
  if (!open) {
    return null
  }

  return (
    <div className="absolute right-0 top-11 z-30 w-64 rounded-xl border border-pebble-border/35 bg-pebble-panel/95 p-4 shadow-glass backdrop-blur-xl">
      <p className="text-xs uppercase tracking-[0.06em] text-pebble-text-muted">Signed in as</p>
      <p className="mt-1 text-base font-semibold text-pebble-text-primary">{userName}</p>
      <p className="mt-2 text-sm text-pebble-text-secondary">{personaSummary}</p>

      <button
        type="button"
        onClick={onSignOut}
        className={`${buttonClass('secondary', 'sm')} mt-4 w-full`}
      >
        Sign out
      </button>
    </div>
  )
}
