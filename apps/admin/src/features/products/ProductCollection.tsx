import type { Product } from './product.types'
import { deriveAvailability } from './product.validation'
import { availabilityLabels, formatPrice, formatUpdated } from './product.selectors'
import { ProductImage } from './ProductImage'

function AvailabilityBadge({ product }: { product: Product }) {
  const availability = deriveAvailability(product)
  return <span className={`product-availability availability-${availability}`}>{availabilityLabels[availability]}</span>
}
function ProductIdentity({ product }: { product: Product }) {
  return <div className="product-identity"><ProductImage url={product.imageUrl} /><div><span className="product-brand">{product.brand}</span><strong>{product.model}</strong><span className="product-specs">{product.cpu}<br />{product.gpu ?? 'GPU unspecified'}<br />{product.ramGB} GB RAM · {product.storageGB} GB{product.storageType ? ` ${product.storageType.toUpperCase()}` : ' storage'}</span></div></div>
}
function Updated({ product }: { product: Product }) {
  return <time dateTime={product.updatedAt}>{formatUpdated(product.updatedAt)}</time>
}
export function ProductCollection({ products }: { products: readonly Product[] }) {
  return <>
    <div className="product-table-wrap">
      <table className="product-table"><caption className="product-sr-only">Local prototype products. Prices in EGP. Updated times in Cairo.</caption>
        <thead><tr><th scope="col">Product &amp; specifications</th><th scope="col">Price / EGP</th><th scope="col">Stock</th><th scope="col">Availability</th><th scope="col">Catalog status</th><th scope="col">Updated / Cairo</th></tr></thead>
        <tbody>{products.map(product => <tr key={product.id}><th scope="row"><ProductIdentity product={product} /></th><td className="product-number">{formatPrice(product.priceMinor)}</td><td className="product-number">{product.stockQuantity.toLocaleString('en-EG')}</td><td><AvailabilityBadge product={product} /></td><td>{product.catalogStatus === 'listed' ? 'Listed locally' : 'Draft'}</td><td className="product-updated"><Updated product={product} /></td></tr>)}</tbody>
      </table>
    </div>
    <ul className="product-mobile-list">{products.map(product => <li key={product.id}><ProductIdentity product={product} /><dl><div><dt>Price</dt><dd>{formatPrice(product.priceMinor)}</dd></div><div><dt>Stock quantity</dt><dd>{product.stockQuantity.toLocaleString('en-EG')}</dd></div><div><dt>Availability</dt><dd><AvailabilityBadge product={product} /></dd></div><div><dt>Catalog status</dt><dd>{product.catalogStatus === 'listed' ? 'Listed locally' : 'Draft'}</dd></div><div><dt>Updated / Cairo</dt><dd><Updated product={product} /></dd></div></dl></li>)}</ul>
  </>
}
