import { useEffect, useId, useRef } from 'react'
import type { ReactNode } from 'react'
import { gsap, useGSAP } from '../motion/gsap'
import './modal-surface.css'

type Props = {
  title: string
  description: string
  closeLabel: string
  variant?: 'drawer' | 'dialog'
  onClose: () => void
  requestClose?: () => boolean
  children: (close: () => void) => ReactNode
}

/** Native modal top layer supplies focus containment and makes the background inert. */
export function ModalSurface({ title, description, closeLabel, variant = 'drawer', onClose, requestClose, children }: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closing = useRef(false)
  const timer = useRef<number | undefined>(undefined)
  const callbacks = useRef({ onClose, requestClose })
  callbacks.current = { onClose, requestClose }
  const titleId = useId()
  const descriptionId = useId()
  const { contextSafe } = useGSAP(() => {
    const element = dialog.current!
    const opener = document.activeElement as HTMLElement | null
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    element.showModal()
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.fromTo(panel.current, { opacity: 0, ...(variant === 'drawer' ? { x: 48 } : { y: 16, scale: .98 }) }, { opacity: 1, x: 0, y: 0, scale: 1, duration: .28, ease: 'power3.out' })
    })
    element.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    return () => {
      media.revert()
      element.close()
      document.body.style.overflow = overflow
      if (opener?.isConnected) opener.focus()
      else document.querySelector<HTMLElement>('[data-inventory-primary], [data-add-product]')?.focus()
    }
  }, { scope: dialog })

  const close = contextSafe(() => {
    if (closing.current) return
    closing.current = true
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { callbacks.current.onClose(); return }
    // Completion is guaranteed even when animation frames are suspended.
    const finish = () => { window.clearTimeout(timer.current); callbacks.current.onClose() }
    timer.current = window.setTimeout(finish, 250)
    gsap.to(panel.current, { opacity: 0, ...(variant === 'drawer' ? { x: 32 } : { y: 10 }), duration: .16, ease: 'power2.in', overwrite: true, onComplete: finish })
  })
  const dismiss = () => { if (!callbacks.current.requestClose || callbacks.current.requestClose()) close() }
  useEffect(() => {
    const hash = window.location.hash
    // A browser Back action must not unmount an unsaved editor behind the modal.
    const onHash = (event: HashChangeEvent) => {
      if (!callbacks.current.requestClose || callbacks.current.requestClose()) {
        callbacks.current.onClose()
        return // Clean dialogs allow the existing router to handle navigation.
      }
      event.stopImmediatePropagation()
      // Append the cancelled destination's return path; do not overwrite its entry.
      window.history.pushState(null, '', `${window.location.pathname}${window.location.search}${hash}`)
    }
    window.addEventListener('hashchange', onHash, true)
    return () => { window.clearTimeout(timer.current); window.removeEventListener('hashchange', onHash, true) }
  }, [])

  return <dialog ref={dialog} className={`modal-surface modal-${variant}`} aria-labelledby={titleId} aria-describedby={descriptionId} onCancel={event => { event.preventDefault(); dismiss() }}>
    <div ref={panel} className="modal-panel">
      <header className="modal-header"><div><span className="modal-context">Development-only · Local prototype</span><h2 id={titleId}>{title}</h2><p id={descriptionId}>{description}</p></div><button type="button" className="modal-close" aria-label={closeLabel} onClick={dismiss}><span aria-hidden="true">×</span></button></header>
      {children(close)}
    </div>
  </dialog>
}
