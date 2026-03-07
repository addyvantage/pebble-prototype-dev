/**
 * Profile/Auth Lambda — handles routes:
 *
 *   GET  /api/profile
 *   PUT  /api/profile
 *   POST /api/profile/username
 *   GET  /api/username/available
 *   POST /api/auth/signup
 *   POST /api/auth/login
 *   POST /api/avatar/presign
 *   GET  /api/avatar/url
 *
 * IMPORTANT: never return HTTP 403 or 404 — CloudFront global error responses
 * may remap those to index.html. Use 401/400/409/429/500 instead.
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  DeleteCommand,
  GetCommand,
  PutCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb'
import {
  AdminDeleteUserCommand,
  ConfirmSignUpCommand,
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  ResendConfirmationCodeCommand,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

const REGION = process.env.AWS_REGION ?? 'ap-south-1'
const PROFILES_TABLE = process.env.PROFILES_TABLE_NAME ?? 'pebble-profiles'
const AVATARS_BUCKET = process.env.AVATARS_BUCKET_NAME ?? ''
const COGNITO_CLIENT_ID = process.env.COGNITO_CLIENT_ID ?? process.env.VITE_COGNITO_CLIENT_ID ?? ''
const COGNITO_USER_POOL_ID = process.env.COGNITO_USER_POOL_ID ?? process.env.VITE_COGNITO_USER_POOL_ID ?? ''
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS ?? '')
  .split(',').map(e => e.trim()).filter(Boolean)

const USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/
const USERNAME_COOLDOWN_DAYS = 30
const USERNAME_CLAIM_PREFIX = 'UNAME#'

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }))
const cognito = new CognitoIdentityProviderClient({ region: REGION })
const s3 = new S3Client({ region: REGION })

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, PUT, POST, OPTIONS',
  'Content-Type': 'application/json',
}

function respond(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  const safe = statusCode === 403 ? 401 : statusCode === 404 ? 200 : statusCode
  return { statusCode: safe, headers: CORS_HEADERS, body: JSON.stringify(body) }
}

interface Identity { userId: string; email: string }

interface ProfileItem {
  userId: string
  username: string
  usernameLower: string
  usernameSetAt: string | null
  lastUsernameChangeAt: string | null
  email: string
  bio: string
  avatarKey: string | null
  avatarUpdatedAt: string | null
  role: 'user' | 'admin'
  createdAt: string
  updatedAt: string
}

function usernameClaimKey(usernameLower: string) {
  return `${USERNAME_CLAIM_PREFIX}${usernameLower}`
}

function normalizeUsername(value: unknown) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!USERNAME_REGEX.test(trimmed)) return null
  return trimmed
}

function normalizeEmail(value: unknown) {
  if (typeof value !== 'string') return ''
  return value.trim().toLowerCase()
}

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function parseJsonBody(body: string | null): Record<string, unknown> {
  if (!body) return {}
  try {
    return JSON.parse(body) as Record<string, unknown>
  } catch {
    return {}
  }
}

function extractIdentity(event: APIGatewayProxyEventV2): Identity | null {
  const auth = event.headers?.authorization ?? event.headers?.Authorization ?? ''
  if (!auth.startsWith('Bearer ')) return null
  const token = auth.slice(7)
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()) as Record<string, unknown>
    const userId = payload['sub'] as string | undefined
    if (!userId) return null
    const email = (payload['email'] ?? payload['cognito:username'] ?? '') as string
    return { userId, email }
  } catch {
    return null
  }
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  try {
    return JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString()) as Record<string, unknown>
  } catch {
    return null
  }
}

function defaultProfile(identity: Identity, nowIso: string): ProfileItem {
  return {
    userId: identity.userId,
    username: '',
    usernameLower: '',
    usernameSetAt: null,
    lastUsernameChangeAt: null,
    email: identity.email,
    bio: '',
    avatarKey: null,
    avatarUpdatedAt: null,
    role: ADMIN_EMAILS.includes(identity.email) ? 'admin' : 'user',
    createdAt: nowIso,
    updatedAt: nowIso,
  }
}

function getNextAllowedTimestamp(profile: Partial<ProfileItem>) {
  const base = profile.lastUsernameChangeAt ?? profile.usernameSetAt
  if (!base) return null
  const parsed = Date.parse(base)
  if (Number.isNaN(parsed)) return null
  return parsed + USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000
}

function getCooldownDaysRemaining(profile: Partial<ProfileItem>, nowMs = Date.now()) {
  const next = getNextAllowedTimestamp(profile)
  if (!next || next <= nowMs) return 0
  return Math.ceil((next - nowMs) / (24 * 60 * 60 * 1000))
}

async function getProfileByUserId(userId: string) {
  const result = await ddb.send(new GetCommand({
    TableName: PROFILES_TABLE,
    Key: { userId },
  }))
  return result.Item as Partial<ProfileItem> | undefined
}

async function getOrCreateProfile(identity: Identity): Promise<ProfileItem> {
  const existing = await getProfileByUserId(identity.userId)
  if (existing) {
    return existing as ProfileItem
  }
  const now = new Date().toISOString()
  const created = defaultProfile(identity, now)
  await ddb.send(new PutCommand({ TableName: PROFILES_TABLE, Item: created }))
  return created
}

async function getUsernameClaim(usernameLower: string) {
  const claim = await ddb.send(new GetCommand({
    TableName: PROFILES_TABLE,
    Key: { userId: usernameClaimKey(usernameLower) },
  }))
  return claim.Item as Record<string, unknown> | undefined
}

async function handleUsernameAvailable(usernameRaw: string | undefined) {
  const normalized = normalizeUsername(usernameRaw)
  if (!normalized) {
    return respond(200, { available: false, reason: 'invalid' })
  }
  const claim = await getUsernameClaim(normalized.toLowerCase())
  return respond(200, { available: !claim, ...(claim ? { reason: 'taken' } : {}) })
}

async function cleanupCreatedUser(email: string) {
  if (!COGNITO_USER_POOL_ID || !email) {
    return
  }
  try {
    await cognito.send(new AdminDeleteUserCommand({
      UserPoolId: COGNITO_USER_POOL_ID,
      Username: email,
    }))
  } catch {
    // best effort cleanup only
  }
}

async function handleGetProfile(identity: Identity): Promise<APIGatewayProxyResultV2> {
  const profile = await getOrCreateProfile(identity)
  return respond(200, profile)
}

async function handlePutProfile(identity: Identity, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = parseJsonBody(body)
  const { username, bio, avatarKey } = parsed

  if (username !== undefined) {
    return respond(400, { error: 'Username updates require POST /api/profile/username' })
  }
  if (bio !== undefined && (typeof bio !== 'string' || bio.length > 160)) {
    return respond(400, { error: 'Bio must be 160 chars or less' })
  }
  if (avatarKey !== undefined && avatarKey !== null && typeof avatarKey !== 'string') {
    return respond(400, { error: 'Invalid avatar key' })
  }

  const now = new Date().toISOString()
  const expressionParts: string[] = ['#updatedAt = :updatedAt']
  const names: Record<string, string> = { '#updatedAt': 'updatedAt' }
  const values: Record<string, unknown> = { ':updatedAt': now }

  if (bio !== undefined) {
    expressionParts.push('#bio = :bio')
    names['#bio'] = 'bio'
    values[':bio'] = bio
  }
  if (avatarKey !== undefined) {
    expressionParts.push('#avatarKey = :avatarKey')
    names['#avatarKey'] = 'avatarKey'
    values[':avatarKey'] = avatarKey
    expressionParts.push('#avatarUpdatedAt = :avatarUpdatedAt')
    names['#avatarUpdatedAt'] = 'avatarUpdatedAt'
    values[':avatarUpdatedAt'] = now
  }

  await ddb.send(new UpdateCommand({
    TableName: PROFILES_TABLE,
    Key: { userId: identity.userId },
    UpdateExpression: `SET ${expressionParts.join(', ')}`,
    ExpressionAttributeNames: names,
    ExpressionAttributeValues: values,
  }))

  return respond(200, { ok: true })
}

async function handlePostUsername(identity: Identity, body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = parseJsonBody(body)
  const username = normalizeUsername(parsed.username)
  if (!username) {
    return respond(400, { error: 'Username must be 3–20 chars, letters/numbers/underscore only', reason: 'invalid' })
  }
  const usernameLower = username.toLowerCase()
  const nowIso = new Date().toISOString()

  const existing = (await getProfileByUserId(identity.userId)) ?? defaultProfile(identity, nowIso)
  const currentUsernameLower = (existing.usernameLower || existing.username || '').toLowerCase()

  if (currentUsernameLower !== usernameLower) {
    if (existing.lastUsernameChangeAt || existing.usernameSetAt) {
      const daysRemaining = getCooldownDaysRemaining(existing)
      if (daysRemaining > 0) {
        return respond(429, {
          error: `You can change again in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`,
          reason: 'cooldown',
          daysRemaining,
        })
      }
    }

    await ddb.send(new PutCommand({
      TableName: PROFILES_TABLE,
      Item: {
        userId: usernameClaimKey(usernameLower),
        entityType: 'username_claim',
        ownerUserId: identity.userId,
        ownerEmail: identity.email,
        username,
        usernameLower,
        updatedAt: nowIso,
      },
      ConditionExpression: 'attribute_not_exists(userId)',
    }))

    if (currentUsernameLower) {
      await ddb.send(new DeleteCommand({
        TableName: PROFILES_TABLE,
        Key: { userId: usernameClaimKey(currentUsernameLower) },
      }))
    }
  }

  await ddb.send(new UpdateCommand({
    TableName: PROFILES_TABLE,
    Key: { userId: identity.userId },
    UpdateExpression: 'SET #username = :username, #usernameLower = :usernameLower, #usernameSetAt = if_not_exists(#usernameSetAt, :now), #lastUsernameChangeAt = :now, #updatedAt = :now',
    ExpressionAttributeNames: {
      '#username': 'username',
      '#usernameLower': 'usernameLower',
      '#usernameSetAt': 'usernameSetAt',
      '#lastUsernameChangeAt': 'lastUsernameChangeAt',
      '#updatedAt': 'updatedAt',
    },
    ExpressionAttributeValues: {
      ':username': username,
      ':usernameLower': usernameLower,
      ':now': nowIso,
    },
  }))

  const updated = await getProfileByUserId(identity.userId)
  return respond(200, updated ?? {})
}

async function handleAuthSignup(body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = parseJsonBody(body)
  const email = normalizeEmail(parsed.email)
  const password = parsed.password
  const username = normalizeUsername(parsed.username)

  if (!email || !isValidEmail(email) || typeof password !== 'string' || password.length < 8 || !username) {
    return respond(400, { error: 'Invalid signup payload' })
  }
  if (!COGNITO_CLIENT_ID) {
    return respond(500, { error: 'Signup is not configured' })
  }

  const usernameLower = username.toLowerCase()
  const existingClaim = await getUsernameClaim(usernameLower)
  if (existingClaim) {
    return respond(409, { error: 'Username is already taken', reason: 'taken' })
  }

  let createdCognitoUser = false
  try {
    const signup = await cognito.send(new SignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      Password: password,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'preferred_username', Value: username },
        { Name: 'name', Value: username },
      ],
    }))
    createdCognitoUser = true

    if (!signup.UserSub) {
      return respond(500, { error: 'Signup failed', code: 'SignupFailed' })
    }

    const nowIso = new Date().toISOString()
    const userId = signup.UserSub
    await ddb.send(new PutCommand({
      TableName: PROFILES_TABLE,
      Item: {
        userId: usernameClaimKey(usernameLower),
        entityType: 'username_claim',
        ownerUserId: userId,
        ownerEmail: email,
        username,
        usernameLower,
        updatedAt: nowIso,
      },
      ConditionExpression: 'attribute_not_exists(userId)',
    }))

    await ddb.send(new PutCommand({
      TableName: PROFILES_TABLE,
      Item: {
        userId,
        username,
        usernameLower,
        displayName: username,
        usernameSetAt: nowIso,
        lastUsernameChangeAt: nowIso,
        email,
        bio: '',
        avatarKey: null,
        avatarUpdatedAt: null,
        role: ADMIN_EMAILS.includes(email) ? 'admin' : 'user',
        createdAt: nowIso,
        updatedAt: nowIso,
      },
      ConditionExpression: 'attribute_not_exists(userId)',
    }))

    return respond(200, {
      ok: true,
      userSub: userId,
      requiresConfirmation: !Boolean(signup.UserConfirmed),
      delivery: signup.CodeDeliveryDetails
        ? {
            destination: signup.CodeDeliveryDetails.Destination ?? null,
            medium: signup.CodeDeliveryDetails.DeliveryMedium ?? null,
          }
        : null,
    })
  } catch (err: any) {
    if (createdCognitoUser) {
      await cleanupCreatedUser(email)
    }
    if (err?.name === 'ConditionalCheckFailedException') {
      return respond(409, { error: 'Username is already taken', reason: 'taken' })
    }
    if (err?.name === 'UsernameExistsException') {
      return respond(409, { error: 'An account with this email already exists. Try signing in.', code: 'UsernameExistsException' })
    }
    if (err?.name === 'InvalidPasswordException') {
      return respond(400, {
        error: 'Password does not meet Cognito policy. Use at least 8 characters with upper/lowercase and a number.',
        code: 'InvalidPasswordException',
      })
    }
    if (err?.name === 'NotAuthorizedException' && String(err?.message ?? '').toLowerCase().includes('secret hash')) {
      return respond(500, {
        error: 'Cognito app client requires a client secret. Set COGNITO_CLIENT_SECRET on the backend.',
        code: 'MissingClientSecret',
      })
    }
    throw err
  }
}

async function handleAuthLogin(body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = parseJsonBody(body)
  const identifier = typeof parsed.identifier === 'string' ? parsed.identifier.trim() : ''
  const password = parsed.password

  if (!identifier || typeof password !== 'string' || !password) {
    return respond(400, { error: 'Invalid login payload' })
  }
  if (!COGNITO_CLIENT_ID) {
    return respond(500, { error: 'Login is not configured' })
  }

  let email = identifier
  if (!identifier.includes('@')) {
    const claim = await getUsernameClaim(identifier.toLowerCase())
    const ownerUserId = claim?.ownerUserId
    if (typeof ownerUserId !== 'string') {
      return respond(401, { error: 'Invalid username/email or password' })
    }
    const profile = await getProfileByUserId(ownerUserId)
    if (!profile?.email) {
      return respond(401, { error: 'Invalid username/email or password' })
    }
    email = profile.email
  }

  try {
    const auth = await cognito.send(new InitiateAuthCommand({
      AuthFlow: 'USER_PASSWORD_AUTH',
      ClientId: COGNITO_CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
      },
    }))

    if (!auth.AuthenticationResult?.IdToken) {
      return respond(401, { error: 'Invalid username/email or password' })
    }

    const payload = decodeJwtPayload(auth.AuthenticationResult.IdToken)
    const userId = typeof payload?.sub === 'string' ? payload.sub : ''
    const tokenEmail = typeof payload?.email === 'string' ? payload.email : email
    if (userId) {
      const existing = await getProfileByUserId(userId)
      if (!existing) {
        const nowIso = new Date().toISOString()
        await ddb.send(new PutCommand({
          TableName: PROFILES_TABLE,
          Item: defaultProfile({ userId, email: tokenEmail }, nowIso),
          ConditionExpression: 'attribute_not_exists(userId)',
        }))
      }
    }

    return respond(200, {
      idToken: auth.AuthenticationResult.IdToken,
      accessToken: auth.AuthenticationResult.AccessToken,
      refreshToken: auth.AuthenticationResult.RefreshToken,
      expiresIn: auth.AuthenticationResult.ExpiresIn,
      tokenType: auth.AuthenticationResult.TokenType,
    })
  } catch (err: any) {
    if (err?.name === 'UserNotConfirmedException') {
      return respond(409, {
        error: 'Your account still needs email verification.',
        code: 'UserNotConfirmedException',
        verificationEmail: email,
      })
    }
    return respond(401, { error: 'Invalid username/email or password' })
  }
}

async function handleConfirmSignUp(body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = parseJsonBody(body)
  const email = normalizeEmail(parsed.email)
  const code = typeof parsed.code === 'string' ? parsed.code.trim() : ''

  if (!email || !code) {
    return respond(400, { error: 'Email and verification code are required' })
  }
  if (!COGNITO_CLIENT_ID) {
    return respond(500, { error: 'Verification is not configured', code: 'AuthNotConfigured' })
  }

  try {
    await cognito.send(new ConfirmSignUpCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
      ConfirmationCode: code,
    }))
    return respond(200, { ok: true })
  } catch (err: any) {
    if (err?.name === 'CodeMismatchException') {
      return respond(400, { error: 'Incorrect code. Please try again.', code: err.name })
    }
    if (err?.name === 'ExpiredCodeException') {
      return respond(400, { error: 'Verification code expired. Request a new code.', code: err.name })
    }
    if (err?.name === 'NotAuthorizedException' && String(err?.message ?? '').toLowerCase().includes('already confirmed')) {
      return respond(200, { ok: true, alreadyConfirmed: true })
    }
    return respond(400, {
      error: err?.message ?? 'Verification failed',
      code: err?.name ?? 'ConfirmSignUpFailed',
    })
  }
}

async function handleResendConfirmation(body: string | null): Promise<APIGatewayProxyResultV2> {
  const parsed = parseJsonBody(body)
  const email = normalizeEmail(parsed.email)
  if (!email) {
    return respond(400, { error: 'Email is required' })
  }
  if (!COGNITO_CLIENT_ID) {
    return respond(500, { error: 'Verification resend is not configured', code: 'AuthNotConfigured' })
  }
  try {
    await cognito.send(new ResendConfirmationCodeCommand({
      ClientId: COGNITO_CLIENT_ID,
      Username: email,
    }))
    return respond(200, { ok: true })
  } catch (err: any) {
    return respond(400, {
      error: err?.message ?? 'Failed to resend code',
      code: err?.name ?? 'ResendFailed',
    })
  }
}

async function handleAvatarPresign(identity: Identity, body: string | null): Promise<APIGatewayProxyResultV2> {
  if (!AVATARS_BUCKET) {
    return respond(500, { error: 'Avatar storage not configured (AVATARS_BUCKET_NAME missing)' })
  }

  const parsed = parseJsonBody(body)
  const ext = ((parsed.fileExtension as string | undefined) ?? 'jpg').replace(/^\./, '')
  const key = `avatars/${identity.userId}/${Date.now()}.${ext}`

  const uploadUrl = await getSignedUrl(
    s3,
    new PutObjectCommand({ Bucket: AVATARS_BUCKET, Key: key }),
    { expiresIn: 300 },
  )

  return respond(200, { uploadUrl, key, avatarKey: key })
}

async function handleAvatarUrl(identity: Identity, key: string | undefined): Promise<APIGatewayProxyResultV2> {
  if (!AVATARS_BUCKET) {
    return respond(500, { error: 'Avatar storage not configured (AVATARS_BUCKET_NAME missing)' })
  }
  if (!key) {
    return respond(400, { error: 'Missing avatar key' })
  }
  if (!key.startsWith(`avatars/${identity.userId}/`)) {
    return respond(401, { error: 'Unauthorized avatar key' })
  }

  const url = await getSignedUrl(
    s3,
    new GetObjectCommand({ Bucket: AVATARS_BUCKET, Key: key }),
    { expiresIn: 3600 },
  )
  return respond(200, { url })
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method.toUpperCase()
  const path = event.requestContext.http.path

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  try {
    if (method === 'GET' && (path === '/api/username/available' || path === '/api/auth/username-available')) {
      return await handleUsernameAvailable(event.queryStringParameters?.username)
    }
    if (method === 'POST' && path === '/api/auth/signup') {
      return await handleAuthSignup(event.body ?? null)
    }
    if (method === 'POST' && path === '/api/auth/login') {
      return await handleAuthLogin(event.body ?? null)
    }
    if (method === 'POST' && path === '/api/auth/confirm-signup') {
      return await handleConfirmSignUp(event.body ?? null)
    }
    if (method === 'POST' && path === '/api/auth/resend-signup-code') {
      return await handleResendConfirmation(event.body ?? null)
    }

    const identity = extractIdentity(event)
    if (!identity) return respond(401, { error: 'Unauthorized' })

    if (method === 'GET' && path === '/api/profile') {
      return await handleGetProfile(identity)
    }
    if (method === 'PUT' && path === '/api/profile') {
      return await handlePutProfile(identity, event.body ?? null)
    }
    if (method === 'POST' && path === '/api/profile/username') {
      return await handlePostUsername(identity, event.body ?? null)
    }
    if (method === 'POST' && path === '/api/avatar/presign') {
      return await handleAvatarPresign(identity, event.body ?? null)
    }
    if (method === 'GET' && path === '/api/avatar/url') {
      return await handleAvatarUrl(identity, event.queryStringParameters?.key)
    }

    return respond(200, { error: `No handler for ${method} ${path}` })
  } catch (err: any) {
    if (err?.name === 'ConditionalCheckFailedException') {
      return respond(409, { error: 'Username is already taken', reason: 'taken' })
    }
    if (err?.name === 'UsernameExistsException') {
      return respond(409, { error: 'Account already exists' })
    }
    console.error('[profile-lambda] Unhandled error:', err)
    return respond(500, { error: 'Internal server error' })
  }
}
