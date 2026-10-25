import { gsap } from './gsap'

// Parallax owns outer wrappers; the entrance timeline owns the inner SVG groups.
export function attachHeroParallax(root: HTMLElement, context: gsap.Context) {
  const hero = root.querySelector<HTMLElement>('.hero-panel')
  const perspective = root.querySelector<HTMLElement>('.schematic-perspective')
  if (!hero || !perspective) return () => {}
  const layers = [...perspective.querySelectorAll<SVGGElement>('[data-depth]')]
  const rotationX = gsap.quickTo(perspective, 'rotationX', { duration: .55, ease: 'power3.out' })
  const rotationY = gsap.quickTo(perspective, 'rotationY', { duration: .55, ease: 'power3.out' })
  const offsets = layers.map((layer, index) => ({
    x: gsap.quickTo(layer, 'x', { duration: .5, ease: 'power3.out' }),
    y: gsap.quickTo(layer, 'y', { duration: .5, ease: 'power3.out' }),
    depth: layer.dataset.depth === 'core' ? 9 : (index + 1) * 1.8,
  }))
  let bounds: DOMRect | null = null
  let frame = 0
  let x = 0
  let y = 0
  const enter = () => {
    root.dispatchEvent(new Event('rxb:finish-entrance'))
    bounds = hero.getBoundingClientRect()
  }
  const move = (event: PointerEvent) => {
    if (!bounds || !bounds.width || !bounds.height) return
    x = gsap.utils.clamp(-1, 1, (event.clientX - bounds.left) / bounds.width * 2 - 1)
    y = gsap.utils.clamp(-1, 1, (event.clientY - bounds.top) / bounds.height * 2 - 1)
    if (!frame) frame = requestAnimationFrame(() => {
      const strength = bounds && bounds.width < 600 ? .5 : 1
      rotationX(-y * 2 * strength)
      rotationY(x * 2.5 * strength)
      offsets.forEach(offset => { offset.x(x * offset.depth * strength); offset.y(y * offset.depth * .55 * strength) })
      frame = 0
    })
  }
  const reset = context.add('resetHero', () => {
    if (frame) cancelAnimationFrame(frame)
    frame = 0
    bounds = null
    rotationX(0); rotationY(0)
    offsets.forEach(offset => { offset.x(0); offset.y(0) })
  }) as () => void
  const invalidate = () => { if (bounds) reset() }
  hero.addEventListener('pointerenter', enter)
  hero.addEventListener('pointermove', move)
  hero.addEventListener('pointerleave', reset)
  hero.addEventListener('pointercancel', reset)
  window.addEventListener('resize', invalidate, { passive: true })
  window.addEventListener('scroll', invalidate, { passive: true })
  return () => {
    if (frame) cancelAnimationFrame(frame)
    hero.removeEventListener('pointerenter', enter)
    hero.removeEventListener('pointermove', move)
    hero.removeEventListener('pointerleave', reset)
    hero.removeEventListener('pointercancel', reset)
    window.removeEventListener('resize', invalidate)
    window.removeEventListener('scroll', invalidate)
  }
}
