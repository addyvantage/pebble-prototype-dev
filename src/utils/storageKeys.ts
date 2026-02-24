export const storageKeys = {
  theme: 'pebble_theme',
  demoMode: 'pebble_demo_mode',
  memory: 'pebble_memory_v1',
  userName: 'pebble_user_name',
  personaSummary: 'pebble_persona_summary',
} as const

const localUserKeys = [
  storageKeys.memory,
  storageKeys.userName,
  storageKeys.personaSummary,
] as const

const appKeys = [
  storageKeys.theme,
  storageKeys.demoMode,
  ...localUserKeys,
] as const

export type LocalUserProfile = {
  name: string
  personaSummary: string
}

export function clearLocalStorageKeys(keys: readonly string[]) {
  if (typeof window === 'undefined') {
    return
  }

  for (const key of keys) {
    window.localStorage.removeItem(key)
  }
}

export function clearAppLocalData() {
  clearLocalStorageKeys(appKeys)
}

export function clearLocalUserData() {
  clearLocalStorageKeys(localUserKeys)
}

export function getLocalUserProfile(): LocalUserProfile {
  if (typeof window === 'undefined') {
    return {
      name: 'Addy',
      personaSummary: 'Not set',
    }
  }

  const name = window.localStorage.getItem(storageKeys.userName) || 'Addy'
  const personaSummary =
    window.localStorage.getItem(storageKeys.personaSummary) || 'Not set'

  return {
    name,
    personaSummary,
  }
}
