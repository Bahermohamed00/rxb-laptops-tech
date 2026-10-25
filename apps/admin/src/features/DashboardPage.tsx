import type { Navigate } from '../navigation'
import { BentoWorkspaces } from '../components/BentoWorkspaces'
import { Icon } from '../components/Icon'
import { ConnectionPanel, StatusBadge } from '../components/WorkspaceState'
import { WorkspaceSchematic } from '../components/WorkspaceSchematic'
export function DashboardPage({ onNavigate }: { onNavigate: Navigate }) {
  return <>
    <div className="overview-grid">
      <section className="hero-panel" aria-labelledby="overview-title" data-motion="hero">
        <div className="hero-topline"><span className="panel-caption">Your business workspace</span><StatusBadge>Backend not implemented</StatusBadge></div>
        <div className="hero-copy"><h2 id="overview-title"><span className="hero-line" data-motion="hero-line">Precision.</span><span className="hero-line" data-motion="hero-line">From the inside out.</span></h2><p>A dedicated space for the business behind every machine. Explore the RXB admin interface while its services are yet to be connected.</p><button className="button button-primary" onClick={() => onNavigate('Products')}>Explore products<Icon name="Arrow" /></button></div>
        <WorkspaceSchematic />
        <div className="hero-foot"><span className="technical-mark" aria-hidden="true">⌖</span><span>Interface ready. Business data unavailable.</span></div>
      </section>
      <ConnectionPanel />
    </div>
    <section className="workspace-section" aria-labelledby="workspaces-title" data-motion="workspaces">
      <div className="section-heading"><div><p className="eyebrow">Explore the interface</p><h2 id="workspaces-title">A space for every perspective.</h2></div><span className="section-meta">Navigation preview</span></div>
      <BentoWorkspaces onNavigate={onNavigate} />
    </section>
    <div className="preview-note"><Icon name="Layers" /><p><strong>A foundation, with intention.</strong> These workspaces show the interface only. No live records, transactions, or analytics are available.</p></div>
  </>
}


