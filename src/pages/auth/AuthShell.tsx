import type { ReactNode } from 'react'
import { Brain, BarChart3, Zap } from 'lucide-react'
import { BrandLogo } from '../../components/ui/BrandLogo'

const FEATURES = [
    { icon: Brain,     text: 'AI-powered coaching that adapts to you' },
    { icon: BarChart3, text: 'Track your growth with deep analytics' },
    { icon: Zap,       text: 'Personalized daily plans in seconds' },
]

export function AuthShell({ children }: { children: ReactNode }) {
    return (
        <div className="relative flex min-h-[100dvh]">
            {/* ── Left brand panel — desktop only ── */}
            <div className="hidden lg:flex w-[440px] xl:w-[500px] shrink-0 flex-col justify-between p-10 xl:p-12 border-r border-pebble-border/[0.12]">
                {/* Empty top spacer — keeps content block vertically centered */}
                <div />

                <div className="space-y-7">
                    {/* Logo sits directly above the headline */}
                    <div className="space-y-5 -translate-y-6">
                        <BrandLogo className="h-20 w-auto select-none pointer-events-none ml-16 translate-y-6" />
                        <h1 className="text-[2rem] xl:text-[2.2rem] font-bold leading-[1.15] tracking-tight text-pebble-text-primary">
                            Master coding,
                            <br />
                            <span className="text-pebble-accent">one session</span>
                            <br />
                            at a time.
                        </h1>
                        <p className="text-[14.5px] leading-relaxed text-pebble-text-secondary max-w-[280px]">
                            Your AI-powered companion for competitive programming and technical interviews.
                        </p>
                    </div>

                    <ul className="space-y-3">
                        {FEATURES.map(({ icon: Icon, text }) => (
                            <li key={text} className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pebble-accent/15">
                                    <Icon className="h-4 w-4 text-pebble-accent" />
                                </div>
                                <span className="text-[13.5px] text-pebble-text-secondary">{text}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                <p className="text-[11.5px] text-pebble-text-muted">
                    © {new Date().getFullYear()} Pebble. All rights reserved.
                </p>
            </div>

            {/* ── Right form area ── */}
            <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-10 relative">
                {/* Mobile logo */}
                <div className="lg:hidden absolute top-6 left-6">
                    <BrandLogo className="h-14 w-auto select-none pointer-events-none" />
                </div>

                <div className="w-full max-w-[400px]">
                    {children}
                </div>
            </div>
        </div>
    )
}
