import { useState } from 'react'

const sections = ['Dashboard', 'Products', 'Inventory', 'Orders', 'Customers', 'Reports'] as const
type Section = (typeof sections)[number]
type View = Section | 'Sign in'

function SectionIcon({ name }: { name: View }) {
  const paths: Record<View, string> = {
    Dashboard: 'M3 3h7v7H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 14h7v7H3z',
    Products: 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z M4.5 7.8 12 12l7.5-4.2 M12 12v9 M8 5.2l8 4.6',
    Inventory: 'M3 7h18v14H3z M7 7V4h10v3 M3 12h18 M10 12v2h4v-2',
    Orders: 'M5 3h14v18l-7-4-7 4z M8 8h8 M8 11h8',
    Customers: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M17 11h6',
    Reports: 'M4 19V9 M10 19V5 M16 19v-7 M22 19V3',
    'Sign in': 'M10 17l5-5-5-5 M15 12H3 M21 3v18',
  }

  return <svg className="nav-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}

function SignInPlaceholder() {
  return <section className="signin-card" aria-labelledby="signin-title">
    <span className="section-kicker">ACCESS / SETUP PENDING</span>
    <h2 id="signin-title">Sign in to RXB Admin</h2>
    <p>Authentication has not been connected. Sign-in will be enabled after a backend identity service and role-based access controls are in place.</p>
    <div className="signin-fields" aria-hidden="true"><span>Email address</span><span>Password</span><button disabled>Sign in unavailable</button></div>
    <span className="security-note"><i /> No credentials are collected in this preview.</span>
  </section>
}

function EmptyDashboard() {
  return <section className="empty-state" aria-labelledby="empty-title">
    <div className="empty-illustration" aria-hidden="true"><div className="illustration-ring ring-one" /><div className="illustration-ring ring-two" /><span className="illustration-core">R</span><i /><i /><i /></div>
    <span className="section-kicker">WORKSPACE / NOT CONNECTED</span>
    <h2 id="empty-title">Your dashboard is ready to connect.</h2>
    <p>This admin preview has no backend connection yet. Products, inventory, orders, customers, and reports will appear here after the services and access controls are built.</p>
    <span className="connection-status"><i /> BACKEND DISCONNECTED</span>
  </section>
}

export default function App() {
  const [view, setView] = useState<View>('Dashboard')
  const isDashboard = view === 'Dashboard'

  return <div className="admin-shell">
    <aside className="sidebar">
      <a className="brand" href="#admin-home" aria-label="RXB Admin home" onClick={() => setView('Dashboard')}>
        <img src="/rxb-logo-transparent.png" alt="RXB Laptops / Tech" />
        <span>ADMIN CONSOLE</span>
      </a>
      <div className="workspace-label"><span>WORKSPACE</span><i>PREVIEW</i></div>
      <nav className="side-nav" aria-label="Admin navigation">
        {sections.map((section) => <button className={`nav-item ${view === section ? 'active' : ''}`} key={section} onClick={() => setView(section)} aria-current={view === section ? 'page' : undefined}>
          <SectionIcon name={section} /><span>{section}</span>{section === 'Dashboard' && <i className="active-mark" />}
        </button>)}
      </nav>
      <div className="sidebar-bottom"><span className="admin-avatar">RX</span><span className="profile-copy"><b>Preview mode</b><small>No account connected</small></span><span className="profile-menu">···</span></div>
    </aside>

    <div className="admin-main">
      <header className="topbar">
        <div className="breadcrumbs"><span>RXB</span><b>/</b><strong>{view}</strong></div>
        <div className="topbar-actions"><span className="environment"><i /> DEMO ENVIRONMENT</span><button className="signin-link" onClick={() => setView(view === 'Sign in' ? 'Dashboard' : 'Sign in')}>{view === 'Sign in' ? 'Back to dashboard' : 'Sign in'} <SectionIcon name="Sign in" /></button></div>
      </header>
      <main className="page-content">
        <div className="page-heading"><div><span className="section-kicker">RXB / ADMINISTRATION</span><h1>{isDashboard ? 'Dashboard' : view}</h1></div><span className="page-date">PREVIEW BUILD&nbsp; / &nbsp;NO LIVE DATA</span></div>
        {view === 'Sign in' ? <SignInPlaceholder /> : isDashboard ? <EmptyDashboard /> : <section className="section-placeholder"><div className="placeholder-symbol"><SectionIcon name={view} /></div><span className="section-kicker">{view.toUpperCase()} / NOT CONNECTED</span><h2>{view} workspace</h2><p>This section is a navigation placeholder. No business data is available until the backend is connected.</p><span className="connection-status"><i /> BACKEND DISCONNECTED</span></section>}
        <footer className="page-footer"><span>RXB Laptops / Tech</span><span>ADMIN PREVIEW&nbsp; · &nbsp;AUTHORIZATION NOT CONFIGURED</span></footer>
      </main>
    </div>
  </div>
}
