import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { Card } from '../components/ui/Card'
import { useAuth } from '../hooks/useAuth'
import { useTheme } from '../hooks/useTheme'
import { Camera } from 'lucide-react'

export function ProfilePage() {
    const { isAuthenticated, isLoading, profile, idToken, refreshProfile } = useAuth()
    const { theme } = useTheme()
    const dark = theme === 'dark'

    const [username, setUsername] = useState('')
    const [bio, setBio] = useState('')
    const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (profile) {
            setUsername(profile.username ?? '')
            setBio(profile.bio ?? '')
            setAvatarPreview(profile.avatarUrl ?? null)
        }
    }, [profile])

    const handleAvatarUpload = useCallback(async (file: File) => {
        if (!idToken) return
        setUploading(true)
        setMessage(null)

        try {
            // 1. Get presigned URL
            const presignRes = await fetch('/api/avatar/presign', {
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
            const { uploadUrl, key } = await presignRes.json()

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
            await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ username, bio, avatarKey: key }),
            })

            // 4. Instant preview
            setAvatarPreview(URL.createObjectURL(file))
            await refreshProfile()
            setMessage({ type: 'success', text: 'Avatar updated!' })
        } catch (err: any) {
            const detail = err?.message ?? 'Unknown error'
            console.error('[avatar-upload] failed:', err)
            setMessage({ type: 'error', text: `Upload failed: ${detail}` })
        } finally {
            setUploading(false)
        }
    }, [idToken, username, bio, refreshProfile])

    async function handleSave() {
        if (!idToken) return
        setSaving(true)
        setMessage(null)

        if (username.length < 3 || username.length > 20 || !/^[a-zA-Z0-9_]+$/.test(username)) {
            setMessage({ type: 'error', text: 'Username must be 3–20 characters (letters, numbers, underscores)' })
            setSaving(false)
            return
        }
        if (bio.length > 160) {
            setMessage({ type: 'error', text: 'Bio must be 160 characters or less' })
            setSaving(false)
            return
        }

        try {
            const res = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${idToken}`,
                },
                body: JSON.stringify({ username, bio }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => ({}))
                throw new Error((data as any).error ?? 'Save failed')
            }
            await refreshProfile()
            setMessage({ type: 'success', text: 'Profile saved!' })
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message ?? 'Save failed' })
        } finally {
            setSaving(false)
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
        <div className="page-enter mx-auto max-w-lg px-4 pb-8 pt-4">
            <Card className="relative overflow-hidden p-6" interactive>
                <div className="pointer-events-none absolute -left-16 -top-16 h-48 w-48 rounded-full bg-pebble-accent/12 blur-3xl" />
                <div className="pointer-events-none absolute -bottom-12 -right-12 h-40 w-40 rounded-full bg-sky-400/8 blur-3xl" />

                <div className="relative space-y-6">
                    <h1 className="text-xl font-bold tracking-tight text-pebble-text-primary">Your Profile</h1>

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

                    {/* Email (read-only) */}
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-[0.06em] text-pebble-text-muted">
                            Email
                        </label>
                        <div className="rounded-xl border border-pebble-border/20 bg-pebble-overlay/[0.03] px-3.5 py-2.5 text-sm text-pebble-text-secondary">
                            {profile?.email ?? '—'}
                        </div>
                    </div>

                    {/* Username */}
                    <div>
                        <label className="mb-1 block text-xs font-medium uppercase tracking-[0.06em] text-pebble-text-muted">
                            Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Choose a username"
                            maxLength={20}
                            className={inputClass}
                        />
                        <p className="mt-1 text-[11px] text-pebble-text-muted">3–20 characters, letters, numbers, underscores</p>
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
    )
}
