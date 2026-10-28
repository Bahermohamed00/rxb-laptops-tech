import { useId, useRef } from 'react'
import type { ReactNode } from 'react'

export function ProductRail({ label, className = '', children }: { label: string; className?: string; children: ReactNode }) {
  const railId = useId()
  const rail = useRef<HTMLDivElement>(null)

  function scroll(direction: -1 | 1) {
    const element = rail.current
    if (!element) return
    element.scrollBy({
      left: direction * element.clientWidth * 0.85,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    })
  }

  return <section className="product-rail" aria-label={`${label} rail`}>
    <div className="product-rail-controls">
      <span>SCROLL OR SWIPE TO EXPLORE</span>
      <div>
        <button type="button" aria-label={`Scroll ${label} left`} aria-controls={railId} onClick={() => scroll(-1)}>←</button>
        <button type="button" aria-label={`Scroll ${label} right`} aria-controls={railId} onClick={() => scroll(1)}>→</button>
      </div>
    </div>
    <div id={railId} ref={rail} className={`product-rail-track ${className}`} role="region" aria-label={`${label} products`} tabIndex={0}>
      {children}
    </div>
  </section>
}
