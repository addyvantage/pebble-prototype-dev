import { useEffect } from 'react'

export function useBodyScrollLock(locked: boolean) {
  useEffect(() => {
    if (!locked || typeof document === 'undefined') {
      return
    }

    const previousOverflow = document.body.style.overflow
    const previousHeight = document.body.style.height

    document.body.style.overflow = 'hidden'
    document.body.style.height = '100vh'

    return () => {
      document.body.style.overflow = previousOverflow
      document.body.style.height = previousHeight
    }
  }, [locked])
}
