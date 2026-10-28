import { useCallback, useEffect, useMemo, useState } from 'react'
import { imageSource, listProducts, type ApiProduct, type ProductSearch, type ProductType } from './products.api'
import { LiveProductEditor } from './LiveProductEditor'
import { ProductEditPage } from './ProductEditPage'
import './live-products.css'

const PAGE_SIZE = 12
const productTypes: { value: ProductType; label: string }[] = [
  { value: 'LAPTOP', label: 'Laptop' },
  { value: 'KEYBOARD', label: 'Keyboard' },
  { value: 'MOUSE', label: 'Mouse' },
  { value: 'MOUSE_PAD', label: 'Mouse Pad' },
  { value: 'OTHER_ACCESSORY', label: 'Other accessory' },
]
const productTypeLabel = (type: ProductType) => productTypes.find(item => item.value === type)?.label ?? type

function price(product: ApiProduct) {
  return (product.priceMinor / 100).toLocaleString('en-EG', { style: 'currency', currency: product.currency })
}

function dateLabel(value: string) {
  return new Date(value).toLocaleDateString('en-EG', { year: 'numeric', month: 'short', day: 'numeric' })
}

function priceMinor(value: string) {
  if (!value.trim()) return null
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return Number.NaN
  const [whole, fraction = ''] = value.trim().split('.')
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, '0'))
  return Number.isSafeInteger(amount) ? amount : Number.NaN
}

export function LiveProductsPage({ csrfToken, productId, navigateProduct }: { csrfToken: string; productId: string | null; navigateProduct: (id: string | null) => void }) {
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [search, setSearch] = useState('')
  const [minPrice, setMinPrice] = useState('')
  const [maxPrice, setMaxPrice] = useState('')
  const [conditionFilter, setConditionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [productTypeFilter, setProductTypeFilter] = useState<ProductType | ''>('')
  const [useCaseFilter, setUseCaseFilter] = useState('')
  const [ramGB, setRamGB] = useState('')
  const [ramType, setRamType] = useState('')
  const [storageGB, setStorageGB] = useState('')
  const [storageType, setStorageType] = useState('')
  const [screenSize, setScreenSize] = useState('')
  const [resolution, setResolution] = useState('')
  const [sort, setSort] = useState<NonNullable<ProductSearch['sort']>>('UPDATED_DESC')
  const [page, setPage] = useState(1)
  const [editing, setEditing] = useState<ApiProduct | null | undefined>(undefined)
  const [addingProduct, setAddingProduct] = useState(false)
  const [selectedType, setSelectedType] = useState<ProductType | null>(null)

  const minMinor = priceMinor(minPrice)
  const maxMinor = priceMinor(maxPrice)
  const priceError = Number.isNaN(minMinor) ? 'Enter a valid minimum price in EGP.'
    : Number.isNaN(maxMinor) ? 'Enter a valid maximum price in EGP.'
      : minMinor !== null && maxMinor !== null && minMinor > maxMinor ? 'Maximum price cannot be lower than minimum price.' : ''
  const searchParams = useMemo<ProductSearch | null>(() => {
    if (priceError) return null
    return {
      q: search.trim() || undefined,
      productType: productTypeFilter || undefined,
      minPriceMinor: minMinor ?? undefined,
      maxPriceMinor: maxMinor ?? undefined,
      condition: conditionFilter ? conditionFilter as ApiProduct['condition'] : undefined,
      status: statusFilter ? statusFilter as ApiProduct['status'] : undefined,
      useCase: productTypeFilter === 'LAPTOP' && useCaseFilter ? useCaseFilter as NonNullable<ProductSearch['useCase']> : undefined,
      ramGB: productTypeFilter === 'LAPTOP' && ramGB ? Number(ramGB) : undefined,
      ramType: productTypeFilter === 'LAPTOP' ? ramType || undefined : undefined,
      storageGB: productTypeFilter === 'LAPTOP' && storageGB ? Number(storageGB) : undefined,
      storageType: productTypeFilter === 'LAPTOP' ? storageType || undefined : undefined,
      displaySizeInches: productTypeFilter === 'LAPTOP' && screenSize ? Number(screenSize) : undefined,
      displayResolution: productTypeFilter === 'LAPTOP' ? resolution.trim() || undefined : undefined,
      page,
      pageSize: PAGE_SIZE,
      sort,
    }
  }, [search, minPrice, maxPrice, minMinor, maxMinor, priceError, conditionFilter, statusFilter, productTypeFilter, useCaseFilter, ramGB, ramType, storageGB, storageType, screenSize, resolution, page, sort])

  const refresh = useCallback(async (query: ProductSearch) => {
    setLoading(true)
    setError('')
    try {
      const result = await listProducts(query)
      setProducts(result.items)
      setTotal(result.total)
    }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Products could not be loaded.') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => {
    if (!searchParams) return
    const timer = window.setTimeout(() => { void refresh(searchParams) }, 250)
    return () => window.clearTimeout(timer)
  }, [searchParams, refresh])
  useEffect(() => { setPage(1)   }, [search, minPrice, maxPrice, conditionFilter, statusFilter, productTypeFilter, useCaseFilter, ramGB, ramType, storageGB, storageType, screenSize, resolution, sort])

  function returnToList() {
    navigateProduct(null)
    if (searchParams) void refresh(searchParams)
  }

  if (productId) return <ProductEditPage key={productId} productId={productId} csrfToken={csrfToken} onBack={returnToList} />

  if (addingProduct && selectedType === null) return <section className="live-products live-product-type-picker" aria-labelledby="product-type-title">
    <header className="live-products-heading"><div><span>PRODUCT CATALOG · NEW LISTING</span><h2 id="product-type-title">Choose a product type</h2><p>Select the type that matches the catalog record you want to create.</p></div><button type="button" className="button button-quiet" onClick={() => setAddingProduct(false)}>Cancel</button></header>
    <div className="live-product-type-grid">{productTypes.map(type => <button type="button" className="live-product-type-option is-supported" key={type.value} onClick={() => { setSelectedType(type.value); setEditing(null) }}>
      <strong>{type.label}</strong><span>{type.value === 'LAPTOP' ? 'Laptop specifications, compatible configurations, and quantity-based inventory.' : 'Accessory listing with database-backed price, image, publication status, and counted stock.'}</span><small>SUPPORTED · DATABASE CATALOG</small>
    </button>)}</div>
  </section>

  if (editing !== undefined) return <LiveProductEditor key={editing?.id ?? 'new'} product={editing ?? undefined} initialProductType={selectedType ?? 'LAPTOP'} csrfToken={csrfToken} onCancel={() => {
    setEditing(undefined)
    if (addingProduct) setSelectedType(null)
    else setAddingProduct(false)
  }} onSaved={async saved => {
    const created = editing === null
    setEditing(undefined)
    setAddingProduct(false)
    setSelectedType(null)
    setNotice(`${saved.brand} ${saved.model} ${created ? 'was created' : 'was updated'}.`)
    if (searchParams) await refresh(searchParams)
  }} />

  return <section className="live-products" aria-label="Product catalog">
    <header className="live-products-heading">
      <div><span>DATABASE CATALOG</span><h2>Products</h2><p>Manage laptop and accessory listings from the connected API database.</p></div>
      <button className="button button-primary" onClick={() => { setNotice(''); setAddingProduct(true); setSelectedType(null) }}>Add product <span aria-hidden="true">+</span></button>
    </header>
    <div className="live-products-toolbar">
      <label>Search products<input type="search" placeholder="Name, brand, model, CPU, GPU, RAM, storage, resolution, or slug" value={search} onChange={event => { setSearch(event.target.value); setPage(1) }} /></label>
      <label>Product type<select value={productTypeFilter} onChange={event => { setProductTypeFilter(event.target.value as ProductType | ''); setPage(1) }}><option value="">All product types</option>{productTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}</select></label>
      <label>Status<select value={statusFilter} onChange={event => { setStatusFilter(event.target.value); setPage(1) }}><option value="">All statuses</option><option value="DRAFT">Draft</option><option value="ACTIVE">Published</option><option value="ARCHIVED">Archived</option></select></label>
      <label>Condition<select value={conditionFilter} onChange={event => { setConditionFilter(event.target.value); setPage(1) }}><option value="">All conditions</option><option value="NEW">New</option><option value="PRE_OWNED">Pre-owned</option></select></label>
      {productTypeFilter === 'LAPTOP' && <label>Use case<select value={useCaseFilter} onChange={event => { setUseCaseFilter(event.target.value); setPage(1) }}><option value="">All use cases</option><option value="WORK">Work</option><option value="STUDY">Study</option><option value="GAMING">Gaming</option><option value="UNCATEGORIZED">Uncategorized</option></select></label>}
      <label>Minimum price (EGP)<input inputMode="decimal" value={minPrice} onChange={event => { setMinPrice(event.target.value); setPage(1) }} placeholder="Any" />{Number.isNaN(minMinor) && <span className="live-field-error" role="alert">Enter a valid minimum price in EGP.</span>}</label>
      <label>Maximum price (EGP)<input inputMode="decimal" value={maxPrice} onChange={event => { setMaxPrice(event.target.value); setPage(1) }} placeholder="Any" aria-invalid={Boolean(priceError)} />{(Number.isNaN(maxMinor) || (minMinor !== null && maxMinor !== null && minMinor > maxMinor)) && <span className="live-field-error" role="alert">{Number.isNaN(maxMinor) ? 'Enter a valid maximum price in EGP.' : 'Maximum price cannot be lower than minimum price.'}</span>}</label>
      {productTypeFilter === 'LAPTOP' && <><label>RAM capacity<input type="number" min="1" value={ramGB} onChange={event => { setRamGB(event.target.value); setPage(1) }} placeholder="Any" /></label>
      <label>RAM type<select value={ramType} onChange={event => { setRamType(event.target.value); setPage(1) }}><option value="">Any RAM type</option>{['DDR4','DDR5','LPDDR4X','LPDDR5','LPDDR5X','OTHER'].map(type => <option key={type}>{type}</option>)}</select></label>
      <label>Storage capacity<input type="number" min="1" value={storageGB} onChange={event => { setStorageGB(event.target.value); setPage(1) }} placeholder="Any" /></label>
      <label>Storage type<select value={storageType} onChange={event => { setStorageType(event.target.value); setPage(1) }}><option value="">Any storage type</option>{['SSD','HDD','NVME','SATA','OTHER'].map(type => <option key={type}>{type}</option>)}</select></label>
      <label>Screen size (inches)<input type="number" min="1" max="100" step="0.1" value={screenSize} onChange={event => { setScreenSize(event.target.value); setPage(1) }} placeholder="Any" /></label>
      <label>Resolution<input value={resolution} onChange={event => { setResolution(event.target.value); setPage(1) }} placeholder="e.g. 1920 × 1080" /></label></>}
      <label>Sort by<select value={sort} onChange={event => { setSort(event.target.value as NonNullable<ProductSearch['sort']>); setPage(1) }}><option value="UPDATED_DESC">Recently updated</option><option value="CREATED_DESC">Recently added</option><option value="PRICE_ASC">Price: low to high</option><option value="PRICE_DESC">Price: high to low</option><option value="NAME_ASC">Name: A to Z</option><option value="NAME_DESC">Name: Z to A</option></select></label>
      <button className="button button-quiet" onClick={() => { if (searchParams) void refresh(searchParams) }} disabled={loading || !searchParams}>Refresh</button>
      <span>{loading ? 'Searching…' : `${total} matching products`}</span>
    </div>
    {priceError && <p className="live-products-message" role="alert">{priceError}</p>}
    <p className="live-products-search-note">Serial-number search is unavailable: the current inventory model tracks product quantities and adjustments, not individually serialized units.</p>
    {notice && <p className="live-products-success" role="status">{notice}</p>}
    {error && <div className="live-products-message" role="alert"><span>{error}</span><button className="button button-quiet" onClick={() => { if (searchParams) void refresh(searchParams) }}>Retry</button></div>}
    {loading ? <div className="live-products-empty" role="status">Loading catalog…</div>
      : !error && total === 0 ? <div className="live-products-empty"><strong>No matching products</strong><span>{search || minPrice || maxPrice || conditionFilter || statusFilter || productTypeFilter || useCaseFilter || ramGB || ramType || storageGB || storageType || screenSize || resolution ? 'Try changing the search or filters.' : 'Add your first laptop or accessory. It will be saved to the configured API database.'}</span></div>
          : <div className="live-products-table-wrap"><table className="live-products-table">
            <thead><tr><th scope="col">Image</th><th scope="col">Product</th><th scope="col">Type</th><th scope="col">Price</th><th scope="col">Condition</th><th scope="col">Stock</th><th scope="col">Publication</th><th scope="col">Updated</th><th scope="col">Actions</th></tr></thead>
            <tbody>{products.map(product => <tr key={product.id} className="live-product-row" tabIndex={0} aria-label={`View ${product.brand} ${product.model}`} onClick={() => navigateProduct(product.id)} onKeyDown={event => { if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); navigateProduct(product.id) } }}>
              <td><div className="live-table-thumbnail">{product.image ? <img src={imageSource(product.image.imageUrl)} alt="" /> : <span aria-label="No image">—</span>}</div></td>
              <td><strong>{product.model}</strong><span>{product.brand} · {product.model}</span>{product.description.startsWith('SAMPLE / TEST LISTING') && <small className="live-table-sample">SAMPLE / TEST</small>}</td>
              <td>{productTypeLabel(product.productType)}{product.productType === 'LAPTOP' && product.useCase ? <small>{product.useCase}</small> : null}</td><td>{price(product)}</td>
              <td>{product.condition === 'NEW' ? 'New' : 'Pre-owned'}</td>
              <td>{product.stockQuantity}<small>{product.stockQuantity > 0 ? 'Available' : 'Out of stock'}</small></td>
              <td><span className={`live-status status-${product.status.toLowerCase()}`}>{product.status === 'ACTIVE' ? 'PUBLISHED' : product.status}</span></td>
              <td>{dateLabel(product.updatedAt)}</td>
              <td><div className="live-product-row-actions">
                <button type="button" onClick={event => { event.stopPropagation(); navigateProduct(product.id) }}>View</button>
                <button type="button" onClick={event => { event.stopPropagation(); navigateProduct(product.id) }}>Edit</button>
              </div></td>
            </tr>)}</tbody>
          </table></div>}
    {!loading && !error && total > PAGE_SIZE && <nav className="live-products-pagination" aria-label="Products pages">
      <button type="button" className="button button-quiet" disabled={page <= 1} onClick={() => setPage(current => current - 1)}>Previous</button>
      <span>Page {page} of {Math.ceil(total / PAGE_SIZE)}</span>
      <button type="button" className="button button-quiet" disabled={page >= Math.ceil(total / PAGE_SIZE)} onClick={() => setPage(current => current + 1)}>Next</button>
    </nav>}
    <p className="live-products-archive-note">Archive is a safe, reversible-in-history alternative to deleting a product. The API preserves products referenced by inventory history.</p>
  </section>
}
