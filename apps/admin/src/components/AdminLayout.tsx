import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { navigationGroups, type Navigate, type View } from '../navigation'
import { Icon } from './Icon'
import { gsap, useGSAP } from '../motion/gsap'
import type { AdminIdentity } from '../api/auth'
import { ThemeToggle } from './ThemeToggle'
import type { Theme } from '../theme/useTheme'

export function AdminLayout({ view, activeView, onNavigate, children, admin, onSignOut, authError, theme, onToggleTheme }: { view: View; activeView: View; onNavigate: Navigate; children: ReactNode; admin: AdminIdentity; onSignOut: () => void; authError?: string; theme: Theme; onToggleTheme: () => void }) {
  const shell = useRef<HTMLDivElement>(null)
  const nav = useRef<HTMLElement>(null)
  const indicator = useRef<HTMLSpanElement>(null)
  const mobileTrigger = useRef<HTMLButtonElement>(null)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(() => window.matchMedia('(max-width: 760px)').matches)

  useEffect(() => {
    const media = window.matchMedia('(max-width: 760px)')
    const update = () => setIsMobile(media.matches)
    media.addEventListener('change', update)
    return () => media.removeEventListener('change', update)
  }, [])

  const previouslyOpen = useRef(false)
  useEffect(() => {
    if (!isMobile) {
      document.body.classList.remove('admin-drawer-open')
      previouslyOpen.current = false
      setMobileOpen(false)
      return
    }
    document.body.classList.toggle('admin-drawer-open', mobileOpen)
    if (mobileOpen) nav.current?.querySelector<HTMLButtonElement>('.nav-item')?.focus()
    else if (previouslyOpen.current) mobileTrigger.current?.focus()
    previouslyOpen.current = mobileOpen
    return () => document.body.classList.remove('admin-drawer-open')
  }, [isMobile, mobileOpen])

  useEffect(() => {
    if (!mobileOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setMobileOpen(false); return }
      if (event.key !== 'Tab') return
      const panel = shell.current?.querySelector<HTMLElement>('.sidebar')
      const focusable = panel ? [...panel.querySelectorAll<HTMLElement>('button:not(:disabled):not([tabindex="-1"]), a[href], [tabindex]:not([tabindex="-1"])')] : []
      const first = focusable[0]
      const last = focusable.at(-1)
      if (!first || !last) return
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mobileOpen])

  const navigate = (section: View) => {
    onNavigate(section)
    setMobileOpen(false)
  }

  useGSAP(() => {
    const element = nav.current
    const mark = indicator.current
    if (!element || !mark) return
    const media = gsap.matchMedia()
    media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
      const update = context.add('positionIndicator', (animate: boolean) => {
        const active = element.querySelector<HTMLElement>('[aria-current="page"]')
        if (!active) { gsap.set(mark, { opacity: 0 }); return }
        gsap.to(mark, {
          x: active.offsetLeft, y: active.offsetTop, width: active.offsetWidth, height: active.offsetHeight, opacity: 1,
          duration: animate && !context.conditions?.reduced ? .28 : 0, ease: 'power3.out', overwrite: true,
        })
      })
      update(false)
      const resize = new ResizeObserver(() => update(false))
      resize.observe(element)
      return () => resize.disconnect()
    }, shell)
    return () => media.revert()
  }, { scope: shell, dependencies: [activeView, collapsed, mobileOpen, isMobile], revertOnUpdate: true })

  return <div className={`admin-shell${collapsed && !isMobile ? ' sidebar-collapsed' : ''}${mobileOpen ? ' mobile-drawer-open' : ''}`} ref={shell}>
    <a className="skip-link" href="#main-content" onClick={event => { event.preventDefault(); document.getElementById('main-content')?.focus() }}>Skip to content</a>
    <button className="sidebar-backdrop" type="button" aria-label="Close admin navigation" tabIndex={mobileOpen ? 0 : -1} onClick={() => setMobileOpen(false)} />
    <aside className="sidebar" data-motion="sidebar" role={isMobile && mobileOpen ? 'dialog' : undefined} aria-modal={isMobile && mobileOpen ? true : undefined} aria-label="Admin navigation" inert={isMobile && !mobileOpen}>
      <div className="sidebar-header">
        <button className="brand" onClick={() => navigate('Dashboard')} aria-label="RXB Admin home"><img src="/rxb-logo-transparent.png" alt="" /><span>Administration</span></button>
        <button className="sidebar-collapse button button-quiet" type="button" tabIndex={isMobile ? -1 : 0} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={() => setCollapsed(value => !value)}><span aria-hidden="true">{collapsed ? '›' : '‹'}</span><span className="collapse-label">{collapsed ? 'Expand' : 'Collapse'}</span></button>
        <button className="sidebar-mobile-close button button-quiet" type="button" aria-label="Close admin navigation" onClick={() => setMobileOpen(false)}>×</button>
      </div>
      <div className="workspace-switch"><span className="workspace-monogram">R</span><div><strong>RXB Laptops / Tech</strong><span>Business workspace</span></div><span className="workspace-square" aria-hidden="true" /></div>
      <nav ref={nav} id="admin-navigation" className="side-nav" aria-label="Admin navigation">
        <span ref={indicator} className="navigation-highlight" aria-hidden="true" />
        {navigationGroups.map(group => <div className="nav-group" key={group.label}>
          <p className="nav-label">{group.label}</p>
          {group.items.map(section => <button key={section} title={collapsed ? section : undefined} className={`nav-item${activeView === section ? ' active' : ''}`} onClick={() => navigate(section)} aria-current={activeView === section ? 'page' : undefined} data-motion="nav-item"><Icon name={section} /><span className="nav-item-label">{section}</span><span className="nav-indicator" aria-hidden="true" /></button>)}
        </div>)}
      </nav>
      <div className="sidebar-note"><span className="small-cross" aria-hidden="true">+</span><p>Built around<br /><strong>your next move.</strong></p><div className="sidebar-trace" aria-hidden="true"><span /><span /><span /></div></div>
      <div className="sidebar-bottom"><span className="avatar"><Icon name="Lock" /></span><div><strong>{admin.email}</strong><span>{admin.role.replace('_', ' ')}</span></div></div>
    </aside>
    <div className="admin-main" inert={isMobile && mobileOpen}>
      <header className="topbar" data-motion="topbar">
        <div className="topbar-leading"><button ref={mobileTrigger} className="mobile-nav-trigger button button-quiet" type="button" aria-label={mobileOpen ? 'Close admin navigation' : 'Open admin navigation'} aria-expanded={mobileOpen} aria-controls="admin-navigation" onClick={() => setMobileOpen(open => !open)}><span aria-hidden="true">☰</span><span>Menu</span></button><div className="breadcrumbs"><span>Workspace</span><span aria-hidden="true">/</span><strong>{view}</strong></div></div>
        <div className="topbar-actions"><span className="preview-label"><span /> Authenticated admin</span><ThemeToggle theme={theme} onToggle={onToggleTheme} /><button className="button button-quiet signout-button" onClick={onSignOut}>Sign out<Icon name="Sign in" /></button></div>
      </header>
      <main className="page-content" id="main-content" tabIndex={-1}>{authError && <p className="signin-error" role="alert">{authError}</p>}{children}</main>
      <footer className="page-footer"><span>RXB <span className="footer-divider">/</span> Laptops &amp; technology</span><span>Products &amp; inventory via API <span className="footer-dot" /> Admin session required</span></footer>
    </div>
  </div>
}
