import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchProductDetail, fetchProducts, type StoreProduct } from '../products/products.api'
import { ProductDetailPage } from '../products/ProductDetailPage'
import { SiteFooter } from '../../components/SiteFooter'
import { whatsappUrl } from '../../config/business-contact'
import { HomeSections } from './HomeSections'
import { ProductTile } from './ProductTile'
import { StoreHeader } from './StoreHeader'
import { matchesSearch, parseEgp } from './catalog'
import type { Theme } from '../../theme/useTheme'
import './home.css'
import './storefront.css'

// Laptop listing categories. Each maps 1:1 to the product's real `useCase` field
// (LaptopUseCase = WORK | STUDY | GAMING | WORKSTATION); a category never borrows another category's products.
const useCases = [
  { value: 'GAMING', label: 'Gaming', title: 'Gaming Laptops' },
  { value: 'WORK', label: 'Business', title: 'Business Laptops' },
  { value: 'WORKSTATION', label: 'Workstations', title: 'Workstations' },
  { value: 'STUDY', label: 'Student', title: 'Student Laptops' },
] as const

type UseCase = typeof useCases[number]['value']
type PriceSort = 'RECENT' | 'PRICE_ASC' | 'PRICE_DESC'

function matchesUseCase(product: StoreProduct, useCase: UseCase | null) {
  return !useCase || product.useCase === useCase
}

function sortProducts(items: StoreProduct[], sort: PriceSort) {
  if (sort === 'PRICE_ASC') items.sort((a, b) => a.priceMinor - b.priceMinor)
  if (sort === 'PRICE_DESC') items.sort((a, b) => b.priceMinor - a.priceMinor)
  return items
}

function inPriceRange(product: StoreProduct, minimum: number | null, maximum: number | null) {
  return (minimum === null || product.priceMinor >= minimum) && (maximum === null || product.priceMinor <= maximum)
}

function listingPath() {
  const path = window.location.pathname.replace(/\/$/, '')
  return path === '/laptops' ? 'laptops' : path === '/accessories' ? 'accessories' : null
}

function productSlugFromPath() {
  const match = window.location.pathname.match(/^\/products\/([^/]+)\/?$/)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return null }
}

function initialUseCase(): UseCase | null {
  const value = new URLSearchParams(window.location.search).get('use')
  return useCases.some(item => item.value === value) ? value as UseCase : null
}

type HomePageProps = { introVisible: boolean; theme: Theme; onToggleTheme: () => void }

export default function HomePage({ introVisible, theme, onToggleTheme }: HomePageProps) {
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
  const [accessoryCategory, setAccessoryCategory] = useState(() => new URLSearchParams(window.location.search).get('category') ?? '')
  const listing = listingPath()
  const isCatalog = listing === 'laptops'
  const isAccessories = listing === 'accessories'
  const liveLaptops = useMemo(() => products.filter(product => product.productType === 'LAPTOP'), [products])
  const liveAccessories = useMemo(() => products.filter(product => product.productType !== 'LAPTOP'), [products])
  const liveLaptopCount = liveLaptops.length
  const activeUseCase = useCases.find(item => item.value === useCase) ?? null
  const accessoryCategories = useMemo(() => [...new Map(liveAccessories
    .filter(product => product.accessoryCategory)
    .map(product => [product.accessoryCategory!.slug, product.accessoryCategory!.name])).entries()]
    .sort((a, b) => a[1].localeCompare(b[1])), [liveAccessories])

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

  // Laptop listings: productType LAPTOP only, filtered by the real useCase field.
  const matchingProducts = useMemo(() => sortProducts(liveLaptops.filter(product =>
    matchesUseCase(product, useCase) && matchesSearch(product, search) && inPriceRange(product, minimumPrice, maximumPrice)), sort),
  [liveLaptops, useCase, sort, search, minimumPrice, maximumPrice])

  // Accessory listings: every non-laptop product type only, optionally narrowed to one accessory category.
  const matchingAccessories = useMemo(() => sortProducts(liveAccessories.filter(product =>
    (!accessoryCategory || product.accessoryCategory?.slug === accessoryCategory) && matchesSearch(product, search) && inPriceRange(product, minimumPrice, maximumPrice)), sort),
  [liveAccessories, accessoryCategory, sort, search, minimumPrice, maximumPrice])

  // Search hints across the two independent listings (never mixed into the other listing's results).
  const searchTerm = search.trim()
  const otherLaptopMatches = searchTerm ? liveLaptops.filter(product => matchesSearch(product, search)).length : 0
  const otherAccessoryMatches = searchTerm ? liveAccessories.filter(product => matchesSearch(product, search)).length : 0

  function replaceListingUrl(path: string, params: Record<string, string>) {
    const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()
    window.history.replaceState(window.history.state, '', `${path}${query ? `?${query}` : ''}`)
  }

  function chooseUseCase(value: UseCase | null) {
    setUseCase(value)
    replaceListingUrl('/laptops', { use: value ?? '', q: searchTerm })
  }

  function chooseAccessoryCategory(value: string) {
    setAccessoryCategory(value)
    replaceListingUrl('/accessories', { category: value, q: searchTerm })
  }

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
    if (isCatalog) chooseUseCase(null)
    if (isAccessories) chooseAccessoryCategory('')
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
    else if (isAccessories) document.getElementById('accessories')?.scrollIntoView({ behavior: 'smooth' })
    else window.location.assign(`/laptops${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`)
  }

  const header = <StoreHeader products={products} loading={loadingProducts} error={productsError} search={search} onSearchChange={setSearch} onSearchSubmit={submitSearch} onOpenProduct={openProduct} theme={theme} onToggleTheme={onToggleTheme} />

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

  if (!listing) return <main className={`site sf ${introVisible ? 'site-muted' : 'site-ready'}`}>
    {header}
    <HomeSections products={products} loading={loadingProducts} error={productsError} onRetry={() => setReloadKey(key => key + 1)} onOpen={openProduct} />
    <SiteFooter />
  </main>

  const priceAndSortFilters = <>
    <fieldset>
      <legend>Price range (EGP)</legend>
      <label>Min<input aria-label="Minimum price in EGP" inputMode="decimal" type="number" min="0" step="0.01" value={minimumDraft} onChange={event => setMinimumDraft(event.target.value)} placeholder="Any" /></label>
      <label>Max<input aria-label="Maximum price in EGP" inputMode="decimal" type="number" min="0" step="0.01" value={maximumDraft} onChange={event => setMaximumDraft(event.target.value)} placeholder="Any" /></label>
      <button className="sf-btn sf-btn-primary" type="submit">Apply</button>
    </fieldset>
    <label>Sort by<select value={sort} onChange={event => setSort(event.target.value as PriceSort)}><option value="RECENT">Recently added</option><option value="PRICE_ASC">Price: low to high</option><option value="PRICE_DESC">Price: high to low</option></select></label>
    <button type="button" className="sf-btn sf-btn-ghost sf-filters-clear" onClick={clearFilters}>Clear filters</button>
  </>
  const loadError = <div className="sf-state" role="alert"><strong>We couldn’t load the RXB catalog.</strong><span>{productsError}</span><button type="button" className="sf-btn sf-btn-ghost" onClick={() => setReloadKey(key => key + 1)}>Try again</button></div>
  const resetAll = <button type="button" className="sf-btn sf-btn-ghost" onClick={() => { clearFilters(); setSearch('') }}>Clear filters</button>

  if (isAccessories) {
    const activeCategoryName = accessoryCategories.find(([slug]) => slug === accessoryCategory)?.[1]
    return <main className={`site sf ${introVisible ? 'site-muted' : 'site-ready'}`}>
      {header}
      <div className="sf-container sf-catalog">
        <section id="accessories" aria-labelledby="sf-accessories-title">
          <div className="sf-section-head"><div><h1 id="sf-accessories-title" className="sf-catalog-title">{activeCategoryName ?? 'Accessories'}</h1><p>{liveAccessories.length} {liveAccessories.length === 1 ? 'accessory' : 'accessories'} in the live RXB catalog.</p></div><a className="sf-view-all" href="/laptops">Browse laptops</a></div>
          <form className="sf-filters" onSubmit={applyPriceFilter} noValidate>
            <label>Category<select value={accessoryCategory} onChange={event => chooseAccessoryCategory(event.target.value)}><option value="">All accessories</option>{accessoryCategories.map(([slug, name]) => <option key={slug} value={slug}>{name}</option>)}{accessoryCategory && !activeCategoryName && <option value={accessoryCategory}>{accessoryCategory}</option>}</select></label>
            {priceAndSortFilters}
          </form>
          {priceError && <p className="sf-filter-error" role="alert">{priceError}</p>}
          {productsError ? loadError
            : loadingProducts ? <p className="sf-catalog-count" role="status">Loading listed accessories…</p>
              : matchingAccessories.length === 0 ? <div className="sf-state">
                <strong>{liveAccessories.length ? 'No accessories match these filters.' : 'No accessories are listed yet.'}</strong>
                <span>{liveAccessories.length ? 'Try adjusting your search, category, or price range.' : 'Published accessory listings will appear here when available.'}</span>
                {otherLaptopMatches > 0 && <a className="sf-btn sf-btn-ghost" href={`/laptops?q=${encodeURIComponent(searchTerm)}`}>{otherLaptopMatches} {otherLaptopMatches === 1 ? 'laptop matches' : 'laptops match'} “{searchTerm}”</a>}
                {liveAccessories.length > 0 && resetAll}
              </div>
                : <>
                  <p className="sf-catalog-count" role="status">{matchingAccessories.length} {matchingAccessories.length === 1 ? 'accessory' : 'accessories'} found{searchTerm ? ` for “${searchTerm}”` : ''}</p>
                  <div className="sf-product-grid">{matchingAccessories.map((product, index) => <ProductTile key={product.id} product={product} index={index} onOpen={() => openProduct(product)} />)}</div>
                </>}
          {!productsError && !loadingProducts && matchingAccessories.length > 0 && otherLaptopMatches > 0 && <p className="sf-catalog-count"><a href={`/laptops?q=${encodeURIComponent(searchTerm)}`}>{otherLaptopMatches} {otherLaptopMatches === 1 ? 'laptop also matches' : 'laptops also match'} “{searchTerm}” — view laptops</a></p>}
        </section>
      </div>
      <SiteFooter />
    </main>
  }

  // Honest empty state only when no Workstation laptop is published at all (not when other filters exclude them).
  const workstationGap = useCase === 'WORKSTATION' && !liveLaptops.some(product => product.useCase === 'WORKSTATION')
  return <main className={`site sf ${introVisible ? 'site-muted' : 'site-ready'}`}>
    {header}
    <div className="sf-container sf-catalog">
      <section id="laptops" aria-labelledby="sf-catalog-title">
        <div className="sf-section-head"><div><h1 id="sf-catalog-title" className="sf-catalog-title">{activeUseCase?.title ?? 'Laptops'}</h1><p>{liveLaptopCount} {liveLaptopCount === 1 ? 'laptop' : 'laptops'} in the live RXB catalog.</p></div><a className="sf-view-all" href="/accessories">Browse accessories</a></div>
        <form className="sf-filters" onSubmit={applyPriceFilter} noValidate>
          <label>Category<select value={useCase ?? ''} onChange={event => chooseUseCase((event.target.value || null) as UseCase | null)}><option value="">All laptops</option>{useCases.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
          {priceAndSortFilters}
        </form>
        {priceError && <p className="sf-filter-error" role="alert">{priceError}</p>}
        {productsError ? loadError
          : loadingProducts ? <p className="sf-catalog-count" role="status">Loading published laptops…</p>
            : matchingProducts.length === 0 ? <div className="sf-state">
              <strong>{workstationGap ? 'No workstation laptops are listed yet.' : liveLaptopCount ? 'No laptops match these filters.' : 'No published laptops are available yet.'}</strong>
              <span>{workstationGap ? 'Tell us the workload you need and we’ll recommend a suitable machine.'
                : liveLaptopCount ? useCase && liveLaptops.every(product => product.useCase === null) ? 'No laptops have been assigned to a use case in the catalog yet.' : 'Try adjusting your search, category, or price range.' : 'Published laptop listings will appear here when available.'}</span>
              {workstationGap && <a className="sf-btn sf-btn-primary" href={whatsappUrl('Hello RXB, I am looking for a workstation laptop. Can you help me choose?')} target="_blank" rel="noreferrer">Ask on WhatsApp</a>}
              {otherAccessoryMatches > 0 && <a className="sf-btn sf-btn-ghost" href={`/accessories?q=${encodeURIComponent(searchTerm)}`}>{otherAccessoryMatches} {otherAccessoryMatches === 1 ? 'accessory matches' : 'accessories match'} “{searchTerm}”</a>}
              {liveLaptopCount > 0 && resetAll}
            </div>
              : <>
                <p className="sf-catalog-count" role="status">{matchingProducts.length} {matchingProducts.length === 1 ? 'laptop' : 'laptops'} found{searchTerm ? ` for “${searchTerm}”` : ''}</p>
                <div className="sf-product-grid">{matchingProducts.map((product, index) => <ProductTile key={product.id} product={product} index={index} onOpen={() => openProduct(product)} />)}</div>
              </>}
        {!productsError && !loadingProducts && matchingProducts.length > 0 && otherAccessoryMatches > 0 && <p className="sf-catalog-count"><a href={`/accessories?q=${encodeURIComponent(searchTerm)}`}>{otherAccessoryMatches} {otherAccessoryMatches === 1 ? 'accessory also matches' : 'accessories also match'} “{searchTerm}” — view accessories</a></p>}
      </section>
    </div>
    <SiteFooter />
  </main>
}
