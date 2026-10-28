import { useEffect, useRef, useState } from 'react'
import { hashView, productEditHash, productIdFromHash, viewHash } from '../routes'
import type { View } from '../navigation'

export function useHashView() {
  const [target, setTarget] = useState<View>(() => typeof window === 'undefined' ? 'Dashboard' : hashView(window.location.hash))
  const [productId, setProductId] = useState<string | null>(() => typeof window === 'undefined' ? null : productIdFromHash(window.location.hash))
  const currentHash = useRef(typeof window === 'undefined' ? '' : window.location.hash)
  function canNavigate(nextHash: string) {
    if (currentHash.current === nextHash) return true
    const event = new CustomEvent('rxb:before-admin-route-change', {
      cancelable: true,
      detail: { currentHash: currentHash.current, nextHash },
    })
    return window.dispatchEvent(event)
  }
  useEffect(() => {
    const sync = () => {
      const previousHash = currentHash.current
      const requestedHash = window.location.hash
      if (previousHash && requestedHash !== previousHash && !canNavigate(requestedHash)) {
        window.history.pushState(null, '', previousHash)
        return
      }
      const next = hashView(window.location.hash)
      const nextProductId = productIdFromHash(window.location.hash)
      const canonical = nextProductId ? productEditHash(nextProductId) : viewHash(next)
      if (window.location.hash !== canonical) window.history.replaceState(null, '', canonical)
      currentHash.current = canonical
      setTarget(next)
      setProductId(nextProductId)
    }
    sync()
    window.addEventListener('hashchange', sync)
    return () => window.removeEventListener('hashchange', sync)
  }, [])
  function navigate(next: View) {
    const hash = viewHash(next)
    if (!canNavigate(hash)) return
    currentHash.current = hash
    if (window.location.hash !== hash) window.location.hash = hash
    setTarget(next)
    setProductId(null)
  }
  function navigateProduct(id: string | null) {
    const hash = id ? productEditHash(id) : viewHash('Products')
    if (!canNavigate(hash)) return
    currentHash.current = hash
    if (window.location.hash !== hash) window.location.hash = hash
    setTarget('Products')
    setProductId(id)
  }
  return { target, productId, navigate, navigateProduct }
}
