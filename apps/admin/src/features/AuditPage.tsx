import { useEffect, useState } from 'react'
import { listAuditEvents, type AuditEvent } from './products/products.api'

export function AuditPage() {
  const [page, setPage] = useState(1)
  const [retry, setRetry] = useState(0)
  const [action, setAction] = useState('')
  const [outcome, setOutcome] = useState('')
  const [administrator, setAdministrator] = useState('')
  const [entityId, setEntityId] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [data, setData] = useState<{ items: AuditEvent[]; total: number } | null>(null)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setError('')
    void listAuditEvents(page, { action, outcome, administrator, entityId, from: from ? new Date(from).toISOString() : undefined, to: to ? new Date(to).toISOString() : undefined }, controller.signal).then(setData).catch(cause => { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Audit history could not be loaded.') })
    return () => controller.abort()
  }, [page, retry, action, outcome, administrator, entityId, from, to])
  return <section className="live-products" aria-label="Administrative audit history">
    <header className="live-products-heading"><div><span>READ ONLY · SERVER PAGINATED</span><h2>Audit history</h2><p>Recorded administrative inventory actions. Entries are append only through the application.</p></div></header>
    <div className="live-products-toolbar"><label>Action<select value={action} onChange={event => { setAction(event.target.value); setPage(1) }}><option value="">All actions</option>{['PRODUCT_CREATED','PRODUCT_UPDATED','PRODUCT_ARCHIVED','HARDWARE_CHANGED','INVENTORY_ADJUSTED','SOLD','REMOVED'].map(value => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select></label><label>Outcome<select value={outcome} onChange={event => { setOutcome(event.target.value); setPage(1) }}><option value="">All outcomes</option><option value="SUCCESS">Success</option><option value="FAILURE">Failure</option></select></label><label>Administrator<input value={administrator} onChange={event => { setAdministrator(event.target.value); setPage(1) }} placeholder="Email" /></label><label>Entity ID<input value={entityId} onChange={event => { setEntityId(event.target.value); setPage(1) }} /></label><label>From<input type="datetime-local" value={from} onChange={event => { setFrom(event.target.value); setPage(1) }} /></label><label>To<input type="datetime-local" value={to} onChange={event => { setTo(event.target.value); setPage(1) }} /></label></div>
    {error && <p role="alert" className="live-products-message">{error} <button className="button button-quiet" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
    {!data && !error && <p role="status">Loading audit history…</p>}
    {data && data.items.length === 0 && <p>No audit events have been recorded.</p>}
    {data && data.items.length > 0 && <div className="live-products-table-wrap"><table className="live-products-table"><thead><tr><th>Time</th><th>Administrator</th><th>Action</th><th>Entity</th><th>Outcome</th><th>Details</th></tr></thead><tbody>{data.items.map(event => <tr key={event.id}><td>{new Date(event.createdAt).toLocaleString()}</td><td>{event.administrator}</td><td>{event.action.replaceAll('_', ' ')}</td><td>{event.entityType}{event.entityId ? ` · ${event.entityId}` : ''}</td><td>{event.outcome}</td><td>{event.summary}{event.reason ? ` — ${event.reason}` : ''}</td></tr>)}</tbody></table></div>}
    {data && <nav className="live-products-pagination" aria-label="Audit pages"><button className="button button-quiet" disabled={page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page} of {Math.max(1, Math.ceil(data.total / 25))} · {data.total} events</span><button className="button button-quiet" disabled={page >= Math.ceil(data.total / 25)} onClick={() => setPage(value => value + 1)}>Next</button></nav>}
  </section>
}
