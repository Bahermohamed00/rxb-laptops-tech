import type { ProductQuery, ProductSort } from './product.selectors'
import type { Availability } from './product.types'

export function ProductToolbar({ query, brands, onChange, disabled }: { query: ProductQuery; brands: string[]; onChange: (query: ProductQuery) => void; disabled: boolean }) {
  return <fieldset className="product-toolbar" disabled={disabled}>
    <legend className="product-sr-only">Search, filter, and sort prototype products</legend>
    <label className="product-search"><span>Search collection</span><input type="search" value={query.search} onChange={event => onChange({ ...query, search: event.target.value })} placeholder="Brand, model, CPU or GPU" autoComplete="off" /></label>
    <label><span>Brand</span><select value={query.brand} onChange={event => onChange({ ...query, brand: event.target.value })}><option value="">All brands</option>{query.brand && !brands.includes(query.brand) && <option value={query.brand}>{query.brand} (not in catalog)</option>}{brands.map(brand => <option key={brand} value={brand}>{brand}</option>)}</select></label>
    <label><span>Availability</span><select value={query.availability} onChange={event => onChange({ ...query, availability: event.target.value as Availability | '' })}><option value="">All availability</option><option value="draft">Draft</option><option value="available">Available</option><option value="out-of-stock">Out of stock</option></select></label>
    <label><span>Sort by</span><select value={query.sort} onChange={event => onChange({ ...query, sort: event.target.value as ProductSort })}><option value="updated">Recently updated</option><option value="name">Product name · A–Z</option><option value="price-asc">Price · low to high</option><option value="price-desc">Price · high to low</option><option value="stock-asc">Stock · low to high</option><option value="stock-desc">Stock · high to low</option></select></label>
  </fieldset>
}
