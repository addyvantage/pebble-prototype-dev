import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { AuthShell } from './AuthShell'
import { PasswordInput } from '../../components/auth/PasswordInput'
import { useAuth } from '../../hooks/useAuth'

export function AuthLoginPage() {
    const { signIn, setGuestMode, isAuthenticated, isLoading, isConfigured } = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    // Redirect if already authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated) navigate('/', { replace: true })
    }, [isAuthenticated, isLoading, navigate])

    // Pre-fill email from ?email= query param (set by verify page on success)
    const emailFromParam = searchParams.get('email') ?? ''
    const justVerified = searchParams.get('verified') === '1'

    const [email, setEmail] = useState(emailFromParam)
    const [password, setPassword] = useState('')
    const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({})
    const [submitting, setSubmitting] = useState(false)
    const errorRef = useRef<HTMLDivElement>(null)

    function validate() {
        const e: typeof errors = {}
        if (!email.trim()) e.email = 'Email is required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Enter a valid email address'
        if (!password) e.password = 'Password is required'
        return e
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) {
            setErrors(errs)
            setTimeout(() => errorRef.current?.focus(), 0)
            return
        }
        setErrors({})
        setSubmitting(true)
        try {
            await signIn(email.trim(), password)
            navigate('/')
        } catch (err: any) {
            const code = err?.code ?? err?.name ?? ''
            if (code === 'UserNotConfirmedException') {
                localStorage.setItem('pebble.auth.verifyEmail', email.trim())
                navigate(`/auth/verify?email=${encodeURIComponent(email.trim())}`)
                return
            }
            setErrors({ form: err?.message ?? 'Sign in failed. Please try again.' })
            setTimeout(() => errorRef.current?.focus(), 0)
        } finally {
            setSubmitting(false)
        }
    }

    const hasErrors = Object.values(errors).some(Boolean)

    return (
        <AuthShell>
            <div className="card-premium rounded-2xl p-7 sm:p-8 space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-[1.5rem] font-bold tracking-tight text-pebble-text-primary">
                        Welcome back
                    </h2>
                    <p className="mt-1 text-[13.5px] text-pebble-text-secondary">
                        Sign in to your Pebble account
                    </p>
                </div>

                {/* Email verified success banner */}
                {justVerified && (
                    <div className="rounded-xl border border-emerald-500/25 bg-emerald-500/[0.08] px-4 py-3 text-[12.5px] text-emerald-500">
                        Email verified! You can now sign in.
                    </div>
                )}

                {/* Error summary */}
                {hasErrors && (
                    <div
                        ref={errorRef}
                        tabIndex={-1}
                        role="alert"
                        aria-live="assertive"
                        className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-[12.5px] text-red-400 outline-none space-y-0.5"
                    >
                        {errors.form    && <p>{errors.form}</p>}
                        {errors.email   && <p>{errors.email}</p>}
                        {errors.password && <p>{errors.password}</p>}
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    {/* Email */}
                    <div>
                        <label
                            htmlFor="login-email"
                            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted"
                        >
                            Email
                        </label>
                        <input
                            id="login-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="you@example.com"
                            aria-invalid={errors.email ? true : undefined}
                            className="auth-input"
                        />
                    </div>

                    {/* Password */}
                    <div>
                        <div className="mb-1.5 flex items-center justify-between">
                            <label
                                htmlFor="login-password"
                                className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted"
                            >
                                Password
                            </label>
                            <Link
                                to="/auth/forgot-password"
                                className="text-[11.5px] text-pebble-accent hover:text-pebble-text-primary transition-colors"
                            >
                                Forgot password?
                            </Link>
                        </div>
                        <PasswordInput
                            id="login-password"
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            error={errors.password}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={submitting}
                        className="auth-button w-full mt-2"
                    >
                        {submitting ? 'Signing in…' : 'Sign in'}
                    </button>
                </form>

                {/* Switch to signup */}
                <p className="text-center text-[13px] text-pebble-text-secondary">
                    Don't have an account?{' '}
                    <Link
                        to="/auth/signup"
                        className="font-medium text-pebble-accent hover:text-pebble-text-primary transition-colors"
                    >
                        Sign up
                    </Link>
                </p>

                {/* Dev / unconfigured section */}
                {!isConfigured && (
                    <div className="border-t border-pebble-border/[0.15] pt-5 space-y-3">
                        <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-3.5 py-3 text-[12px] text-amber-400">
                            <p className="font-semibold">Cognito not configured</p>
                            <p className="mt-1 leading-relaxed text-amber-400/80">
                                On Vercel, set{' '}
                                <code className="rounded bg-pebble-overlay/[0.15] px-1 py-px font-mono text-amber-300 text-[11px]">
                                    VITE_COGNITO_USER_POOL_ID
                                </code>{' '}
                                and{' '}
                                <code className="rounded bg-pebble-overlay/[0.15] px-1 py-px font-mono text-amber-300 text-[11px]">
                                    VITE_COGNITO_CLIENT_ID
                                </code>{' '}
                                (must redeploy after changing env vars).
                            </p>
                        </div>
                        {import.meta.env.DEV && (
                            <button
                                type="button"
                                onClick={() => { setGuestMode(); navigate('/') }}
                                className="w-full rounded-xl border border-pebble-border/30 bg-pebble-overlay/[0.05] px-4 py-2.5 text-[13px] font-medium text-pebble-text-secondary hover:bg-pebble-overlay/[0.10] hover:text-pebble-text-primary transition-colors"
                            >
                                Continue as guest <span className="text-pebble-text-muted">(dev only)</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
        </AuthShell>
    )
}
