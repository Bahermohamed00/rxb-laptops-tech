import { useCallback, useEffect, useState } from 'react'
import { listAllProducts, updateInventoryQuantity, type ApiProduct } from '../products/products.api'
import { stockLevel } from './inventory.model'
import './live-inventory.css'

const productTypeLabel = (product: ApiProduct) => product.productType === 'OTHER_ACCESSORY'
  ? 'Other accessory'
  : product.productType.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())

export function LiveInventoryPage({ csrfToken }: { csrfToken: string }) {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [quantities, setQuantities] = useState<Record<string, string>>({})
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [feedback, setFeedback] = useState('')
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState('all')
  const [sort, setSort] = useState('name')
  const refresh = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const items = await listAllProducts()
      setProducts(items.filter(item => item.status !== 'ARCHIVED'))
      setQuantities(Object.fromEntries(items.filter(item => item.status !== 'ARCHIVED').map(item => [item.id, String(item.stockQuantity)])))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Inventory could not be loaded.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])
  const visibleProducts = products.filter(product => {
    const term = search.trim().toLowerCase()
    return (!term || `${product.brand} ${product.model} ${product.cpu ?? ''} ${product.gpu ?? ''}`.toLowerCase().includes(term)) && (stockFilter === 'all' || stockLevel(product.stockQuantity) === stockFilter)
  }).sort((a, b) => sort === 'quantity-asc' ? a.stockQuantity - b.stockQuantity || a.model.localeCompare(b.model) : sort === 'quantity-desc' ? b.stockQuantity - a.stockQuantity || a.model.localeCompare(b.model) : a.model.localeCompare(b.model))
  const totalStock = products.reduce((total, product) => total + product.stockQuantity, 0)

  async function save(product: ApiProduct) {
    const quantity = Number(quantities[product.id])
    if (!Number.isSafeInteger(quantity) || quantity < 0 || quantity > 1_000_000) { setError('Enter a whole quantity from 0 to 1,000,000.'); return }
    const reason = reasons[product.id]?.trim() ?? ''
    if (!reason || reason.length > 500) { setError('Enter a reason for the stock change (1–500 characters).'); document.querySelector<HTMLInputElement>(`[name="reason-${product.id}"]`)?.focus(); return }
    setSaving(product.id); setError(''); setFeedback('')
    try {
      const result = await updateInventoryQuantity(product.id, quantity, reason, csrfToken)
      setProducts(current => current.map(item => item.id === product.id ? { ...item, stockQuantity: result.stockQuantity, updatedAt: result.updatedAt } : item))
      setReasons(current => ({ ...current, [product.id]: '' }))
      setFeedback(`${product.brand} ${product.model} inventory updated.`)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Inventory could not be saved.') }
    finally { setSaving(null) }
  }

  return <section className="live-inventory" aria-labelledby="inventory-title">
    <header><div><span>DATABASE INVENTORY</span><h2 id="inventory-title">Physical catalog stock</h2><p>Each quantity counts complete items for its product. Laptop upgrade options do not create separate stock counts.</p></div><div className="live-inventory-actions"><span>On hand <strong data-inventory-total>{loading ? '—' : totalStock.toLocaleString('en-EG')}</strong></span><button className="button button-quiet" onClick={() => void refresh()} disabled={loading}>Refresh</button><button className="button button-primary" onClick={() => document.querySelector<HTMLInputElement>('.live-inventory-row input')?.focus()} disabled={!products.length}>Adjust stock</button></div></header>
    {feedback && <p className="inventory-feedback" role="status">{feedback}</p>}
    {error && <p className="inventory-api-error" role="alert">{error}</p>}
    {loading ? <div className="live-inventory-empty" role="status">Loading inventory…</div>
      : !error && products.length === 0 ? <div className="live-inventory-empty"><strong>No active inventory records</strong><span>Add products in the catalog to manage available stock.</span></div>
      : <><div className="live-inventory-filters"><label>Search<input name="inventorySearch" type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="Brand, model, or product details" /></label><label>Stock status<select name="stockFilter" value={stockFilter} onChange={event => setStockFilter(event.target.value)}><option value="all">All stock</option><option value="zero">Out of stock</option><option value="low">Low stock</option><option value="healthy">Healthy stock</option></select></label><label>Sort<select name="inventorySort" value={sort} onChange={event => setSort(event.target.value)}><option value="name">Name</option><option value="quantity-asc">Quantity: low to high</option><option value="quantity-desc">Quantity: high to low</option></select></label><span>{visibleProducts.length} of {products.length} records</span></div><div className="live-inventory-list">{visibleProducts.map(product => <article className="live-inventory-row" key={product.id}>
        <div className="live-inventory-identity"><span>{productTypeLabel(product)} · {product.brand} · {product.status} · {stockLevel(product.stockQuantity).toUpperCase()}</span><strong>{product.model}</strong><small>{product.condition === 'NEW' ? 'New' : 'Pre-owned'}{product.productType === 'LAPTOP' ? ` · ${product.cpu} · ${product.baseRamGB} GB RAM · ${product.baseStorageGB} GB ${product.baseStorageType}` : ''}</small></div>
        <label>Available quantity<input name={`stock-${product.id}`} type="number" min="0" max="1000000" step="1" value={quantities[product.id] ?? ''} onChange={event => setQuantities(current => ({ ...current, [product.id]: event.target.value }))} /></label>
        <label>Reason for change<input name={`reason-${product.id}`} maxLength={500} value={reasons[product.id] ?? ''} onChange={event => setReasons(current => ({ ...current, [product.id]: event.target.value }))} /></label>
        <button className="button button-primary" type="button" aria-label={`Save stock for ${product.model}`} disabled={saving !== null || quantities[product.id] === String(product.stockQuantity)} onClick={() => void save(product)}>{saving === product.id ? 'Saving…' : 'Save stock'}</button>
      </article>)}{visibleProducts.length === 0 && <div className="live-inventory-empty"><strong>No matching inventory</strong><span>Try a different search or stock filter.</span></div>}</div></>}
  </section>
}
