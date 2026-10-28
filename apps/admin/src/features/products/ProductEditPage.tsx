import { useEffect, useState } from 'react'
import { archiveProduct, getProduct, imageSource, updateProduct, type ApiProduct, type ProductPayload } from './products.api'
import { LiveProductEditor } from './LiveProductEditor'

function payloadForStatus(product: ApiProduct, status: 'DRAFT' | 'ACTIVE'): ProductPayload {
  const laptop = product.productType === 'LAPTOP'
  return {
    slug: product.slug,
    productType: product.productType,
    brand: product.brand,
    model: product.model,
    description: product.description,
    condition: product.condition,
    conditionNotes: product.conditionNotes ?? undefined,
    useCase: laptop ? product.useCase : null,
    status,
    priceMinor: product.priceMinor,
    specs: laptop ? {} : product.specs,
    ...(laptop ? {
      cpu: product.cpu ?? undefined,
      gpu: product.gpu ?? undefined,
      baseRamGB: product.baseRamGB ?? undefined,
      baseRamType: product.baseRamType ?? undefined,
      baseStorageGB: product.baseStorageGB ?? undefined,
      baseStorageType: product.baseStorageType ?? undefined,
      displaySizeInches: product.displaySizeInches ?? undefined,
      displayResolution: product.displayResolution ?? undefined,
      displayPanel: product.displayPanel ?? undefined,
      refreshRateHz: product.refreshRateHz ?? undefined,
    } : {}),
    stockQuantity: product.stockQuantity,
    ...(product.image ? { imageId: product.image.id } : {}),
    ramOptions: laptop ? product.ramOptions.map(({ id: _id, ...option }) => option) : [],
    storageOptions: laptop ? product.storageOptions.map(({ id: _id, ...option }) => option) : [],
    combinations: laptop ? product.combinations : [],
  }
}

function formatUpdated(value: string) {
  return new Date(value).toLocaleString('en-EG', { dateStyle: 'medium', timeStyle: 'short' })
}

export function ProductEditPage({ productId, csrfToken, onBack }: {
  productId: string
  csrfToken: string
  onBack: () => void
}) {
  const [product, setProduct] = useState<ApiProduct | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    void getProduct(productId)
      .then(value => { if (active) setProduct(value) })
      .catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Product details could not be loaded.') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [productId, revision])

  async function changeStatus() {
    if (!product || busy) return
    setBusy(true)
    setError('')
    try {
      const status = product.status === 'ACTIVE' ? 'DRAFT' : 'ACTIVE'
      const saved = await updateProduct(product.id, payloadForStatus(product, status), csrfToken)
      setProduct(saved)
      setRevision(value => value + 1)
      setNotice(`${saved.brand} ${saved.model} is now ${status === 'ACTIVE' ? 'published' : 'a draft'}.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Product status could not be updated.')
    } finally {
      setBusy(false)
    }
  }

  async function archive() {
    if (!product || busy || product.status === 'ARCHIVED') return
    if (!window.confirm(`Archive ${product.brand} ${product.model}? This removes it from the public catalog while preserving its history.`)) return
    setBusy(true)
    setError('')
    try {
      const saved = await archiveProduct(product.id, csrfToken)
      setProduct(saved)
      setNotice(`${saved.brand} ${saved.model} was archived. Its history remains preserved.`)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Product could not be archived.')
    } finally {
      setBusy(false)
    }
  }

  if (loading) return <section className="live-product-route-state" role="status">Loading product details…</section>
  if (error && !product) return <section className="live-product-route-state" role="alert">
    <h2>Product could not be opened</h2><p>{error}</p><button className="button button-quiet" onClick={onBack}>Back to products</button>
  </section>
  if (!product) return null

  return <section className="live-product-route" aria-label={`Edit ${product.brand} ${product.model}`}>
    <header className="live-product-route-heading">
      <div className="live-product-route-identity">
        <div className="live-product-route-thumbnail">
          {product.image ? <img src={imageSource(product.image.imageUrl)} alt="" /> : <span aria-hidden="true">RXB</span>}
        </div>
        <div>
          <span>PRODUCT CATALOG · {product.productType.replaceAll('_', ' ')}</span>
          <h2>{product.brand} {product.model}</h2>
          <p>Product record · Last saved {formatUpdated(product.updatedAt)}</p>
        </div>
      </div>
      <div className="live-product-route-actions">
        <button type="button" className="button button-quiet" onClick={changeStatus} disabled={busy || product.status === 'ARCHIVED'}>
          {product.status === 'ACTIVE' ? 'Unpublish' : product.status === 'DRAFT' ? 'Publish' : 'Archived'}
        </button>
        {product.status !== 'ARCHIVED' && <button type="button" className="button button-quiet" onClick={() => void archive()} disabled={busy}>Archive</button>}
      </div>
    </header>
    {notice && <p className="live-products-success" role="status">{notice}</p>}
    {error && <p className="live-product-error" role="alert">{error}</p>}
    <LiveProductEditor
      key={`${product.id}:${revision}`}
      product={product}
      csrfToken={csrfToken}
      cancelLabel="Back to product list"
      onCancel={onBack}
      onSaved={saved => {
        setProduct(saved)
        setNotice(`${saved.brand} ${saved.model} was saved from the API response.`)
        setRevision(value => value + 1)
      }}
    />
  </section>
}
