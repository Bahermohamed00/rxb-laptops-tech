import { ModalSurface } from '../../components/ModalSurface'
import { EmptyState } from '../../components/WorkspaceState'
import { ProductImage } from '../products/ProductImage'
import { availabilityLabels, formatUpdated } from '../products/product.selectors'
import { deriveAvailability } from '../products/product.validation'
import { LOW_STOCK_THRESHOLD, stockLabels, stockLevel } from './inventory.model'
import { useInventory } from './useInventory'

export function InventoryDetails({ productId, onClose }: { productId: string; onClose: () => void }) {
  const { catalog } = useInventory()
  const product = catalog.status === 'ready' ? catalog.products.find(item => item.id === productId) : undefined
  return <ModalSurface title="Inventory details" description="Known quantities from your local product catalog. Development-only, never live stock." closeLabel="Close inventory details" onClose={onClose}>
    {close => <><div className="modal-body">
      {!product ? <p className="inventory-notice" role="status">{catalog.status === 'ready' ? 'This product no longer exists in the local catalog.' : 'The product catalog is unavailable. Close this view and retry.'}</p> : <>
        <div className="inventory-identity"><ProductImage url={product.imageUrl} /><div><span>{product.brand}</span><h3>{product.model}</h3><p>{product.cpu}</p></div></div>
        <div className="inventory-detail-quantity"><span>Prototype units</span><strong>{product.stockQuantity.toLocaleString('en-EG')}</strong><span className={`inventory-stock inventory-stock-${stockLevel(product.stockQuantity)}`}>{stockLabels[stockLevel(product.stockQuantity)]}</span></div>
        <dl className="inventory-detail-list"><div><dt>Catalog availability</dt><dd>{availabilityLabels[deriveAvailability(product)]}</dd></div><div><dt>Catalog status</dt><dd>{product.catalogStatus === 'listed' ? 'Listed locally' : 'Draft'}</dd></div><div><dt>Low-stock display rule</dt><dd>1–{LOW_STOCK_THRESHOLD} units · UI-only threshold</dd></div><div><dt>Product last updated / Cairo</dt><dd><time dateTime={product.updatedAt}>{formatUpdated(product.updatedAt)}</time></dd></div><div><dt>Product ID</dt><dd>{product.id}</dd></div></dl>
        <p className="inventory-scope-note">The timestamp is the product’s last edit, not proof of a stock movement. Draft products can hold local quantities without being listed.</p>
        <section className="inventory-history"><EmptyState icon="Inventory" title="Movement history is unavailable." description="This prototype stores a current quantity only. Adjustment reasons and past movements are not recorded. No history is inferred from product edits." /></section>
      </>}
    </div><footer className="modal-footer"><button type="button" className="button button-quiet" data-autofocus onClick={close}>Close</button></footer></>}
  </ModalSurface>
}

export function InventoryArchiveDialog({ productId, onClose }: { productId: string; onClose: () => void }) {
  const { catalog } = useInventory()
  const product = catalog.status === 'ready' ? catalog.products.find(item => item.id === productId) : undefined
  return <ModalSurface title="Archive inventory?" description="Preview only. Independent inventory archival is not supported by the current product model." closeLabel="Close archive options" variant="dialog" onClose={onClose}>
    {close => <><div className="modal-body"><strong>{product ? `${product.brand} ${product.model}` : 'Product unavailable'}</strong><p className="inventory-scope-note" id="inventory-archive-note">Inventory currently shares its record with Products. Removal could delete product data, so archive and delete are unavailable until the backend contract defines safe behavior. Setting quantity to zero is a separate simulated adjustment, not archival.</p><p className="inventory-notice">No record will be changed or removed.</p></div><footer className="modal-footer"><button type="button" className="button button-quiet" data-autofocus onClick={close}>Keep inventory</button><button type="button" className="button button-disabled" disabled aria-describedby="inventory-archive-note">Archive unavailable</button></footer></>}
  </ModalSurface>
}
