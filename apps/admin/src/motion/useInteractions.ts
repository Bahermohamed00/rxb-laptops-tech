import type { RefObject } from 'react'
import { gsap, useGSAP } from './gsap'
import type { View } from '../navigation'
import { attachHeroParallax } from './heroParallax'

export function useInteractions(root: RefObject<HTMLDivElement | null>, view: View) {
  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference) and (hover: hover) and (pointer: fine)', context => {
      const safe = (callback: () => void) => context.add('interaction', callback) as () => void
      const disposers: (() => void)[] = []
      if (root.current) disposers.push(attachHeroParallax(root.current, context))
      const select = gsap.utils.selector(root)
      const controls = select('.workspace-card, .nav-item, .button:not(:disabled)') as HTMLElement[]
      controls.forEach(control => {
        const card = control.classList.contains('workspace-card')
        const icon = control.querySelector(card ? '.workspace-card-top .icon:last-child' : '.icon')
        const light = control.querySelector('.card-light')
        const illustration = control.querySelector('.bento-illustration')
        let bounds: DOMRect | null = null
        let frame = 0
        let x = 0
        let y = 0
        const lightX = light ? gsap.quickTo(light, 'x', { duration: .22, ease: 'power2.out' }) : null
        const lightY = light ? gsap.quickTo(light, 'y', { duration: .22, ease: 'power2.out' }) : null
        const enter = safe(() => {
          root.current?.dispatchEvent(new Event('rxb:finish-entrance'))
          if (card) {
            bounds = control.getBoundingClientRect()
            gsap.to(control, { y: -4, duration: .25, ease: 'power3.out', overwrite: 'auto' })
          }
          if (icon) gsap.to(icon, { x: card ? 2 : 1.5, y: card ? -2 : 0, duration: .25, overwrite: 'auto' })
          if (light) gsap.to(light, { opacity: .65, duration: .22, overwrite: 'auto' })
          if (illustration) gsap.to(illustration, { y: -3, duration: .4, ease: 'power3.out', overwrite: 'auto' })
        })
        const leave = safe(() => {
          if (frame) cancelAnimationFrame(frame)
          frame = 0
          bounds = null
          gsap.to(control, { y: 0, scale: 1, duration: .3, ease: 'power3.out', overwrite: 'auto' })
          if (icon) gsap.to(icon, { x: 0, y: 0, duration: .25, overwrite: 'auto' })
          if (light) gsap.to(light, { opacity: 0, duration: .18, overwrite: 'auto' })
          if (illustration) gsap.to(illustration, { y: 0, duration: .4, ease: 'power3.out', overwrite: 'auto' })
        })
        const move = (event: PointerEvent) => {
          if (!bounds || !lightX || !lightY) return
          x = event.clientX - bounds.left
          y = event.clientY - bounds.top
          if (!frame) frame = requestAnimationFrame(() => {
            lightX(x); lightY(y); frame = 0
          })
        }
        const press = safe(() => { gsap.to(control, { scale: .985, duration: .1, overwrite: 'auto' }) })
        const release = safe(() => { gsap.to(control, { scale: 1, duration: .22, ease: 'power3.out', overwrite: 'auto' }) })
        const invalidate = () => { if (bounds) leave() }
        control.addEventListener('pointerenter', enter)
        control.addEventListener('pointerleave', leave)
        control.addEventListener('pointermove', move)
        control.addEventListener('pointerdown', press)
        control.addEventListener('pointerup', release)
        control.addEventListener('pointercancel', leave)
        window.addEventListener('scroll', invalidate, { passive: true })
        window.addEventListener('resize', invalidate, { passive: true })
        disposers.push(() => {
          if (frame) cancelAnimationFrame(frame)
          control.removeEventListener('pointerenter', enter)
          control.removeEventListener('pointerleave', leave)
          control.removeEventListener('pointermove', move)
          control.removeEventListener('pointerdown', press)
          control.removeEventListener('pointerup', release)
          control.removeEventListener('pointercancel', leave)
          window.removeEventListener('scroll', invalidate)
          window.removeEventListener('resize', invalidate)
        })
      })
      return () => disposers.forEach(dispose => dispose())
    }, root)
    return () => media.revert()
  }, { scope: root, dependencies: [view], revertOnUpdate: true })
}
