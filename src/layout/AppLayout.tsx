import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { ProfileMenu } from '../components/modals/ProfileMenu'
import { SettingsModal } from '../components/modals/SettingsModal'
import { NotificationCenter } from '../components/layout/NotificationCenter'
import { Card } from '../components/ui/Card'
import { PageContainer } from '../components/ui/PageContainer'
import { StreakPill } from '../components/ui/StreakPill'
import { BrandLogo } from '../components/ui/BrandLogo'
import { HoverBorderGradient } from '../components/ui/hover-border-gradient'
import { AnimatedBorderRing } from '../components/ui/rainbow-borders-button'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import {
  clearAppLocalData,
  clearLocalUserData,
} from '../utils/storageKeys'
import { clearTaskProgress } from '../utils/taskProgress'
import { useI18n } from '../i18n/useI18n'
import { getAnalyticsState, subscribeAnalytics } from '../lib/analyticsStore'
import { dateKeyForTimeZone, selectCurrentStreak, selectDailyCompletions } from '../lib/analyticsDerivers'
import { safeClearPrefix, subscribeStoragePressure } from '../lib/safeStorage'
import { setNotificationScope, useNotifications } from '../lib/notificationsStore'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

export function AppLayout() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const location = useLocation()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [profileAnchorRect, setProfileAnchorRect] = useState<DOMRect | null>(null)
  const [showStoragePressureNotice, setShowStoragePressureNotice] = useState(false)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const profileButtonRef = useRef<HTMLButtonElement | null>(null)
  const notificationButtonRef = useRef<HTMLButtonElement | null>(null)

  const analyticsState = useSyncExternalStore(subscribeAnalytics, getAnalyticsState, getAnalyticsState)
  const notificationsState = useNotifications()
  const timeZone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', [])
  const dailyCompletions = useMemo(
    () => selectDailyCompletions(analyticsState.events, timeZone),
    [analyticsState.events, timeZone],
  )
  const todayKey = useMemo(() => dateKeyForTimeZone(nowTick, timeZone), [nowTick, timeZone])
  const currentStreak = useMemo(
    () => selectCurrentStreak(dailyCompletions, todayKey),
    [dailyCompletions, todayKey],
  )
  const isImmersiveRoute = location.pathname.startsWith('/session/') || location.pathname.startsWith('/placement')
  const isLandingRoute = location.pathname === '/'
  const auth = useAuth()
  const { theme } = useTheme()
  const iconButtonClass = `inline-flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-[12px] border border-pebble-border/35 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/40 ${
    theme === 'dark'
      ? 'bg-[rgba(10,14,24,0.58)] text-[rgba(214,222,242,0.82)] hover:bg-[rgba(10,14,24,0.68)] hover:text-[rgba(241,245,255,0.96)]'
      : 'bg-pebble-overlay/8 text-pebble-text-secondary hover:bg-pebble-overlay/14 hover:text-pebble-text-primary'
  }`
  const navItems = useMemo(
    () => {
      const items = [
        { to: '/', label: t('nav.home') },
        { to: '/problems', label: t('nav.problems') },
        { to: '/session/1', label: t('nav.session') },
        { to: '/dashboard', label: t('nav.insights') },
      ]
      if (auth.isAdmin) {
        items.push({ to: '/ops', label: 'Ops' })
      }
      return items
    },
    [t, auth.isAdmin],
  )
  const headerUserName =
    auth.profile?.displayName?.trim()
    || auth.profile?.username?.trim()
    || auth.user?.email?.split('@')[0]
    || 'Guest'
  const headerUserInitials = headerUserName.slice(0, 2).toUpperCase()
  const unreadNotificationCount = useMemo(
    () => notificationsState.items.reduce((count, item) => count + (item.read ? 0 : 1), 0),
    [notificationsState.items],
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
    if (!isNotificationsOpen) {
      return
    }

    function handleOutsideClick(event: MouseEvent | TouchEvent) {
      const target = event.target as HTMLElement | null
      if (!target) {
        return
      }

      if (notificationButtonRef.current?.contains(target)) {
        return
      }

      if (target.closest('[data-notification-center-root="true"]')) {
        return
      }

      setIsNotificationsOpen(false)
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsNotificationsOpen(false)
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
  }, [isNotificationsOpen])

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
    const id = window.setInterval(() => setNowTick(Date.now()), 60_000)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    return subscribeStoragePressure(() => {
      setShowStoragePressureNotice(true)
    })
  }, [])

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
    auth.signOut()
    clearLocalUserData()
    setIsProfileOpen(false)
    setIsNotificationsOpen(false)
    navigate('/')
  }

  useEffect(() => {
    setNotificationScope(auth.user?.userId ?? auth.profile?.userId ?? null)
  }, [auth.profile?.userId, auth.user?.userId])

  useEffect(() => {
    setIsNotificationsOpen(false)
  }, [location.pathname])

  return (
    <div
      className="relative min-h-[100dvh] overflow-x-hidden bg-pebble-deep text-pebble-text-primary"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-14rem] top-[-12rem] h-[28rem] w-[28rem] rounded-full bg-pebble-accent/8 blur-3xl" />
        <div className="absolute bottom-[-14rem] right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-pebble-accent/6 blur-3xl" />
      </div>

      {isImmersiveRoute ? (
        <div className="relative min-h-[100dvh] w-full">
          <Outlet />
        </div>
      ) : (
        <div className="relative flex min-h-[100dvh] flex-col">
          {/* Keep header/popup layer above page content stacking contexts. */}
          <header className="relative z-[240] w-full">
            <Card className={`pebble-header rounded-none p-0 ${isLandingRoute ? 'mb-0' : 'mb-1'}`}>
              <PageContainer>
                <div className="flex items-center justify-between px-1.5 py-0 sm:px-2.5 sm:py-0">
                  <div className="flex min-w-0 items-center gap-1.5 sm:gap-2 justify-start flex-1">
                    <NavLink
                      to="/"
                      aria-label="PebbleCode home"
                      className="-ml-8 inline-flex h-10 sm:h-11 md:h-12 items-center flex-shrink-0"
                    >
                      <BrandLogo className="-translate-y-px h-10 sm:h-11 md:h-12 w-[188px] sm:w-[204px] md:w-[220px] origin-left scale-[1.38] select-none pointer-events-none object-contain object-left block" />
                    </NavLink>
                  </div>

                  <HoverBorderGradient
                    as="div"
                    duration={1.2}
                    containerClassName="hidden rounded-full lg:flex flex-shrink-0"
                    className="bg-transparent px-0 py-0 text-inherit"
                  >
                    <nav className="flex items-center justify-center gap-0.5 overflow-hidden rounded-full p-0.5">
                      {navItems.map(({ to, label }) => (
                        <NavLink
                          key={to}
                          to={to}
                          className={({ isActive }) =>
                            `relative z-10 whitespace-nowrap rounded-full px-2.5 py-1 md:px-3 md:py-1.5 text-[12px] md:text-[13px] font-medium tracking-[0.01em] transition ${isActive
                              ? 'border border-[var(--navActiveBorder)] bg-[var(--navActiveBg)] text-[var(--navActiveFg)] ring-0 shadow-none hover:bg-[var(--navActiveBg)] hover:shadow-none'
                              : 'border border-transparent text-pebble-text-secondary hover:bg-white/5 dark:hover:bg-white/6 hover:text-pebble-text-primary focus-visible:bg-white/6'
                            }`
                          }
                        >
                          {label}
                        </NavLink>
                      ))}
                    </nav>
                  </HoverBorderGradient>

                  <div className="flex items-center gap-1.5 sm:gap-2 justify-end flex-1">
                    <div className="mr-1.5 sm:mr-2 flex items-center gap-1.5 sm:gap-2">
                      <StreakPill
                        streak={currentStreak.streak}
                        isTodayComplete={currentStreak.isTodayComplete}
                        darkSurface={theme === 'dark'}
                      />
                      <div className="relative">
                        <TooltipProvider delayDuration={100}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <button
                                ref={notificationButtonRef}
                                aria-label={t('layout.notificationsAria')}
                                aria-expanded={isNotificationsOpen}
                                aria-haspopup="dialog"
                                onClick={() => {
                                  setIsProfileOpen(false)
                                  setIsNotificationsOpen((current) => !current)
                                }}
                                className={`group relative ${iconButtonClass} ${
                                  isNotificationsOpen ? 'border-pebble-accent/45 bg-pebble-accent/16 text-pebble-text-primary' : ''
                                }`}
                                type="button"
                              >
                                <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 sm:h-5 sm:w-5" aria-hidden="true">
                                  <path d="M10 3.5a4.25 4.25 0 0 0-4.25 4.25v2.4L4.6 12.2a.9.9 0 0 0 .8 1.3h9.2a.9.9 0 0 0 .8-1.3l-1.15-2.05v-2.4A4.25 4.25 0 0 0 10 3.5Z" stroke="currentColor" strokeWidth="1.25" />
                                  <path d="M8.1 14.8a2.1 2.1 0 0 0 3.8 0" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" />
                                </svg>
                                {unreadNotificationCount > 0 ? (
                                  <span
                                    className="pointer-events-none absolute -right-[3px] -top-[3px] z-[5] inline-flex h-2.5 w-2.5 rounded-full border-2 border-[var(--pebble-header-bg)] bg-pebble-accent shadow-[0_0_10px_rgba(59,130,246,0.55)] transition-transform duration-150 ease-out group-hover:scale-105"
                                  />
                                ) : null}
                              </button>
                            </TooltipTrigger>
                            <TooltipContent side="bottom">{t('layout.notificationsAria')}</TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                        <NotificationCenter
                          open={isNotificationsOpen}
                          onClose={() => setIsNotificationsOpen(false)}
                        />
                      </div>
                      <button
                        aria-label={t('layout.settingsAria')}
                        onClick={() => setIsSettingsOpen(true)}
                        className={iconButtonClass}
                        type="button"
                      >
                        <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5 sm:h-5 sm:w-5" aria-hidden="true">
                          <path d="M8.35 3.75h3.3l.35 1.57c.36.12.7.27 1.02.46l1.49-.66 1.65 2.85-1.15 1.12c.03.23.04.46.04.7s-.01.47-.04.7l1.15 1.12-1.65 2.85-1.49-.66c-.32.19-.66.34-1.02.46l-.35 1.57h-3.3l-.35-1.57a4.95 4.95 0 0 1-1.02-.46l-1.49.66-1.65-2.85 1.15-1.12a5.86 5.86 0 0 1 0-1.4L3.85 7.97 5.5 5.12l1.49.66c.32-.19.66-.34 1.02-.46l.35-1.57Z" stroke="currentColor" strokeWidth="1.15" strokeLinejoin="round" />
                          <circle cx="10" cy="10" r="1.95" stroke="currentColor" strokeWidth="1.15" />
                        </svg>
                      </button>
                    </div>

                    {auth.isAuthenticated ? (
                      <div className="flex min-w-[74px] flex-col items-center justify-center gap-1">
                        <AnimatedBorderRing className="h-[50px] w-[50px] sm:h-[54px] sm:w-[54px] rounded-full" variant="avatar">
                          <button
                            ref={profileButtonRef}
                            aria-label={t('layout.profileAria')}
                            aria-expanded={isProfileOpen}
                            aria-haspopup="menu"
                            onClick={() => {
                              updateProfileAnchorRect()
                              setIsProfileOpen((current) => !current)
                            }}
                            className="inline-flex h-full w-full items-center justify-center rounded-full border border-pebble-border/35 overflow-hidden transition hover:scale-[1.05] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/40"
                            style={{
                              background: theme === 'dark' ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.90)',
                            }}
                            type="button"
                          >
                            {auth.profile?.avatarUrl ? (
                              <img src={auth.profile.avatarUrl} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-sm font-semibold text-pebble-text-primary">{headerUserInitials}</span>
                            )}
                          </button>
                        </AnimatedBorderRing>
                        <span
                          className={`max-w-[88px] truncate text-[10px] font-semibold leading-none ${
                            theme === 'dark' ? 'text-[rgba(232,239,255,0.94)]' : 'text-[rgba(27,42,74,0.88)]'
                          }`}
                          title={headerUserName}
                        >
                          {headerUserName}
                        </span>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => navigate('/auth')}
                        className="rounded-full border border-pebble-accent/45 bg-pebble-accent/18 px-3.5 py-1.5 text-xs font-semibold text-pebble-text-primary transition hover:bg-pebble-accent/28"
                      >
                        Sign in
                      </button>
                    )}
                  </div>
                </div>

                <HoverBorderGradient
                  as="div"
                  duration={1.2}
                  containerClassName="mt-0.5 rounded-full lg:hidden"
                  className="bg-transparent px-0 py-0 text-inherit"
                >
                  <nav className="flex items-center gap-0.5 overflow-hidden rounded-full p-0.5">
                    {navItems.map(({ to, label }) => (
                      <NavLink
                        key={to}
                        to={to}
                        className={({ isActive }) =>
                          `relative z-10 whitespace-nowrap rounded-full px-2.5 py-1.5 md:py-1.5 text-[13px] font-medium tracking-[0.01em] transition ${isActive
                            ? 'border border-[var(--navActiveBorder)] bg-[var(--navActiveBg)] text-[var(--navActiveFg)] ring-0 shadow-none hover:bg-[var(--navActiveBg)] hover:shadow-none'
                            : 'border border-transparent text-pebble-text-secondary hover:bg-white/5 dark:hover:bg-white/6 hover:text-pebble-text-primary focus-visible:bg-white/6'
                          }`
                        }
                      >
                        {label}
                      </NavLink>
                    ))}
                  </nav>
                </HoverBorderGradient>
              </PageContainer>
            </Card>
          </header>

          <main className={isLandingRoute ? 'relative z-0 flex-1 min-h-0' : 'relative z-0 flex-1 pb-4'}>
            {isLandingRoute ? (
              <div className="min-h-0">
                <Outlet />
              </div>
            ) : (
              <PageContainer>
                <Outlet />
              </PageContainer>
            )}
          </main>
        </div>
      )}

      <ProfileMenu
        open={isProfileOpen}
        anchorRect={profileAnchorRect}
        userName={headerUserName}
        userEmail={auth.user?.email ?? auth.profile?.email ?? ''}
        userBio={auth.profile?.bio ?? ''}
        avatarUrl={auth.profile?.avatarUrl ?? null}
        isGuest={auth.user?.userId === 'dev-guest'}
        isAdmin={auth.isAdmin}
        onSignOut={handleSignOut}
        onRequestClose={() => setIsProfileOpen(false)}
      />

      <SettingsModal
        open={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
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

      {/* Portal mount for modals that need to inherit layout theme context */}
      <div id="pebble-portal" />
    </div>
  )
}
