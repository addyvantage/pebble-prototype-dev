import type { EventName, PebbleEvent } from '../shared/events'
import { apiFetch } from './apiUrl'
import { safeGetItem, safeGetJSON, safeSetItem, safeSetJSON } from './safeStorage'

const STORAGE_KEY = 'pebble.telemetry.queue'
const FLUSH_INTERVAL_MS = 10_000
const MAX_QUEUE_SIZE = 100

class TelemetryEmitter {
    private queue: PebbleEvent[] = []
    private sessionId: string
    private flushTimer: number | null = null
    private disabled = false

    constructor() {
        this.sessionId = this.getOrSetSessionId()
        this.loadFromStorage()
        this.setupListeners()
        this.startTimer()
    }

    private getOrSetSessionId(): string {
        const key = 'pebble.sessionId'
        let sid = safeGetItem(key)
        if (!sid) {
            sid = crypto.randomUUID()
            safeSetItem(key, sid, { maxBytes: 256, silent: true })
        }
        return sid
    }

    private loadFromStorage() {
        const saved = safeGetJSON<PebbleEvent[]>(STORAGE_KEY, [])
        if (Array.isArray(saved)) {
            this.queue = saved
        }
    }

    private saveToStorage() {
        safeSetJSON(STORAGE_KEY, this.queue)
    }

    private setupListeners() {
        if (typeof window !== 'undefined') {
            window.addEventListener('visibilitychange', () => {
                if (document.visibilityState === 'hidden') {
                    this.flush(true)
                } else {
                    this.startTimer()
                }
            })
        }
    }

    private startTimer() {
        if (this.flushTimer !== null) {
            window.clearInterval(this.flushTimer)
        }
        this.flushTimer = window.setInterval(() => this.flush(false), FLUSH_INTERVAL_MS)
    }

    track(
        eventName: EventName,
        properties: Omit<Partial<PebbleEvent>, keyof import('../shared/events').BaseEvent>,
        context?: { page?: PebbleEvent['page']; problemId?: string | null; language?: string | null }
    ) {
        const isLocal = import.meta.env.DEV

        const event: PebbleEvent = {
            eventName,
            eventVersion: '1.0',
            timestamp: new Date().toISOString(),
            sessionId: this.sessionId,
            userId: null, // Phase 1 will add Cognito
            page: context?.page ?? 'unknown',
            problemId: context?.problemId ?? null,
            language: context?.language ?? null,
            buildEnv: isLocal ? 'local' : 'prod',
            ...properties,
        } as PebbleEvent

        this.queue.push(event)

        if (this.queue.length > MAX_QUEUE_SIZE) {
            this.queue.shift() // Drop oldest if queue gets too large
        }

        this.saveToStorage()

        if (this.queue.length >= 10) {
            this.flush(false)
        }
    }

    async flush(sync = false) {
        if (this.disabled || this.queue.length === 0) return

        const batch = [...this.queue]
        this.queue = [] // Optimistic clear
        this.saveToStorage()

        try {
            const response = await apiFetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ events: batch }),
                // keepalive helps ensure the request fires even if the page is unloading
                keepalive: sync,
            })

            if (response.status === 404 || response.status === 405) {
                // Endpoint doesn't exist or does not support POST — stop retrying for this session.
                console.warn(`[Telemetry] /api/telemetry returned ${response.status}, disabling telemetry for this session.`)
                this.disabled = true
                return
            }

            if (!response.ok) {
                throw new Error(`Telemetry endpoint returned ${response.status}`)
            }
        } catch (error) {
            if (this.disabled) return
            console.warn('[Telemetry] Failed to flush events, requeuing...', error)
            // Re-queue events that failed to send, putting them at the front
            this.queue = [...batch, ...this.queue].slice(-MAX_QUEUE_SIZE)
            this.saveToStorage()
        }
    }
}

export const telemetry = new TelemetryEmitter()
