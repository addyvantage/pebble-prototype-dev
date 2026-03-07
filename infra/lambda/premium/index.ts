import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb'
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'
import { buildRecapNarrative, isScriptSafe, type RecapSummary, type RecapTone } from '../../../server/phase9/recapBuilder'
import { buildRecapSsml } from '../../../server/phase9/recapSsml'
import { generateRecapAudio, type RecapAudioDecision } from '../../../server/phase9/pollyClient'
import { normalizeAppLanguageCode, type AppLanguageCode, type RecapVoiceMode } from '../../../shared/recapVoice'

const REGION = process.env.AWS_REGION ?? 'ap-south-1'
const RECAPS_TABLE = process.env.WEEKLY_RECAPS_TABLE_NAME ?? ''
const RECAP_AUDIO_BUCKET = process.env.RECAP_AUDIO_BUCKET_NAME ?? ''

const ddb = DynamoDBDocumentClient.from(new DynamoDBClient({ region: REGION }), {
  marshallOptions: {
    removeUndefinedValues: true,
  },
})
const s3 = new S3Client({ region: REGION })

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
}

type RecapVoiceInput = {
  mode: RecapVoiceMode
  preferredPollyVoiceId?: string | null
  preferredBrowserVoiceURI?: string | null
}

const DEFAULT_RECAP_PLAYBACK: RecapAudioDecision = {
  mode: 'auto',
  provider: 'device',
  appLanguage: 'en',
  locale: 'en-US',
  reason: 'no_audio_generated',
}

function respond(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) }
}

function parseJsonBody(body: string | null): Record<string, unknown> {
  if (!body) return {}
  try {
    return JSON.parse(body) as Record<string, unknown>
  } catch {
    return {}
  }
}

function currentWeekStart(): string {
  const now = new Date()
  const dayOfWeek = now.getUTCDay()
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - ((dayOfWeek + 6) % 7))
  monday.setUTCHours(0, 0, 0, 0)
  return monday.toISOString().slice(0, 10)
}

function validateRecapSummary(body: unknown): RecapSummary | null {
  if (!body || typeof body !== 'object') return null
  const b = body as Record<string, unknown>
  const num = (k: string, fallback?: number) => {
    const value = b[k]
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value
    }
    return fallback
  }
  const text = (k: string, maxLength: number) => {
    const value = b[k]
    if (typeof value !== 'string') return undefined
    const cleaned = value.trim().slice(0, maxLength)
    return cleaned.length > 0 ? cleaned : undefined
  }
  const trend = b.trendDirection
  if (trend !== 'improving' && trend !== 'stable' && trend !== 'worsening') return null
  const solvesLast7 = num('solvesLast7')
  const daysActiveLast7 = num('daysActiveLast7')
  const streakDays = num('streakDays')
  if (
    typeof solvesLast7 !== 'number'
    || typeof daysActiveLast7 !== 'number'
    || typeof streakDays !== 'number'
  ) {
    return null
  }
  const struggle = text('biggestStruggle', 80) ?? null
  const hardestSolvedDifficultyRaw = text('hardestSolvedDifficulty', 16)
  const hardestSolvedDifficulty = (
    hardestSolvedDifficultyRaw === 'easy'
    || hardestSolvedDifficultyRaw === 'medium'
    || hardestSolvedDifficultyRaw === 'hard'
  )
    ? hardestSolvedDifficultyRaw
    : null

  return {
    appLanguage: normalizeAppLanguageCode(text('appLanguage', 8)),
    trackLanguage: text('trackLanguage', 24),
    userName: text('userName', 64) ?? null,
    solvesLast7,
    solvesDelta: num('solvesDelta'),
    daysActiveLast7,
    streakDays,
    streakDelta: num('streakDelta'),
    biggestStruggle: struggle,
    trendDirection: trend,
    attemptsLast7: num('attemptsLast7'),
    passRateLast7: num('passRateLast7'),
    passRateDelta: num('passRateDelta'),
    guidanceReliancePct: num('guidanceReliancePct'),
    guidanceRelianceDeltaPct: num('guidanceRelianceDeltaPct'),
    avgRecoveryTimeSec: num('avgRecoveryTimeSec'),
    avgRecoveryTimeDeltaSec: num('avgRecoveryTimeDeltaSec'),
    hardestSolvedDifficulty,
  }
}

function validateRecapVoiceInput(body: unknown): RecapVoiceInput {
  if (!body || typeof body !== 'object') {
    return { mode: 'auto' }
  }
  const value = body as Record<string, unknown>
  const rawMode = value.mode
  const mode: RecapVoiceMode =
    rawMode === 'auto' || rawMode === 'polly' || rawMode === 'device'
      ? rawMode
      : 'auto'

  const preferredPollyVoiceId = typeof value.preferredPollyVoiceId === 'string'
    ? value.preferredPollyVoiceId.trim().slice(0, 64) || null
    : null
  const preferredBrowserVoiceURI = typeof value.preferredBrowserVoiceURI === 'string'
    ? value.preferredBrowserVoiceURI.trim().slice(0, 200) || null
    : null

  return {
    mode,
    preferredPollyVoiceId,
    preferredBrowserVoiceURI,
  }
}

function resolveRecapPlayback(item: Record<string, unknown>): RecapAudioDecision {
  const playbackRaw = item.playback
  if (!playbackRaw || typeof playbackRaw !== 'object') {
    return DEFAULT_RECAP_PLAYBACK
  }
  const playback = playbackRaw as Record<string, unknown>
  const modeRaw = playback.mode
  const providerRaw = playback.provider
  const appLanguageRaw = playback.appLanguage
  const localeRaw = playback.locale
  const mode: RecapVoiceMode = modeRaw === 'auto' || modeRaw === 'polly' || modeRaw === 'device'
    ? modeRaw
    : 'auto'
  const provider: 'polly' | 'device' = providerRaw === 'polly' ? 'polly' : 'device'
  const appLanguage: AppLanguageCode = normalizeAppLanguageCode(appLanguageRaw)
  const locale = typeof localeRaw === 'string' && localeRaw.trim()
    ? localeRaw
    : 'en-US'
  return {
    mode,
    provider,
    appLanguage,
    locale,
    pollyVoiceId: typeof playback.pollyVoiceId === 'string' ? playback.pollyVoiceId : undefined,
    pollyLanguageCode: typeof playback.pollyLanguageCode === 'string' ? playback.pollyLanguageCode : undefined,
    preferredBrowserVoiceURI:
      typeof playback.preferredBrowserVoiceURI === 'string' ? playback.preferredBrowserVoiceURI : undefined,
    reason: typeof playback.reason === 'string' ? playback.reason : undefined,
  }
}

async function handleTelemetry(body: string | null) {
  const parsed = parseJsonBody(body)
  const events = Array.isArray(parsed.events) ? parsed.events : []
  return respond(200, {
    ok: true,
    accepted: events.length,
    offline: true,
  })
}

async function handleGenerateRecap(event: APIGatewayProxyEventV2) {
  const userId = event.headers['x-user-id'] ?? event.headers['X-User-Id'] ?? 'anonymous'
  const body = parseJsonBody(event.body ?? null)
  const summary = validateRecapSummary(body.summary)
  if (!summary) {
    return respond(400, { ok: false, error: 'Invalid or missing summary payload' })
  }
  const voice = validateRecapVoiceInput(body.voice)

  const narrative = buildRecapNarrative(summary)
  const script = narrative.script
  if (!isScriptSafe(script)) {
    return respond(400, { ok: false, error: 'Recap script failed safety check' })
  }

  const ssml = buildRecapSsml({
    script,
    tone: narrative.tone,
  })

  const weekStart = currentWeekStart()
  const generatedAt = new Date().toISOString()
  let audioUrl: string | undefined
  let s3Key: string | undefined

  const audioOutput = await generateRecapAudio({
    script,
    ssml,
    appLanguage: normalizeAppLanguageCode(summary.appLanguage),
    mode: voice.mode,
    preferredPollyVoiceId: voice.preferredPollyVoiceId,
    preferredBrowserVoiceURI: voice.preferredBrowserVoiceURI,
  })

  let playback = audioOutput.decision
  if (audioOutput.audioBuffer && RECAP_AUDIO_BUCKET) {
    s3Key = `recaps/${String(userId).replace(/[^a-zA-Z0-9_-]/g, '_')}/${weekStart}.mp3`
    await s3.send(new PutObjectCommand({
      Bucket: RECAP_AUDIO_BUCKET,
      Key: s3Key,
      Body: audioOutput.audioBuffer,
      ContentType: 'audio/mpeg',
    }))
    audioUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: RECAP_AUDIO_BUCKET, Key: s3Key }),
      { expiresIn: 3600 },
    )
  } else if (audioOutput.audioBuffer && !RECAP_AUDIO_BUCKET) {
    playback = {
      ...playback,
      provider: 'device',
      reason: 'polly_audio_storage_unavailable',
    }
  }

  const recapData = {
    script,
    audioUrl,
    generatedAt,
    weekStart,
    tone: narrative.tone,
    usedHumor: narrative.usedHumor,
    playback,
  }

  if (RECAPS_TABLE) {
    await ddb.send(new PutCommand({
      TableName: RECAPS_TABLE,
      Item: {
        userId,
        weekStart,
        script,
        s3Key,
        generatedAt,
        playback,
        tone: narrative.tone,
        usedHumor: narrative.usedHumor,
        ttl: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30,
      },
    }))
  }

  return respond(200, { ok: true, data: recapData })
}

async function handleLatestRecap(event: APIGatewayProxyEventV2) {
  const userId = event.headers['x-user-id'] ?? event.headers['X-User-Id'] ?? 'anonymous'
  if (!RECAPS_TABLE) {
    return respond(200, { ok: true, data: null })
  }

  const result = await ddb.send(new QueryCommand({
    TableName: RECAPS_TABLE,
    KeyConditionExpression: 'userId = :uid',
    ExpressionAttributeValues: { ':uid': userId },
    ScanIndexForward: false,
    Limit: 1,
  }))

  const item = result.Items?.[0]
  if (!item || typeof item !== 'object') {
    return respond(200, { ok: true, data: null })
  }

  const record = item as Record<string, unknown>
  let audioUrl: string | undefined
  const s3Key = typeof record.s3Key === 'string' ? record.s3Key : undefined
  if (s3Key && RECAP_AUDIO_BUCKET) {
    audioUrl = await getSignedUrl(
      s3,
      new GetObjectCommand({ Bucket: RECAP_AUDIO_BUCKET, Key: s3Key }),
      { expiresIn: 3600 },
    )
  }

  let playback = resolveRecapPlayback(record)
  if (playback.provider === 'polly' && !audioUrl) {
    playback = {
      ...playback,
      provider: 'device',
      reason: 'polly_audio_unavailable',
    }
  }

  const tone = (record.tone === 'celebratory'
    || record.tone === 'encouraging'
    || record.tone === 'reflective'
    || record.tone === 'empathetic'
    || record.tone === 'determined')
    ? record.tone
    : 'encouraging'

  return respond(200, {
    ok: true,
    data: {
      script: typeof record.script === 'string' ? record.script : '',
      audioUrl,
      generatedAt: typeof record.generatedAt === 'string' ? record.generatedAt : new Date().toISOString(),
      weekStart: typeof record.weekStart === 'string' ? record.weekStart : currentWeekStart(),
      tone: tone as RecapTone,
      usedHumor: typeof record.usedHumor === 'boolean' ? record.usedHumor : false,
      playback,
    },
  })
}

export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method.toUpperCase()
  const path = event.requestContext.http.path

  if (method === 'OPTIONS') {
    return { statusCode: 200, headers: CORS_HEADERS, body: '' }
  }

  try {
    if (method === 'POST' && path === '/api/telemetry') {
      return await handleTelemetry(event.body ?? null)
    }
    if (method === 'POST' && path === '/api/growth/weekly-recap') {
      return await handleGenerateRecap(event)
    }
    if (method === 'GET' && path === '/api/growth/weekly-recap/latest') {
      return await handleLatestRecap(event)
    }
    return respond(404, { ok: false, error: `No handler for ${method} ${path}` })
  } catch (error) {
    console.error('[premium-lambda] Unhandled error:', error)
    return respond(500, { ok: false, error: 'Internal server error' })
  }
}
