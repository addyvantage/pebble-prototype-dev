import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { AuthShell } from './AuthShell'
import { PasswordInput } from '../../components/auth/PasswordInput'
import { PasswordStrength } from '../../components/auth/PasswordStrength'
import { PasswordMatch } from '../../components/auth/PasswordMatch'
import { useAuth } from '../../hooks/useAuth'
import {
    checkUsernameAvailability,
    validateSignupFields,
} from '../../lib/auth'

export function AuthSignupPage() {
    const { signUp, isAuthenticated, isLoading, isConfigured } = useAuth()
    const navigate = useNavigate()

    // Redirect if already authenticated
    useEffect(() => {
        if (!isLoading && isAuthenticated) navigate('/', { replace: true })
    }, [isAuthenticated, isLoading, navigate])

    const [email, setEmail] = useState('')
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [errors, setErrors] = useState<{
        email?: string
        username?: string
        password?: string
        confirm?: string
        form?: string
    }>({})
    const [submitting, setSubmitting] = useState(false)
    const [usernameAvailability, setUsernameAvailability] = useState<{
        status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid' | 'error'
        message: string
    }>({ status: 'idle', message: '' })
    const errorRef = useRef<HTMLDivElement>(null)
    const validation = useMemo(
        () => validateSignupFields({ email, username, password, confirm }),
        [email, username, password, confirm],
    )
    const { errors: liveErrors, normalizedEmail, normalizedUsername } = validation

    useEffect(() => {
        const candidate = normalizedUsername
        if (!candidate) {
            setUsernameAvailability({ status: 'idle', message: '' })
            return
        }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(candidate)) {
            setUsernameAvailability({ status: 'invalid', message: '3–20 characters · letters, numbers, underscores' })
            return
        }

        setUsernameAvailability({ status: 'checking', message: 'Checking…' })
        const controller = new AbortController()
        const timer = window.setTimeout(async () => {
            try {
                const nextState = await checkUsernameAvailability(candidate, controller.signal)
                setUsernameAvailability(nextState)
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    if (import.meta.env.DEV) {
                        console.debug('[auth] username availability request failed', err)
                    }
                    setUsernameAvailability({
                        status: 'error',
                        message: 'Could not verify username right now. You can still submit and we will check again securely.',
                    })
                }
            }
        }, 400)

        return () => {
            controller.abort()
            window.clearTimeout(timer)
        }
    }, [normalizedUsername])

    useEffect(() => {
        setErrors((current) => {
            const next = { ...current }
            if (current.email && !liveErrors.email) delete next.email
            if (current.username && !liveErrors.username && usernameAvailability.status !== 'taken') delete next.username
            if (current.password && !liveErrors.password) delete next.password
            if (current.confirm && !liveErrors.confirm) delete next.confirm
            if (current.form && isConfigured) delete next.form
            return next
        })
    }, [isConfigured, liveErrors.confirm, liveErrors.email, liveErrors.password, liveErrors.username, usernameAvailability.status])

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        const errs: typeof errors = { ...liveErrors }
        if (!isConfigured) {
            errs.form = 'Auth configuration unavailable. Please try again after Cognito is configured.'
        }
        if (usernameAvailability.status === 'checking') {
            errs.username = 'Checking username availability…'
        }
        if (usernameAvailability.status === 'taken') {
            errs.username = 'Username is already taken'
        }
        if (Object.keys(errs).length) {
            setErrors(errs)
            setTimeout(() => errorRef.current?.focus(), 0)
            return
        }
        setErrors({})
        setSubmitting(true)
        try {
            const result = await signUp(normalizedEmail, password, normalizedUsername)
            localStorage.setItem('pebble.auth.verifyEmail', normalizedEmail)
            localStorage.setItem('pebble.auth.resendAt', String(Date.now() + 120_000))

            if (result.requiresConfirmation) {
                navigate(`/auth/verify-email?email=${encodeURIComponent(normalizedEmail)}`)
                return
            }

            navigate(`/auth/login?email=${encodeURIComponent(normalizedEmail)}&created=1`)
        } catch (err: any) {
            const code = err?.code ?? err?.name ?? ''
            const message = err?.message ?? 'Account creation failed. Please try again.'
            if (String(message).toLowerCase().includes('username is already taken')) {
                setErrors({ username: 'Username is already taken' })
                setUsernameAvailability({ status: 'taken', message: 'Username is already taken' })
            } else if (code === 'UsernameExistsException') {
                setErrors({ form: 'An account with this email already exists. Try signing in.' })
            } else if (code === 'InvalidPasswordException') {
                setErrors({ password: message })
            } else if (code === 'AuthNotConfigured' || code === 'MissingClientSecret') {
                setErrors({ form: message })
            } else {
                setErrors({ form: message })
            }
            setTimeout(() => errorRef.current?.focus(), 0)
        } finally {
            setSubmitting(false)
        }
    }

    const hasErrors = Object.values(errors).some(Boolean)
    const submitBlocker =
        !isConfigured
            ? 'Auth configuration unavailable'
            : liveErrors.email
                ?? liveErrors.username
                ?? liveErrors.password
                ?? liveErrors.confirm
                ?? (usernameAvailability.status === 'checking' ? 'Checking username availability…' : undefined)
                ?? (usernameAvailability.status === 'taken' ? 'Username is already taken' : undefined)

    const helperMessage =
        submitBlocker
            ?? (usernameAvailability.status === 'error'
                ? usernameAvailability.message
                : usernameAvailability.status === 'available'
                    ? 'All signup requirements are satisfied.'
                    : 'Enter your email, username, and password to continue.')

    const canSubmit = !submitting && !submitBlocker

    return (
        <AuthShell>
            <div className="card-premium rounded-2xl p-7 sm:p-8 space-y-6">
                {/* Header */}
                <div>
                    <h2 className="text-[1.5rem] font-bold tracking-tight text-pebble-text-primary">
                        Create your account
                    </h2>
                    <p className="mt-1 text-[13.5px] text-pebble-text-secondary">
                        Start your free learning journey
                    </p>
                </div>

                {/* Error summary */}
                {hasErrors && (
                    <div
                        ref={errorRef}
                        tabIndex={-1}
                        role="alert"
                        aria-live="assertive"
                        className="rounded-xl border border-red-500/25 bg-red-500/[0.08] px-4 py-3 text-[12.5px] text-red-400 outline-none space-y-0.5"
                    >
                        {errors.form     && <p>{errors.form}</p>}
                        {errors.email    && <p>{errors.email}</p>}
                        {errors.username && <p>{errors.username}</p>}
                        {errors.password && <p>{errors.password}</p>}
                        {errors.confirm  && <p>{errors.confirm}</p>}
                    </div>
                )}

                {!isConfigured && (
                    <div className="rounded-xl border border-amber-500/25 bg-amber-500/[0.08] px-4 py-3 text-[12.5px] text-amber-400">
                        <p className="font-semibold">Auth configuration unavailable</p>
                        <p className="mt-1 leading-relaxed text-amber-400/80">
                            Signup is disabled until Cognito client configuration is available for this deployment.
                        </p>
                    </div>
                )}

                {/* Form */}
                <form onSubmit={handleSubmit} noValidate className="space-y-4">
                    {/* Email */}
                    <div>
                        <label
                            htmlFor="signup-email"
                            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted"
                        >
                            Email
                        </label>
                        <input
                            id="signup-email"
                            type="email"
                            autoComplete="email"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value)
                                setErrors((current) => ({ ...current, email: undefined, form: undefined }))
                            }}
                            placeholder="you@example.com"
                            aria-invalid={errors.email ? true : undefined}
                            className="auth-input"
                        />
                    </div>

                    {/* Username */}
                    <div>
                        <label
                            htmlFor="signup-username"
                            className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted"
                        >
                            Username
                        </label>
                        <input
                            id="signup-username"
                            type="text"
                            autoComplete="username"
                            value={username}
                            onChange={(e) => {
                                setUsername(e.target.value)
                                setErrors((current) => ({ ...current, username: undefined, form: undefined }))
                            }}
                            placeholder="cool_dev_42"
                            minLength={3}
                            maxLength={20}
                            aria-invalid={errors.username ? true : undefined}
                            aria-describedby="signup-username-hint"
                            className="auth-input"
                        />
                        <p id="signup-username-hint" className="mt-1 text-[11px] text-pebble-text-muted">
                            3–20 characters · letters, numbers, underscores
                        </p>
                        {usernameAvailability.status !== 'idle' && (
                            <p
                                className={`mt-1 text-[11px] ${
                                    usernameAvailability.status === 'available'
                                        ? 'text-emerald-400'
                                        : usernameAvailability.status === 'checking'
                                            ? 'text-pebble-text-muted'
                                            : usernameAvailability.status === 'error'
                                                ? 'text-amber-400'
                                            : 'text-red-400'
                                }`}
                            >
                                {usernameAvailability.message}
                            </p>
                        )}
                    </div>

                    {/* Password */}
                    <div>
                        <PasswordInput
                            id="signup-password"
                            label="Password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => {
                                setPassword(e.target.value)
                                setErrors((current) => ({ ...current, password: undefined, confirm: undefined, form: undefined }))
                            }}
                            placeholder="••••••••"
                            error={errors.password}
                        />
                        <PasswordStrength password={password} />
                    </div>

                    {/* Confirm password */}
                    <div>
                        <PasswordInput
                            id="signup-confirm"
                            label="Confirm Password"
                            autoComplete="new-password"
                            value={confirm}
                            onChange={(e) => {
                                setConfirm(e.target.value)
                                setErrors((current) => ({ ...current, confirm: undefined, form: undefined }))
                            }}
                            placeholder="••••••••"
                            error={errors.confirm}
                        />
                        <PasswordMatch password={password} confirm={confirm} />
                    </div>

                    <button
                        type="submit"
                        disabled={!canSubmit}
                        className="auth-button w-full mt-2"
                    >
                        {submitting ? 'Creating account…' : 'Create account'}
                    </button>
                    <p
                        className={`mt-2 flex min-h-[1.1rem] items-center gap-1.5 text-[11.5px] ${
                            canSubmit
                                ? 'text-emerald-500'
                                : usernameAvailability.status === 'error'
                                    ? 'text-amber-400'
                                    : 'text-pebble-text-muted'
                        }`}
                    >
                        {!canSubmit && !submitting && <AlertCircle className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />}
                        {submitting && <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" strokeWidth={2.2} />}
                        {canSubmit && <CheckCircle2 className="h-3.5 w-3.5 shrink-0" strokeWidth={2.2} />}
                        <span>{helperMessage}</span>
                    </p>
                </form>

                {/* Switch to login */}
                <p className="text-center text-[13px] text-pebble-text-secondary">
                    Already have an account?{' '}
                    <Link
                        to="/auth/login"
                        className="font-medium text-pebble-accent hover:text-pebble-text-primary transition-colors"
                    >
                        Sign in
                    </Link>
                </p>
            </div>
        </AuthShell>
    )
}
