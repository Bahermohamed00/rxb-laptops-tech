import { useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { EmptyState } from '../../components/WorkspaceState'
import type { Navigate } from '../../navigation'
import { useInventory } from './useInventory'
import { initialInventoryQuery, inventoryOverview, LOW_STOCK_THRESHOLD, selectInventory } from './inventory.model'
import type { InventoryQuery } from './inventory.types'
import { InventoryCollection } from './InventoryCollection'
import type { InventoryAction } from './InventoryCollection'
import { StockAdjustmentDrawer } from './StockAdjustmentDrawer'
import { InventoryArchiveDialog, InventoryDetails } from './InventoryDetails'
import '../products/products.css'
import './inventory.css'

export function InventoryPage({ onNavigate }: { onNavigate: Navigate }) {
  const { catalog, refresh } = useInventory()
  const [query, setQuery] = useState(initialInventoryQuery)
  const [overlay, setOverlay] = useState<{ kind: InventoryAction; productId?: string } | null>(null)
  const [feedback, setFeedback] = useState('')
  const ready = catalog.status === 'ready'
  const overview = useMemo(() => inventoryOverview(catalog.products), [catalog.products])
  const products = useMemo(() => selectInventory(catalog.products, query), [catalog.products, query])
  const count = (value: number) => ready ? value.toLocaleString('en-EG') : '—'
  const open = (kind: InventoryAction, productId?: string) => { setFeedback(''); setOverlay({ kind, productId }) }
  return <section className="inventory-page" aria-label="Inventory management">
    <header className="inventory-intro"><div><span className="inventory-mode"><Icon name="Inventory" />Development-only · Simulated stock</span><h2>Every unit.<br />A clearer picture.</h2><p>One shared local catalog. Inspect quantities, spot low stock, and preview adjustments without affecting live inventory.</p></div><div className="inventory-header-actions"><button type="button" className="button button-primary" data-inventory-primary disabled={!ready || !catalog.products.length} onClick={() => open('adjust')}>Adjust stock <span aria-hidden="true">↗</span></button><span>Browser storage only</span></div></header>
    <dl className="inventory-overview" aria-label="Local inventory overview"><div><dt>Local products</dt><dd>{count(overview.records)}</dd><span>All catalog statuses</span></div><div><dt>Prototype units</dt><dd data-inventory-total>{count(overview.units)}</dd><span>Includes draft products</span></div><div className="inventory-metric-low"><dt>Low-stock products</dt><dd>{count(overview.low)}</dd><span>1–{LOW_STOCK_THRESHOLD} units · UI-only rule</span></div><div><dt>Zero-stock products</dt><dd>{count(overview.zero)}</dd><span>Known local zero quantities</span></div></dl>
    <div role="status" aria-live="polite" aria-atomic="true" className={feedback ? 'inventory-feedback' : 'inventory-sr-only'}>{feedback}</div>
    <div className="inventory-surface"><div className="inventory-surface-heading"><div><h3>Stock overview</h3><p>Quantities come directly from Products. Low stock and catalog availability are shown separately.</p></div><span className="inventory-source">Shared with Products</span></div>
      <fieldset className="inventory-toolbar" disabled={!ready}><legend className="inventory-sr-only">Search, filter and sort inventory</legend><label><span>Search products</span><input type="search" name="inventorySearch" placeholder="Brand, model, CPU or GPU" value={query.search} onChange={event => setQuery({ ...query, search: event.target.value })} /></label><label><span>Stock status</span><select name="stockFilter" value={query.stock} onChange={event => setQuery({ ...query, stock: event.target.value as InventoryQuery['stock'] })}><option value="">All stock levels</option><option value="low">Low stock · 1–5 units</option><option value="zero">Out of stock · 0 units</option><option value="healthy">Above threshold · 6+ units</option></select></label><label><span>Sort by</span><select name="inventorySort" value={query.sort} onChange={event => setQuery({ ...query, sort: event.target.value as InventoryQuery['sort'] })}><option value="name">Product name · A–Z</option><option value="quantity-asc">Quantity · low to high</option><option value="quantity-desc">Quantity · high to low</option><option value="updated">Product recently updated</option></select></label></fieldset>
      <div className="inventory-results"><span role="status" aria-live="polite">{ready ? `${products.length} of ${catalog.products.length} local products` : catalog.status === 'restoring' ? 'Reading local products…' : 'Local stock unavailable'}</span>{(query.search || query.stock) && <button type="button" onClick={() => setQuery(initialInventoryQuery)}>Clear filters</button>}</div>
      {catalog.status === 'restoring' ? <div className="inventory-empty" aria-busy="true"><EmptyState icon="Inventory" title="Reading local quantities" description="Checking the existing product catalog. No stock is inferred while it loads." /></div>
        : !ready ? <div className="inventory-empty"><div role="alert"><EmptyState icon="Connection" title="Local stock is unavailable." description="The product catalog could not be read. Existing data is preserved; quantities and totals are not shown as zero." /></div><div className="inventory-inline-actions"><button type="button" className="button button-quiet" onClick={refresh}>Retry reading catalog</button><button type="button" className="button button-quiet" onClick={() => onNavigate('Products')}>Open Products recovery</button></div></div>
          : !catalog.products.length ? <div className="inventory-empty"><EmptyState icon="Inventory" title="Your products bring this view to life." description="Create a development product first. It appears here automatically with the same prototype quantity; there is no separate inventory record to add." /><button type="button" className="button button-quiet" onClick={() => onNavigate('Products')}>Manage products</button></div>
            : <InventoryCollection products={products} onAction={open} onClear={() => setQuery(initialInventoryQuery)} />}
    </div>
    <aside className="inventory-boundary"><Icon name="Lock" /><div><strong>One product, one local quantity.</strong><p>Separate inventory creation, archival, reservations, and movement history need an agreed backend contract. No real stock transactions are performed here.</p></div><button type="button" className="button button-quiet" onClick={() => onNavigate('Products')}>Manage products</button></aside>
    {overlay?.kind === 'adjust' && <StockAdjustmentDrawer selectedId={overlay.productId} onClose={() => setOverlay(null)} onSaved={product => { setQuery(initialInventoryQuery); setFeedback(`Simulated adjustment saved: ${product.brand} ${product.model} now has ${product.stockQuantity} prototype units. Products uses this same quantity.`) }} />}
    {overlay?.kind === 'details' && overlay.productId && <InventoryDetails productId={overlay.productId} onClose={() => setOverlay(null)} />}
    {overlay?.kind === 'archive' && overlay.productId && <InventoryArchiveDialog productId={overlay.productId} onClose={() => setOverlay(null)} />}
  </section>
}
