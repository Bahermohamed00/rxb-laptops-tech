import { useRef, useState } from 'react'
import { AdminLayout } from './components/AdminLayout'
import { DashboardPage } from './features/DashboardPage'
import { WorkspacePage, SignInPage } from './features/WorkspacePage'
import { useHashView } from './motion/useHashView'
import { useEntrance } from './motion/useEntrance'
import { useInteractions } from './motion/useInteractions'
import { gsap, useGSAP } from './motion/gsap'
import type { View } from './navigation'
import { ProductProvider } from './features/products/ProductStore'
import { ProductsPage } from './features/products/ProductsPage'

export default function App() {
  return <ProductProvider><AdminApp /></ProductProvider>
}

function AdminApp() {
  const { target, navigate } = useHashView()
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
    <AdminLayout view={view} activeView={target} onNavigate={navigate}>
      <div className="view-stage" key={view} inert={target !== view} aria-busy={target !== view}>
        <div className="page-heading" data-motion="page-heading">
          <div><p className="eyebrow">RXB administration <span>/</span> {view === 'Dashboard' ? 'Overview' : view === 'Sign in' ? 'Workspace access' : 'Workspace'}</p>
            <h1 ref={headingRef} tabIndex={-1}>{view === 'Dashboard' ? 'Command center' : view}</h1>
          </div><span className="edition-label"><span className="edition-line" /> Interface preview</span>
        </div>
        <div className="view-content" data-view={view} data-motion="view">
          {view === 'Dashboard' ? <DashboardPage onNavigate={navigate} /> : view === 'Products' ? <ProductsPage /> : view === 'Sign in' ? <SignInPage onNavigate={navigate} /> : <WorkspacePage section={view} onNavigate={navigate} />}
        </div>
      </div>
    </AdminLayout>
  </div>
}
