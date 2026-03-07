import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { Camera } from 'lucide-react'
import { ConfirmDialog } from '../components/modals/ConfirmDialog'
import { useI18n } from '../i18n/useI18n'
import { LANGUAGES, type LanguageCode } from '../i18n/languages'
import { clearLocalUserData } from '../utils/storageKeys'
import { apiFetch, apiUrl } from '../lib/apiUrl'
import { pushNotification } from '../lib/notificationsStore'

export function ProfilePage() {
    const { isAuthenticated, isLoading, profile, idToken, refreshProfile, signOut } = useAuth()
    const { theme, setTheme } = useTheme()
    const { lang, setLang } = useI18n()
    const dark = theme === 'dark'

    const [displayName, setDisplayName] = useState('')
    const [username, setUsername] = useState('')
    const [newUsername, setNewUsername] = useState('')
    const [bio, setBio] = useState('')
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [avatarVersion, setAvatarVersion] = useState<number | null>(null)
    const [saving, setSaving] = useState(false)
    const [savingUsername, setSavingUsername] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [isChangingUsername, setIsChangingUsername] = useState(false)
    const [showUsernameConfirm, setShowUsernameConfirm] = useState(false)
    const [usernameAvailability, setUsernameAvailability] = useState<{
        status: 'idle' | 'checking' | 'available' | 'taken' | 'invalid'
        message: string
    }>({ status: 'idle', message: '' })
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const fetchAvatarUrl = useCallback(async (key: string) => {
        if (!idToken) return null
        const res = await fetch(apiUrl(`/api/avatar/url?key=${encodeURIComponent(key)}`), {
            headers: { Authorization: `Bearer ${idToken}` },
        })
        if (!res.ok) return null
        const data = await res.json() as { url?: string }
        return typeof data.url === 'string' && data.url ? data.url : null
    }, [idToken])

    useEffect(() => {
        let cancelled = false
        async function hydrateAvatar() {
            if (!profile) {
                return
            }
            setDisplayName(profile.displayName ?? profile.username ?? '')
            setUsername(profile.username ?? '')
            setNewUsername(profile.username ?? '')
            setBio(profile.bio ?? '')
            if (!profile.avatarKey) {
                setAvatarPreview(null)
                return
            }
            const freshUrl = await fetchAvatarUrl(profile.avatarKey)
            if (cancelled) {
                return
            }
            if (!freshUrl) {
                setAvatarPreview(null)
                return
            }
            const version = avatarVersion
                ?? (profile.avatarUpdatedAt ? new Date(profile.avatarUpdatedAt).getTime() : Date.now())
            setAvatarPreview(`${freshUrl}${freshUrl.includes('?') ? '&' : '?'}v=${version}`)
        }
        void hydrateAvatar()
        return () => { cancelled = true }
    }, [avatarVersion, fetchAvatarUrl, profile])

    const handleAvatarUpload = useCallback(async (file: File) => {
        if (!idToken) return
        setUploading(true)
        setMessage(null)

        try {
            // 1. Get presigned URL
            const presignRes = await apiFetch('/api/avatar/presign', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({
                    contentType: file.type,
                    fileExtension: file.name.split('.').pop() ?? 'jpg',
                }),
            })
            if (!presignRes.ok) throw new Error(`Failed to get upload URL (HTTP ${presignRes.status})`)
            const { uploadUrl, key, avatarKey } = await presignRes.json() as {
                uploadUrl: string
                key?: string
                avatarKey?: string
            }
            const resolvedAvatarKey = avatarKey ?? key
            if (!resolvedAvatarKey) {
                throw new Error('Avatar key missing from upload response')
            }

            // 2. Upload to S3 (or dev stub)
            // Wrap separately so CORS/network errors get a clear message distinct from HTTP errors.
            let uploadRes: Response
            try {
                uploadRes = await fetch(uploadUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': file.type },
                    body: file,
                })
            } catch {
                throw new Error(
                    'Avatar upload blocked — likely a CORS error. ' +
                    'Ensure AVATARS_BUCKET_NAME is set to the correct S3 bucket ' +
                    'and that bucket has a CORS rule allowing this origin.'
                )
            }
            if (!uploadRes.ok) throw new Error(`S3 upload failed (HTTP ${uploadRes.status})`)

            // 3. Update profile with new avatar key
            const profileRes = await apiFetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ bio, avatarKey: resolvedAvatarKey }),
            })
            if (!profileRes.ok) throw new Error(`Failed to save avatar key (HTTP ${profileRes.status})`)

            // 4. Instant preview
            const resolvedUrl = await fetchAvatarUrl(resolvedAvatarKey)
            const version = Date.now()
            const cacheBustedUrl = resolvedUrl
                ? `${resolvedUrl}${resolvedUrl.includes('?') ? '&' : '?'}v=${version}`
                : URL.createObjectURL(file)
            setAvatarVersion(version)
            setAvatarPreview(cacheBustedUrl)
            await refreshProfile()
            setMessage({ type: 'success', text: 'Avatar updated!' })
            pushNotification({
                category: 'system',
                title: 'Profile updated',
                message: 'Your avatar was updated successfully.',
                actionRoute: '/profile',
                actionLabel: 'View profile',
            })
        } catch (err: any) {
            const detail = err?.message ?? 'Unknown error'
            console.error('[avatar-upload] failed:', err)
            setMessage({ type: 'error', text: `Upload failed: ${detail}` })
        } finally {
            setUploading(false)
        }
    }, [idToken, bio, fetchAvatarUrl, refreshProfile])

    async function handleSave() {
        if (!idToken) return
        setSaving(true)
        setMessage(null)

        if (bio.length > 160) {
            setMessage({ type: 'error', text: 'Bio must be 160 characters or less' })
            setSaving(false)
            return
        }
        if (displayName.trim().length > 48) {
            setMessage({ type: 'error', text: 'Display name must be 48 characters or less' })
            setSaving(false)
            return
        }

        try {
            const res = await apiFetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ displayName: displayName.trim(), bio }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error((data as any).error ?? 'Save failed')
            }
            await refreshProfile()
            setMessage({ type: 'success', text: 'Profile saved!' })
            pushNotification({
                category: 'system',
                title: 'Profile updated',
                message: 'Your profile details were saved.',
                actionRoute: '/profile',
                actionLabel: 'View profile',
            })
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message ?? 'Save failed' })
        } finally {
            setSaving(false)
        }
    }

    function handleClearLocalData() {
        clearLocalUserData()
        setMessage({ type: 'success', text: 'Local session data cleared from this browser.' })
    }

    const usernameCooldownRemainingDays = (() => {
        const base = profile?.lastUsernameChangeAt ?? profile?.usernameSetAt
        if (!base) return 0
        const baseMs = Date.parse(base)
        if (Number.isNaN(baseMs)) return 0
        const next = baseMs + 30 * 24 * 60 * 60 * 1000
        if (next <= Date.now()) return 0
        return Math.ceil((next - Date.now()) / (24 * 60 * 60 * 1000))
    })()
    const canChangeUsername = usernameCooldownRemainingDays === 0
    const usernameChanged = newUsername.trim() !== username.trim()

    useEffect(() => {
        if (!isChangingUsername) {
            setUsernameAvailability({ status: 'idle', message: '' })
            return
        }
        const candidate = newUsername.trim()
        if (!candidate || candidate === username) {
            setUsernameAvailability({ status: 'idle', message: '' })
            return
        }
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(candidate)) {
            setUsernameAvailability({ status: 'invalid', message: '3–20 chars · letters, numbers, underscores' })
            return
        }
        setUsernameAvailability({ status: 'checking', message: 'Checking…' })
        const controller = new AbortController()
        const timer = window.setTimeout(async () => {
            try {
                const res = await fetch(apiUrl(`/api/username/available?username=${encodeURIComponent(candidate)}`), { signal: controller.signal })
                const data = await res.json() as { available?: boolean; reason?: string }
                if (!res.ok) {
                    setUsernameAvailability({ status: 'idle', message: '' })
                    return
                }
                if (data.available) {
                    setUsernameAvailability({ status: 'available', message: 'Username is available' })
                    return
                }
                if (data.reason === 'taken') {
                    setUsernameAvailability({ status: 'taken', message: 'Username is already taken' })
                    return
                }
                setUsernameAvailability({ status: 'invalid', message: 'Username is invalid' })
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    setUsernameAvailability({ status: 'idle', message: '' })
                }
            }
        }, 400)
        return () => {
            controller.abort()
            window.clearTimeout(timer)
        }
    }, [isChangingUsername, newUsername, username])

    async function handleConfirmUsernameChange() {
        if (!idToken) return
        const candidate = newUsername.trim()
        if (!/^[a-zA-Z0-9_]{3,20}$/.test(candidate)) {
            setMessage({ type: 'error', text: 'Username must be 3–20 characters (letters, numbers, underscores)' })
            return
        }
        setSavingUsername(true)
        setShowUsernameConfirm(false)
        try {
            const res = await apiFetch('/api/profile/username', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ username: candidate }),
            })
            const data = await res.json().catch(() => ({})) as { error?: string; daysRemaining?: number }
            if (!res.ok) {
                if (res.status === 409) {
                    setUsernameAvailability({ status: 'taken', message: 'Username is already taken' })
                }
                if (res.status === 429 && typeof data.daysRemaining === 'number') {
                    setMessage({ type: 'error', text: `You can change again in ${data.daysRemaining} day${data.daysRemaining === 1 ? '' : 's'}` })
                } else {
                    setMessage({ type: 'error', text: data.error ?? 'Username change failed' })
                }
                return
            }
            await refreshProfile()
            setIsChangingUsername(false)
            setMessage({ type: 'success', text: 'Username updated' })
            pushNotification({
                category: 'system',
                title: 'Profile updated',
                message: `Username changed to ${candidate}.`,
                actionRoute: '/profile',
                actionLabel: 'View profile',
            })
        } catch (err: any) {
            setMessage({ type: 'error', text: err?.message ?? 'Username change failed' })
        } finally {
            setSavingUsername(false)
        }
    }

    if (isLoading) {
        return <div className="flex min-h-[40vh] items-center justify-center text-pebble-text-secondary">Loading…</div>
    }

    if (!isAuthenticated) {
        return <Navigate to="/auth" replace />
    }

    const avatarGlow = dark
        ? '0 0 0 1px rgba(180,195,230,0.12), 0 0 14px 6px rgba(96,165,250,0.35), 0 0 28px 12px rgba(59,130,246,0.20), 0 0 44px 20px rgba(79,107,196,0.12)'
        : '0 0 0 1px rgba(55,72,110,0.16), 0 0 14px 6px rgba(29,78,216,0.18), 0 0 28px 12px rgba(15,34,90,0.10), 0 0 44px 20px rgba(29,78,216,0.06)'

    const inputClass = `w-full rounded-xl border bg-pebble-overlay/[0.06] px-3.5 py-2.5 text-sm text-pebble-text-primary outline-none transition placeholder:text-pebble-text-muted focus:ring-2 ${dark
            ? 'border-pebble-border/35 focus:border-pebble-accent/50 focus:ring-pebble-accent/20'
            : 'border-pebble-border/30 focus:border-pebble-accent/60 focus:ring-pebble-accent/15'
        }`

    const initials = profile?.username
        ? profile.username.slice(0, 2).toUpperCase()
        : profile?.email
            ? profile.email.slice(0, 2).toUpperCase()
            : ''

    return (
        <>
        <div className="page-enter mx-auto w-full max-w-3xl px-4 pb-8 pt-5">
            <Card className="relative overflow-hidden p-6 md:p-7" interactive>
                <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-pebble-accent/12 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-sky-400/8 blur-3xl" />

                <div className="relative space-y-6">
                    <div className="space-y-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">Account</p>
                        <h1 className="text-2xl font-bold tracking-tight text-pebble-text-primary">Your Profile</h1>
                        <p className="text-sm text-pebble-text-secondary">Personalize your Pebble identity and preferences.</p>
                    </div>

                    {/* Avatar */}
                    <div className="flex justify-center">
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={uploading}
                            className="group relative h-36 w-36 rounded-full transition-transform hover:scale-[1.03]"
                            style={{ boxShadow: avatarGlow }}
                        >
                            {avatarPreview ? (
                                <img
                                    src={avatarPreview}
                                    alt="Avatar"
                                    className="h-full w-full rounded-full object-cover"
                                />
                            ) : (
                                <div className={`flex h-full w-full items-center justify-center rounded-full ${dark ? 'bg-pebble-panel' : 'bg-pebble-canvas'}`}>
                                    {initials ? (
                                        <span className="text-3xl font-bold text-pebble-accent">{initials}</span>
                                    ) : (
                                        <Camera className="h-9 w-9 text-pebble-text-muted" />
                                    )}
                                </div>
                            )}
                            <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40 opacity-0 transition group-hover:opacity-100">
                                <Camera className="h-9 w-9 text-white" />
                            </div>
                            {uploading && (
                                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50">
                                    <span className="text-xs font-medium text-white">Uploading…</span>
                                </div>
                            )}
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) handleAvatarUpload(file)
                            }}
                        />
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                        {/* Display name */}
                        <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.06em] text-pebble-text-muted">
                                Display name
                            </label>
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="How your name appears"
                                maxLength={48}
                                className={inputClass}
                            />
                        </div>

                        {/* Email (read-only) */}
                        <div>
                            <label className="mb-1 block text-xs font-medium uppercase tracking-[0.06em] text-pebble-text-muted">
                                Email
                            </label>
                            <div className="rounded-xl border border-pebble-border/20 bg-pebble-overlay/[0.03] px-3.5 py-2.5 text-sm text-pebble-text-secondary">
                                {profile?.email ?? '—'}
                            </div>
                        </div>
                    </div>

                    {/* Username */}
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-[0.06em] text-pebble-text-muted">
                            Username
                        </label>
                        {!isChangingUsername ? (
                            <>
                                <input
                                    type="text"
                                    value={username}
                                    disabled
                                    placeholder="Set username"
                                    className={`${inputClass} opacity-80`}
                                />
                                <div className="mt-2 flex items-center justify-between gap-2">
                                    <p className="text-[11px] text-pebble-text-muted">
                                        3–20 characters, letters, numbers, underscores
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsChangingUsername(true)
                                            setNewUsername(username)
                                            setMessage(null)
                                        }}
                                        disabled={!canChangeUsername}
                                        className="rounded-lg border border-pebble-border/30 bg-pebble-overlay/[0.06] px-2.5 py-1 text-[11px] font-medium text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.12] hover:text-pebble-text-primary disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        Change username
                                    </button>
                                </div>
                                {!canChangeUsername && (
                                    <p className="mt-1 text-[11px] text-pebble-text-muted">
                                        You can change again in {usernameCooldownRemainingDays} day{usernameCooldownRemainingDays === 1 ? '' : 's'}.
                                    </p>
                                )}
                            </>
                        ) : (
                            <>
                                <input
                                    type="text"
                                    value={newUsername}
                                    onChange={(e) => setNewUsername(e.target.value)}
                                    placeholder="Enter new username"
                                    maxLength={20}
                                    className={inputClass}
                                />
                                <div className="mt-2 flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => setShowUsernameConfirm(true)}
                                        disabled={
                                            savingUsername ||
                                            !usernameChanged ||
                                            usernameAvailability.status === 'checking' ||
                                            usernameAvailability.status === 'taken' ||
                                            usernameAvailability.status === 'invalid'
                                        }
                                        className="rounded-lg border border-pebble-accent/45 bg-pebble-accent/16 px-3 py-1.5 text-[12px] font-semibold text-pebble-text-primary transition hover:bg-pebble-accent/24 disabled:cursor-not-allowed disabled:opacity-50"
                                    >
                                        {savingUsername ? 'Saving…' : 'Save new username'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsChangingUsername(false)
                                            setNewUsername(username)
                                            setUsernameAvailability({ status: 'idle', message: '' })
                                        }}
                                        disabled={savingUsername}
                                        className="rounded-lg border border-pebble-border/30 bg-pebble-overlay/[0.06] px-3 py-1.5 text-[12px] font-medium text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.12] hover:text-pebble-text-primary"
                                    >
                                        Cancel
                                    </button>
                                </div>
                                {usernameAvailability.status !== 'idle' && (
                                    <p
                                        className={`mt-1 text-[11px] ${
                                            usernameAvailability.status === 'available'
                                                ? 'text-emerald-400'
                                                : usernameAvailability.status === 'checking'
                                                    ? 'text-pebble-text-muted'
                                                    : 'text-red-400'
                                        }`}
                                    >
                                        {usernameAvailability.message}
                                    </p>
                                )}
                            </>
                        )}
                    </div>

                    {/* Bio */}
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-[0.06em] text-pebble-text-muted">
                            Bio
                        </label>
                        <textarea
                            value={bio}
                            onChange={(e) => setBio(e.target.value)}
                            placeholder="Tell us about yourself…"
                            maxLength={160}
                            rows={3}
                            className={`${inputClass} resize-none`}
                        />
                        <p className="mt-1 text-right text-[11px] text-pebble-text-muted">{bio.length}/160</p>
                    </div>

                    {/* Preferences */}
                    <div className="rounded-2xl border border-pebble-border/25 bg-pebble-overlay/[0.04] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">Preferences</p>
                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                            <label className="space-y-1">
                                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-pebble-text-muted">Theme</span>
                                <select
                                    value={theme}
                                    onChange={(event) => setTheme(event.target.value as 'dark' | 'light')}
                                    className={inputClass}
                                >
                                    <option value="dark">Dark</option>
                                    <option value="light">Light</option>
                                </select>
                            </label>
                            <label className="space-y-1">
                                <span className="text-[11px] font-medium uppercase tracking-[0.06em] text-pebble-text-muted">Chat language</span>
                                <select
                                    value={lang}
                                    onChange={(event) => setLang(event.target.value as LanguageCode)}
                                    className={inputClass}
                                >
                                    {LANGUAGES.map((option) => (
                                        <option key={option.code} value={option.code}>
                                            {option.romanizedName}
                                        </option>
                                    ))}
                                </select>
                            </label>
                        </div>
                    </div>

                    {/* Account tools */}
                    <div className="rounded-2xl border border-pebble-border/25 bg-pebble-overlay/[0.04] p-4">
                        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-pebble-text-muted">Account</p>
                        <div className="mt-3 flex flex-wrap items-center gap-2.5">
                            <button
                                type="button"
                                onClick={signOut}
                                className="rounded-lg border border-pebble-border/30 bg-pebble-overlay/[0.06] px-3 py-1.5 text-[12px] font-medium text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.12] hover:text-pebble-text-primary"
                            >
                                Sign out
                            </button>
                            <button
                                type="button"
                                onClick={handleClearLocalData}
                                className="rounded-lg border border-pebble-border/30 bg-pebble-overlay/[0.06] px-3 py-1.5 text-[12px] font-medium text-pebble-text-secondary transition hover:bg-pebble-overlay/[0.12] hover:text-pebble-text-primary"
                            >
                                Clear local data
                            </button>
                            <span className="rounded-lg border border-pebble-border/20 bg-pebble-overlay/[0.03] px-3 py-1.5 text-[12px] text-pebble-text-muted">
                                Export my data (coming soon)
                            </span>
                        </div>
                    </div>

                    {/* Role badge */}
                    {profile?.role === 'admin' && (
                        <div className="flex items-center gap-2">
                            <span className="rounded-full border border-pebble-accent/40 bg-pebble-accent/15 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em] text-pebble-accent">
                                Admin
                            </span>
                        </div>
                    )}

                    {/* Messages */}
                    {message && (
                        <div className={`rounded-lg border px-3 py-2 text-xs ${message.type === 'success'
                                ? 'border-green-500/30 bg-green-500/10 text-green-400'
                                : 'border-red-500/30 bg-red-500/10 text-red-400'
                            }`}>
                            {message.text}
                        </div>
                    )}

                    {/* Save */}
                    <button
                        type="button"
                        onClick={handleSave}
                        disabled={saving}
                        className="w-full rounded-xl border border-pebble-accent/50 bg-pebble-accent/20 px-4 py-2.5 text-sm font-semibold text-pebble-text-primary transition hover:bg-pebble-accent/30 disabled:opacity-50"
                    >
                        {saving ? 'Saving…' : 'Save Profile'}
                    </button>
                </div>
            </Card>
        </div>
        <ConfirmDialog
            open={showUsernameConfirm}
            title="Change username?"
            description="You won’t be able to change your username for 30 days. Continue?"
            confirmText="Confirm"
            cancelText="Cancel"
            onConfirm={handleConfirmUsernameChange}
            onClose={() => setShowUsernameConfirm(false)}
        />
    </>
    )
}
