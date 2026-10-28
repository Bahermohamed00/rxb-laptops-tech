import { ModalSurface } from '../../components/ModalSurface'
import { useProductCatalog } from './ProductStore'
import { ProductImage } from './ProductImage'
import { availabilityLabels, formatPrice, formatUpdated } from './product.selectors'
import { deriveAvailability } from './product.validation'

export function ProductDetails({ productId, onClose }: { productId: string; onClose: () => void }) {
  const catalog = useProductCatalog()
  const product = catalog.status === 'ready' ? catalog.products.find(item => item.id === productId) : undefined
  return <ModalSurface title="Product details" description="A local prototype record, not a live storefront listing." closeLabel="Close product details" onClose={onClose}>
    {close => <><div className="modal-body">
      {!product ? <p className="product-message" role="status">{catalog.status === 'ready' ? 'This product no longer exists in the local collection.' : 'The local collection is unavailable. Close this view and retry reading the catalog.'}</p> : <>
        <div className="product-detail-identity"><ProductImage url={product.imageUrl} /><div><span className="product-brand">{product.brand}</span><h3>{product.model}</h3><p>{formatPrice(product.priceMinor)}</p></div></div>
        <div className="product-detail-status"><span className={`product-availability availability-${deriveAvailability(product)}`}>{availabilityLabels[deriveAvailability(product)]}</span><span>{product.catalogStatus === 'listed' ? 'Listed locally' : 'Draft'} · Prototype only</span></div>
        <h3 className="product-detail-heading">Specifications</h3>
        <dl className="product-detail-list">
          <div><dt>Processor / CPU</dt><dd>{product.cpu}</dd></div><div><dt>Graphics / GPU</dt><dd>{product.gpu ?? 'Unspecified'}</dd></div>
          <div><dt>RAM</dt><dd>{product.ramGB} GB</dd></div><div><dt>Storage</dt><dd>{product.storageGB} GB {product.storageType?.toUpperCase()}</dd></div>
          <div><dt>Screen size</dt><dd>{product.display?.sizeInches ? `${product.display.sizeInches} inches` : 'Unspecified'}</dd></div>
          <div><dt>Resolution</dt><dd>{product.display?.resolution ?? 'Unspecified'}</dd></div><div><dt>Panel</dt><dd>{product.display?.panelType ?? 'Unspecified'}</dd></div>
          <div><dt>Refresh rate</dt><dd>{product.display?.refreshRateHz ? `${product.display.refreshRateHz} Hz` : 'Unspecified'}</dd></div>
          <div><dt>Prototype quantity</dt><dd>{product.stockQuantity.toLocaleString('en-EG')} · Not real stock</dd></div>
        </dl>
        <h3 className="product-detail-heading">Description</h3><p className="product-detail-description">{product.description ?? 'No description added.'}</p>
        <h3 className="product-detail-heading">Record information</h3><dl className="product-detail-list">
          <div><dt>Product ID</dt><dd>{product.id}</dd></div><div><dt>Created / Cairo</dt><dd><time dateTime={product.createdAt}>{formatUpdated(product.createdAt)}</time></dd></div>
          <div><dt>Updated / Cairo</dt><dd><time dateTime={product.updatedAt}>{formatUpdated(product.updatedAt)}</time></dd></div>
          <div><dt>Image URL</dt><dd>{product.imageUrl ?? 'No image added.'}</dd></div>
        </dl>
      </>}
    </div><footer className="modal-footer"><button type="button" className="button button-quiet" data-autofocus onClick={close}>Close</button></footer></>}
  </ModalSurface>
}
