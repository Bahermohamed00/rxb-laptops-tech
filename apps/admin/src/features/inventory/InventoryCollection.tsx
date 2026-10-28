import { useRef } from 'react'
import { gsap, useGSAP } from '../../motion/gsap'
import { EmptyState } from '../../components/WorkspaceState'
import { ProductImage } from '../products/ProductImage'
import type { Product } from '../products/product.types'
import { availabilityLabels, formatUpdated } from '../products/product.selectors'
import { deriveAvailability } from '../products/product.validation'
import { stockLabels, stockLevel } from './inventory.model'

export type InventoryAction = 'adjust' | 'details' | 'archive'
export function InventoryCollection({ products, onAction, onClear }: { products: readonly Product[]; onAction: (action: InventoryAction, productId: string) => void; onClear: () => void }) {
  const root = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    const media = gsap.matchMedia()
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const timeline = gsap.from(root.current?.querySelectorAll('[data-inventory-row]') ?? [], { opacity: 0, y: 8, duration: .3, stagger: { each: .035, amount: .18 }, ease: 'power2.out' })
      const finish = () => { timeline.progress(1) }
      root.current?.addEventListener('focusin', finish)
      const element = root.current
      return () => element?.removeEventListener('focusin', finish)
    })
    return () => media.revert()
  }, { scope: root })
  const identity = (product: Product) => <div className="inventory-identity"><ProductImage url={product.imageUrl} /><div><span>{product.brand}</span><strong>{product.model}</strong><p>{product.ramGB} GB RAM · {product.storageGB} GB storage</p></div></div>
  const indicator = (product: Product) => <span className={`inventory-stock inventory-stock-${stockLevel(product.stockQuantity)}`}><span aria-hidden="true" />{stockLabels[stockLevel(product.stockQuantity)]}</span>
  const actions = (product: Product) => <div className="inventory-row-actions"><button type="button" onClick={() => onAction('adjust', product.id)} aria-label={`Adjust ${product.model}`}>Adjust</button><button type="button" onClick={() => onAction('details', product.id)} aria-label={`Inventory details for ${product.model}`}>Details</button><button type="button" onClick={() => onAction('archive', product.id)} aria-label={`Archive options for ${product.model}`}>Archive options</button></div>
  return <div ref={root} className="inventory-collection">
    {!products.length ? <div className="inventory-empty"><EmptyState icon="Inventory" title="No products match this view." description="Try a different search or stock filter. Your local quantities have not changed." /><button type="button" className="button button-quiet" onClick={onClear}>Clear filters</button></div> : <>
      <div className="inventory-table-wrap"><table className="inventory-table"><caption className="inventory-sr-only">Development-only inventory. All quantities are simulated. Product update times are in Cairo.</caption><thead><tr><th scope="col">Product</th><th scope="col">Prototype units</th><th scope="col">Stock level</th><th scope="col">Availability</th><th scope="col">Product updated</th><th scope="col">Actions</th></tr></thead><tbody>{products.map(product => <tr key={product.id} data-inventory-row><th scope="row">{identity(product)}</th><td className="inventory-table-quantity">{product.stockQuantity.toLocaleString('en-EG')}</td><td>{indicator(product)}</td><td>{availabilityLabels[deriveAvailability(product)]}<span className="inventory-cell-note">{product.catalogStatus === 'listed' ? 'Listed locally' : 'Not listed'}</span></td><td><time dateTime={product.updatedAt}>{formatUpdated(product.updatedAt)}</time></td><td>{actions(product)}</td></tr>)}</tbody></table></div>
      <ul className="inventory-cards">{products.map(product => <li key={product.id} data-inventory-row><div className="inventory-card-top">{identity(product)}<div className="inventory-card-quantity"><strong>{product.stockQuantity.toLocaleString('en-EG')}</strong><span>Prototype units</span></div></div><div className="inventory-card-status">{indicator(product)}<span>{availabilityLabels[deriveAvailability(product)]} · {product.catalogStatus === 'listed' ? 'Listed locally' : 'Not listed'}</span></div><p className="inventory-card-updated">Product updated <time dateTime={product.updatedAt}>{formatUpdated(product.updatedAt)}</time> · Cairo</p>{actions(product)}</li>)}</ul>
    </>}
  </div>
}
