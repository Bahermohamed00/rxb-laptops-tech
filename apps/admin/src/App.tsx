import { useEffect, useRef, useState } from 'react'
import { AdminLayout } from './components/AdminLayout'
import { DashboardPage } from './features/DashboardPage'
import { WorkspacePage } from './features/WorkspacePage'
import { SignInPage } from './features/auth/SignInPage'
import { useHashView } from './motion/useHashView'
import { useEntrance } from './motion/useEntrance'
import { useInteractions } from './motion/useInteractions'
import { gsap, useGSAP } from './motion/gsap'
import type { View } from './navigation'
import type { Section } from './navigation'
import { LiveProductsPage } from './features/products/LiveProductsPage'
import { CategoriesPage } from './features/products/CategoriesPage'
import { LiveInventoryPage } from './features/inventory/LiveInventoryPage'
import { AuditPage } from './features/AuditPage'
import { getAdminSession, SessionRequestError, signOut, type AdminIdentity, type AuthResponse } from './api/auth'
import { useTheme } from './theme/useTheme'
import type { Theme } from './theme/useTheme'

type AuthState =
  | { status: 'checking'; error?: string }
  | { status: 'signed-out' }
  | { status: 'signed-in'; user: AdminIdentity; csrfToken: string; error?: string }

export default function App() {
  return <AdminApp />
}

function AdminApp() {
  const { target, productId, navigate, navigateProduct } = useHashView()
  const { theme, toggleTheme } = useTheme()
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' })

  useEffect(() => {
    let active = true
    const refresh = () => getAdminSession().then(session => {
      if (active) setAuth({ status: 'signed-in', user: session.user, csrfToken: session.csrfToken })
    }).catch((cause) => {
      if (!active) return
      if (cause instanceof SessionRequestError && cause.expired) setAuth({ status: 'signed-out' })
      else setAuth(current => current.status === 'signed-in'
        ? { ...current, error: cause instanceof Error ? cause.message : 'The admin session could not be checked.' }
        : { status: 'checking', error: cause instanceof Error ? cause.message : 'The admin session could not be checked.' })
    })
    void refresh()
    const timer = window.setInterval(() => { void refresh() }, 5 * 60_000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  useEffect(() => {
    if (auth.status === 'signed-in' && target === 'Sign in') navigate('Dashboard')
  }, [auth.status, target])

  function handleAuthenticated(session: AuthResponse) {
    setAuth({ status: 'signed-in', user: session.user, csrfToken: session.csrfToken })
    if (target === 'Sign in') navigate('Dashboard')
  }

  async function handleSignOut() {
    if (auth.status !== 'signed-in') return
    try {
      await signOut(auth.csrfToken)
      setAuth({ status: 'signed-out' })
      navigate('Sign in')
    } catch (cause) {
      setAuth(current => current.status === 'signed-in'
        ? { ...current, error: cause instanceof Error ? cause.message : 'Sign-out failed.' }
        : current)
    }
  }

  if (auth.status === 'checking') return <main className="auth-loading" aria-live="polite"><img src="/rxb-logo-transparent.png" alt="RXB Laptops / Tech" /><span>{auth.error ?? 'Checking admin session…'}</span>{auth.error && <button type="button" onClick={() => { setAuth({ status: 'checking' }); void getAdminSession().then(session => setAuth({ status: 'signed-in', user: session.user, csrfToken: session.csrfToken })).catch(cause => { if (cause instanceof SessionRequestError && cause.expired) setAuth({ status: 'signed-out' }); else setAuth({ status: 'checking', error: cause instanceof Error ? cause.message : 'Session check failed.' }) }) }}>Retry</button>}</main>
  if (auth.status === 'signed-out') return <SignInPage onAuthenticated={handleAuthenticated} theme={theme} onToggleTheme={toggleTheme} />
  return <AuthenticatedAdminApp target={target} productId={productId} navigate={navigate} navigateProduct={navigateProduct} auth={auth} onSignOut={handleSignOut} theme={theme} onToggleTheme={toggleTheme} />
}

function AuthenticatedAdminApp({ target, productId, navigate, navigateProduct, auth, onSignOut, theme, onToggleTheme }: {
  target: View
  productId: string | null
  navigate: (view: View) => void
  navigateProduct: (id: string | null) => void
  auth: Extract<AuthState, { status: 'signed-in' }>
  onSignOut: () => void
  theme: Theme
  onToggleTheme: () => void
}) {
  const [view, setView] = useState<View>(target)
  const root = useRef<HTMLDivElement>(null)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const firstView = useRef(true)
  useEntrance(root, view, firstView)
  useInteractions(root, view)

  useGSAP(() => {
    if (target === view) return
    firstView.current = false
    root.current?.dispatchEvent(new Event('rxb:finish-entrance'))
    const media = gsap.matchMedia()
    media.add({ motion: '(prefers-reduced-motion: no-preference)', reduced: '(prefers-reduced-motion: reduce)' }, context => {
      if (context.conditions?.reduced) {
        setView(target)
        return
      }
      const stage = root.current?.querySelector('.view-stage')
      if (!stage) { setView(target); return }
      // Navigation must complete even if animation frames stop progressing.
      const fallback = window.setTimeout(() => setView(target), 400)
      gsap.to(stage, {
        opacity: 0, y: -8, duration: .16, ease: 'power2.in',
        onComplete: () => { window.clearTimeout(fallback); setView(target) },
      })
      return () => window.clearTimeout(fallback)
    }, root)
    // Reverting cancels the previous completion callback on rapid navigation.
    return () => media.revert()
  }, { scope: root, dependencies: [target, view], revertOnUpdate: true })

  useGSAP(() => {
    if (!firstView.current) headingRef.current?.focus()
  }, { dependencies: [view] })

  return <div ref={root}>
    <AdminLayout view={view} activeView={target} onNavigate={navigate} admin={auth.user} onSignOut={onSignOut} authError={auth.error} theme={theme} onToggleTheme={onToggleTheme}>
      <div className="view-stage" key={view} inert={target !== view} aria-busy={target !== view}>
        <div className="page-heading" data-motion="page-heading">
          <div><p className="eyebrow">RXB administration <span>/</span> {view === 'Dashboard' ? 'Overview' : view === 'Sign in' ? 'Workspace access' : 'Workspace'}</p>
            <h1 ref={headingRef} tabIndex={-1}>{view === 'Dashboard' ? 'Overview' : view}</h1>
          </div><span className="edition-label"><span className="edition-line" /> {view === 'Dashboard' ? 'Live catalog & inventory' : 'Interface preview'}</span>
        </div>
        <div className="view-content" data-view={view} data-motion="view">
          {view === 'Dashboard' || view === 'Sign in' ? <DashboardPage onNavigate={navigate} /> : ['Products', 'All Products', 'New Laptops', 'Pre-owned Laptops', 'Accessories'].includes(view) ? <LiveProductsPage key={view} csrfToken={auth.csrfToken} productId={productId} navigateProduct={navigateProduct} scope={view === 'Products' ? 'All Products' : view as 'All Products'|'New Laptops'|'Pre-owned Laptops'|'Accessories'} /> : view === 'Categories' ? <CategoriesPage csrfToken={auth.csrfToken} /> : view === 'Inventory' ? <LiveInventoryPage csrfToken={auth.csrfToken} /> : view === 'Audit' ? <AuditPage /> : <WorkspacePage section={view as Exclude<Section, 'Dashboard'>} onNavigate={navigate} />}
        </div>
      </div>
    </AdminLayout>
  </div>
}
