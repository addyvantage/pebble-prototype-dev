import { CognitoIdentityProviderClient, ListUsersCommand } from '@aws-sdk/client-cognito-identity-provider'
import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, GetCommand } from '@aws-sdk/lib-dynamodb'
import {
  COGNITO_USER_POOL_ID,
  PROFILES_TABLE,
  normalizeUsername,
  resolveCognitoRegion,
  usernameClaimKey,
} from './auth.js'

export type UsernameAvailabilityResult =
  | { available: true; source: 'profiles' | 'cognito' }
  | { available: false; reason: 'invalid' | 'taken'; source: 'validation' | 'profiles' | 'cognito' }

export async function lookupUsernameAvailability(usernameInput: unknown): Promise<UsernameAvailabilityResult> {
  const normalized = normalizeUsername(usernameInput)
  if (!normalized) {
    return { available: false, reason: 'invalid', source: 'validation' }
  }

  const awsRegion = resolveCognitoRegion()
  if (!awsRegion) {
    throw new Error('Username availability is not configured.')
  }

  const usernameLower = normalized.toLowerCase()
  // Username claims in the profile table are the primary source of truth, but
  // Cognito `preferred_username` is used as a fallback so live signup checks do
  // not silently break when profile-table reads are unavailable.
  let profileLookupError: unknown = null

  try {
    const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: awsRegion }))
    const claim = await ddb.send(new GetCommand({
      TableName: PROFILES_TABLE,
      Key: { userId: usernameClaimKey(usernameLower) },
    }))
    if (claim.Item) {
      return { available: false, reason: 'taken', source: 'profiles' }
    }
  } catch (error) {
    profileLookupError = error
  }

  if (COGNITO_USER_POOL_ID) {
    try {
      const cognito = new CognitoIdentityProviderClient({ region: awsRegion })
      const filterValue = normalized.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const response = await cognito.send(new ListUsersCommand({
        UserPoolId: COGNITO_USER_POOL_ID,
        Limit: 1,
        Filter: `preferred_username = "${filterValue}"`,
      }))

      if ((response.Users?.length ?? 0) > 0) {
        return { available: false, reason: 'taken', source: 'cognito' }
      }

      return { available: true, source: 'cognito' }
    } catch (error) {
      if (!profileLookupError) {
        profileLookupError = error
      }
    }
  }

  if (!profileLookupError) {
    return { available: true, source: 'profiles' }
  }

  throw profileLookupError instanceof Error
    ? profileLookupError
    : new Error('Failed to check username availability')
}
