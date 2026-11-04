import { useEffect, useState } from 'react'
import { fetchProductDetail, fetchQuote, type PublicOption, type StoreProduct } from './products.api'
import { productInquiryMessage, whatsappUrl } from '../../config/business-contact'
import { CpuIcon, GpuIcon, LaptopIcon, MouseIcon, WhatsAppIcon } from '../../components/icons'
import { formatEgp } from '../home/catalog'
import { ProductGallery } from './ProductGallery'
import './product-detail.css'

const deltaLabel = (minor: number, currency: string) => minor === 0 ? 'Included' : `${minor > 0 ? '+' : '−'} ${formatEgp(Math.abs(minor), currency)}`
const storageLabel = (gb: number) => gb >= 1000 && gb % 1000 === 0 ? `${gb / 1000} TB` : `${gb} GB`
const optionLabel = (kind: 'ram' | 'storage', option: PublicOption) => `${kind === 'storage' ? storageLabel(option.capacityGB) : `${option.capacityGB} GB`} ${option.type}`
const MemoryGlyph = () => <svg className="pd-option-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 8h18v8H3zM7 8v8M11 8v8M15 8v8M19 8v8M6 16v2M10 16v2M14 16v2M18 16v2" /></svg>
const DriveGlyph = () => <svg className="pd-option-glyph" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16v10H4zM7.5 12h6M17 12h.01" /></svg>
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

export function ProductDetailPage({ product, onClose }: { product: StoreProduct; onClose: () => void }) {
  const baseRam = product.ramOptions.find(option => option.isBase) ?? product.ramOptions[0]
  const baseStorage = product.storageOptions.find(option => option.isBase) ?? product.storageOptions[0]
  const [ramId, setRamId] = useState(baseRam?.id ?? '')
  const [storageId, setStorageId] = useState(baseStorage?.id ?? '')
  const [quote, setQuote] = useState<{ currency: string; priceMinor: number; ramOptionId: string; storageOptionId: string } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [details, setDetails] = useState<StoreProduct | null>(null)
  const [detailsLoading, setDetailsLoading] = useState(true)
  const [detailsError, setDetailsError] = useState('')
  const [retry, setRetry] = useState(0)
  const [adjustment, setAdjustment] = useState('')

  useEffect(() => {
    let active = true
    setDetailsLoading(true); setDetailsError('')
    void fetchProductDetail(product.slug).then(value => { if (active) setDetails(value) }).catch(cause => { if (active) setDetailsError(cause instanceof Error ? cause.message : 'Product details could not be loaded.') }).finally(() => { if (active) setDetailsLoading(false) })
    return () => { active = false }
  }, [product.slug, retry])

  useEffect(() => {
    if (!details) return
    const baseRamId = details.ramOptions.find(option => option.isBase)?.id ?? details.ramOptions[0]?.id ?? ''
    const baseStorageId = details.storageOptions.find(option => option.isBase)?.id ?? details.storageOptions[0]?.id ?? ''
    // Start from the base pair; fall back to the first offered pair if the base pair is not offered.
    const start = details.combinations.some(pair => pair.ramOptionId === baseRamId && pair.storageOptionId === baseStorageId)
      ? { ramOptionId: baseRamId, storageOptionId: baseStorageId }
      : details.combinations[0] ?? { ramOptionId: baseRamId, storageOptionId: baseStorageId }
    setRamId(start.ramOptionId)
    setStorageId(start.storageOptionId)
    setAdjustment('')
  }, [details])

  const isOffered = (nextRamId: string, nextStorageId: string) => Boolean(details?.combinations.some(pair => pair.ramOptionId === nextRamId && pair.storageOptionId === nextStorageId))
  /** Options of the other specification that are offered together with `id`. */
  function partnersOf(kind: 'ram' | 'storage', id: string) {
    const pairs = details?.combinations ?? []
    return kind === 'ram' ? pairs.filter(pair => pair.ramOptionId === id).map(pair => pair.storageOptionId) : pairs.filter(pair => pair.storageOptionId === id).map(pair => pair.ramOptionId)
  }
  /**
   * The partner that selecting `id` would leave in place: the current one when it is still offered, otherwise the
   * offered partner closest in capacity to the current one, then the cheaper upgrade.
   */
  function resolvePartner(kind: 'ram' | 'storage', id: string): PublicOption | undefined {
    const partnerOptions = (kind === 'ram' ? details?.storageOptions : details?.ramOptions) ?? []
    const currentPartner = partnerOptions.find(option => option.id === (kind === 'ram' ? storageId : ramId))
    const candidates = partnersOf(kind, id).map(partnerId => partnerOptions.find(option => option.id === partnerId)).filter((option): option is PublicOption => Boolean(option))
    if (currentPartner && candidates.some(option => option.id === currentPartner.id)) return currentPartner
    const reference = currentPartner?.capacityGB ?? 0
    return [...candidates].sort((a, b) => Math.abs(a.capacityGB - reference) - Math.abs(b.capacityGB - reference) || a.priceDeltaMinor - b.priceDeltaMinor)[0]
  }
  function select(kind: 'ram' | 'storage', id: string) {
    const options = (kind === 'ram' ? details?.ramOptions : details?.storageOptions) ?? []
    const chosen = options.find(option => option.id === id)
    const partner = resolvePartner(kind, id)
    if (!chosen || !partner) return
    const previousPartnerId = kind === 'ram' ? storageId : ramId
    const nextRamId = kind === 'ram' ? id : partner.id
    const nextStorageId = kind === 'ram' ? partner.id : id
    if (!isOffered(nextRamId, nextStorageId)) return
    // Both ids change in one render, so the quote request only ever sees the final, offered pair.
    setRamId(nextRamId)
    setStorageId(nextStorageId)
    if (partner.id === previousPartnerId) { setAdjustment(''); return }
    const otherKind = kind === 'ram' ? 'storage' : 'ram'
    const previousPartner = (kind === 'ram' ? details?.storageOptions : details?.ramOptions)?.find(option => option.id === previousPartnerId)
    setAdjustment(`${otherKind === 'ram' ? 'Memory' : 'Storage'} changed to ${optionLabel(otherKind, partner)}${previousPartner ? ` — ${optionLabel(kind, chosen)} ${kind === 'ram' ? 'RAM' : 'storage'} isn’t offered with ${optionLabel(otherKind, previousPartner)}` : ''}.`)
  }
  const compatibleRamIds = partnersOf('storage', storageId)
  const compatibleStorageIds = partnersOf('ram', ramId)
  useEffect(() => {
    if (!details || details.productType !== 'LAPTOP') {
      setQuote(null)
      setLoading(false)
      setError('')
      return
    }
    // Never ask the server to price a pair that is not offered.
    if (!ramId || !storageId || !isOffered(ramId, storageId)) { setQuote(null); setLoading(false); return }
    let active = true
    setLoading(true); setError(''); setQuote(null)
    void fetchQuote(details, ramId, storageId).then(value => { if (active) setQuote(value) }).catch(cause => { if (active) setError(cause instanceof Error ? cause.message : 'Price could not be confirmed.') }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [details, ramId, storageId])

  const shownProduct = details ?? product
  const gallery = shownProduct.imageUrls?.length ? shownProduct.imageUrls : shownProduct.imageUrl ? [shownProduct.imageUrl] : []
  const isLaptop = shownProduct.productType === 'LAPTOP'
  const selectedRam = details?.ramOptions.find(option => option.id === ramId)
  const selectedStorage = details?.storageOptions.find(option => option.id === storageId)
  const isBaseConfiguration = Boolean(selectedRam?.isBase && selectedStorage?.isBase)
  const quoteMatchesSelection = Boolean(quote && quote.ramOptionId === ramId && quote.storageOptionId === storageId)
  const currentQuote = quoteMatchesSelection ? quote : null
  const inquiryPrice = currentQuote ?? (details && (!isLaptop || isBaseConfiguration) ? { currency: details.currency, priceMinor: details.priceMinor } : null)
  const productTypeLabel = shownProduct.productType === 'LAPTOP' ? 'Laptop' : shownProduct.accessoryCategory?.name || (shownProduct.productType === 'OTHER_ACCESSORY'
    ? 'Other accessory'
    : shownProduct.productType.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase()))
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
      isLaptop && details && selectedRam && selectedStorage ? { base: details.priceMinor, ramDelta: selectedRam.priceDeltaMinor, storageDelta: selectedStorage.priceDeltaMinor } : undefined,
    ))
    : ''
  const displaySummary = [
    shownProduct.displaySizeInches !== null ? `${shownProduct.displaySizeInches}"` : null,
    shownProduct.displayResolution,
    shownProduct.displayPanel,
    shownProduct.refreshRateHz !== null ? `${shownProduct.refreshRateHz} Hz` : null,
  ].filter(Boolean).join(' · ')
  const specificationGroups = ([
    { title: 'General', rows: [
      ['Brand', shownProduct.brand],
      ['Model', shownProduct.model],
      ['Product type', productTypeLabel],
      ['Condition', shownProduct.condition === 'NEW' ? 'New' : 'Pre-owned'],
      ['Availability', shownProduct.available ? 'In stock' : 'Currently unavailable'],
      ['Condition notes', shownProduct.conditionNotes],
    ] },
    ...(isLaptop ? [
      { title: 'Performance', rows: [
        ['Processor', shownProduct.cpu],
        ['Graphics card', shownProduct.gpu],
        ['Memory (base)', shownProduct.baseRamGB !== null && shownProduct.baseRamType ? `${shownProduct.baseRamGB} GB ${shownProduct.baseRamType}` : null],
        ['Storage (base)', shownProduct.baseStorageGB !== null && shownProduct.baseStorageType ? `${storageLabel(shownProduct.baseStorageGB)} ${shownProduct.baseStorageType}` : null],
      ] },
      { title: 'Display', rows: [
        ['Screen size', shownProduct.displaySizeInches !== null ? `${shownProduct.displaySizeInches} in` : null],
        ['Resolution', shownProduct.displayResolution],
        ['Panel', shownProduct.displayPanel],
        ['Refresh rate', shownProduct.refreshRateHz !== null ? `${shownProduct.refreshRateHz} Hz` : null],
      ] },
    ] : [
      { title: 'Details', rows: Object.entries(shownProduct.specs ?? {}).map(([key, value]) => [accessorySpecLabels[key] ?? key, String(value)]) },
    ]),
  ] as { title: string; rows: [string, string | null][] }[])
    .map(group => ({ title: group.title, rows: group.rows.filter((row): row is [string, string] => typeof row[1] === 'string' && row[1].length > 0) }))
    .filter(group => group.rows.length > 0)
  const keySpecs = (isLaptop ? [
    { Icon: CpuIcon, label: 'Processor', value: shownProduct.cpu },
    { Icon: GpuIcon, label: 'Graphics', value: shownProduct.gpu },
    { Icon: LaptopIcon, label: 'Display', value: displaySummary || null },
  ] : [
    { Icon: MouseIcon, label: 'Type', value: productTypeLabel },
  ]).filter(spec => spec.value)
  const descriptionLines = shownProduct.description.split(/\r?\n/).map(line => line.trim()).filter(Boolean)
  const totalLabel = isLaptop
    ? detailsLoading ? 'Loading details…' : loading ? 'Updating price…' : inquiryPrice ? formatEgp(inquiryPrice.priceMinor, inquiryPrice.currency) : 'Price unavailable'
    : detailsLoading ? 'Loading product…' : inquiryPrice ? formatEgp(inquiryPrice.priceMinor, inquiryPrice.currency) : 'Price unavailable'

  function optionGroup(kind: 'ram' | 'storage') {
    const options = kind === 'ram' ? shownProduct.ramOptions : shownProduct.storageOptions
    const selected = kind === 'ram' ? ramId : storageId
    const compatible = kind === 'ram' ? compatibleRamIds : compatibleStorageIds
    const otherKind = kind === 'ram' ? 'storage' : 'ram'
    const current = options.find(option => option.id === selected)
    const locked = detailsLoading || !details || Boolean(detailsError)
    if (!options.length) return null
    return <fieldset className="pd-options" disabled={locked}>
      <legend><span>{kind === 'ram' ? 'Memory (RAM)' : 'Storage'}</span>{current && <b>{optionLabel(kind, current)}</b>}</legend>
      <div className="pd-option-grid">
        {options.map(option => {
          // Only options with no offered pairing at all are unavailable; others re-pair the other specification on selection.
          const unavailable = Boolean(details && partnersOf(kind, option.id).length === 0)
          const conflict = Boolean(details && !unavailable && !compatible.includes(option.id))
          const switchTo = conflict ? resolvePartner(kind, option.id) : undefined
          const checked = option.id === selected
          return <label key={option.id} className={`pd-option${checked ? ' is-selected' : ''}${unavailable ? ' is-unavailable' : ''}${conflict ? ' is-conflict' : ''}`}>
            <input type="radio" name={`pd-${kind}`} value={option.id} checked={checked} disabled={unavailable} onChange={() => select(kind, option.id)} />
            <span className="pd-option-head">
              {kind === 'ram' ? <MemoryGlyph /> : <DriveGlyph />}
              <small className="pd-option-type">{option.type}</small>
              <i className="pd-option-check" aria-hidden="true" />
            </span>
            <span className="pd-option-name">{kind === 'storage' ? storageLabel(option.capacityGB) : `${option.capacityGB} GB`}</span>
            <span className="pd-option-delta">{unavailable ? 'Currently unavailable' : deltaLabel(option.priceDeltaMinor, shownProduct.currency)}</span>
            {switchTo && <span className="pd-option-switch"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5.5h9l-2.5-2.5M13 10.5H4l2.5 2.5" /></svg>Switches {otherKind === 'ram' ? 'memory' : 'storage'} to {optionLabel(otherKind, switchTo)}</span>}
          </label>
        })}
      </div>
    </fieldset>
  }

  const orderButton = whatsappHref
    ? <a className="pd-order" href={whatsappHref} target="_blank" rel="noreferrer"><WhatsAppIcon />Order via WhatsApp</a>
    : <button type="button" className="pd-order" disabled><WhatsAppIcon />{isLaptop ? loading ? 'Confirming configuration price…' : 'Configuration price unavailable' : 'Ordering unavailable'}</button>

  return <section className="pd" aria-labelledby="product-detail-title">
    <div className="sf-container">
      <nav className="pd-breadcrumb" aria-label="Breadcrumb">
        <button type="button" className="pd-back" onClick={onClose}>← Back</button>
        <ol>
          <li><a href="/">Home</a></li>
          <li><a href={isLaptop ? '/laptops' : '/accessories'}>{isLaptop ? 'Laptops' : 'Accessories'}</a></li>
          <li aria-current="page">{shownProduct.brand} {shownProduct.model}</li>
        </ol>
      </nav>

      <div className="pd-grid">
        <div className="pd-gallery">
          <ProductGallery images={gallery} label={`${shownProduct.brand} ${shownProduct.model}`} sample={shownProduct.description.startsWith('SAMPLE / TEST LISTING')} />
        </div>

        <div className="pd-info">
          <div className="pd-tags">
            <span className="pd-tag">{productTypeLabel}</span>
            <span className="pd-tag">{shownProduct.condition === 'NEW' ? 'New' : 'Pre-owned'}</span>
            <span className={`pd-tag pd-stock${shownProduct.available ? '' : ' is-out'}`}><i aria-hidden="true" />{shownProduct.available ? 'In stock' : 'Currently unavailable'}</span>
          </div>
          <h1 id="product-detail-title">{shownProduct.brand} {shownProduct.model}</h1>

          {keySpecs.length > 0 && <ul className="pd-keyspecs">
            {keySpecs.map(({ Icon, label, value }) => <li key={label}><Icon /><span><small>{label}</small><b dir="auto">{value}</b></span></li>)}
          </ul>}

          <div className="pd-price"><span>{isLaptop ? 'Starting from' : 'Price'}</span><strong>{formatEgp(shownProduct.priceMinor, shownProduct.currency)}</strong></div>

          <div className="pd-buy">
            {isLaptop && <>
              <h2>Configure your laptop</h2>
              {optionGroup('ram')}
              {optionGroup('storage')}
              <p className="pd-adjusted" role="status">{adjustment && <><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 5.5h9l-2.5-2.5M13 10.5H4l2.5 2.5" /></svg><span key={adjustment}>{adjustment}</span></>}</p>
              {selectedRam && selectedStorage && <p className="pd-config">
                <span>Your configuration</span>
                <b>{optionLabel('ram', selectedRam)} RAM</b><i aria-hidden="true">+</i><b>{optionLabel('storage', selectedStorage)} storage</b>
              </p>}
            </>}
            <div className="pd-total" aria-live="polite"><span>{isLaptop ? 'Selected configuration total' : 'Listed price'}</span><strong>{totalLabel}</strong></div>
            {detailsError && <p className="pd-error" role="alert">{detailsError} <button type="button" onClick={() => setRetry(value => value + 1)}>Retry</button></p>}
            {error && <p className="pd-error" role="alert">{error}</p>}
            {orderButton}
            <p className="pd-note">{isLaptop ? 'Configuration prices are confirmed by RXB. ' : ''}Sending a WhatsApp message starts an inquiry; it does not place an order.</p>
          </div>

          <a className="pd-specs-link" href="#pd-specifications">View full specifications ↓</a>
        </div>
      </div>

      <div className="pd-sections">
        {descriptionLines.length > 0 && <section className="pd-section" id="pd-overview" aria-labelledby="pd-overview-title">
          <h2 id="pd-overview-title">Overview</h2>
          <div className="pd-description">{descriptionLines.map((line, index) => <p key={index} dir="auto">{line}</p>)}</div>
        </section>}
        <section className="pd-section" id="pd-specifications" aria-labelledby="pd-specifications-title">
          <h2 id="pd-specifications-title">Technical Specifications</h2>
          <div className="pd-spec-groups">
            {specificationGroups.map(group => <div key={group.title} className="pd-spec-group">
              <h3>{group.title}</h3>
              <dl>{group.rows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd dir="auto">{value}</dd></div>)}</dl>
            </div>)}
          </div>
        </section>
      </div>
    </div>
  </section>
}
