import { useEffect, useState } from 'react'
import { fetchProductDetail, fetchQuote, imageSource, type StoreProduct } from './products.api'
import { productInquiryMessage, whatsappUrl } from '../../config/business-contact'
import { ThemeToggle } from '../../components/ThemeToggle'
import type { Theme } from '../../theme/useTheme'

const formatMoney = (minor: number, currency: string) => (minor / 100).toLocaleString('en-EG', { style: 'currency', currency })
const deltaLabel = (minor: number, currency: string) => minor === 0 ? 'Included' : `${minor > 0 ? '+' : '−'}${formatMoney(Math.abs(minor), currency)}`
const accessorySpecLabels: Record<string, string> = {
  keyboardType: 'Keyboard type',
  connection: 'Connection',
  layout: 'Layout / language',
  backlight: 'Backlight',
  dpi: 'DPI',
  buttonCount: 'Number of buttons',
  size: 'Size',
  material: 'Material',
  color: 'Color',
  categoryName: 'Category',
  additionalNotes: 'Additional notes',
}

export function ProductDetailPage({ product, onClose, theme, onToggleTheme }: { product: StoreProduct; onClose: () => void; theme: Theme; onToggleTheme: () => void }) {
  const baseRam = product.ramOptions.find(option => option.isBase) ?? product.ramOptions[0]
  const baseStorage = product.storageOptions.find(option => option.isBase) ?? product.storageOptions[0]
  const [ramId, setRamId] = useState(baseRam?.id ?? '')
  const [storageId, setStorageId] = useState(baseStorage?.id ?? '')
  const [quote, setQuote] = useState<{ currency: string; priceMinor: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [details, setDetails] = useState<StoreProduct | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [detailsError, setDetailsError] = useState('')
  const [retry, setRetry] = useState(0)
  const [imageFailed, setImageFailed] = useState(false)

  useEffect(() => {
    let active = true
    setDetailsLoading(true); setDetailsError('')
    void fetchProductDetail(product.slug).then(value => { if (active) setDetails(value) }).catch(cause => { if (active) setDetailsError(cause instanceof Error ? cause.message : 'Product details could not be loaded.') }).finally(() => { if (active) setDetailsLoading(false) })
    return () => { active = false }
  }, [product.slug, retry])

  useEffect(() => {
    if (!details) return
    setRamId(details.ramOptions.find(option => option.isBase)?.id ?? details.ramOptions[0]?.id ?? '')
    setStorageId(details.storageOptions.find(option => option.isBase)?.id ?? details.storageOptions[0]?.id ?? '')
  }, [details])

  const compatibleStorageIds = details?.combinations.filter(pair => pair.ramOptionId === ramId).map(pair => pair.storageOptionId) ?? []
  const compatibleRamIds = details?.combinations.filter(pair => pair.storageOptionId === storageId).map(pair => pair.ramOptionId) ?? []
  function selectRam(nextRamId: string) {
    setRamId(nextRamId)
    const nextStorageIds = details?.combinations.filter(pair => pair.ramOptionId === nextRamId).map(pair => pair.storageOptionId) ?? []
    if (!nextStorageIds.includes(storageId)) {
      const nextPair = details?.combinations.find(pair => pair.ramOptionId === nextRamId)
      if (nextPair) setStorageId(nextPair.storageOptionId)
    }
  }
  function selectStorage(nextStorageId: string) {
    setStorageId(nextStorageId)
    const nextRamIds = details?.combinations.filter(pair => pair.storageOptionId === nextStorageId).map(pair => pair.ramOptionId) ?? []
    if (!nextRamIds.includes(ramId)) {
      const nextPair = details?.combinations.find(pair => pair.storageOptionId === nextStorageId)
      if (nextPair) setRamId(nextPair.ramOptionId)
    }
  }

  useEffect(() => {
    if (!details || details.productType !== 'LAPTOP') {
      setQuote(null)
      setLoading(false)
      setError('')
      return
    }
    if (!ramId || !storageId) { setQuote(null); return }
    let active = true
    setLoading(true); setError(''); setQuote(null)
    void fetchQuote(details, ramId, storageId).then(value => { if (active) setQuote(value) }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Price could not be confirmed.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [details, ramId, storageId])

  const shownProduct = details ?? product
  const isLaptop = shownProduct.productType === 'LAPTOP'
  const selectedRam = details?.ramOptions.find(option => option.id === ramId)
  const selectedStorage = details?.storageOptions.find(option => option.id === storageId)
  const isBaseConfiguration = Boolean(selectedRam?.isBase && selectedStorage?.isBase)
  const inquiryPrice = quote ?? (details && (!isLaptop || isBaseConfiguration) ? { currency: details.currency, priceMinor: details.priceMinor } : null)
  const productTypeLabel = shownProduct.productType === 'OTHER_ACCESSORY'
    ? 'Other accessory'
    : shownProduct.productType.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
  const productUrl = details ? new URL(`/products/${encodeURIComponent(details.slug)}`, window.location.origin).toString() : ''
  const whatsappHref = details && inquiryPrice && (!isLaptop || (selectedRam && selectedStorage))
    ? whatsappUrl(productInquiryMessage(
      details,
      productUrl,
      isLaptop && selectedRam && selectedStorage
        ? { ram: `${selectedRam.capacityGB} GB ${selectedRam.type}`, storage: `${selectedStorage.capacityGB} GB ${selectedStorage.type}` }
        : null,
      inquiryPrice.currency,
      inquiryPrice.priceMinor,
    ))
    : ''
  const specifications = [
    ['Product type', productTypeLabel],
    ['Brand', shownProduct.brand],
    ['Model', shownProduct.model],
    ['Condition', shownProduct.condition === 'NEW' ? 'New' : 'Pre-owned'],
    ['Availability', shownProduct.available ? 'In stock' : 'Currently unavailable'],
    ...(isLaptop ? [
      ['Processor', shownProduct.cpu],
      ['Graphics', shownProduct.gpu],
      ['Base memory', shownProduct.baseRamGB !== null && shownProduct.baseRamType ? `${shownProduct.baseRamGB} GB ${shownProduct.baseRamType}` : null],
      ['Base storage', shownProduct.baseStorageGB !== null && shownProduct.baseStorageType ? `${shownProduct.baseStorageGB} GB ${shownProduct.baseStorageType}` : null],
      ['Display size', shownProduct.displaySizeInches !== null ? `${shownProduct.displaySizeInches} in` : null],
      ['Resolution', shownProduct.displayResolution],
      ['Panel', shownProduct.displayPanel],
      ['Refresh rate', shownProduct.refreshRateHz !== null ? `${shownProduct.refreshRateHz} Hz` : null],
    ] as [string, string | null][] : Object.entries(shownProduct.specs ?? {}).map(([key, value]) => [
      accessorySpecLabels[key] ?? key,
      String(value),
    ])),
    ['Condition notes', shownProduct.conditionNotes],
  ].filter((entry): entry is [string, string] => typeof entry[1] === 'string' && entry[1].length > 0)
  return <section className="product-detail-page" aria-labelledby="product-detail-title">
    <header className="product-detail-topbar wrap">
      <a className="wordmark" href="/" aria-label="RXB Laptops and Tech home"><img className="wordmark-logo" src="/rxb-logo-transparent.png" alt="" /><span className="wordmark-caption">LAPTOPS <i>/</i> TECH</span></a>
      <div className="product-detail-topbar-actions"><ThemeToggle theme={theme} onToggle={onToggleTheme} /><button type="button" onClick={onClose}>← Back to catalog</button></div>
    </header>
    <div className="product-detail-container wrap">
      <p className="product-detail-breadcrumb"><a href={isLaptop ? '/#laptops' : '/#parts'} onClick={event => { event.preventDefault(); onClose() }}>{isLaptop ? 'LAPTOP CATALOG' : 'ACCESSORIES'}</a><span>/</span> PRODUCT DETAILS</p>
      <div className="product-detail-grid">
        <div className="product-detail-media">
          {shownProduct.imageUrl && !imageFailed
            ? <img src={imageSource(shownProduct.imageUrl)} alt={`${shownProduct.brand} ${shownProduct.model}`} onError={() => setImageFailed(true)} />
            : <div className="product-image-fallback"><strong>RXB</strong><span>{shownProduct.imageUrl ? 'PRODUCT IMAGE UNAVAILABLE' : 'NO PRODUCT IMAGE PROVIDED'}</span></div>}
          {shownProduct.description.startsWith('SAMPLE / TEST LISTING') && <span className="product-detail-sample">SAMPLE / TEST · NOT CONFIRMED INVENTORY</span>}
        </div>
        <div className="product-detail-purchase">
          <span className="product-dialog-kicker">{productTypeLabel.toUpperCase()} · {shownProduct.condition === 'NEW' ? 'NEW' : 'PRE-OWNED'} · {shownProduct.available ? 'IN STOCK' : 'CURRENTLY UNAVAILABLE'}</span>
          <h1 id="product-detail-title">{shownProduct.brand} {shownProduct.model}</h1>
          <p className="product-detail-description">{shownProduct.description || 'No product description has been provided.'}</p>
          <div className="product-listed-price"><span>{isLaptop ? 'Listed base price' : 'Price'}</span><strong>{formatMoney(shownProduct.priceMinor, shownProduct.currency)}</strong></div>
          {isLaptop
            ? <div className="product-detail-configuration">
              <h2>Configure your laptop</h2>
              <p>Only options compatible with this product are available.</p>
              <label className="product-choice">Memory (RAM)<select disabled={detailsLoading || !details || Boolean(detailsError)} value={ramId} onChange={event => selectRam(event.target.value)}>{shownProduct.ramOptions.map(option => <option key={option.id} value={option.id} disabled={Boolean(details && !compatibleRamIds.includes(option.id))}>{option.capacityGB} GB {option.type} · {deltaLabel(option.priceDeltaMinor, shownProduct.currency)}</option>)}</select></label>
              <label className="product-choice">Storage<select disabled={detailsLoading || !details || Boolean(detailsError)} value={storageId} onChange={event => selectStorage(event.target.value)}>{shownProduct.storageOptions.map(option => <option key={option.id} value={option.id} disabled={Boolean(details && !compatibleStorageIds.includes(option.id))}>{option.capacityGB} GB {option.type} · {deltaLabel(option.priceDeltaMinor, shownProduct.currency)}</option>)}</select></label>
              <div className="product-quote" aria-live="polite"><span>Selected configuration total</span><strong>{detailsLoading ? 'Loading details…' : loading ? 'Updating price…' : quote ? formatMoney(quote.priceMinor, quote.currency) : 'Price unavailable'}</strong></div>
              {detailsError && <p className="product-quote-error" role="alert">{detailsError} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
              {error && <p className="product-quote-error" role="alert">{error}</p>}
              <p className="product-dialog-note">Configuration prices are confirmed by the RXB API. An inquiry does not place an order.</p>
              {whatsappHref
                ? <a className="product-dialog-action product-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">Contact us on WhatsApp <span aria-hidden="true">↗</span></a>
                : <button type="button" className="product-dialog-action product-whatsapp" disabled>{loading ? 'Confirming configuration price…' : 'Configuration price unavailable'}</button>}
            </div>
            : <div className="product-detail-configuration">
              <h2>Interested in this item?</h2>
              <p>Contact RXB about this listed product. An inquiry does not place an order.</p>
              <div className="product-quote" aria-live="polite"><span>Listed price</span><strong>{detailsLoading ? 'Loading product…' : inquiryPrice ? formatMoney(inquiryPrice.priceMinor, inquiryPrice.currency) : 'Price unavailable'}</strong></div>
              {detailsError && <p className="product-quote-error" role="alert">{detailsError} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
              {whatsappHref
                ? <a className="product-dialog-action product-whatsapp" href={whatsappHref} target="_blank" rel="noreferrer">Contact us on WhatsApp <span aria-hidden="true">↗</span></a>
                : <button type="button" className="product-dialog-action product-whatsapp" disabled>Contact unavailable</button>}
            </div>}
        </div>
      </div>
      <section className="product-detail-specifications" aria-labelledby="specifications-title">
        <div><span className="eyebrow">PRODUCT INFORMATION</span><h2 id="specifications-title">Specifications</h2></div>
        <dl>{specifications.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </section>
      <button type="button" className="product-detail-back-bottom" onClick={onClose}>← Back to the catalog</button>
    </div>
  </section>
}
