import { useState, useEffect } from 'react'
import { apiFetch } from '../lib/apiUrl'

const CACHE_KEY = 'pebble.feature_flags'
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

type FeatureFlags = {
    agenticCoachEnabled: boolean
    guardrailsEnabled: boolean
    tier3FullSolutionAllowed: boolean
    livePresenceEnabled: boolean
    insightsAthenaEnabled: boolean
    pdfExportEnabled: boolean
    opsAdminPageEnabled: boolean
}

const DEFAULT_FLAGS: FeatureFlags = {
    agenticCoachEnabled: false,
    guardrailsEnabled: false,
    tier3FullSolutionAllowed: false,
    livePresenceEnabled: false,
    insightsAthenaEnabled: false,
    pdfExportEnabled: false,
    opsAdminPageEnabled: false,
}

let memoryCache: { data: FeatureFlags; ts: number } | null = null

export function useFeatureFlag(flagName: keyof FeatureFlags): boolean {
    const [flags, setFlags] = useState<FeatureFlags>(() => {
        // 1. Check memory cache
        if (memoryCache && Date.now() - memoryCache.ts < CACHE_TTL_MS) {
            return memoryCache.data
        }
        // 2. Check local storage fallback
        try {
            const stored = localStorage.getItem(CACHE_KEY)
            if (stored) {
                const parsed = JSON.parse(stored)
                if (parsed.data && Date.now() - parsed.ts < CACHE_TTL_MS) {
                    return parsed.data
                }
            }
        } catch {
            // ignore
        }
        // 3. Use default safe values while loading
        return DEFAULT_FLAGS
    })

    useEffect(() => {
        const fetchFlags = async () => {
            // Don't fetch if memory cache is still super fresh (e.g., from another hook instance)
            if (memoryCache && Date.now() - memoryCache.ts < 10000) return

            try {
                const res = await apiFetch('/api/flags')
                if (!res.ok) throw new Error('Failed to fetch flags')

                const data = await res.json()
                const merged: FeatureFlags = { ...DEFAULT_FLAGS, ...data }

                const cacheEntry = { data: merged, ts: Date.now() }
                memoryCache = cacheEntry
                try {
                    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheEntry))
                } catch {
                    // ignore
                }

                setFlags(merged)
            } catch (error) {
                console.warn('[FeatureFlags] Using fallback defaults:', error)
            }
        }

        void fetchFlags()
    }, [])

    return flags[flagName] ?? false
}
