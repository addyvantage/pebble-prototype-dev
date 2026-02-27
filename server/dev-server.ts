import dotenv from 'dotenv'
import express, { type NextFunction, type Request, type Response } from 'express'
import pebbleHandler from '../api/pebble.ts'

dotenv.config({ path: '.env.local' })

type PebbleReq = Parameters<typeof pebbleHandler>[0]
type PebbleRes = Parameters<typeof pebbleHandler>[1]

const app = express()

app.use(express.json({ limit: '1mb' }))

app.use((req: Request, res: Response, next: NextFunction) => {
  const startedAt = Date.now()
  res.on('finish', () => {
    console.log(`[dev-api] ${req.method} ${req.originalUrl} ${res.statusCode} ${Date.now() - startedAt}ms`)
  })
  next()
})

app.all('/api/pebble', async (req: Request, res: Response) => {
  try {
    await pebbleHandler(req as unknown as PebbleReq, res as unknown as PebbleRes)
  } catch (error) {
    const stack = error instanceof Error ? error.stack ?? error.message : String(error)
    console.error('[dev-api] unhandled crash in /api/pebble', stack)
    if (!res.headersSent) {
      res.status(500).json({ error: 'Dev server crashed.' })
    }
  }
})

const port = Number(process.env.PORT ?? 3001)
app.listen(port, () => {
  console.log(`Pebble backend running at http://localhost:${port}`)
})
