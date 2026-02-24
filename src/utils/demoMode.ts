import { storageKeys } from './storageKeys'

const DEMO_MODE_EVENT = 'pebble:demo-mode'

export function getDemoMode() {
  if (typeof window === 'undefined') {
    return false
  }

  return window.localStorage.getItem(storageKeys.demoMode) === '1'
}

export function setDemoMode(isEnabled: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(storageKeys.demoMode, isEnabled ? '1' : '0')
  window.dispatchEvent(
    new CustomEvent<boolean>(DEMO_MODE_EVENT, {
      detail: isEnabled,
    }),
  )
}

export function subscribeDemoMode(listener: (isEnabled: boolean) => void) {
  if (typeof window === 'undefined') {
    return () => {}
  }

  const handleEvent = (event: Event) => {
    const demoEvent = event as CustomEvent<boolean>
    listener(demoEvent.detail)
  }

  window.addEventListener(DEMO_MODE_EVENT, handleEvent)

  return () => {
    window.removeEventListener(DEMO_MODE_EVENT, handleEvent)
  }
}
