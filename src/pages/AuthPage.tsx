import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'

export function AuthPage() {
    const { signIn, signUp, setGuestMode, isConfigured } = useAuth()
    const navigate = useNavigate()
    const { theme } = useTheme()
    const dark = theme === 'dark'

    const [mode, setMode] = useState<'signin' | 'signup'>('signin')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [username, setUsername] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        setLoading(true)

        try {
            if (mode === 'signin') {
                await signIn(email, password)
            } else {
                if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
                    setError('Username must be 3–20 characters (letters, numbers, underscores)')
                    setLoading(false)
                    return
                }
                await signUp(email, password, username)
            }
            navigate('/')
        } catch (err: any) {
            setError(err?.message ?? 'Authentication failed')
        } finally {
            setLoading(false)
        }
    }

    function handleGuestMode() {
        setGuestMode()
        navigate('/')
    }

    const inputClass = `w-full rounded-xl border bg-pebble-overlay/[0.06] px-3.5 py-2.5 text-sm text-pebble-text-primary outline-none transition placeholder:text-pebble-text-muted focus:ring-2 ${dark
            ? 'border-pebble-border/35 focus:border-pebble-accent/50 focus:ring-pebble-accent/20'
            : 'border-pebble-border/30 focus:border-pebble-accent/60 focus:ring-pebble-accent/15'
        }`

    const tabClass = (active: boolean) =>
        `flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${active
            ? 'border border-pebble-border/45 bg-pebble-overlay/16 text-pebble-text-primary shadow-[inset_0_1px_0_rgba(255,255,255,0.15),0_8px_22px_rgba(2,8,23,0.18)]'
            : 'border border-transparent text-pebble-text-secondary hover:bg-pebble-overlay/12 hover:text-pebble-text-primary'
        }`

    return (
        <div className="page-enter mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
            <Card className="relative w-full overflow-hidden p-6" interactive>
                {/* Decorative glows */}
                <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-pebble-accent/15 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />

                <div className="relative space-y-5">
                    <div className="text-center">
                        <h1 className="text-2xl font-bold tracking-tight text-pebble-text-primary">
                            {mode === 'signin' ? 'Welcome back' : 'Create account'}
                        </h1>
                        <p className="mt-1 text-sm text-pebble-text-secondary">
                            {mode === 'signin' ? 'Sign in to your Pebble account' : 'Start your learning journey'}
                        </p>
                    </div>

                    {/* Mode toggle */}
                    <div className="flex items-center gap-1 rounded-xl border border-pebble-border/28 bg-pebble-overlay/7 p-1">
                        <button type="button" className={tabClass(mode === 'signin')} onClick={() => { setMode('signin'); setError('') }}>
                            Sign In
                        </button>
                        <button type="button" className={tabClass(mode === 'signup')} onClick={() => { setMode('signup'); setError('') }}>
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.06em] text-pebble-text-muted">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                required
                                className={inputClass}
                            />
                        </div>

                        {mode === 'signup' && (
                            <div>
                                <label className="mb-1 block text-xs font-medium uppercase tracking-[0.06em] text-pebble-text-muted">
                                    Username
                                </label>
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="cool_dev_42"
                                    required
                                    minLength={3}
                                    maxLength={20}
                                    pattern="^[a-zA-Z0-9_]+$"
                                    className={inputClass}
                                />
                            </div>
                        )}

                        <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.06em] text-pebble-text-muted">
                                Password
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                required
                                minLength={8}
                                className={inputClass}
                            />
                        </div>

                        {error && (
                            <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-400">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full rounded-xl border border-pebble-accent/50 bg-pebble-accent/20 px-4 py-2.5 text-sm font-semibold text-pebble-text-primary transition hover:bg-pebble-accent/30 disabled:opacity-50"
                        >
                            {loading ? 'Processing…' : mode === 'signin' ? 'Sign In' : 'Create Account'}
                        </button>
                    </form>

                    {!isConfigured && (
                        <div className="space-y-2 border-t border-pebble-border/20 pt-3">
                            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-400">
                                <p className="font-semibold">Cognito not configured</p>
                                <p className="mt-1 leading-relaxed">
                                    On Vercel, set <code className="rounded bg-pebble-overlay/20 px-1 py-0.5 font-mono">VITE_COGNITO_USER_POOL_ID</code> and{' '}
                                    <code className="rounded bg-pebble-overlay/20 px-1 py-0.5 font-mono">VITE_COGNITO_CLIENT_ID</code> (must redeploy after changing env vars).
                                </p>
                            </div>
                            {import.meta.env.DEV && (
                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={handleGuestMode}
                                        className="text-xs text-pebble-text-secondary underline decoration-pebble-border/40 transition hover:text-pebble-text-primary"
                                    >
                                        Continue as guest (dev only)
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </Card>
        </div>
    )
}
