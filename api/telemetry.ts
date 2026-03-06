import { InvokeCommand, LambdaClient } from '@aws-sdk/client-lambda'

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

type ApiRequest = {
  method?: string
  body?: { events?: unknown }
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

  const payload = req.body ?? {}
  const eventCount = Array.isArray(payload.events) ? payload.events.length : 0
  const awsRegion = process.env.AWS_REGION
  const ingestEventsLambda = process.env.INGEST_EVENTS_LAMBDA_NAME

  if (!awsRegion || !ingestEventsLambda) {
    res.status(200).json({
      ok: true,
      offline: true,
      accepted: eventCount,
    })
    return
  }

  const accessKeyId = process.env.AWS_ACCESS_KEY_ID
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY
  const client = accessKeyId && secretAccessKey
    ? new LambdaClient({
        region: awsRegion,
        credentials: {
          accessKeyId,
          secretAccessKey,
        },
      })
    : new LambdaClient({ region: awsRegion })

  try {
    const invokeResult = await client.send(
      new InvokeCommand({
        FunctionName: ingestEventsLambda,
        InvocationType: 'Event',
        Payload: new TextEncoder().encode(JSON.stringify(payload)),
      }),
    )

    if (invokeResult.FunctionError) {
      throw new Error(`Telemetry lambda error: ${invokeResult.FunctionError}`)
    }

    res.status(200).json({ ok: true, accepted: eventCount })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to ingest telemetry events'
    res.status(502).json({
      ok: false,
      error: message,
    })
  } finally {
    client.destroy()
  }
}
