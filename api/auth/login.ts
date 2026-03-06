import { CognitoIdentityProviderClient, InitiateAuthCommand } from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import { COGNITO_CLIENT_ID, PROFILES_TABLE, createSecretHash, resolveCognitoRegion, usernameClaimKey } from '../_shared/auth.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

type ApiRequest = {
  method?: string
  body?: {
    identifier?: unknown
    password?: unknown
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

  const { identifier, password } = req.body ?? {}
  const normalizedIdentifier = typeof identifier === 'string' ? identifier.trim() : ''
  if (!normalizedIdentifier || typeof password !== 'string' || !password) {
    res.status(400).json({ error: 'Invalid login payload' })
    return
  }

  const awsRegion = resolveCognitoRegion()
  if (!awsRegion || !COGNITO_CLIENT_ID) {
    res.status(500).json({
      error: 'Login is not configured. Set COGNITO_CLIENT_ID and AWS_REGION (or COGNITO_USER_POOL_ID).',
      code: 'AuthNotConfigured',
    })
    return
  }

  let loginEmail = normalizedIdentifier

  try {

    if (!normalizedIdentifier.includes('@')) {
      const lower = normalizedIdentifier.toLowerCase()
      const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
      const claim = await ddb.send(new GetCommand({
        TableName: PROFILES_TABLE,
        Key: { userId: usernameClaimKey(lower) },
      }))
      const ownerUserId = claim.Item?.ownerUserId
      if (typeof ownerUserId !== 'string') {
        res.status(401).json({ error: 'Invalid username/email or password' })
        return
      }

      const profile = await ddb.send(new GetCommand({
        TableName: PROFILES_TABLE,
        Key: { userId: ownerUserId },
      }))
      const email = profile.Item?.email
      if (typeof email !== 'string' || !email) {
        res.status(401).json({ error: 'Invalid username/email or password' })
        return
      }

      loginEmail = email
    }

    const cognito = new CognitoIdentityProviderClient({ region: awsRegion })
    const secretHash = createSecretHash(loginEmail)
    const authResult = await cognito.send(
      new InitiateAuthCommand({
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: COGNITO_CLIENT_ID,
        AuthParameters: {
          USERNAME: loginEmail,
          PASSWORD: password,
          ...(secretHash ? { SECRET_HASH: secretHash } : {}),
        },
      }),
    )

    if (!authResult.AuthenticationResult?.IdToken) {
      res.status(401).json({ error: 'Invalid username/email or password' })
      return
    }

    res.status(200).json({
      idToken: authResult.AuthenticationResult.IdToken,
      accessToken: authResult.AuthenticationResult.AccessToken,
      refreshToken: authResult.AuthenticationResult.RefreshToken,
      expiresIn: authResult.AuthenticationResult.ExpiresIn,
      tokenType: authResult.AuthenticationResult.TokenType,
    })
  } catch (error) {
    const err = error as { name?: string; message?: string }
    const errorName = err?.name ?? ''

    if (errorName === 'UserNotConfirmedException') {
      res.status(401).json({
        error: 'Account not verified. Enter the code sent to your email.',
        code: 'UserNotConfirmedException',
        verificationEmail: loginEmail.toLowerCase(),
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

    res.status(401).json({
      error: 'Invalid username/email or password',
      code: errorName || 'AuthFailed',
    })
  }
}
