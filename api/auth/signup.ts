import {
  AdminDeleteUserCommand,
  CognitoIdentityProviderClient,
  SignUpCommand,
} from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb'
import {
  ADMIN_EMAILS,
  COGNITO_USER_POOL_ID,
  COGNITO_CLIENT_ID,
  PROFILES_TABLE,
  createSecretHash,
  resolveCognitoRegion,
  usernameClaimKey,
} from '../_shared/auth.js'
import { lookupUsernameAvailability } from '../_shared/usernameAvailability.js'
import {
  getPasswordValidationError,
  isValidEmailCandidate,
  normalizeEmailCandidate,
  normalizeUsernameCandidate,
} from '../../shared/authValidation.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

type ApiRequest = {
  method?: string
  body?: {
    email?: unknown
    password?: unknown
    username?: unknown
  }
}

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => void }
  setHeader?: (name: string, value: string) => void
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader?.('Allow', 'POST')
    res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use POST.',
    })
    return
  }

  const { email, password, username } = req.body ?? {}
  const normalizedEmail = normalizeEmailCandidate(email)
  const normalizedUsername = normalizeUsernameCandidate(username)
  const usernameError = getUsernameValidationError(normalizedUsername)
  const passwordError = typeof password === 'string' ? getPasswordValidationError(password) : 'Password is required'

  if (
    !normalizedEmail ||
    !isValidEmailCandidate(normalizedEmail) ||
    typeof password !== 'string' ||
    passwordError ||
    usernameError
  ) {
    res.status(400).json({ error: 'Invalid signup payload' })
    return
  }

  const awsRegion = resolveCognitoRegion()
  if (!awsRegion || !COGNITO_CLIENT_ID) {
    res.status(500).json({
      error: 'Signup is not configured. Set COGNITO_CLIENT_ID and AWS_REGION (or COGNITO_USER_POOL_ID).',
      code: 'AuthNotConfigured',
    })
    return
  }

  const usernameLower = normalizedUsername.toLowerCase()
  const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
  let createdCognitoUser = false

  try {
    const availability = await lookupUsernameAvailability(normalizedUsername)
    if (!availability.available) {
      res.status(409).json({ error: 'Username is already taken', reason: 'taken' })
      return
    }

    const cognito = new CognitoIdentityProviderClient({ region: awsRegion })
    const secretHash = createSecretHash(normalizedEmail)
    const signUpResp = await cognito.send(
      new SignUpCommand({
        ClientId: COGNITO_CLIENT_ID,
        Username: normalizedEmail,
        Password: password,
        ...(secretHash ? { SecretHash: secretHash } : {}),
        UserAttributes: [
          { Name: 'email', Value: normalizedEmail },
          { Name: 'preferred_username', Value: normalizedUsername },
          { Name: 'name', Value: normalizedUsername },
        ],
      }),
    )
    createdCognitoUser = true

    const userId = signUpResp.UserSub
    if (!userId) {
      res.status(500).json({ error: 'Signup failed', code: 'SignupFailed' })
      return
    }

    const nowIso = new Date().toISOString()

    await ddb.send(
      new PutCommand({
        TableName: PROFILES_TABLE,
        Item: {
          userId: usernameClaimKey(usernameLower),
          entityType: 'username_claim',
          ownerUserId: userId,
          ownerEmail: normalizedEmail,
          username: normalizedUsername,
          usernameLower,
          updatedAt: nowIso,
        },
        ConditionExpression: 'attribute_not_exists(userId)',
      }),
    )

    await ddb.send(
      new PutCommand({
        TableName: PROFILES_TABLE,
        Item: {
          userId,
          username: normalizedUsername,
          usernameLower,
          displayName: normalizedUsername,
          usernameSetAt: nowIso,
          lastUsernameChangeAt: nowIso,
          email: normalizedEmail,
          bio: '',
          avatarKey: null,
          avatarUpdatedAt: null,
          role: ADMIN_EMAILS.includes(normalizedEmail) ? 'admin' : 'user',
          createdAt: nowIso,
          updatedAt: nowIso,
        },
        ConditionExpression: 'attribute_not_exists(userId)',
      }),
    )

    res.status(200).json({
      ok: true,
      userSub: userId,
      requiresConfirmation: !Boolean(signUpResp.UserConfirmed),
      delivery: signUpResp.CodeDeliveryDetails
        ? {
            destination: signUpResp.CodeDeliveryDetails.Destination ?? null,
            medium: signUpResp.CodeDeliveryDetails.DeliveryMedium ?? null,
          }
        : null,
    })
  } catch (error) {
    const err = error as { name?: string; message?: string }
    const errorName = err?.name ?? ''

    if (createdCognitoUser && COGNITO_USER_POOL_ID && normalizedEmail) {
      try {
        const cognito = new CognitoIdentityProviderClient({ region: awsRegion })
        await cognito.send(new AdminDeleteUserCommand({
          UserPoolId: COGNITO_USER_POOL_ID,
          Username: normalizedEmail,
        }))
      } catch {
        // Best effort cleanup only. If cleanup fails, the caller still receives a
        // deterministic error instead of thinking signup completed cleanly.
      }
    }

    if (errorName === 'ConditionalCheckFailedException') {
      res.status(409).json({ error: 'Username is already taken', reason: 'taken' })
      return
    }

    if (errorName === 'UsernameExistsException') {
      res.status(409).json({
        error: 'An account with this email already exists. Try signing in.',
        code: 'UsernameExistsException',
      })
      return
    }

    if (errorName === 'InvalidPasswordException') {
      res.status(400).json({
        error: 'Password does not meet Cognito policy. Use at least 8 characters with upper/lowercase and a number.',
        code: 'InvalidPasswordException',
      })
      return
    }

    if (errorName === 'InvalidParameterException') {
      res.status(400).json({
        error: err?.message ?? 'Invalid signup parameters',
        code: 'InvalidParameterException',
      })
      return
    }

    if (errorName === 'NotAuthorizedException' && String(err?.message ?? '').toLowerCase().includes('secret hash')) {
      res.status(500).json({
        error: 'Cognito app client requires a client secret. Set COGNITO_CLIENT_SECRET on the backend.',
        code: 'MissingClientSecret',
      })
      return
    }

    res.status(500).json({
      error: err?.message ?? 'Signup failed',
      code: errorName || 'SignupFailed',
    })
  }
}
