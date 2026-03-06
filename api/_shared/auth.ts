import { createHmac } from 'node:crypto'
import {
  USERNAME_REGEX,
  isValidEmailCandidate,
  normalizeEmailCandidate,
} from '../../shared/authValidation.js'

export const PROFILES_TABLE = process.env.PROFILES_TABLE_NAME ?? 'pebble-profiles'
export const COGNITO_CLIENT_ID =
  process.env.COGNITO_CLIENT_ID ??
  process.env.VITE_COGNITO_CLIENT_ID ??
  ''
export const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean)
const COGNITO_USER_POOL_ID =
  process.env.COGNITO_USER_POOL_ID ??
  process.env.VITE_COGNITO_USER_POOL_ID ??
  ''
const COGNITO_CLIENT_SECRET = process.env.COGNITO_CLIENT_SECRET ?? ''
const USERNAME_CLAIM_PREFIX = 'UNAME#'
export { COGNITO_USER_POOL_ID, USERNAME_REGEX }

export function usernameClaimKey(usernameLower: string) {
  return `${USERNAME_CLAIM_PREFIX}${usernameLower}`
}

export function normalizeUsername(username: unknown) {
  if (typeof username !== 'string') return null
  const trimmed = username.trim()
  if (!USERNAME_REGEX.test(trimmed)) return null
  return trimmed
}

export function normalizeEmail(email: unknown) {
  return normalizeEmailCandidate(email)
}

export function isValidEmail(email: string) {
  return isValidEmailCandidate(email)
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
