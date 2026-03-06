import { lookupUsernameAvailability } from '../_shared/usernameAvailability.js'

export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

type ApiRequest = {
  method?: string
  query?: {
    username?: unknown
  }
}

type ApiResponse = {
  status: (code: number) => { json: (payload: unknown) => void }
  setHeader?: (name: string, value: string) => void
}

export default async function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method && req.method !== 'GET') {
    res.setHeader?.('Allow', 'GET')
    res.status(405).json({ ok: false, error: 'Method not allowed. Use GET.' })
    return
  }

  try {
    const result = await lookupUsernameAvailability(req.query?.username)
    res.status(200).json(result)
  } catch (error) {
    const err = error as { message?: string }
    res.status(500).json({
      available: false,
      reason: 'error',
      error: err?.message ?? 'Failed to check username availability',
      code: 'UsernameAvailabilityFailed',
    })
  }
}
