import { useMemo, useState } from 'react'
import { Icon } from '../../components/Icon'
import { EmptyState } from '../../components/WorkspaceState'
import { useProductActions, useProductCatalog } from './ProductStore'
import { initialQuery, productBrands, selectProducts } from './product.selectors'
import { ProductToolbar } from './ProductToolbar'
import { ProductCollection } from './ProductCollection'
import './products.css'

export function ProductsPage() {
  const catalog = useProductCatalog()
  const actions = useProductActions()
  const [query, setQuery] = useState(initialQuery)
  const [exportError, setExportError] = useState('')
  const products = useMemo(() => selectProducts(catalog.products, query), [catalog.products, query])
  const brands = useMemo(() => productBrands(catalog.products), [catalog.products])
  const ready = catalog.status === 'ready'
  const filtered = Boolean(query.search || query.brand || query.availability)
  const damaged = catalog.error?.code === 'malformed' || catalog.error?.code === 'unsupported-version'
  function exportOriginal() {
    setExportError('')
    const result = actions.readRaw()
    if (!result.ok) { setExportError(result.error.message); return }
    if (result.value === null) { setExportError('There is no saved content to download. Retry reading the catalog.'); return }
    let url: string | undefined
    try {
      url = URL.createObjectURL(new Blob([result.value], { type: 'text/plain;charset=utf-8' }))
      const link = document.createElement('a')
      link.href = url
      link.download = 'rxb-products-original.txt'
      document.body.append(link)
      link.click()
      link.remove()
    } catch { setExportError('The original content could not be downloaded. Your saved data has not been changed.') }
    finally { if (url) URL.revokeObjectURL(url) }
  }
  return <section className="products-page" aria-label="Product management" data-motion="products-page">
    <div className="products-intro"><div><span className="products-prototype"><Icon name="Layers" />Local prototype</span><h2>Your collection.<br />In clear view.</h2><p>Product records stored in this browser. These are demo records, never live inventory or storefront listings.</p></div><div className="products-next"><button type="button" className="button button-disabled" disabled aria-describedby="products-next-note">Add product <span aria-hidden="true">+</span></button><span id="products-next-note">Coming next phase</span></div></div>
    <div className="products-surface">
      <ProductToolbar query={query} brands={brands} onChange={setQuery} disabled={!ready} />
      <div className="products-result-bar"><p role="status" aria-live="polite">{ready ? `${products.length} of ${catalog.products.length} prototype ${catalog.products.length === 1 ? 'product' : 'products'}` : catalog.status === 'restoring' ? 'Reading local catalog…' : 'Catalog unavailable'}</p>{ready && filtered && <button type="button" className="products-clear" onClick={() => setQuery(initialQuery)}>Clear filters</button>}<span>Browser storage only</span></div>
      {catalog.status === 'restoring' ? <div className="products-state" aria-busy="true"><EmptyState icon="Products" title="Reading your local collection" description="Checking this browser for saved prototype products." /></div>
        : !ready ? <div className="products-state"><div role="alert"><EmptyState icon="Connection" title={damaged ? catalog.error?.code === 'unsupported-version' ? 'This catalog version is not supported.' : 'Saved content needs recovery.' : 'Local storage is unavailable.'} description={damaged ? 'Your original saved content is preserved. Download it for recovery, or retry after it has been corrected. Nothing has been reset or deleted.' : 'This browser could not provide access to the local catalog. Check browser storage permissions and retry. No saved data has been changed.'} /></div><div className="products-recovery"><button type="button" className="button button-quiet" onClick={() => { setExportError(''); actions.restore() }}>Retry reading catalog</button>{damaged && <button type="button" className="button button-quiet" onClick={exportOriginal}>Download original content</button>}</div>{exportError && <p role="alert" className="products-export-error">{exportError}</p>}</div>
        : catalog.products.length === 0 ? <div className="products-state"><EmptyState icon="Products" title="Your local collection starts here." description="There are no prototype products in this browser. Adding products will be available in the next phase; no sample inventory has been created." /></div>
        : products.length === 0 ? <div className="products-state"><EmptyState icon="Products" title="No products match this view." description="Try a different brand, availability, or search term. Your saved collection has not changed." /><button type="button" className="button button-quiet" onClick={() => setQuery(initialQuery)}>Clear search and filters</button></div>
        : <ProductCollection products={products} />}
    </div>
    <p className="products-footnote"><Icon name="Lock" />Local listings are prototype data. No backend connection, account, or publishing is configured.</p>
  </section>
}
