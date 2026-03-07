const RAW_API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim()

function normalizeBaseUrl(value: string | undefined) {
    if (!value) return ''
    return value.replace(/\/+$/, '')
}

const API_BASE_URL = normalizeBaseUrl(RAW_API_BASE_URL)

export function apiUrl(path: string): string {
    const normalizedPath = path.startsWith('/') ? path : `/${path}`
    return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath
}

export function apiFetch(input: string, init?: RequestInit) {
    return fetch(apiUrl(input), init)
}

export function apiEventSource(path: string) {
    return new EventSource(apiUrl(path))
}

export function resolveApiAssetUrl(pathOrUrl: string | null | undefined) {
    if (!pathOrUrl) return undefined
    if (/^https?:\/\//i.test(pathOrUrl)) {
        return pathOrUrl
    }
    return apiUrl(pathOrUrl)
}

export function getApiBaseUrl() {
    return API_BASE_URL
}
