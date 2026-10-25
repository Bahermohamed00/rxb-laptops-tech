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
export function SignInPage({ onNavigate }: { onNavigate: Navigate }) {
  return <div className="overview-grid section-grid">
    <section className="workspace-detail access-panel" aria-labelledby="access-title" data-motion="access">
      <div className="detail-intro"><div className="hero-topline"><span className="panel-caption"><Icon name="Lock" />Workspace access</span><StatusBadge>Setup pending</StatusBadge></div><h2 id="access-title">A private workspace.<br />Access comes next.</h2><p>Sign-in is not available in this preview. Authentication and role-based access controls must be implemented before accounts can connect.</p><span className="detail-watermark" aria-hidden="true"><Icon name="Lock" /></span></div>
      <div className="detail-content"><EmptyState icon="Lock" title="No credentials needed." description="This interface does not collect email addresses or passwords. There is no active account or authenticated session." /><div className="access-actions"><button className="button button-disabled" disabled><Icon name="Lock" />Sign in unavailable</button><button className="button button-text" onClick={() => onNavigate('Dashboard')}>Back to dashboard<Icon name="Arrow" /></button></div></div>
    </section>
    <ConnectionPanel service="Identity service" note="A separate admin interface does not provide authorization. Access must be enforced by a backend service." />
  </div>
}
