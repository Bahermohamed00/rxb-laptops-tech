import { workspaceContent, type Navigate, type Section } from '../navigation'
import { Icon } from '../components/Icon'
import { ConnectionPanel, EmptyState, StatusBadge } from '../components/WorkspaceState'
export function WorkspacePage({ section, onNavigate }: { section: Exclude<Section, 'Dashboard'>; onNavigate: Navigate }) {
  const content = workspaceContent[section]
  return <div className="overview-grid section-grid">
    <section className="workspace-detail" aria-labelledby="workspace-title" data-motion="workspace-detail">
      <div className="detail-intro"><div className="hero-topline"><span className="panel-caption"><Icon name={section} />{content.label}</span><StatusBadge /></div><h2 id="workspace-title">{content.title}</h2><p>{content.description}</p><span className="detail-watermark" aria-hidden="true"><Icon name={section} /></span></div>
      <div className="detail-content"><div className="detail-heading"><h2>{section} workspace</h2><span>Preview</span></div><EmptyState icon={section} title={content.empty} description={content.detail} /><button className="button button-text" onClick={() => onNavigate('Dashboard')}><span aria-hidden="true">←</span>Back to command center</button></div>
    </section>
    <ConnectionPanel service={content.dependency} note={content.note} />
  </div>
}
