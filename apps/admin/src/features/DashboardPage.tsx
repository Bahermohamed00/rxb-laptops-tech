import { useEffect, useState } from 'react'
import type { Navigate } from '../navigation'
import { API_BASE_URL } from '../config/api-base.runtime'
import './dashboard.css'

type Overview = {
  generatedAt: string
  products: { total: number; active: number }
  inventory: { availableUnits: number; legacyQuantityUnits: number; individuallyTrackedAvailableUnits: number }
  unavailable: { salesAndRevenue: string; lowStock: string }
}

async function getOverview(signal: AbortSignal): Promise<Overview> {
  const response = await fetch(`${API_BASE_URL}/admin/dashboard/overview`, { credentials: 'include', signal })
  if (response.status === 401) throw new Error('Your admin session has expired. Sign in again.')
  if (response.status === 403) throw new Error('You do not have permission to view the overview.')
  if (!response.ok) throw new Error(`Overview data could not be loaded (HTTP ${response.status}).`)
  return response.json() as Promise<Overview>
}

export function DashboardPage({ onNavigate }: { onNavigate: Navigate }) {
  const [data, setData] = useState<Overview | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError(null)
    getOverview(controller.signal).then(value => {
      setData(value)
      setLoading(false)
    }).catch(cause => {
      if (controller.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Overview data could not be loaded.')
      setLoading(false)
    })
    return () => controller.abort()
  }, [refreshKey])

  const legacy = data?.inventory.legacyQuantityUnits ?? 0
  const individual = data?.inventory.individuallyTrackedAvailableUnits ?? 0
  const total = legacy + individual
  const legacyPercent = total ? Math.round(legacy / total * 100) : 0
  const updated = data ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(data.generatedAt)) : null

  return <main className="dashboard-overview" aria-labelledby="dashboard-overview-title" aria-busy={loading}>
    <header className="dashboard-welcome">
      <div><p className="eyebrow">BUSINESS SNAPSHOT <span>/</span> LIVE DATABASE AGGREGATES</p><h2 id="dashboard-overview-title">Catalog &amp; inventory</h2><p className="dashboard-subtitle">A current view of your catalog and available stock.</p></div>
      <div className="dashboard-actions"><span className="dashboard-live"><i aria-hidden="true" />{loading ? 'Updating' : 'Connected'}</span><button className="button button-quiet dashboard-refresh" type="button" onClick={() => setRefreshKey(key => key + 1)} disabled={loading}><span aria-hidden="true">↻</span> Refresh</button></div>
    </header>

    {error && <section className="dashboard-error" role="alert"><div><strong>Overview unavailable</strong><p>{error}</p></div><button className="button button-quiet" type="button" onClick={() => setRefreshKey(key => key + 1)}>Retry</button></section>}

    <section className="dashboard-kpis" aria-label="Catalog and inventory summary">
      <Metric title="Active products" value={data?.products.active} detail={data ? `${data.products.total} total catalog records` : 'Current catalog listings'} accent="blue" loading={loading && !data} />
      <Metric title="Available units" value={data?.inventory.availableUnits} detail="Legacy quantity + available individual units" accent="cyan" loading={loading && !data} />
      <Metric title="Individual units" value={data?.inventory.individuallyTrackedAvailableUnits} detail="Tracked laptops with AVAILABLE status" accent="violet" loading={loading && !data} />
    </section>

    <div className="dashboard-content-grid">
      <section className="dashboard-card inventory-card" aria-labelledby="inventory-mix-title">
        <div className="dashboard-card-heading"><div><p className="eyebrow">STOCK COMPOSITION</p><h3 id="inventory-mix-title">Available inventory</h3></div><button className="dashboard-link" type="button" onClick={() => onNavigate('Inventory')}>View inventory <span aria-hidden="true">→</span></button></div>
        {loading && !data ? <div className="dashboard-skeleton dashboard-chart-skeleton" aria-label="Loading inventory" /> : data ? <>
          <div className="inventory-total"><strong>{data.inventory.availableUnits.toLocaleString()}</strong><span>available units</span></div>
          <div className="inventory-bar" role="img" aria-label={`${legacy} legacy quantity units and ${individual} individually tracked available units`}><span className="inventory-bar-legacy" style={{ width: `${legacyPercent}%` }} /><span className="inventory-bar-individual" style={{ width: `${100 - legacyPercent}%` }} /></div>
          <div className="inventory-legend"><div><i className="legend-legacy" /><span>Legacy quantity</span><strong>{legacy.toLocaleString()}</strong></div><div><i className="legend-individual" /><span>Individual units</span><strong>{individual.toLocaleString()}</strong></div></div>
          {total === 0 && <p className="dashboard-empty-note">No available stock is currently recorded.</p>}
        </> : !error ? <p className="dashboard-empty-note">Inventory data is unavailable.</p> : null}
        <p className="dashboard-footnote">Legacy figures sum product quantities; individual figures count units marked available.</p>
      </section>

      <section className="dashboard-card unavailable-card" aria-labelledby="sales-unavailable-title">
        <div className="dashboard-card-heading"><div><p className="eyebrow">SALES PERFORMANCE</p><h3 id="sales-unavailable-title">Revenue &amp; orders</h3></div><span className="unavailable-mark" aria-hidden="true">—</span></div>
        <div className="unavailable-content"><span className="unavailable-icon" aria-hidden="true">↗</span><div><strong>Not available yet</strong><p>There are no persisted order, payment, or refund records to calculate paid revenue or order trends.</p></div></div>
        <div className="dashboard-unavailable-foot">WhatsApp inquiries are not recorded as confirmed sales.</div>
      </section>

      <section className="dashboard-card unavailable-card" aria-labelledby="stock-alert-title">
        <div className="dashboard-card-heading"><div><p className="eyebrow">INVENTORY HEALTH</p><h3 id="stock-alert-title">Low-stock alerts</h3></div><span className="unavailable-mark" aria-hidden="true">—</span></div>
        <div className="unavailable-content"><span className="unavailable-icon" aria-hidden="true">⌁</span><div><strong>Threshold not configured</strong><p>Low-stock alerts need a product-level threshold before they can be calculated accurately.</p></div></div>
        <button className="dashboard-link dashboard-card-link" type="button" onClick={() => onNavigate('Products')}>Manage catalog <span aria-hidden="true">→</span></button>
      </section>
    </div>
    <footer className="dashboard-footer"><span>Figures reflect catalog records and available stock only.</span>{updated && <span>Updated {updated}</span>}</footer>
  </main>
}

function Metric({ title, value, detail, accent, loading }: { title: string; value?: number; detail: string; accent: string; loading: boolean }) {
  return <article className={`dashboard-metric metric-${accent}`}>
    <div className="metric-heading"><span>{title}</span><i aria-hidden="true" /></div>
    {loading ? <div className="dashboard-skeleton dashboard-number-skeleton" aria-hidden="true" /> : <strong className="metric-value">{value?.toLocaleString() ?? '—'}</strong>}
    <p>{detail}</p>
  </article>
}
