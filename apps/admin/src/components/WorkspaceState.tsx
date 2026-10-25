import type { ReactNode } from 'react'
import { Icon, type IconName } from './Icon'
export function StatusBadge({ children = 'Not connected' }: { children?: ReactNode }) {
  return <span className="status-badge"><span aria-hidden="true" />{children}</span>
}
export function EmptyState({ icon, title, description }: { icon: IconName; title: string; description: string }) {
  return <div className="empty-state" data-motion="empty-state"><div className="empty-symbol"><Icon name={icon} /></div><div><h3>{title}</h3><p>{description}</p></div><span className="empty-cross" aria-hidden="true">+</span></div>
}
export function ConnectionPanel({ service = 'Business services', note }: { service?: string; note?: string }) {
  return <aside className="connection-panel" aria-labelledby="connection-title" data-motion="connection-panel">
    <div className="panel-caption"><Icon name="Connection" /><span>System overview</span></div>
    <h2 id="connection-title">The foundation.<br />The next chapter.</h2>
    <p className="system-disclaimer">Known development states.<br />Not a live health check.</p>
    <dl className="connection-list"><div><dt><Icon name="Layers" />Backend</dt><dd>Not implemented</dd></div><div><dt><Icon name="Lock" />Authentication</dt><dd>Not configured</dd></div><div><dt><Icon name="Reports" />Business data</dt><dd>Unavailable</dd></div></dl>
    <p className="system-scope">{service} · Interface preview</p>
    <div className="connection-note"><Icon name="Lock" /><p>{note ?? 'No live records or credentials are collected in this preview.'}</p></div>
  </aside>
}
