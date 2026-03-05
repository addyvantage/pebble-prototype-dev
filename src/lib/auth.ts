/**
 * Cognito SRP authentication wrapper.
 * Uses amazon-cognito-identity-js directly (no Amplify).
 * Falls back to dev/guest mode when env vars are missing.
 */
import {
    CognitoUserPool,
    CognitoUser,
    AuthenticationDetails,
    CognitoUserAttribute,
    CognitoUserSession,
} from 'amazon-cognito-identity-js'

const USER_POOL_ID = import.meta.env.VITE_COGNITO_USER_POOL_ID as string | undefined
const CLIENT_ID = import.meta.env.VITE_COGNITO_CLIENT_ID as string | undefined
const USER_POOL_ID_FALLBACK = (import.meta.env as Record<string, unknown>).COGNITO_USER_POOL_ID as string | undefined
const CLIENT_ID_FALLBACK = (import.meta.env as Record<string, unknown>).COGNITO_CLIENT_ID as string | undefined

const RESOLVED_USER_POOL_ID = USER_POOL_ID ?? USER_POOL_ID_FALLBACK
const RESOLVED_CLIENT_ID = CLIENT_ID ?? CLIENT_ID_FALLBACK

const isConfigured = Boolean(RESOLVED_USER_POOL_ID && RESOLVED_CLIENT_ID)

function maskEnvValue(value?: string) {
    if (!value) {
        return 'missing'
    }
    if (value.length <= 6) {
        return `${value.slice(0, 1)}***${value.slice(-1)}`
    }
    return `${value.slice(0, 3)}***${value.slice(-3)}`
}

if (import.meta.env.DEV) {
    const detected = {
        VITE_COGNITO_USER_POOL_ID: maskEnvValue(USER_POOL_ID),
        COGNITO_USER_POOL_ID: maskEnvValue(USER_POOL_ID_FALLBACK),
        VITE_COGNITO_CLIENT_ID: maskEnvValue(CLIENT_ID),
        COGNITO_CLIENT_ID: maskEnvValue(CLIENT_ID_FALLBACK),
        resolved: {
            userPoolId: maskEnvValue(RESOLVED_USER_POOL_ID),
            clientId: maskEnvValue(RESOLVED_CLIENT_ID),
            source: USER_POOL_ID && CLIENT_ID ? 'VITE_' : (USER_POOL_ID_FALLBACK && CLIENT_ID_FALLBACK ? 'COGNITO_' : 'incomplete'),
        },
    }
    console.debug('[auth] Cognito env detection', detected)
}

let userPool: CognitoUserPool | null = null
if (isConfigured) {
    userPool = new CognitoUserPool({
        UserPoolId: RESOLVED_USER_POOL_ID!,
        ClientId: RESOLVED_CLIENT_ID!,
    })
}

export function isCognitoConfigured(): boolean {
    return isConfigured
}

export type AuthUser = {
    userId: string
    email: string
}

function sessionToUser(session: CognitoUserSession): AuthUser {
    const payload = session.getIdToken().decodePayload()
    return {
        userId: payload.sub as string,
        email: (payload.email as string) ?? '',
    }
}

export function getCurrentSession(): Promise<{ user: AuthUser; idToken: string } | null> {
    if (!userPool) return Promise.resolve(null)

    const cognitoUser = userPool.getCurrentUser()
    if (!cognitoUser) return Promise.resolve(null)

    return new Promise((resolve) => {
        cognitoUser.getSession((err: Error | null, session: CognitoUserSession | null) => {
            if (err || !session || !session.isValid()) {
                resolve(null)
                return
            }
            resolve({
                user: sessionToUser(session),
                idToken: session.getIdToken().getJwtToken(),
            })
        })
    })
}

export function signIn(email: string, password: string): Promise<{ user: AuthUser; idToken: string }> {
    if (!userPool) return Promise.reject(new Error('Cognito not configured'))

    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
    const authDetails = new AuthenticationDetails({ Username: email, Password: password })

    return new Promise((resolve, reject) => {
        cognitoUser.authenticateUser(authDetails, {
            onSuccess(session) {
                resolve({
                    user: sessionToUser(session),
                    idToken: session.getIdToken().getJwtToken(),
                })
            },
            onFailure(err) {
                reject(err)
            },
        })
    })
}

export function signUp(email: string, password: string, username: string): Promise<void> {
    if (!userPool) return Promise.reject(new Error('Cognito not configured'))

    const attributes = [
        new CognitoUserAttribute({ Name: 'email', Value: email }),
        new CognitoUserAttribute({ Name: 'preferred_username', Value: username }),
    ]

    return new Promise((resolve, reject) => {
        userPool!.signUp(email, password, attributes, [], (err) => {
            if (err) {
                reject(err)
                return
            }
            resolve()
        })
    })
}

export function signOut(): void {
    if (!userPool) return
    const cognitoUser = userPool.getCurrentUser()
    cognitoUser?.signOut()
}

export function confirmSignUp(email: string, code: string): Promise<void> {
    if (!userPool) return new Promise((resolve) => setTimeout(resolve, 800))
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
    return new Promise((resolve, reject) => {
        cognitoUser.confirmRegistration(code, true, (err) => {
            if (err) { reject(err); return }
            resolve()
        })
    })
}

export function resendSignUpCode(email: string): Promise<void> {
    if (!userPool) return new Promise((resolve) => setTimeout(resolve, 800))
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
    return new Promise((resolve, reject) => {
        cognitoUser.resendConfirmationCode((err) => {
            if (err) { reject(err); return }
            resolve()
        })
    })
}

export function forgotPassword(email: string): Promise<void> {
    if (!userPool) {
        // Dev fallback — simulate network delay
        return new Promise((resolve) => setTimeout(resolve, 800))
    }
    const cognitoUser = new CognitoUser({ Username: email, Pool: userPool })
    return new Promise((resolve, reject) => {
        cognitoUser.forgotPassword({
            onSuccess: () => resolve(),
            onFailure: (err) => reject(err),
            // inputVerificationCode is called when the code is delivered (still a success)
            inputVerificationCode: () => resolve(),
        })
    })
}
