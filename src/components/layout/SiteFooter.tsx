import { Link } from 'react-router-dom'
import { BrandLogo } from '../ui/BrandLogo'
import { PageContainer } from '../ui/PageContainer'
import { useTheme } from '../../hooks/useTheme'
import pebbleIconDark from '../../assets/brand/pebblecode-icon-dark.jpg'
import awsLogoLight from '../../assets/partners/aws/aws-light-mode-logo-removebg-preview.png'
import awsLogoDark from '../../assets/partners/aws/aws-dark-mode-logo-removebg-preview.png'
import awsBedrockIcon from '../../assets/partners/aws/aws-bedrock-icon.webp'
import awsLambdaLogo from '../../assets/partners/aws/aws-lambda-logo-transparent-background.png'

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
  const { theme } = useTheme()
  const awsWordmark = theme === 'dark' ? awsLogoDark : awsLogoLight

  return (
    <footer className="relative w-full overflow-hidden border-t border-pebble-border/8 bg-[linear-gradient(180deg,rgba(var(--pebble-overlay),0.03),rgba(var(--pebble-overlay),0.01))] pb-8 pt-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] dark:border-pebble-border/8 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.028),rgba(255,255,255,0.012))] sm:pb-10 sm:pt-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-pebble-accent/[0.035] via-pebble-accent/[0.012] to-transparent dark:from-pebble-accent/[0.04] dark:via-pebble-accent/[0.014]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-pebble-overlay/[0.045] to-transparent dark:from-white/[0.02]" />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-[10%] z-0 flex justify-center"
      >
        <p
          className="select-none whitespace-nowrap text-center text-[clamp(8rem,19vw,16rem)] font-black leading-none tracking-[-0.06em] text-[#405778]/[0.14] dark:text-[#d7e4ff]/[0.16]"
          style={{
            maskImage: 'linear-gradient(to top, rgba(0,0,0,0.95) 16%, rgba(0,0,0,0.62) 64%, rgba(0,0,0,0.04) 100%)',
            WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.95) 16%, rgba(0,0,0,0.62) 64%, rgba(0,0,0,0.04) 100%)',
            textShadow: '0 1px 0 rgba(255,255,255,0.03)',
          }}
        >
          Pebble
        </p>
      </div>

      <PageContainer className="relative z-10 px-4 sm:px-5 lg:px-7">
        <div className="relative overflow-hidden rounded-[28px] border border-pebble-border/12 bg-[linear-gradient(180deg,rgba(var(--pebble-overlay),0.12),rgba(var(--pebble-overlay),0.055))] px-6 py-9 shadow-[0_20px_48px_rgba(15,23,42,0.10),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-[2px] dark:border-pebble-border/12 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.028))] dark:shadow-[0_24px_56px_rgba(0,0,0,0.26),inset_0_1px_0_rgba(255,255,255,0.06)] sm:px-7 sm:py-10 lg:px-10 lg:py-11">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-pebble-overlay/60 to-transparent dark:via-white/12" />
          <div className="pointer-events-none absolute left-[-4%] top-[-18%] h-40 w-40 rounded-full bg-pebble-accent/10 blur-3xl dark:bg-pebble-accent/12" />
          <div className="pointer-events-none absolute right-[-6%] bottom-[-24%] h-52 w-52 rounded-full bg-pebble-accent/8 blur-3xl dark:bg-pebble-accent/10" />

          <div className="grid grid-cols-1 gap-y-10 lg:grid-cols-[minmax(320px,420px)_1fr] lg:items-start lg:gap-x-10">
            <div className="space-y-6 lg:pr-4">
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

              <div className="rounded-[20px] border border-pebble-border/12 bg-[linear-gradient(180deg,rgba(var(--pebble-overlay),0.1),rgba(var(--pebble-overlay),0.04))] px-4 py-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:border-pebble-border/12 dark:bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.02))]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-pebble-text-muted">
                  Built with
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3 sm:gap-4">
                  <div className="inline-flex items-center rounded-[14px] border border-pebble-border/12 bg-pebble-overlay/[0.1] px-3 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] dark:bg-white/[0.04]">
                    <img
                      src={awsWordmark}
                      alt="Amazon Web Services"
                      className="h-[20px] w-auto object-contain sm:h-[22px]"
                    />
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-[14px] border border-pebble-border/12 bg-pebble-overlay/[0.08] px-2.5 py-2 text-[12px] font-semibold text-pebble-text-secondary dark:bg-white/[0.035]">
                    <img
                      src={awsBedrockIcon}
                      alt=""
                      aria-hidden="true"
                      className="h-[18px] w-[18px] rounded-[6px] object-contain"
                    />
                    <span>Bedrock</span>
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-[14px] border border-pebble-border/12 bg-pebble-overlay/[0.08] px-2.5 py-2 text-[12px] font-semibold text-pebble-text-secondary dark:bg-white/[0.035]">
                    <img
                      src={awsLambdaLogo}
                      alt=""
                      aria-hidden="true"
                      className="h-[18px] w-auto object-contain"
                    />
                    <span>Lambda</span>
                  </div>
                </div>
              </div>

              <p className="pt-0.5 text-[12px] text-pebble-text-muted">
                © 2026 Pebble. All rights reserved.
              </p>
            </div>

            <div className="w-full">
              <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4 sm:gap-9 md:gap-10 xl:gap-12">
                <div className="space-y-[18px]">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.17em] text-pebble-accent/95">Product</h3>
                  <nav className="flex flex-col gap-3.5">
                    <FooterLink to="/">Home</FooterLink>
                    <FooterLink to="/problems">Problems</FooterLink>
                    <FooterLink to="/session/1">Session</FooterLink>
                    <FooterLink to="/community">Community</FooterLink>
                    <FooterLink to="/dashboard">Insights</FooterLink>
                  </nav>
                </div>

                <div className="space-y-[18px]">
                  <h3 className="text-[12px] font-black uppercase tracking-[0.17em] text-pebble-accent/95">Guides</h3>
                  <nav className="flex flex-col gap-3.5">
                    <FooterLink to="/about">About</FooterLink>
                    <FooterLink to="/how-to-use">How to Use</FooterLink>
                    <FooterLink to="/faq">FAQ</FooterLink>
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
      </PageContainer>
    </footer>
  )
}
