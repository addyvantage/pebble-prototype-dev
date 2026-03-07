import { useEffect, useState } from 'react'
import { apiEventSource } from './apiUrl'

export interface MentalStateUpdate {
    userId: string
    timestamp: string
    recoveryEffectiveness?: number
    timeToRecover?: number
    autonomyDelta?: number
    guidanceRelianceDelta?: number
    breakpointIncrement?: number
    streakDelta?: number
}

interface UseLiveMentalStateReturn {
    connected: boolean
    latestUpdate: MentalStateUpdate | null
}

export function useLiveMentalState(userId: string): UseLiveMentalStateReturn {
    const [connected, setConnected] = useState(false)
    const [latestUpdate, setLatestUpdate] = useState<MentalStateUpdate | null>(null)

    useEffect(() => {
        const appsyncUrl = import.meta.env.VITE_APPSYNC_URL
        const apiKey = import.meta.env.VITE_APPSYNC_API_KEY

        // Fallback to local SSE Mock if no AWS AppSync config
        if (!appsyncUrl || !apiKey) {
            console.debug('[Live] Using offline SSE fallback for live updates')
            const source = apiEventSource('/api/live-events')

            source.onopen = () => setConnected(true)
            source.onmessage = (e) => {
                try {
                    const data = JSON.parse(e.data) as MentalStateUpdate
                    if (data.userId === userId) {
                        setLatestUpdate(data)
                    }
                } catch { /* ignore parse errors */ }
            }
            source.onerror = () => setConnected(false)

            return () => {
                source.close()
                setConnected(false)
            }
        }

        // Connect via AppSync Real-Time WebSocket Protocol
        console.debug('[Live] Connecting to AWS AppSync Real-time endpoint')

        const url = new URL(appsyncUrl)
        const apiHostname = url.hostname
        url.hostname = url.hostname.replace('appsync-api', 'appsync-realtime-api')
        url.protocol = 'wss:'

        const header = {
            host: apiHostname,
            'x-api-key': apiKey,
        }
        const b64Header = btoa(JSON.stringify(header))
        const wsUrl = `${url.href}?header=${b64Header}&payload=e30=` // e30= is base64 "{}"

        const ws = new WebSocket(wsUrl, ['graphql-ws'])
        let isSubscribed = false

        const subscriptionMessage = {
            id: 'sub-1',
            type: 'start',
            payload: {
                data: JSON.stringify({
                    query: `
            subscription OnUpdate($userId: ID!) {
              onMentalStateUpdate(userId: $userId) {
                userId
                timestamp
                recoveryEffectiveness
                timeToRecover
                autonomyDelta
                guidanceRelianceDelta
                breakpointIncrement
                streakDelta
              }
            }
          `,
                    variables: { userId }
                }),
                extensions: {
                    authorization: header
                }
            }
        }

        ws.onopen = () => {
            // Step 1: Init connection
            ws.send(JSON.stringify({ type: 'connection_init' }))
        }

        ws.onmessage = (event) => {
            try {
                const msg = JSON.parse(event.data)

                switch (msg.type) {
                    case 'connection_ack':
                        setConnected(true)
                        // Step 2: Subscribe once connection acknowledged
                        if (!isSubscribed) {
                            ws.send(JSON.stringify(subscriptionMessage))
                            isSubscribed = true
                        }
                        break

                    case 'data':
                        if (msg.payload?.data?.onMentalStateUpdate) {
                            setLatestUpdate(msg.payload.data.onMentalStateUpdate)
                        }
                        break

                    case 'error':
                        console.error('[Live] AppSync subscription error:', msg.payload)
                        break

                    case 'ka':
                        // Keep-alive, safely ignore
                        break
                }
            } catch { /* ignore parse errors */ }
        }

        ws.onclose = () => {
            setConnected(false)
            isSubscribed = false
        }

        return () => {
            if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
                if (isSubscribed) {
                    ws.send(JSON.stringify({ id: 'sub-1', type: 'stop' }))
                }
                ws.close()
            }
        }
    }, [userId])

    return { connected, latestUpdate }
}
