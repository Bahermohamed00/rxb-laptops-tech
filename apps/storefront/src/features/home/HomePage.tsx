import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchProductDetail, fetchProducts, type StoreProduct } from '../products/products.api'
import { ProductDetailPage } from '../products/ProductDetailPage'
import { SiteFooter } from '../../components/SiteFooter'
import { HomeSections } from './HomeSections'
import { ProductTile } from './ProductTile'
import { StoreHeader } from './StoreHeader'
import { matchesSearch, parseEgp } from './catalog'
import './home.css'
import './storefront.css'

const useCases = [
  { value: 'WORK', label: 'Work' },
  { value: 'STUDY', label: 'Study' },
  { value: 'GAMING', label: 'Gaming' },
] as const

type UseCase = typeof useCases[number]['value']
type PriceSort = 'RECENT' | 'PRICE_ASC' | 'PRICE_DESC'

function productSlugFromPath() {
  const match = window.location.pathname.match(/^\/products\/([^/]+)\/?$/)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return null }
}

function initialUseCase(): UseCase | null {
  const value = new URLSearchParams(window.location.search).get('use')
  return useCases.some(item => item.value === value) ? value as UseCase : null
}

type HomePageProps = { introVisible: boolean }

export default function HomePage({ introVisible }: HomePageProps) {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [useCase, setUseCase] = useState<UseCase | null>(initialUseCase)
  const [sort, setSort] = useState<PriceSort>('RECENT')
  const [search, setSearch] = useState(() => new URLSearchParams(window.location.search).get('q') ?? '')
  const [selectedProduct, setSelectedProduct] = useState<StoreProduct | null>(null)
  const [routeSlug, setRouteSlug] = useState(productSlugFromPath)
  const [routeLoading, setRouteLoading] = useState(Boolean(productSlugFromPath()))
  const [routeError, setRouteError] = useState('')
  const [routeRetry, setRouteRetry] = useState(0)
  const [minimumDraft, setMinimumDraft] = useState('')
  const [maximumDraft, setMaximumDraft] = useState('')
  const [minimumPrice, setMinimumPrice] = useState<number | null>(null)
  const [maximumPrice, setMaximumPrice] = useState<number | null>(null)
  const [priceError, setPriceError] = useState('')
  const isCatalog = window.location.pathname.replace(/\/$/, '') === '/laptops'
  const liveLaptopCount = products.filter(product => product.productType === 'LAPTOP').length

  useEffect(() => {
    const syncProductRoute = () => {
      setRouteSlug(productSlugFromPath())
    }
    syncProductRoute()
    window.addEventListener('popstate', syncProductRoute)
    return () => window.removeEventListener('popstate', syncProductRoute)
  }, [])

  useEffect(() => {
    if (!routeSlug) {
      setSelectedProduct(null)
      setRouteLoading(false)
      setRouteError('')
      return
    }
    const listedProduct = products.find(product => product.slug === routeSlug)
    if (listedProduct) {
      setSelectedProduct(listedProduct)
      setRouteLoading(false)
      setRouteError('')
      return
    }
    let active = true
    setRouteLoading(true)
    setRouteError('')
    void fetchProductDetail(routeSlug)
      .then(product => { if (active) setSelectedProduct(product) })
      .catch(cause => { if (active) setRouteError(cause instanceof Error ? cause.message : 'Product details could not be loaded.') })
      .finally(() => { if (active) setRouteLoading(false) })
    return () => { active = false }
  }, [products, routeSlug, routeRetry])

  useEffect(() => {
    let controller: AbortController | null = null
    const load = () => {
      controller?.abort()
      controller = new AbortController()
      const requestController = controller
      setLoadingProducts(true)
      setProductsError('')
      void fetchProducts(requestController.signal)
        .then(items => {
          if (!requestController.signal.aborted) setProducts([...new Map(items.map(item => [item.id, item])).values()])
        })
        .catch(error => {
          if (!requestController.signal.aborted) setProductsError(error instanceof Error ? error.message : 'Products could not be loaded.')
        })
        .finally(() => {
          if (!requestController.signal.aborted) setLoadingProducts(false)
        })
    }
    load()
    window.addEventListener('focus', load)
    return () => {
      controller?.abort()
      window.removeEventListener('focus', load)
    }
  }, [reloadKey])

  const matchingProducts = useMemo(() => {
    const filtered = products.filter(product =>
      product.productType === 'LAPTOP' &&
      (!useCase || product.useCase === useCase) &&
      matchesSearch(product, search) &&
      (minimumPrice === null || product.priceMinor >= minimumPrice) &&
      (maximumPrice === null || product.priceMinor <= maximumPrice),
    )
    if (sort === 'PRICE_ASC') filtered.sort((a, b) => a.priceMinor - b.priceMinor)
    if (sort === 'PRICE_DESC') filtered.sort((a, b) => b.priceMinor - a.priceMinor)
    return filtered
  }, [products, useCase, sort, search, minimumPrice, maximumPrice])

  const matchingAccessories = useMemo(() => {
    const filtered = products.filter(product =>
      product.productType !== 'LAPTOP' &&
      matchesSearch(product, search) &&
      (minimumPrice === null || product.priceMinor >= minimumPrice) &&
      (maximumPrice === null || product.priceMinor <= maximumPrice),
    )
    if (sort === 'PRICE_ASC') filtered.sort((a, b) => a.priceMinor - b.priceMinor)
    if (sort === 'PRICE_DESC') filtered.sort((a, b) => b.priceMinor - a.priceMinor)
    return filtered
  }, [products, sort, search, minimumPrice, maximumPrice])

  function applyPriceFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const minimum = parseEgp(minimumDraft)
    const maximum = parseEgp(maximumDraft)
    if (Number.isNaN(minimum) || Number.isNaN(maximum)) {
      setPriceError('Enter valid EGP amounts with up to two decimal places.')
      return
    }
    if (minimum !== null && maximum !== null && minimum > maximum) {
      setPriceError('Minimum price cannot be greater than maximum price.')
      return
    }
    setPriceError('')
    setMinimumPrice(minimum)
    setMaximumPrice(maximum)
  }

  function clearFilters() {
    setUseCase(null)
    setSort('RECENT')
    setMinimumDraft('')
    setMaximumDraft('')
    setMinimumPrice(null)
    setMaximumPrice(null)
    setPriceError('')
  }

  function openProduct(product: StoreProduct) {
    const path = `/products/${encodeURIComponent(product.slug)}`
    if (window.location.pathname !== path) window.history.pushState({ rxbProductDetail: true }, '', path)
    setRouteSlug(product.slug)
    setRouteError('')
    setSelectedProduct(product)
  }

  function closeProduct() {
    if ((window.history.state as { rxbProductDetail?: unknown } | null)?.rxbProductDetail) {
      window.history.back()
      return
    }
    window.history.replaceState(null, '', '/')
    setRouteSlug(null)
    setSelectedProduct(null)
  }

  function submitSearch() {
    if (isCatalog) document.getElementById('laptops')?.scrollIntoView({ behavior: 'smooth' })
    else window.location.assign(`/laptops${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`)
  }

  const header = <StoreHeader products={products} loading={loadingProducts} error={productsError} search={search} onSearchChange={setSearch} onSearchSubmit={submitSearch} onOpenProduct={openProduct} />

  if (routeSlug && !selectedProduct) return <main className="site site-ready sf">
    {header}
    <section className="sf-container pd-route-state" aria-live="polite">
      {routeLoading ? <div className="sf-state"><strong>Loading product details…</strong></div>
        : <div className="sf-state" role="alert"><strong>This product could not be opened.</strong><span>{routeError || 'The listing may have been removed from the catalog.'}</span><button className="sf-btn sf-btn-primary" type="button" onClick={() => setRouteRetry(value => value + 1)}>Try again</button></div>}
    </section>
    <SiteFooter />
  </main>
  if (routeSlug && selectedProduct) return <main className="site site-ready sf">
    {header}
    <ProductDetailPage product={selectedProduct} onClose={closeProduct} />
    <SiteFooter />
  </main>

  if (!isCatalog) return <main className={`site sf ${introVisible ? 'site-muted' : 'site-ready'}`}>
    {header}
    <HomeSections products={products} loading={loadingProducts} error={productsError} onRetry={() => setReloadKey(key => key + 1)} onOpen={openProduct} />
    <SiteFooter />
  </main>

  return <main className={`site sf ${introVisible ? 'site-muted' : 'site-ready'}`}>
    {header}
    <div className="sf-container sf-catalog">
      <section id="laptops" aria-labelledby="sf-catalog-title">
        <div className="sf-section-head"><div><h1 id="sf-catalog-title" className="sf-catalog-title">Laptops</h1><p>{liveLaptopCount} {liveLaptopCount === 1 ? 'laptop' : 'laptops'} in the live RXB catalog.</p></div></div>
        <form className="sf-filters" onSubmit={applyPriceFilter} noValidate>
          <label>Use case<select value={useCase ?? ''} onChange={event => setUseCase((event.target.value || null) as UseCase | null)}><option value="">All laptops</option>{useCases.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          <fieldset>
            <legend>Price range (EGP)</legend>
            <label>Min<input aria-label="Minimum price in EGP" inputMode="decimal" type="number" min="0" step="0.01" value={minimumDraft} onChange={event => setMinimumDraft(event.target.value)} placeholder="Any" /></label>
            <label>Max<input aria-label="Maximum price in EGP" inputMode="decimal" type="number" min="0" step="0.01" value={maximumDraft} onChange={event => setMaximumDraft(event.target.value)} placeholder="Any" /></label>
            <button className="sf-btn sf-btn-primary" type="submit">Apply</button>
          </fieldset>
          <label>Sort by<select value={sort} onChange={event => setSort(event.target.value as PriceSort)}><option value="RECENT">Recently added</option><option value="PRICE_ASC">Price: low to high</option><option value="PRICE_DESC">Price: high to low</option></select></label>
          <button type="button" className="sf-btn sf-btn-ghost sf-filters-clear" onClick={clearFilters}>Clear filters</button>
        </form>
        {priceError && <p className="sf-filter-error" role="alert">{priceError}</p>}
        {productsError ? <div className="sf-state" role="alert"><strong>We couldn’t load the RXB catalog.</strong><span>{productsError}</span><button type="button" className="sf-btn sf-btn-ghost" onClick={() => setReloadKey(key => key + 1)}>Try again</button></div>
          : loadingProducts ? <p className="sf-catalog-count" role="status">Loading published laptops…</p>
            : matchingProducts.length === 0 ? <div className="sf-state">
              <strong>{liveLaptopCount ? 'No laptops match these filters.' : 'No published laptops are available yet.'}</strong>
              <span>{liveLaptopCount ? useCase && products.filter(product => product.productType === 'LAPTOP').every(product => product.useCase === null) ? 'No laptops have been assigned to a use case in the catalog yet.' : 'Try adjusting your search, category, or price range.' : 'Published laptop listings will appear here when available.'}</span>
              <button type="button" className="sf-btn sf-btn-ghost" onClick={() => { clearFilters(); setSearch('') }}>Clear filters</button>
            </div>
              : <>
                <p className="sf-catalog-count" role="status">{matchingProducts.length} {matchingProducts.length === 1 ? 'laptop' : 'laptops'} found{search.trim() ? ` for “${search.trim()}”` : ''}</p>
                <div className="sf-product-grid">{matchingProducts.map((product, index) => <ProductTile key={product.id} product={product} index={index} onOpen={() => openProduct(product)} />)}</div>
              </>}
      </section>

      <section className="sf-section" id="accessories" aria-labelledby="sf-accessories-title">
        <div className="sf-section-head"><div><h2 id="sf-accessories-title">Accessories</h2><p>Accessories currently listed in the RXB catalog.</p></div></div>
        {productsError ? <p className="sf-catalog-count" role="alert">Accessories could not be loaded.</p>
          : loadingProducts ? <p className="sf-catalog-count" role="status">Loading listed accessories…</p>
            : matchingAccessories.length
              ? <div className="sf-product-grid">{matchingAccessories.map((product, index) => <ProductTile key={product.id} product={product} index={index} onOpen={() => openProduct(product)} />)}</div>
              : <p className="sf-catalog-count" role="status">{products.some(product => product.productType !== 'LAPTOP') ? 'No accessories match the current search and filters.' : 'No accessories are currently listed.'}</p>}
      </section>
    </div>
    <SiteFooter />
  </main>
}
