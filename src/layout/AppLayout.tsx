import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ProfileMenu } from '../components/modals/ProfileMenu'
import { SettingsModal } from '../components/modals/SettingsModal'
import { Card } from '../components/ui/Card'
import { PageContainer } from '../components/ui/PageContainer'
import { StreakPill } from '../components/ui/StreakPill'
import { getDemoMode, setDemoMode, subscribeDemoMode } from '../utils/demoMode'
import {
  clearAppLocalData,
  clearLocalUserData,
  getLocalUserProfile,
} from '../utils/storageKeys'
import { clearTaskProgress } from '../utils/taskProgress'
import { useI18n } from '../i18n/useI18n'
import { getAnalyticsState, subscribeAnalytics } from '../lib/analyticsStore'
import { dateKeyForTimeZone, selectCurrentStreak, selectDailyCompletions } from '../lib/analyticsDerivers'
import { safeClearPrefix, subscribeStoragePressure } from '../lib/safeStorage'

const iconButtonClass =
  'inline-flex h-9 w-9 items-center justify-center rounded-lg border border-pebble-border/35 bg-pebble-overlay/8 text-pebble-text-secondary transition hover:bg-pebble-overlay/14 hover:text-pebble-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/40'

export function AppLayout() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [profileAnchorRect, setProfileAnchorRect] = useState<DOMRect | null>(null)
  const [demoMode, setDemoModeState] = useState(() => getDemoMode())
  const [profile, setProfile] = useState(() => getLocalUserProfile())
  const [showStoragePressureNotice, setShowStoragePressureNotice] = useState(false)
  const profileButtonRef = useRef<HTMLButtonElement | null>(null)

  const personaLabel = useMemo(() => {
    return profile.personaSummary === 'Not set' ? 'Not set' : profile.personaSummary
  }, [profile.personaSummary])
  const analyticsState = useSyncExternalStore(subscribeAnalytics, getAnalyticsState, getAnalyticsState)
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const dailyCompletions = useMemo(
    () => selectDailyCompletions(analyticsState.events, timeZone),
    [analyticsState.events, timeZone],
  )
  const todayKey = useMemo(() => dateKeyForTimeZone(Date.now(), timeZone), [analyticsState.updatedAt, timeZone])
  const currentStreak = useMemo(
    () => selectCurrentStreak(dailyCompletions, todayKey),
    [dailyCompletions, todayKey],
  )
  const isImmersiveRoute = location.pathname.startsWith('/session/') || location.pathname.startsWith('/placement')
  const isLandingRoute = location.pathname === '/'
  const navItems = useMemo(
    () => [
      { to: '/', label: t('nav.home') },
      { to: '/problems', label: t('nav.problems') },
      { to: '/session/1', label: t('nav.session') },
      { to: '/dashboard', label: t('nav.insights') },
    ],
    [t],
  )

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

  useEffect(() => {
    return subscribeStoragePressure(() => {
      setShowStoragePressureNotice(true)
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

  function handleResetAfterStoragePressure() {
    safeClearPrefix(['pebble.', 'pebble:', 'pebble_'])
    window.location.reload()
  }

  function handleSignOut() {
    clearLocalUserData()
    setProfile(getLocalUserProfile())
    setIsProfileOpen(false)
    navigate('/')
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-pebble-deep text-pebble-text-primary"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-14rem] top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-pebble-accent/8 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-pebble-accent/6 blur-3xl" />
      </div>

      {isImmersiveRoute ? (
        <div className="relative h-screen w-full">
          <Outlet />
        </div>
      ) : (
        <div className={`relative flex min-h-screen flex-col ${isLandingRoute ? 'overflow-hidden' : ''}`}>
          <header className="w-full pt-1.5 sm:pt-2">
            <PageContainer>
              <Card className={`p-2 sm:p-3 ${isLandingRoute ? 'mb-2' : 'mb-2 sm:mb-3'}`} interactive>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <img
                      src="/assets/pebble/master/brand/pebble_app_icon_primary_1024.png"
                      alt="Pebble mark"
                      className="h-8 w-8 rounded-xl sm:h-9 sm:w-9"
                    />
                    <div className="min-w-0">
                      <p className="text-lg font-semibold tracking-[-0.015em] text-pebble-text-primary sm:text-xl">
                        Pebble
                      </p>
                      <p className="mt-0.5 text-xs text-pebble-text-secondary sm:text-sm">
                        {t('app.tagline')}
                      </p>
                    </div>

                    <nav className="ml-2 hidden items-center gap-1 overflow-x-auto rounded-xl border border-pebble-border/28 bg-pebble-overlay/7 p-1 lg:flex">
                      {navItems.map(({ to, label }) => (
                        <NavLink
                          key={to}
                          to={to}
                          className={({ isActive }) =>
                            `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium tracking-[0.01em] transition ${isActive
                              ? 'border border-pebble-border/45 bg-pebble-overlay/16 text-pebble-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.15)]'
                              : 'border border-transparent text-pebble-text-secondary hover:bg-pebble-overlay/12 hover:text-pebble-text-primary'
                            }`
                          }
                        >
                          {label}
                        </NavLink>
                      ))}
                    </nav>
                  </div>

                  <div className="flex items-center gap-2">
                    <StreakPill
                      streak={currentStreak.streak}
                      isTodayComplete={currentStreak.isTodayComplete}
                      compact
                    />
                    <button
                      aria-label={t('layout.notificationsAria')}
                      className={iconButtonClass}
                      type="button"
                    >
                      <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4" aria-hidden="true">
                        <path d="M10 3.5a4.25 4.25 0 0 0-4.25 4.25v2.4L4.6 12.2a.9.9 0 0 0 .8 1.3h9.2a.9.9 0 0 0 .8-1.3l-1.15-2.05v-2.4A4.25 4.25 0 0 0 10 3.5Z" stroke="currentColor" strokeWidth="1.25" />
                        <path d="M8.1 14.8a2.1 2.1 0 0 0 3.8 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                      </svg>
                    </button>
                    <button
                      aria-label={t('layout.settingsAria')}
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
                      aria-label={t('layout.profileAria')}
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

                <nav className="mt-3 flex items-center gap-1 overflow-x-auto rounded-xl border border-pebble-border/28 bg-pebble-overlay/7 p-1 lg:hidden">
                  {navItems.map(({ to, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        `whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium tracking-[0.01em] transition ${isActive
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
            </PageContainer>
          </header>

          <main className={isLandingRoute ? 'flex-1 min-h-0 overflow-hidden' : 'flex-1 pb-4'}>
            <PageContainer className={isLandingRoute ? 'h-full min-h-0' : ''}>
              <Outlet />
            </PageContainer>
          </main>
        </div>
      )}

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

      {showStoragePressureNotice ? (
        <div className="fixed bottom-4 right-4 z-[120] w-[min(92vw,360px)] rounded-2xl border border-pebble-warning/35 bg-pebble-panel/92 p-3 shadow-[0_18px_42px_rgba(2,8,23,0.34)] backdrop-blur-xl">
          <p className="text-sm font-medium text-pebble-text-primary">{t('storage.fullTitle')}</p>
          <p className="mt-1 text-xs text-pebble-text-secondary">{t('storage.fullDescription')}</p>
          <div className="mt-3 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowStoragePressureNotice(false)}
              className="rounded-lg border border-pebble-border/35 bg-pebble-overlay/[0.08] px-2.5 py-1 text-xs text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.16]"
            >
              {t('actions.close')}
            </button>
            <button
              type="button"
              onClick={handleResetAfterStoragePressure}
              className="rounded-lg border border-pebble-warning/35 bg-pebble-warning/15 px-2.5 py-1 text-xs font-medium text-pebble-warning transition hover:bg-pebble-warning/22"
            >
              {t('storage.resetAction')}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
