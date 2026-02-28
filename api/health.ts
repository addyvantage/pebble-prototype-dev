export const config = {
  runtime: 'nodejs',
  maxDuration: 10,
}

type HealthResponse = {
  ok: true
  ts: string
  method: string
  region: string
  runtime: 'nodejs'
  vercelEnv: string
}

export default function handler(
  req: { method?: string },
  res: {
    status: (code: number) => { json: (payload: unknown) => void }
    end?: () => void
    setHeader?: (name: string, value: string) => void
  },
) {
  if (req.method && req.method !== 'GET' && req.method !== 'HEAD') {
    res.setHeader?.('Allow', 'GET, HEAD')
    res.status(405).json({
      ok: false,
      error: 'Method not allowed. Use GET.',
    })
    return
  }

  const payload: HealthResponse = {
    ok: true,
    ts: new Date().toISOString(),
    method: req.method ?? 'GET',
    region: process.env.VERCEL_REGION ?? process.env.AWS_REGION ?? 'unknown',
    runtime: 'nodejs',
    vercelEnv: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'unknown',
  }

  if (req.method === 'HEAD') {
    res.status(200)
    res.end?.()
    return
  }

  res.status(200).json(payload)
}
