import { useEffect, useState } from 'react'
import { hashView, viewHash } from '../routes'
import type { View } from '../navigation'

export function useHashView() {
  const [target, setTarget] = useState<View>(() => typeof window === 'undefined' ? 'Dashboard' : hashView(window.location.hash))
  useEffect(() => {
    const sync = () => {
      const next = hashView(window.location.hash)
      const canonical = viewHash(next)
      if (window.location.hash !== canonical) window.history.replaceState(null, '', canonical)
      setTarget(next)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  function navigate(next: View) {
    const hash = viewHash(next)
    if (window.location.hash !== hash) window.location.hash = hash
    setTarget(next)
  }
  return { target, navigate }
}
