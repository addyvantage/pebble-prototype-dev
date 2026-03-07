import { createContext, useCallback, useEffect, useState, type ReactNode } from 'react'
import {
    getCurrentSession,
    signIn as cognitoSignIn,
    signUp as cognitoSignUp,
    signOut as cognitoSignOut,
    confirmSignUp as cognitoConfirmSignUp,
    resendSignUpCode as cognitoResendSignUpCode,
    isCognitoConfigured,
    type SignUpResult,
    type AuthUser,
} from '../lib/auth'
import { apiFetch, apiUrl } from '../lib/apiUrl'
import { pushNotification, setNotificationScope } from '../lib/notificationsStore'

export type UserProfile = {
    userId: string
    displayName?: string | null
    username: string
    usernameLower?: string
    usernameSetAt?: string | null
    lastUsernameChangeAt?: string | null
    email: string
    bio: string
    avatarKey?: string | null
    avatarUpdatedAt?: string | null
    avatarUrl: string | null
    updatedAt?: string
    role: 'user' | 'admin'
}

export type AuthContextValue = {
    user: AuthUser | null
    profile: UserProfile | null
    isAuthenticated: boolean
    isAdmin: boolean
    isLoading: boolean
    isConfigured: boolean
    idToken: string | null
    signIn: (identifier: string, password: string) => Promise<void>
    signUp: (email: string, password: string, username: string) => Promise<SignUpResult>
    confirmSignUp: (email: string, code: string) => Promise<void>
    resendSignUpCode: (email: string) => Promise<void>
    signOut: () => void
    refreshProfile: () => Promise<void>
    setGuestMode: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

const DEV_GUEST_USER: AuthUser = { userId: 'dev-guest', email: 'guest@pebble.dev' }
const DEV_GUEST_PROFILE: UserProfile = {
    userId: 'dev-guest',
    displayName: 'Guest',
    username: 'Guest',
    usernameLower: 'guest',
    usernameSetAt: null,
    lastUsernameChangeAt: null,
    email: 'guest@pebble.dev',
    bio: 'Dev mode guest',
    avatarUrl: null,
    avatarUpdatedAt: null,
    role: 'user',
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null)
    const [profile, setProfile] = useState<UserProfile | null>(null)
    const [idToken, setIdToken] = useState<string | null>(null)
    const [isLoading, setIsLoading] = useState(true)
    const configured = isCognitoConfigured()

    const fetchAvatarUrl = useCallback(async (token: string, key: string) => {
        const res = await fetch(apiUrl(`/api/avatar/url?key=${encodeURIComponent(key)}`), {
            headers: { Authorization: `Bearer ${token}` },
        })
        if (!res.ok) return null
        const data = await res.json() as { url?: string }
        return typeof data.url === 'string' ? data.url : null
    }, [])

    const appendAvatarVersion = useCallback((url: string, avatarUpdatedAt?: string | null) => {
        const version = avatarUpdatedAt ? new Date(avatarUpdatedAt).getTime() : Date.now()
        return `${url}${url.includes('?') ? '&' : '?'}v=${version}`
    }, [])

    const fetchProfile = useCallback(async (token: string): Promise<UserProfile | null> => {
        try {
            const res = await apiFetch('/api/profile', {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json() as UserProfile
                let avatarUrl: string | null = null
                if (data.avatarKey) {
                    const freshUrl = await fetchAvatarUrl(token, data.avatarKey)
                    avatarUrl = freshUrl ? appendAvatarVersion(freshUrl, data.avatarUpdatedAt) : null
                }
                const nextProfile = { ...data, avatarUrl }
                setProfile(nextProfile)
                return nextProfile
            }
        } catch {
            // Profile fetch failed — user is authed but profile not yet created
        }
        return null
    }, [appendAvatarVersion, fetchAvatarUrl])

    const refreshProfile = useCallback(async () => {
        if (idToken) await fetchProfile(idToken)
    }, [idToken, fetchProfile])

    // Restore session on mount
    useEffect(() => {
        let cancelled = false
        async function restore() {
            try {
                const session = await getCurrentSession()
                if (cancelled) return
                if (session) {
                    setUser(session.user)
                    setIdToken(session.idToken)
                    await fetchProfile(session.idToken)
                }
            } catch {
                // no session
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }
        restore()
        return () => { cancelled = true }
    }, [fetchProfile])

    const handleSignIn = useCallback(async (identifier: string, password: string) => {
        const result = await cognitoSignIn(identifier, password)
        setUser(result.user)
        setIdToken(result.idToken)
        setNotificationScope(result.user.userId)
        const profileResult = await fetchProfile(result.idToken)
        const signedInName =
            profileResult?.displayName?.trim()
            || profileResult?.username?.trim()
            || result.user.email.split('@')[0]
            || 'User'
        pushNotification({
            category: 'system',
            title: `Signed in as ${signedInName}`,
            message: 'Your profile and progress are synced.',
            actionRoute: '/profile',
            actionLabel: 'Open profile',
        })
    }, [fetchProfile])

    // signUp only registers the user — Cognito sends a verification email.
    // Auto sign-in is NOT attempted here; the verify page handles confirmation.
    const handleSignUp = useCallback(async (email: string, password: string, username: string) => {
        return await cognitoSignUp(email, password, username)
    }, [])

    const handleConfirmSignUp = useCallback(async (email: string, code: string) => {
        await cognitoConfirmSignUp(email, code)
    }, [])

    const handleResendSignUpCode = useCallback(async (email: string) => {
        await cognitoResendSignUpCode(email)
    }, [])

    const handleSignOut = useCallback(() => {
        cognitoSignOut()
        setNotificationScope(null)
        setUser(null)
        setProfile(null)
        setIdToken(null)
    }, [])

    const setGuestMode = useCallback(() => {
        if (import.meta.env.DEV) {
            setNotificationScope('dev-guest')
            setUser(DEV_GUEST_USER)
            setProfile(DEV_GUEST_PROFILE)
            setIdToken('dev-guest-token')
            setIsLoading(false)
        }
    }, [])

    const value: AuthContextValue = {
        user,
        profile,
        isAuthenticated: user !== null,
        isAdmin: profile?.role === 'admin',
        isLoading,
        isConfigured: configured,
        idToken,
        signIn: handleSignIn,
        signUp: handleSignUp,
        confirmSignUp: handleConfirmSignUp,
        resendSignUpCode: handleResendSignUpCode,
        signOut: handleSignOut,
        refreshProfile,
        setGuestMode,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
