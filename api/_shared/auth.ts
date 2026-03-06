import { createHmac } from 'node:crypto'

export const PROFILES_TABLE = process.env.PROFILES_TABLE_NAME ?? 'pebble-profiles'
export const COGNITO_CLIENT_ID =
  process.env.COGNITO_CLIENT_ID ??
  process.env.VITE_COGNITO_CLIENT_ID ??
  ''
const COGNITO_USER_POOL_ID =
  process.env.COGNITO_USER_POOL_ID ??
  process.env.VITE_COGNITO_USER_POOL_ID ??
  ''
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET ?? ''
const USERNAME_CLAIM_PREFIX = 'UNAME#'

export function usernameClaimKey(usernameLower: string) {
  return `${USERNAME_CLAIM_PREFIX}${usernameLower}`
}

export function createSecretHash(username: string) {
  if (!COGNITO_CLIENT_SECRET || !COGNITO_CLIENT_ID) {
    return undefined
  }

  return createHmac('sha256', COGNITO_CLIENT_SECRET)
    .update(`${username}${COGNITO_CLIENT_ID}`)
    .digest('base64')
}

export function resolveCognitoRegion() {
  if (process.env.AWS_REGION) {
    return process.env.AWS_REGION
  }

  const match = COGNITO_USER_POOL_ID.match(/^([a-z]{2}-[a-z]+-\d+)_/)
  return match?.[1]
}
