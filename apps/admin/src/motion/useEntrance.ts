import type { RefObject } from 'react'
import { gsap, useGSAP, motionQuery } from './gsap'
import type { View } from '../navigation'

// One timeline owns the entrance. Content is visible in CSS; GSAP only hides
// elements inside its scoped context, which always restores styles on cleanup.
export function useEntrance(root: RefObject<HTMLDivElement | null>, view: View, firstView: RefObject<boolean>) {
  const timeline = useGSAP(() => {
    const media = gsap.matchMedia()
    media.add(motionQuery, () => {
      const select = gsap.utils.selector(root)
      const tl = gsap.timeline({ defaults: { duration: .48, ease: 'power3.out' } })
      try {
      const reveal = (selector: string, at: number, vars: gsap.TweenVars = {}) => {
        const elements = select(selector)
        if (elements.length) tl.from(elements, { opacity: 0, y: 14, ...vars }, at)
      }
      if (firstView.current) {
        reveal('[data-motion="sidebar"]', 0, { x: -16, y: 0 })
        reveal('[data-motion="nav-item"]', .08, { x: -10, y: 0, stagger: .045 })
        reveal('[data-motion="topbar"]', .16, { y: -8 })
      }
      reveal('[data-motion="page-heading"]', .2)
      if (view === 'Dashboard') {
        reveal('.hero-topline', .28, { y: 0 })
        reveal('[data-motion="hero-line"]', .32, { y: 22, stagger: .09 })
        reveal('.hero-copy > p', .48)
        reveal('.hero-copy > .button', .58, { y: 8 })
        reveal('[data-motion="schematic"]', .54, { y: 0 })
        reveal('[data-part="grid"]', .58, { y: 0 })
        reveal('[data-part="layer"]', .65, { y: 18, stagger: .09 })
        reveal('[data-part="core"]', .82, { y: 20, duration: .6 })
        const paths = root.current?.querySelectorAll<SVGPathElement>('[data-part="connection"]') ?? []
        paths.forEach((path, index) => {
          const length = path.getTotalLength()
          tl.fromTo(path, { strokeDasharray: length, strokeDashoffset: length }, { strokeDashoffset: 0, duration: .5, clearProps: 'strokeDasharray,strokeDashoffset' }, .85 + index * .06)
        })
        reveal('[data-part="marker"]', 1.02, { y: 0, stagger: .05 })
        const signals = root.current?.querySelectorAll<SVGPathElement>('[data-part="signal"]') ?? []
        signals.forEach((path, index) => {
          const length = path.getTotalLength()
          tl.fromTo(path, { opacity: 0, strokeDasharray: `12 ${length}`, strokeDashoffset: 12 }, { opacity: .85, duration: .12 }, 1.02 + index * .06)
          tl.to(path, { strokeDashoffset: -length, duration: .55, ease: 'power1.inOut' }, 1.05 + index * .06)
          tl.to(path, { opacity: 0, duration: .12 }, 1.48 + index * .06)
        })
        reveal('.hero-foot, .schematic-label', .95, { y: 0 })
        reveal('[data-motion="connection-panel"]', .82, { x: 12, y: 0 })
        reveal('.section-heading', .9)
        reveal('[data-motion="workspace-card"]', .98, { y: window.matchMedia('(max-width: 760px)').matches ? 8 : 16, stagger: .065 })
        reveal('.preview-note', 1.15, { y: 0 })
      } else if (view === 'Products') {
        reveal('.products-intro', .27, { y: 10 })
        reveal('.products-surface', .34, { y: 10 })
      } else if (view === 'Inventory') {
        reveal('.inventory-intro', .27, { y: 10 })
        reveal('.inventory-overview', .32, { y: 8 })
        reveal('.inventory-surface', .38, { y: 10 })
      } else {
        reveal('.detail-intro', .27, { y: 10 })
        reveal('[data-motion="empty-state"]', .37)
        reveal('.detail-heading, .detail-content > .button, .access-actions', .42, { y: 8 })
        reveal('[data-motion="connection-panel"]', .37, { x: 10, y: 0 })
      }
      const finishForInput = () => { tl.progress(1) }
      const finishForFocus = (event: FocusEvent) => {
        if ((event.target as HTMLElement).matches('button, a, input, select, textarea')) finishForInput()
      }
      // Never make a keyboard user wait for a visually hidden control.
      const element = root.current
      element?.addEventListener('focusin', finishForFocus)
      element?.addEventListener('rxb:finish-entrance', finishForInput)
      return () => {
        element?.removeEventListener('focusin', finishForFocus)
        element?.removeEventListener('rxb:finish-entrance', finishForInput)
      }
      } catch {
        // Unsupported SVG operations must never leave interface content hidden.
        tl.revert()
      }
    }, root)
    return () => media.revert()
  }, { scope: root, dependencies: [view], revertOnUpdate: true })
  return timeline
}
