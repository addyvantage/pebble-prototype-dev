type SafeSetOptions = {
  maxBytes?: number
  silent?: boolean
}

const STORAGE_PRESSURE_EVENT = 'pebble:storage-pressure'
const DEFAULT_MAX_BYTES = 25 * 1024
const LARGE_ITEM_BYTES = 120 * 1024
const TOTAL_PEBBLE_BYTES = 600 * 1024
let bootRecoveryDone = false
let storagePressureRaised = false

function inBrowser() {
  return typeof window !== 'undefined'
}

function estimateBytes(value: string) {
  if (typeof TextEncoder !== 'undefined') {
    return new TextEncoder().encode(value).length
  }
  return value.length * 2
}

function warn(message: string, silent?: boolean) {
  if (silent || !import.meta.env.DEV) {
    return
  }
  console.warn(`[safeStorage] ${message}`)
}

function isQuotaError(error: unknown) {
  if (!(error instanceof Error)) {
    return false
  }
  const message = `${error.name} ${error.message}`.toLowerCase()
  return message.includes('quota') || message.includes('kquotabytesperitem')
}

function notifyStoragePressure(cause: string) {
  if (!inBrowser() || storagePressureRaised) {
    return
  }
  storagePressureRaised = true
  window.dispatchEvent(new CustomEvent(STORAGE_PRESSURE_EVENT, {
    detail: {
      cause,
      ts: Date.now(),
    },
  }))
}

export function safeGetItem(key: string): string | null {
  if (!inBrowser()) {
    return null
  }

  try {
    return window.localStorage.getItem(key)
  } catch (error) {
    warn(`getItem failed for "${key}": ${error instanceof Error ? error.message : String(error)}`)
    return null
  }
}

export function safeSetItem(key: string, value: string, options?: SafeSetOptions): boolean {
  if (!inBrowser()) {
    return false
  }

  const maxBytes = options?.maxBytes ?? DEFAULT_MAX_BYTES
  const bytes = estimateBytes(value)
  if (bytes > maxBytes) {
    warn(`skipped oversize write for "${key}" (${bytes} bytes > ${maxBytes} bytes)`, options?.silent)
    return false
  }

  try {
    window.localStorage.setItem(key, value)
    return true
  } catch (error) {
    warn(`setItem failed for "${key}": ${error instanceof Error ? error.message : String(error)}`, options?.silent)
    if (isQuotaError(error)) {
      notifyStoragePressure(key)
    }
    return false
  }
}

export function safeGetJSON<T>(key: string, fallback: T): T {
  const raw = safeGetItem(key)
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch (error) {
    warn(`invalid JSON for "${key}": ${error instanceof Error ? error.message : String(error)}`)
    return fallback
  }
}

export function safeSetJSON(key: string, value: unknown, options?: SafeSetOptions): boolean {
  let raw = ''
  try {
    raw = JSON.stringify(value)
  } catch (error) {
    warn(`JSON stringify failed for "${key}": ${error instanceof Error ? error.message : String(error)}`, options?.silent)
    return false
  }

  return safeSetItem(key, raw, options)
}

export function safeRemoveItem(key: string) {
  if (!inBrowser()) {
    return
  }
  try {
    window.localStorage.removeItem(key)
  } catch (error) {
    warn(`removeItem failed for "${key}": ${error instanceof Error ? error.message : String(error)}`)
  }
}

export function safeKeys() {
  if (!inBrowser()) {
    return [] as string[]
  }
  try {
    return Object.keys(window.localStorage)
  } catch (error) {
    warn(`enumerating keys failed: ${error instanceof Error ? error.message : String(error)}`)
    return [] as string[]
  }
}

export function safeClearPrefix(prefix: string | string[]) {
  const prefixes = Array.isArray(prefix) ? prefix : [prefix]
  for (const key of safeKeys()) {
    if (prefixes.some((item) => key.startsWith(item))) {
      safeRemoveItem(key)
    }
  }
}

export function recoverPebbleStorageOnBoot() {
  if (!inBrowser() || bootRecoveryDone) {
    return
  }
  bootRecoveryDone = true

  try {
    const pebbleKeys = safeKeys().filter((key) => key.startsWith('pebble'))
    if (pebbleKeys.length === 0) {
      return
    }

    let totalBytes = 0
    const heavy: Array<{ key: string; bytes: number }> = []

    for (const key of pebbleKeys) {
      const raw = safeGetItem(key)
      if (!raw) {
        continue
      }

      const bytes = estimateBytes(raw)
      totalBytes += bytes
      if (bytes > LARGE_ITEM_BYTES) {
        heavy.push({ key, bytes })
      }
    }

    for (const item of heavy) {
      safeRemoveItem(item.key)
      totalBytes -= item.bytes
      warn(`removed oversized "${item.key}" (${item.bytes} bytes)`)
    }

    if (totalBytes > TOTAL_PEBBLE_BYTES) {
      const remaining = pebbleKeys
        .map((key) => ({ key, bytes: estimateBytes(safeGetItem(key) ?? '') }))
        .sort((left, right) => right.bytes - left.bytes)

      for (const item of remaining) {
        if (totalBytes <= TOTAL_PEBBLE_BYTES) {
          break
        }
        safeRemoveItem(item.key)
        totalBytes -= item.bytes
      }
      warn('trimmed pebble.* storage due total size pressure')
    }
  } catch (error) {
    warn(`boot recovery failed: ${error instanceof Error ? error.message : String(error)}`)
    safeClearPrefix('pebble')
  }
}

export function subscribeStoragePressure(listener: () => void) {
  if (!inBrowser()) {
    return () => {}
  }

  const handler = () => listener()
  window.addEventListener(STORAGE_PRESSURE_EVENT, handler)
  return () => {
    window.removeEventListener(STORAGE_PRESSURE_EVENT, handler)
  }
}
