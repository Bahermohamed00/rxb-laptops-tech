import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { DEMO_CATALOG_ENABLED, demoAccessories, demoLaptops, type DemoAccessoryCategory, type DemoLaptopCategory } from '../../data/demo-catalog'
import { ProductRail } from './ProductRail'

const laptopCategories: { id: DemoLaptopCategory; label: string }[] = [
  { id: 'WORK', label: 'Work' }, { id: 'STUDY', label: 'Study' }, { id: 'GAMING', label: 'Gaming' },
]
const accessoryCategories: { id: DemoAccessoryCategory; label: string }[] = [
  { id: 'KEYBOARD', label: 'Keyboard' }, { id: 'STAND', label: 'Stand' }, { id: 'MOUSE', label: 'Mouse' }, { id: 'MOUSE_PAD', label: 'Mouse Pad' },
]

type Props = {
  search: string
  minimumPrice: number | null
  maximumPrice: number | null
  sort: 'RECENT' | 'PRICE_ASC' | 'PRICE_DESC'
}

function money(amount: number) {
  return amount.toLocaleString('en-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 })
}

function DemoArtwork({ category, label, visualId }: { category: DemoLaptopCategory | DemoAccessoryCategory; label: string; visualId: string }) {
  const laptop = category === 'WORK' || category === 'STUDY' || category === 'GAMING'
  const gradientId = visualId.replace(/[^a-z0-9-]/gi, '-')
  return <div className={`demo-artwork demo-artwork-${category.toLocaleLowerCase()}`} aria-label={`Illustrative ${label} demo artwork`}>
    <svg viewBox="0 0 420 300" role="img" aria-label={`${label} illustrative demo artwork`}>
      <defs>
        <linearGradient id={`demo-screen-${gradientId}`} x1="0" x2="1" y1="0" y2="1">
          <stop offset="0" stopColor="#0d2944" /><stop offset=".55" stopColor="#177ad3" /><stop offset="1" stopColor="#111426" />
        </linearGradient>
        <linearGradient id={`demo-metal-${gradientId}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#dae5f2" /><stop offset=".18" stopColor="#718399" /><stop offset=".58" stopColor="#283446" /><stop offset="1" stopColor="#b9c9d8" />
        </linearGradient>
        <radialGradient id={`demo-glow-${gradientId}`}>
          <stop stopColor="#4bc4ff" stopOpacity=".6" /><stop offset="1" stopColor="#1687ff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="210" cy="154" rx="155" ry="115" fill={`url(#demo-glow-${gradientId})`} />
      {laptop
        ? <g transform="rotate(-8 210 155)">
          <rect x="101" y="52" width="218" height="156" rx="12" fill={`url(#demo-metal-${gradientId})`} stroke="#a9bed5" strokeWidth="2" />
          <rect x="110" y="61" width="200" height="137" rx="5" fill={`url(#demo-screen-${gradientId})`} />
          <circle cx="210" cy="56" r="2" fill="#152234" />
          <path d="M75 211h270l-24 26H99z" fill={`url(#demo-metal-${gradientId})`} stroke="#8293a7" strokeWidth="2" />
          <path d="M166 213h88l-9 5h-70z" fill="#263346" />
          <path d="M121 78h87v4h-87zM121 88h55v3h-55z" fill="#c6e8ff" opacity=".65" />
          <circle cx="267" cy="133" r="38" fill="#48baff" opacity=".28" />
        </g>
        : category === 'KEYBOARD'
          ? <g transform="rotate(-7 210 154)">
            <rect x="65" y="87" width="290" height="128" rx="15" fill={`url(#demo-metal-${gradientId})`} stroke="#a9bed5" strokeWidth="2" />
            {Array.from({ length: 5 }, (_, row) => Array.from({ length: 13 }, (_, col) => <rect key={`${row}-${col}`} x={82 + col * 19} y={103 + row * 19} width="14" height="12" rx="2" fill="#172337" stroke="#4c6986" strokeWidth=".7" />))}
            <rect x="135" y="199" width="150" height="5" rx="2.5" fill="#152033" />
          </g>
          : category === 'STAND'
            ? <g>
              <path d="M117 84h186l-15 18H132z" fill="#9fb4ca" stroke="#d7e3ef" strokeWidth="3" />
              <path d="m140 102 29 130h22l-22-130zm140 0-30 130h-22l22-130z" fill={`url(#demo-metal-${gradientId})`} stroke="#71869d" strokeWidth="2" />
              <rect x="118" y="229" width="184" height="13" rx="5" fill="#63768c" />
              <path d="M134 92h151" stroke="#49c0ff" strokeWidth="3" opacity=".7" />
            </g>
            : category === 'MOUSE'
              ? <g transform="rotate(12 210 155)">
                <path d="M210 59c-51 0-82 36-82 89v40c0 44 31 68 82 68s82-24 82-68v-40c0-53-31-89-82-89z" fill={`url(#demo-metal-${gradientId})`} stroke="#a9bed5" strokeWidth="3" />
                <path d="M210 61v76m-82 4h164" stroke="#455d78" strokeWidth="3" />
                <rect x="204" y="83" width="12" height="31" rx="6" fill="#36b7ff" />
                <circle cx="210" cy="167" r="12" fill="#1687ff" opacity=".25" />
              </g>
              : <g transform="rotate(-6 210 155)">
                <rect x="55" y="78" width="310" height="152" rx="18" fill={`url(#demo-metal-${gradientId})`} stroke="#a9bed5" strokeWidth="3" />
                <rect x="68" y="91" width="284" height="126" rx="12" fill="#0c1421" />
                <path d="M78 187c62-73 126 36 198-44 27-30 48-15 67-35" fill="none" stroke="#2aa9ff" strokeWidth="3" opacity=".65" />
                <circle cx="276" cy="143" r="39" fill="none" stroke="#82ddff" strokeWidth="1.5" opacity=".45" />
              </g>}
    </svg>
    <span className="demo-artwork-label">ILLUSTRATIVE DEMO ART</span>
  </div>
}

function LaptopCard({ item }: { item: typeof demoLaptops[number] }) {
  return <article className="demo-product-card">
    <div className="demo-product-image"><DemoArtwork category={item.category} label={`${item.brand} ${item.model}`} visualId={item.id} /><span className="demo-product-badge">DEMO</span></div>
    <div className="demo-product-copy">
      <span className="demo-product-category">{item.category} LAPTOP PREVIEW · NOT FOR SALE</span>
      <h3>{item.brand} {item.model}</h3>
      <p>{item.description}</p>
      <dl className="demo-specs">
        <div><dt>CPU</dt><dd>{item.cpu}</dd></div><div><dt>GPU</dt><dd>{item.gpu}</dd></div>
        <div><dt>Memory</dt><dd>{item.ramGB} GB {item.ramType}</dd></div><div><dt>Storage</dt><dd>{item.storageGB.toLocaleString()} GB {item.storageType}</dd></div>
        <div className="demo-spec-wide"><dt>Display</dt><dd>{item.display}</dd></div>
      </dl>
      <div className="demo-product-price"><span>{money(item.priceEgp)}</span><small>SAMPLE PRICE · NOT AUTHORITATIVE</small></div>
      <span className="demo-product-action" aria-label="Demo products are not available to purchase">Visual preview only · No purchase or inventory actions</span>
    </div>
  </article>
}

function AccessoryCard({ item }: { item: typeof demoAccessories[number] }) {
  return <article className="demo-product-card">
    <div className="demo-product-image"><DemoArtwork category={item.category} label={item.model} visualId={item.id} /><span className="demo-product-badge">DEMO</span></div>
    <div className="demo-product-copy">
      <span className="demo-product-category">{accessoryCategories.find(category => category.id === item.category)?.label.toUpperCase()} PREVIEW · NOT FOR SALE</span>
      <h3>{item.brand} {item.model}</h3>
      <p>{item.description}</p>
      <div className="demo-product-price"><span>{money(item.priceEgp)}</span><small>SAMPLE PRICE · NOT AUTHORITATIVE</small></div>
      <span className="demo-product-action" aria-label="Demo accessories are not available to purchase">Visual preview only · No purchase or inventory actions</span>
    </div>
  </article>
}

function matches(item: { brand: string; model: string; description: string }, query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const content = `${item.brand} ${item.model} ${item.description}`.toLocaleLowerCase()
  return terms.every(term => content.includes(term))
}

function sorted<T extends { priceEgp: number }>(items: T[], sort: Props['sort']) {
  if (sort === 'PRICE_ASC') return [...items].sort((a, b) => a.priceEgp - b.priceEgp)
  if (sort === 'PRICE_DESC') return [...items].sort((a, b) => b.priceEgp - a.priceEgp)
  return items
}

function DemoPriceFilter({ onApply }: { onApply: (minimum: number | null, maximum: number | null) => void }) {
  const [minimum, setMinimum] = useState('')
  const [maximum, setMaximum] = useState('')
  const [error, setError] = useState('')
  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const min = minimum.trim() ? Number(minimum) : null
    const max = maximum.trim() ? Number(maximum) : null
    if ((min !== null && (!Number.isFinite(min) || min < 0)) || (max !== null && (!Number.isFinite(max) || max < 0))) {
      setError('Enter valid non-negative prices.')
      return
    }
    if (min !== null && max !== null && min > max) {
      setError('Minimum price cannot exceed maximum price.')
      return
    }
    setError('')
    onApply(min === null ? null : Math.round(min * 100), max === null ? null : Math.round(max * 100))
  }
  return <form className="demo-price-filter" onSubmit={apply} noValidate>
    <fieldset className="price-filter"><legend>Accessory demo price range (EGP)</legend>
      <label>Min<input aria-label="Minimum accessory demo price in EGP" type="number" min="0" step="1" value={minimum} onChange={event => setMinimum(event.target.value)} placeholder="Any" /></label>
      <span aria-hidden="true">–</span>
      <label>Max<input aria-label="Maximum accessory demo price in EGP" type="number" min="0" step="1" value={maximum} onChange={event => setMaximum(event.target.value)} placeholder="Any" /></label>
      <button type="submit">Apply</button>
      <button type="button" className="clear-filters" onClick={() => { setMinimum(''); setMaximum(''); setError(''); onApply(null, null) }}>Clear</button>
    </fieldset>
    {error && <span className="filter-error" role="alert">{error}</span>}
  </form>
}

export function DemoCatalogPreview({ search, minimumPrice, maximumPrice, sort }: Props) {
  const [laptopCategory, setLaptopCategory] = useState<DemoLaptopCategory>('WORK')
  const [accessoryCategory, setAccessoryCategory] = useState<DemoAccessoryCategory>('KEYBOARD')
  const [accessoryPriceRange, setAccessoryPriceRange] = useState<{ min: number | null; max: number | null }>({ min: null, max: null })
  const [accessorySort, setAccessorySort] = useState<Props['sort']>('RECENT')

  const laptopItems = useMemo(() => {
    return sorted(demoLaptops.filter(item => item.category === laptopCategory && matches(item, search) &&
      (minimumPrice === null || item.priceEgp * 100 >= minimumPrice) &&
      (maximumPrice === null || item.priceEgp * 100 <= maximumPrice)), sort)
  }, [laptopCategory, search, minimumPrice, maximumPrice, sort])

  const accessoryItems = useMemo(() => sorted(demoAccessories.filter(item =>
    item.category === accessoryCategory && matches(item, search) &&
    (accessoryPriceRange.min === null || item.priceEgp * 100 >= accessoryPriceRange.min) &&
    (accessoryPriceRange.max === null || item.priceEgp * 100 <= accessoryPriceRange.max),
  ), accessorySort), [accessoryCategory, search, accessoryPriceRange, accessorySort])

  if (!DEMO_CATALOG_ENABLED) return null

  return <section className="demo-catalog-section" id="demo-catalog" aria-labelledby="demo-catalog-title">
    <div className="wrap">
      <div className="demo-catalog-heading">
        <div><div className="eyebrow"><span>DEMO</span><i /> TEMPORARY VISUAL PREVIEW</div><h2 id="demo-catalog-title">Layout <em>preview.</em></h2></div>
        <p>Every card below is sample-only. Products, imagery, and prices are not real listings and cannot be purchased.</p>
      </div>
      <div className="demo-subsection">
        <div className="demo-subsection-heading"><h3>Laptop category layouts</h3><span>{laptopItems.length} sample cards</span></div>
        <div className="category-pills demo-category-pills" role="group" aria-label="Choose demo laptop category">
          {laptopCategories.map(item => <button key={item.id} type="button" className={laptopCategory === item.id ? 'active' : ''} aria-pressed={laptopCategory === item.id} onClick={() => setLaptopCategory(item.id)}>{item.label}</button>)}
        </div>
        {laptopItems.length
          ? <ProductRail label="demo laptops" className="demo-product-grid">{laptopItems.map(item => <LaptopCard key={item.id} item={item} />)}</ProductRail>
          : <p className="demo-empty-state" role="status">No demo laptops match the current search and price filters.</p>}
      </div>
      <div className="demo-subsection demo-accessories" id="demo-accessories">
        <div className="demo-subsection-heading"><h3>Accessory category layouts</h3><span>{accessoryItems.length} sample cards</span></div>
        <div className="category-pills demo-category-pills" role="group" aria-label="Choose demo accessory category">
          {accessoryCategories.map(item => <button key={item.id} type="button" className={accessoryCategory === item.id ? 'active' : ''} aria-pressed={accessoryCategory === item.id} onClick={() => setAccessoryCategory(item.id)}>{item.label}</button>)}
        </div>
        <div className="demo-accessory-controls">
          <DemoPriceFilter onApply={(min, max) => setAccessoryPriceRange({ min, max })} />
          <label className="sort-control">Sort by<select value={accessorySort} onChange={event => setAccessorySort(event.target.value as Props['sort'])}><option value="RECENT">Default order</option><option value="PRICE_ASC">Price: low to high</option><option value="PRICE_DESC">Price: high to low</option></select></label>
        </div>
        {accessoryItems.length
          ? <ProductRail label="demo accessories" className="demo-product-grid demo-accessory-grid">{accessoryItems.map(item => <AccessoryCard key={item.id} item={item} />)}</ProductRail>
          : <p className="demo-empty-state" role="status">No demo accessories match the current search and price filters.</p>}
      </div>
    </div>
  </section>
}
