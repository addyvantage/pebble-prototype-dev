import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { ProfileMenu } from '../components/modals/ProfileMenu'
import { SettingsModal } from '../components/modals/SettingsModal'
import { Card } from '../components/ui/Card'
import { getDemoMode, setDemoMode, subscribeDemoMode } from '../utils/demoMode'
import {
  clearAppLocalData,
  clearLocalUserData,
  getLocalUserProfile,
} from '../utils/storageKeys'
import { clearTaskProgress } from '../utils/taskProgress'

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/session/1', label: 'Session' },
  { to: '/dashboard', label: 'Insights' },
]

const iconButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-pebble-border/35 bg-pebble-overlay/8 text-pebble-text-secondary transition hover:bg-pebble-overlay/14 hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/40'

export function AppLayout() {
  const navigate = useNavigate()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profileAnchorRect, setProfileAnchorRect] = useState<DOMRect | null>(null)
  const [demoMode, setDemoModeState] = useState(() => getDemoMode())
  const [profile, setProfile] = useState(() => getLocalUserProfile())
  const profileButtonRef = useRef<HTMLButtonElement | null>(null)

  const personaLabel = useMemo(() => {
    return profile.personaSummary === 'Not set' ? 'Not set' : profile.personaSummary
  }, [profile.personaSummary])

  const updateProfileAnchorRect = useCallback(() => {
    setProfileAnchorRect(profileButtonRef.current?.getBoundingClientRect() ?? null)
  }, [])

  useEffect(() => {
    if (!isProfileOpen) {
      return
    }

    function handleOutsideClick(event: MouseEvent | TouchEvent) {
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }

      if (profileButtonRef.current?.contains(target)) {
        return
      }

      if (target.closest('[data-profile-menu-root="true"]')) {
        return
      }

      setIsProfileOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsProfileOpen(false)
      }
    }

    window.addEventListener('mousedown', handleOutsideClick)
    window.addEventListener('touchstart', handleOutsideClick)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('mousedown', handleOutsideClick)
      window.removeEventListener('touchstart', handleOutsideClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [isProfileOpen])

  useEffect(() => {
    if (!isProfileOpen) {
      return
    }

    updateProfileAnchorRect()

    const syncAnchorRect = () => {
      updateProfileAnchorRect()
    }

    window.addEventListener('resize', syncAnchorRect)
    window.addEventListener('scroll', syncAnchorRect, true)

    return () => {
      window.removeEventListener('resize', syncAnchorRect)
      window.removeEventListener('scroll', syncAnchorRect, true)
    }
  }, [isProfileOpen, updateProfileAnchorRect])

  useEffect(() => {
    return subscribeDemoMode((isEnabled) => {
      setDemoModeState(isEnabled)
    })
  }, [])

  function handleDemoModeChange(nextMode: boolean) {
    setDemoModeState(nextMode)
    setDemoMode(nextMode)
  }

  function handleResetLocalData() {
    clearTaskProgress()
    clearAppLocalData()
    window.location.reload()
  }

  function handleSignOut() {
    clearLocalUserData()
    setProfile(getLocalUserProfile())
    setIsProfileOpen(false)
    navigate('/')
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-pebble-deep text-pebble-text-primary">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-14rem] top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-pebble-accent/8 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-pebble-accent/6 blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-screen w-full max-w-[1360px] flex-col px-4 pb-8 pt-5 sm:px-8 lg:px-12">
        <Card className="mb-6 p-4 sm:mb-7 sm:p-5" interactive>
          <div className="flex items-center justify-between gap-3 sm:gap-4">
            <img
              src="/assets/pebble/master/brand/pebble_app_icon_primary_1024.png"
              alt="Pebble mark"
              className="h-8 w-8 rounded-xl sm:h-10 sm:w-10"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xl font-semibold tracking-[-0.015em] text-pebble-text-primary sm:text-2xl">
                Pebble
              </p>
              <p className="mt-0.5 text-sm text-pebble-text-secondary">
                Cognitive recovery companion
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                aria-label="Notifications"
                className={iconButtonClass}
                type="button"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M10 3.5a4.25 4.25 0 0 0-4.25 4.25v2.4L4.6 12.2a.9.9 0 0 0 .8 1.3h9.2a.9.9 0 0 0 .8-1.3l-1.15-2.05v-2.4A4.25 4.25 0 0 0 10 3.5Z" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M8.1 14.8a2.1 2.1 0 0 0 3.8 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                </svg>
              </button>
              <button
                aria-label="Settings"
                onClick={() => setIsSettingsOpen(true)}
                className={iconButtonClass}
                type="button"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="M8.35 3.75h3.3l.35 1.57c.36.12.7.27 1.02.46l1.49-.66 1.65 2.85-1.15 1.12c.03.23.04.46.04.7s-.01.47-.04.7l1.15 1.12-1.65 2.85-1.49-.66c-.32.19-.66.34-1.02.46l-.35 1.57h-3.3l-.35-1.57a4.95 4.95 0 0 1-1.02-.46l-1.49.66-1.65-2.85 1.15-1.12a5.86 5.86 0 0 1 0-1.4L3.85 7.97 5.5 5.12l1.49.66c.32-.19.66-.34 1.02-.46l.35-1.57Z" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
                  <circle cx="10" cy="10" r="1.95" stroke="currentColor" strokeWidth="1.15" />
                </svg>
              </button>

              <button
                ref={profileButtonRef}
                aria-label="Profile"
                aria-expanded={isProfileOpen}
                aria-haspopup="menu"
                onClick={() => {
                  updateProfileAnchorRect()
                  setIsProfileOpen((current) => !current)
                }}
                className={iconButtonClass}
                type="button"
              >
                <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                  <circle cx="10" cy="7" r="2.6" stroke="currentColor" strokeWidth="1.25" />
                  <path d="M4.9 15.25c.85-2.05 2.88-3.25 5.1-3.25s4.25 1.2 5.1 3.25" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          </div>

          <nav className="mt-4 flex items-center gap-1 overflow-x-auto rounded-xl border border-pebble-border/28 bg-pebble-overlay/7 p-1">
            {navItems.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium tracking-[0.01em] transition ${
                    isActive
                      ? 'border border-pebble-border/45 bg-pebble-overlay/16 text-pebble-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                      : 'border border-transparent text-pebble-text-secondary hover:bg-pebble-overlay/12 hover:text-pebble-text-primary'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>
        </Card>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>

      <ProfileMenu
        open={isProfileOpen}
        anchorRect={profileAnchorRect}
        userName={profile.name}
        personaSummary={personaLabel}
        onSignOut={handleSignOut}
        onRequestClose={() => setIsProfileOpen(false)}
      />

      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        demoMode={demoMode}
        onDemoModeChange={handleDemoModeChange}
        onResetLocalData={handleResetLocalData}
      />
    </div>
  )
}
