import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { fetchProductDetail, fetchProducts, imageSource, type StoreProduct } from '../products/products.api'
import { ProductDetailPage } from '../products/ProductDetailPage'
import { SiteFooter } from '../../components/SiteFooter'
import { ThemeToggle } from '../../components/ThemeToggle'
import { ProductRail } from './ProductRail'
import type { Theme } from '../../theme/useTheme'
import './home.css'

const useCases = [
  { value: 'WORK', label: 'Work' },
  { value: 'STUDY', label: 'Study' },
  { value: 'GAMING', label: 'Gaming' },
] as const

type UseCase = typeof useCases[number]['value']
type PriceSort = 'RECENT' | 'PRICE_ASC' | 'PRICE_DESC'

function formatMoney(priceMinor: number, currency: string) {
  return (priceMinor / 100).toLocaleString('en-EG', { style: 'currency', currency })
}

function productTypeLabel(product: StoreProduct) {
  switch (product.productType) {
    case 'LAPTOP': return 'Laptop'
    case 'KEYBOARD': return 'Keyboard'
    case 'MOUSE': return 'Mouse'
    case 'MOUSE_PAD': return 'Mouse pad'
    case 'OTHER_ACCESSORY': return 'Accessory'
  }
}

function productSearchText(product: StoreProduct) {
  return [
    product.brand, product.model, product.description, product.conditionNotes,
    product.cpu, product.gpu, product.baseRamGB, product.baseRamType,
    product.baseStorageGB, product.baseStorageType, product.displaySizeInches,
    product.displayResolution, product.displayPanel, product.refreshRateHz,
  ].filter(Boolean).join(' ').toLocaleLowerCase()
}

function matchesSearch(product: StoreProduct, query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const content = productSearchText(product)
  return terms.every(term => content.includes(term))
}

function parseEgp(value: string) {
  if (!value.trim()) return null
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return Number.NaN
  const minor = Math.round(Number(value) * 100)
  return Number.isSafeInteger(minor) && minor <= 1_000_000_000 ? minor : Number.NaN
}

function productSlugFromPath() {
  const match = window.location.pathname.match(/^\/products\/([^/]+)\/?$/)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return null }
}

function ProductVisual({ product, index }: { product: StoreProduct; index: number }) {
  const [imageFailed, setImageFailed] = useState(false)
  return <div className={`product-visual ${['violet', 'silver', 'blue'][index % 3]}`}>
    {product.imageUrl && !imageFailed
      ? <img className="live-catalog-image" src={imageSource(product.imageUrl)} alt={`${product.brand} ${product.model}`} loading="lazy" onError={() => setImageFailed(true)} />
      : <div className="product-image-placeholder" aria-label="No product image provided"><span>RXB</span><small>IMAGE NOT PROVIDED</small></div>}
  </div>
}

function SuggestionImage({ product }: { product: StoreProduct }) {
  const [failed, setFailed] = useState(false)
  return product.imageUrl && !failed
    ? <img src={imageSource(product.imageUrl)} alt="" onError={() => setFailed(true)} />
    : <span className="suggestion-placeholder" aria-hidden="true">RXB</span>
}

function ProductCard({ product, index, onOpen }: { product: StoreProduct; index: number; onOpen: () => void }) {
  const isLaptop = product.productType === 'LAPTOP'
  const laptopSpecifications = [
    product.baseRamGB !== null && product.baseRamType ? `${product.baseRamGB} GB ${product.baseRamType}` : '',
    product.baseStorageGB !== null && product.baseStorageType ? `${product.baseStorageGB} GB ${product.baseStorageType}` : '',
  ].filter(Boolean).join(' · ')
  return <article className="product-card">
    <div className="product-image-wrap">
      <ProductVisual product={product} index={index} />
      <span className="condition-pill">{product.condition === 'NEW' ? 'NEW' : 'PRE-OWNED'}</span>
      {product.description.startsWith('SAMPLE / TEST LISTING') && <span className="sample-listing-pill">SAMPLE / TEST · ZERO STOCK</span>}
    </div>
    <div className="product-info">
      <div>
        <span className="product-label">{product.available ? 'IN STOCK' : 'CURRENTLY UNAVAILABLE'}</span>
        <h3>{product.brand} {product.model}</h3>
        <p>{isLaptop ? product.cpu || 'Laptop' : productTypeLabel(product)}</p>
        {isLaptop && laptopSpecifications && <p className="product-specs">{laptopSpecifications}</p>}
      </div>
      <div className="product-price">{formatMoney(product.priceMinor, product.currency)}<span>{isLaptop ? 'BASE CONFIGURATION' : 'LISTED PRICE'}</span></div>
    </div>
    <a className="product-foot product-details-button" href={`/products/${encodeURIComponent(product.slug)}`} onClick={event => { event.preventDefault(); onOpen() }}>
      <span>{product.brand} · {product.available ? 'AVAILABLE' : 'ENQUIRE'}</span><span>VIEW DETAILS ↗</span>
    </a>
  </article>
}

type HomePageProps = { introVisible: boolean; theme: Theme; onToggleTheme: () => void }

export default function HomePage({ introVisible, theme, onToggleTheme }: HomePageProps) {
  const [products, setProducts] = useState<StoreProduct[]>([])
  const [loadingProducts, setLoadingProducts] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const [useCase, setUseCase] = useState<UseCase | null>(null)
  const [sort, setSort] = useState<PriceSort>('RECENT')
  const [search, setSearch] = useState('')
  const [searchFocused, setSearchFocused] = useState(false)
  const [activeSuggestion, setActiveSuggestion] = useState(-1)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
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
  const searchContainer = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Node && !searchContainer.current?.contains(event.target)) setSearchFocused(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [])

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

  const suggestions = useMemo(() => {
    const query = search.trim()
    return query ? products.filter(product => matchesSearch(product, query)).slice(0, 5) : []
  }, [products, search])

  const showSuggestions = searchFocused && Boolean(search.trim())
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

  function openSuggestion(product: StoreProduct) {
    setSearch(`${product.brand} ${product.model}`)
    setSearchFocused(false)
    setActiveSuggestion(-1)
    openProduct(product)
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

  function handleSearchKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault()
      setSearchFocused(true)
      setActiveSuggestion(current => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault()
      setActiveSuggestion(current => current <= 0 ? suggestions.length - 1 : current - 1)
    } else if (event.key === 'Escape') {
      setSearchFocused(false)
      setActiveSuggestion(-1)
    } else if (event.key === 'Enter') {
      event.preventDefault()
      if (activeSuggestion >= 0 && suggestions[activeSuggestion]) openSuggestion(suggestions[activeSuggestion])
      else {
        setSearchFocused(false)
        document.getElementById('laptops')?.scrollIntoView({ behavior: 'smooth' })
      }
    }
  }

  if (routeSlug && !selectedProduct) return <main className="site site-ready product-route-shell">
    <header className="product-detail-topbar wrap"><a className="wordmark" href="/" aria-label="RXB Laptops and Tech home"><img className="wordmark-logo" src="/rxb-logo-transparent.png" alt="" /><span className="wordmark-caption">LAPTOPS <i>/</i> TECH</span></a><a href="/#laptops">Back to catalog</a></header>
    <section className="product-route-state wrap" aria-live="polite">
      {routeLoading ? <><span className="eyebrow">RXB PRODUCT CATALOG</span><h1>Loading product details…</h1></>
        : <><span className="eyebrow">PRODUCT DETAILS UNAVAILABLE</span><h1>This product could not be opened.</h1><p>{routeError || 'The listing may have been removed from the catalog.'}</p><button className="button-primary" type="button" onClick={() => setRouteRetry(value => value + 1)}>Try again</button></>}
    </section>
    <SiteFooter />
  </main>
  if (routeSlug && selectedProduct) return <main className="site site-ready product-route-shell">
    <ProductDetailPage product={selectedProduct} onClose={closeProduct} theme={theme} onToggleTheme={onToggleTheme} />
    <SiteFooter />
  </main>

  return <main className={`site ${introVisible ? 'site-muted' : 'site-ready'}`}>
    <div className="announcement"><span className="status-dot" /> CURATED TECHNOLOGY. READY FOR WHAT'S NEXT. <span className="announce-end">CAIRO, EGYPT <span>↗</span></span></div>
    <header className="site-header">
      <div className="header wrap">
        <a className="wordmark" href="/" aria-label="RXB Laptops and Tech home" onClick={() => setMobileMenuOpen(false)}>
          <img className="wordmark-logo" src="/rxb-logo-transparent.png" alt="" /><span className="wordmark-caption">LAPTOPS <i>/</i> TECH</span>
        </a>
        <nav className={`main-nav ${mobileMenuOpen ? 'main-nav-open' : ''}`} aria-label="Main navigation">
          <a href="/" onClick={() => setMobileMenuOpen(false)}>Home</a>
          <a href="/#laptops" onClick={() => setMobileMenuOpen(false)}>Laptops</a>
          <a href="/#parts" onClick={() => setMobileMenuOpen(false)}>Parts</a>
          <a href="/about" onClick={() => setMobileMenuOpen(false)}>About</a>
        </nav>
        <div className="header-tools">
          <div className="search-container" ref={searchContainer}>
            <label className="search-box">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" /><path d="m16 16 5 5" /></svg>
              <input
                type="search"
                placeholder="Search products"
                aria-label="Search products by name, brand, model, or specifications"
                role="combobox"
                aria-autocomplete="list"
                aria-expanded={showSuggestions}
                aria-controls="product-suggestions"
                aria-activedescendant={activeSuggestion >= 0 ? `product-suggestion-${activeSuggestion}` : undefined}
                value={search}
                onFocus={() => setSearchFocused(true)}
                onChange={event => { setSearch(event.target.value); setActiveSuggestion(-1) }}
                onKeyDown={handleSearchKeyDown}
              />
            </label>
            {showSuggestions && <div className="search-suggestions">
              {loadingProducts ? <p role="status">Loading catalog…</p>
                : productsError ? <p role="status">Search is unavailable while the catalog cannot be loaded.</p>
                  : suggestions.length ? <ul id="product-suggestions" role="listbox" aria-label="Matching products">
                    {suggestions.map((product, index) => <li key={product.id}>
                      <button id={`product-suggestion-${index}`} type="button" role="option" aria-selected={activeSuggestion === index} onClick={() => openSuggestion(product)}>
                        <SuggestionImage product={product} />
                        <span className="suggestion-name"><strong>{product.brand} {product.model}</strong><small>{product.productType === 'LAPTOP' ? product.cpu || 'Laptop' : productTypeLabel(product)}</small></span>
                        <span className="suggestion-price">{formatMoney(product.priceMinor, product.currency)}</span>
                      </button>
                    </li>)}
                  </ul>
                    : <p role="status">{productsError ? 'Live product suggestions are unavailable.' : 'No matching live products found.'}</p>}
            </div>}
          </div>
          <button className="mobile-menu-toggle" type="button" aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={mobileMenuOpen} onClick={() => setMobileMenuOpen(open => !open)}>
            <span /><span /><span />
          </button>
          <ThemeToggle theme={theme} onToggle={onToggleTheme} />
        </div>
      </div>
    </header>

    <section className="hero wrap" id="top">
      <div className="hero-copy">
        <div className="eyebrow"><span>01</span><i /> BUILT AROUND YOUR NEXT MOVE</div>
        <h1>Power that<br />moves <em>you.</em></h1>
        <p className="hero-description">Thoughtfully selected laptops for the way you think, work, and create. Your next chapter starts here.</p>
        <div className="hero-actions"><a className="button-primary" href="#laptops">Explore the collection <span>↗</span></a><a href="#laptops" className="text-link">Find your fit <span>↓</span></a></div>
        <div className="hero-note"><span className="note-rule" /> INDEPENDENTLY SOURCED. PERSONALLY CHECKED.</div>
      </div>
      <div className="hero-art" aria-label="Illustrative image of a premium laptop">
        <div className="orbit orbit-one" /><div className="orbit orbit-two" />
        <div className="hero-coordinate">30°02' N&nbsp;&nbsp; 31°14' E</div>
        <div className="hero-laptop"><div className="hero-screen"><div className="screen-wallpaper"><span className="wallpaper-orb" /><span className="wallpaper-glow" /><span className="wallpaper-line" /><b>01<br /><small>MAKE IT MATTER</small></b></div><span className="camera" /></div><div className="hero-base"><div className="keyboard" /><div className="trackpad" /></div></div>
        <div className="art-caption"><span>RXB / FIELD NOTE 001</span><span>FORM MEETS FUNCTION</span></div>
        <div className="art-glint">✳</div>
      </div>
      <div className="hero-bottom"><span>SCROLL TO EXPLORE <b>↓</b></span><span>DESIGNED FOR EVERY DAY. CHOSEN FOR YOU.</span><span>EST. 2025&nbsp; /&nbsp; EGYPT</span></div>
    </section>

    <section className="collection-section" id="laptops" aria-labelledby="collection-title">
      <div className="wrap">
        <div className="collection-top"><div><div className="eyebrow"><span>03</span><i /> THE RXB EDIT</div><h2 id="collection-title">Good machines.<br /><em>Better stories.</em></h2></div>
          <div className="collection-aside"><p>A considered lineup of new and pre-owned laptops, each chosen with care.</p><a className="text-link" href="/about">Our quality promise <span>↗</span></a></div>
        </div>
        <div className="catalog-controls">
          <div className="product-toolbar">
            <span>LIVE LAPTOP CATALOG <i>·</i> {liveLaptopCount} PRODUCTS LOADED</span>
          </div>
          <form className="catalog-filter-row" onSubmit={applyPriceFilter} noValidate>
            <fieldset className="price-filter">
              <legend>Price range (EGP)</legend>
              <label>Min<input aria-label="Minimum price in EGP" inputMode="decimal" type="number" min="0" step="0.01" value={minimumDraft} onChange={event => setMinimumDraft(event.target.value)} placeholder="Any" /></label>
              <span aria-hidden="true">–</span>
              <label>Max<input aria-label="Maximum price in EGP" inputMode="decimal" type="number" min="0" step="0.01" value={maximumDraft} onChange={event => setMaximumDraft(event.target.value)} placeholder="Any" /></label>
              <button type="submit">Apply</button>
            </fieldset>
            <label className="sort-control">Sort by<select value={sort} onChange={event => setSort(event.target.value as PriceSort)}><option value="RECENT">Recently added</option><option value="PRICE_ASC">Price: low to high</option><option value="PRICE_DESC">Price: high to low</option></select></label>
            <label className="catalog-use-case"><select aria-label="Filter by use case" value={useCase ?? ''} onChange={event => setUseCase((event.target.value || null) as UseCase | null)}><option value="">All laptops</option>{useCases.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <button type="button" className="clear-filters" onClick={clearFilters}>Clear filters</button>
          </form>
          {priceError && <p className="filter-error" role="alert">{priceError}</p>}
        </div>
        {productsError ? <div className="catalog-state" role="alert"><strong>We couldn’t load the RXB catalog.</strong><span>{productsError}</span><button type="button" onClick={() => setReloadKey(key => key + 1)}>Try again</button></div>
          : loadingProducts ? <div className="catalog-loading" role="status"><span>Loading published laptops…</span><div className="skeleton-grid">{Array.from({ length: 3 }, (_, index) => <div className="product-skeleton" key={index}><span /><i /><i /></div>)}</div></div>
            : matchingProducts.length === 0 ? <div className="catalog-state">
              <strong>{liveLaptopCount ? 'No laptops match these filters.' : 'No published laptops are available yet.'}</strong>
              <span>{liveLaptopCount ? useCase && products.filter(product => product.productType === 'LAPTOP').every(product => product.useCase === null) ? 'No laptops have been assigned to a use case in the catalog yet.' : 'Try adjusting your search, category, or price range.' : 'Published laptop listings will appear here when available.'}</span>
              <button type="button" onClick={clearFilters}>Clear filters</button>
            </div>
              : <>
                <p className="catalog-result-count" role="status">{matchingProducts.length} {matchingProducts.length === 1 ? 'laptop' : 'laptops'} found</p>
                <ProductRail label="Published laptops" className="product-grid">
                  {matchingProducts.map((product, index) => <ProductCard key={product.id} product={product} index={index} onOpen={() => openProduct(product)} />)}
                </ProductRail>
              </>}
      </div>
    </section>

    <section className="parts-section wrap" id="parts" aria-labelledby="parts-title">
      <div className="eyebrow"><span>04</span><i /> PARTS &amp; ACCESSORIES</div>
      <div className="parts-content"><div><h2 id="parts-title">Accessories, <em>when listed.</em></h2><p>Browse accessories currently listed in the RXB catalog.</p></div>
        {productsError
          ? <p className="parts-unavailable" role="alert">Accessories could not be loaded. <button type="button" onClick={() => setReloadKey(key => key + 1)}>Try again</button></p>
          : loadingProducts
            ? <p className="parts-unavailable" role="status">Loading listed accessories…</p>
            : matchingAccessories.length
              ? <ProductRail label="Published accessories" className="product-grid">
                {matchingAccessories.map((product, index) => <ProductCard key={product.id} product={product} index={index} onOpen={() => openProduct(product)} />)}
              </ProductRail>
              : <p className="parts-unavailable" role="status">{products.some(product => product.productType !== 'LAPTOP') ? 'No accessories match the current search and filters.' : 'No accessories are currently listed.'}</p>}
      </div>
    </section>

    <SiteFooter />
  </main>
}
