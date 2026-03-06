import { Link } from 'react-router-dom'
import { BrandLogo } from '../ui/BrandLogo'
import pebbleIconDark from '../../assets/brand/pebblecode-icon-dark.jpg'

const linkClassName =
  'group inline-flex w-fit items-center text-[14px] md:text-[15px] text-pebble-text-secondary transition-colors duration-300 ease-out hover:text-pebble-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pebble-accent/45 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent'

function FooterLink({ to, children }: { to: string; children: string }) {
  return (
    <Link to={to} className={linkClassName}>
      <span className="relative">
        {children}
        <span className="pointer-events-none absolute -bottom-[2px] left-0 h-px w-0 bg-pebble-accent/75 transition-all duration-300 ease-out group-hover:w-full" />
      </span>
    </Link>
  )
}

export function SiteFooter() {
  return (
    <footer className="relative overflow-hidden pb-9 pt-5 sm:pb-11 sm:pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-pebble-accent/[0.02] to-transparent dark:from-pebble-accent/[0.03]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[12%] z-0 flex justify-center"
      >
        <p
          className="select-none whitespace-nowrap text-center text-[clamp(7.2rem,18vw,14.5rem)] font-black leading-none tracking-[-0.06em] text-[#405778]/[0.16] dark:text-[#d7e4ff]/[0.19]"
          style={{
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.95) 16%, rgba(0,0,0,0.62) 64%, rgba(0,0,0,0.04) 100%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.95) 16%, rgba(0,0,0,0.62) 64%, rgba(0,0,0,0.04) 100%)',
            textShadow: '0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          Pebble
        </p>
      </div>

      <div className="relative z-10 mx-auto w-full max-w-[1280px] px-2 sm:px-3 lg:px-4">
        <div className="grid grid-cols-1 gap-y-10 pt-10 pb-12 sm:pt-11 sm:pb-14 md:pb-[4.25rem] lg:grid-cols-[minmax(250px,360px)_1fr] lg:items-start lg:gap-x-8">
          <div className="space-y-6.5 lg:pr-2">
            <div className="flex items-center gap-3">
              <span className="relative inline-flex h-[52px] w-[52px] sm:h-14 sm:w-14 md:h-16 md:w-16 items-center justify-center overflow-hidden rounded-xl border border-pebble-border/45 bg-pebble-overlay/[0.1] shadow-[0_10px_24px_rgba(15,23,42,0.16)]">
                <img
                  src={pebbleIconDark}
                  alt=""
                  aria-hidden="true"
                  className="h-full w-full object-cover"
                />
              </span>
              <BrandLogo className="h-[54px] w-auto object-contain sm:h-[58px] md:h-[64px]" />
            </div>
            <p className="max-w-[31ch] text-[14px] md:text-[15px] leading-relaxed text-pebble-text-secondary">
              Elite coding practice with mentor-level guidance.
            </p>
            <p className="pt-1 text-[12px] text-pebble-text-muted">
              © 2026 Pebble. All rights reserved.
            </p>
          </div>

          <div className="w-full lg:flex lg:justify-center">
            <div className="grid w-full max-w-[720px] grid-cols-1 gap-8 sm:grid-cols-3 sm:gap-10 md:gap-12">
              <div className="space-y-[18px]">
                <h3 className="text-[12px] font-black uppercase tracking-[0.17em] text-pebble-accent/95">Product</h3>
                <nav className="flex flex-col gap-3.5">
                  <FooterLink to="/">Home</FooterLink>
                  <FooterLink to="/problems">Problems</FooterLink>
                  <FooterLink to="/session/1">Session</FooterLink>
                  <FooterLink to="/dashboard">Insights</FooterLink>
                </nav>
              </div>

              <div className="space-y-[18px]">
                <h3 className="text-[12px] font-black uppercase tracking-[0.17em] text-pebble-accent/95">Account</h3>
                <nav className="flex flex-col gap-3.5">
                  <FooterLink to="/auth/login">Login</FooterLink>
                  <FooterLink to="/auth/signup">Sign Up</FooterLink>
                  <FooterLink to="/auth/forgot-password">Forgot Password</FooterLink>
                </nav>
              </div>

              <div className="space-y-[18px]">
                <h3 className="text-[12px] font-black uppercase tracking-[0.17em] text-pebble-accent/95">Legal</h3>
                <nav className="flex flex-col gap-3.5">
                  <FooterLink to="/legal/privacy">Privacy Policy</FooterLink>
                  <FooterLink to="/legal/terms">Terms of Service</FooterLink>
                  <FooterLink to="/legal/cookies">Cookie Policy</FooterLink>
                </nav>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
