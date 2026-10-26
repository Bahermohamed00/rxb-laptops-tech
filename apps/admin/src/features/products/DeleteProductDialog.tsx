import { useRef, useState } from 'react'
import { ModalSurface } from '../../components/ModalSurface'
import { useProductActions, useProductCatalog } from './ProductStore'
import type { Product, ProductError } from './product.types'

export function DeleteProductDialog({ product, token, onClose, onDeleted }: { product: Product; token: string | null; onClose: () => void; onDeleted: () => void }) {
  const actions = useProductActions()
  const catalog = useProductCatalog()
  const [error, setError] = useState<ProductError | null>(null)
  const [deleted, setDeleted] = useState(false)
  const completed = useRef(false)
  return <ModalSurface title="Delete this product?" description="This removes a prototype record from this browser only." closeLabel="Close delete confirmation" variant="dialog" onClose={onClose}>
    {close => <><div className="modal-body">
      <div className="product-delete-identity"><ProductImageName product={product} /></div>
      <p>You cannot undo this action. Your storefront and real inventory are not affected.</p>
      {catalog.token !== token && !deleted && <p className="product-message" role="status">The collection has changed. Close this dialog and review the latest product before deleting.</p>}
      {error && <div className="product-message product-error" role="alert">{error.message}</div>}
    </div><footer className="modal-footer"><button type="button" className="button button-quiet" data-autofocus onClick={close}>Keep product</button><button type="button" className="button button-danger" disabled={deleted || catalog.status !== 'ready'} onClick={() => {
      if (completed.current) return
      const result = actions.delete(product.id, token)
      if (!result.ok) { setError(result.error); return }
      completed.current = true
      setDeleted(true)
      onDeleted()
      close()
    }}>Delete local product</button></footer></>}
  </ModalSurface>
}

function ProductImageName({ product }: { product: Product }) {
  return <><span className="product-brand">{product.brand}</span><strong>{product.model}</strong></>
}
