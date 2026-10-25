import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { sections, type Navigate, type View } from '../navigation'
import { Icon } from './Icon'
import { gsap, useGSAP } from '../motion/gsap'

export function AdminLayout({ view, activeView, onNavigate, children }: { view: View; activeView: View; onNavigate: Navigate; children: ReactNode }) {
  const shell = useRef<HTMLDivElement>(null)
  const nav = useRef<HTMLElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  const [expanded, setExpanded] = useState(true)
  const toggle = useRef<HTMLButtonElement>(null)
  const previousMark = useRef({ x: 0, y: 0, width: 0, height: 0, opacity: 0 })

  useGSAP(() => {
    const element = nav.current
    const mark = indicator.current
    if (!element || !mark) return
    gsap.set(mark, previousMark.current)
    const media = gsap.matchMedia()
    media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
      const update = context.add('positionIndicator', (animate: boolean) => {
        const active = element.querySelector<HTMLElement>('[aria-current="page"]')
        if (!active) { previousMark.current.opacity = 0; gsap.set(mark, { opacity: 0 }); return }
        previousMark.current = { x: active.offsetLeft, y: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight, opacity: 1 }
        gsap.to(mark, {
          ...previousMark.current,
          duration: animate && !context.conditions?.reduced ? .32 : 0,
          ease: 'power3.out', overwrite: true,
        })
      })
      update(true)
      let initialObservation = true
      const resize = new ResizeObserver(() => {
        if (initialObservation) { initialObservation = false; return }
        update(false)
      })
      resize.observe(element)
      return () => resize.disconnect()
    }, shell)
    return () => media.revert()
  }, { scope: shell, dependencies: [activeView, expanded], revertOnUpdate: true })

  useGSAP(() => {
    const element = nav.current
    if (!element) return
    const media = gsap.matchMedia()
    media.add({ mobile: '(max-width: 760px)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
      if (!context.conditions?.mobile) return
      element.inert = !expanded
      element.setAttribute('aria-hidden', String(!expanded))
      if (!expanded && element.contains(document.activeElement)) toggle.current?.focus()
      gsap.fromTo(element, { height: expanded ? 0 : element.scrollHeight, opacity: expanded ? 0 : 1, marginTop: expanded ? 0 : 10 }, {
        height: expanded ? 'auto' : 0, opacity: expanded ? 1 : 0,
        marginTop: expanded ? 10 : 0,
        duration: context.conditions?.reduced ? 0 : .24, ease: 'power3.inOut', overwrite: true,
      })
      return () => {
        element.inert = false
        element.removeAttribute('aria-hidden')
      }
    }, shell)
    return () => media.revert()
  }, { scope: shell, dependencies: [expanded], revertOnUpdate: true })

  return <div className="admin-shell" ref={shell}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Skip to content</a>
    <aside className="sidebar" data-motion="sidebar">
      <button className="brand" onClick={() => onNavigate('Dashboard')} aria-label="RXB Admin home"><img src="/rxb-logo-transparent.png" alt="" /><span>Administration</span></button>
      <button ref={toggle} className="nav-toggle button button-quiet" aria-expanded={expanded} aria-controls="admin-navigation" onClick={() => setExpanded(value => !value)}><span>{expanded ? 'Hide navigation' : 'Show navigation'}</span><span aria-hidden="true">{expanded ? '−' : '+'}</span></button>
      <div className="workspace-switch"><span className="workspace-monogram">R</span><div><strong>RXB Laptops / Tech</strong><span>Business workspace</span></div><span className="workspace-square" aria-hidden="true" /></div>
      <p className="nav-label">Workspace</p>
      <nav ref={nav} id="admin-navigation" className="side-nav" aria-label="Admin navigation">
        <span ref={indicator} className="navigation-highlight" aria-hidden="true" />
        {sections.map(section => <button key={section} className={`nav-item${activeView === section ? ' active' : ''}`} onClick={() => onNavigate(section)} aria-current={activeView === section ? 'page' : undefined} data-motion="nav-item"><Icon name={section} /><span>{section}</span><span className="nav-indicator" aria-hidden="true" /></button>)}
      </nav>
      <div className="sidebar-note"><span className="small-cross" aria-hidden="true">+</span><p>Built around<br /><strong>your next move.</strong></p><div className="sidebar-trace" aria-hidden="true"><span /><span /><span /></div></div>
      <div className="sidebar-bottom"><span className="avatar"><Icon name="Lock" /></span><div><strong>Preview session</strong><span>No account connected</span></div></div>
    </aside>
    <div className="admin-main">
      <header className="topbar" data-motion="topbar"><div className="breadcrumbs"><span>Workspace</span><span aria-hidden="true">/</span><strong>{view}</strong></div><div className="topbar-actions"><span className="preview-label"><span /> Preview mode</span><button className="button button-quiet" onClick={() => onNavigate(activeView === 'Sign in' ? 'Dashboard' : 'Sign in')}>{activeView === 'Sign in' ? 'Back to dashboard' : 'Sign in'}<Icon name="Sign in" /></button></div></header>
      <main className="page-content" id="main-content" tabIndex={-1}>{children}</main>
      <footer className="page-footer"><span>RXB <span className="footer-divider">/</span> Laptops &amp; technology</span><span>Preview only <span className="footer-dot" /> No live business data</span></footer>
    </div>
  </div>
}
