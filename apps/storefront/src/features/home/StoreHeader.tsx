import { useEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent, KeyboardEvent } from 'react'
import { imageSource, type StoreProduct } from '../products/products.api'
import { generalInquiryUrl, topicInquiryUrl, whatsappUrl } from '../../config/business-contact'
import { BriefcaseIcon, CartIcon, ChevronDownIcon, CpuIcon, GamepadIcon, GraduationIcon, HelpIcon, LaptopIcon, MenuIcon, MouseIcon, PhoneIcon, SearchIcon, WhatsAppIcon } from '../../components/icons'
import { formatEgp, matchesSearch, productTypeLabel } from './catalog'

const categoryLinks = [
  { label: 'Gaming Laptops', href: '/laptops?use=GAMING', Icon: GamepadIcon },
  { label: 'Business Laptops', href: '/laptops?use=WORK', Icon: BriefcaseIcon },
  { label: 'Workstations', href: '/laptops?use=WORK', Icon: CpuIcon },
  { label: 'Student Laptops', href: '/laptops?use=STUDY', Icon: GraduationIcon },
  { label: 'Accessories', href: '/laptops#accessories', Icon: MouseIcon },
  { label: 'All Laptops', href: '/laptops', Icon: LaptopIcon },
]

const navLinks = [
  { label: 'Laptops', href: '/laptops' },
  { label: 'Gaming', href: '/laptops?use=GAMING' },
  { label: 'Workstations', href: '/laptops?use=WORK' },
  { label: 'Accessories', href: '/laptops#accessories' },
  { label: 'Brands', href: '/#brands' },
]

function SuggestionImage({ product }: { product: StoreProduct }) {
  const [failed, setFailed] = useState(false)
  return product.imageUrl && !failed
    ? <img src={imageSource(product.imageUrl)} alt="" onError={() => setFailed(true)} />
    : <span className="sf-suggestion-placeholder" aria-hidden="true">RXB</span>
}

type StoreHeaderProps = {
  products: StoreProduct[]
  loading: boolean
  error: string
  search: string
  onSearchChange: (value: string) => void
  onSearchSubmit: () => void
  onOpenProduct: (product: StoreProduct) => void
}

export function StoreHeader({ products, loading, error, search, onSearchChange, onSearchSubmit, onOpenProduct }: StoreHeaderProps) {
  const [focused, setFocused] = useState(false)
  const [active, setActive] = useState(-1)
  const [categoriesOpen, setCategoriesOpen] = useState(false)
  const searchArea = useRef<HTMLFormElement>(null)
  const categoriesArea = useRef<HTMLDivElement>(null)

  const suggestions = useMemo(() => {
    const query = search.trim()
    return query ? products.filter(product => matchesSearch(product, query)).slice(0, 5) : []
  }, [products, search])
  const showSuggestions = focused && Boolean(search.trim())

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!(event.target instanceof Node)) return
      if (!searchArea.current?.contains(event.target)) setFocused(false)
      if (!categoriesArea.current?.contains(event.target)) setCategoriesOpen(false)
    }
    const onKey = (event: globalThis.KeyboardEvent) => { if (event.key === 'Escape') setCategoriesOpen(false) }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [])

  function openSuggestion(product: StoreProduct) {
    onSearchChange(`${product.brand} ${product.model}`)
    setFocused(false)
    setActive(-1)
    onOpenProduct(product)
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (active >= 0 && suggestions[active]) return openSuggestion(suggestions[active])
    setFocused(false)
    onSearchSubmit()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' && suggestions.length) {
      event.preventDefault()
      setFocused(true)
      setActive(current => (current + 1) % suggestions.length)
    } else if (event.key === 'ArrowUp' && suggestions.length) {
      event.preventDefault()
      setActive(current => current <= 0 ? suggestions.length - 1 : current - 1)
    } else if (event.key === 'Escape') {
      setFocused(false)
      setActive(-1)
    }
  }

  return <header className="sf-header">
    <div className="sf-header-top sf-container">
      <a className="sf-logo" href="/" aria-label="RXB Laptops and Tech home"><img src="/rxb-logo-transparent.png" alt="" width="973" height="575" /></a>

      <form className="sf-search" ref={searchArea} role="search" onSubmit={submit}>
        <input
          type="search"
          placeholder="Search for laptops, accessories, brands..."
          aria-label="Search products by name, brand, model, or specifications"
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={showSuggestions}
          aria-controls="sf-product-suggestions"
          aria-activedescendant={active >= 0 ? `sf-suggestion-${active}` : undefined}
          value={search}
          onFocus={() => setFocused(true)}
          onChange={event => { onSearchChange(event.target.value); setActive(-1); setFocused(true) }}
          onKeyDown={handleKeyDown}
        />
        <button type="submit" aria-label="Search"><SearchIcon /></button>
        {showSuggestions && <div className="sf-suggestions">
          {loading ? <p role="status">Loading catalog…</p>
            : error ? <p role="status">Search is unavailable while the catalog cannot be loaded.</p>
              : suggestions.length ? <ul id="sf-product-suggestions" role="listbox" aria-label="Matching products">
                {suggestions.map((product, index) => <li key={product.id}>
                  <button id={`sf-suggestion-${index}`} type="button" role="option" aria-selected={active === index} onClick={() => openSuggestion(product)}>
                    <SuggestionImage product={product} />
                    <span className="sf-suggestion-name"><strong>{product.brand} {product.model}</strong><small>{product.productType === 'LAPTOP' ? product.cpu || 'Laptop' : productTypeLabel(product)}</small></span>
                    <span className="sf-suggestion-price">{formatEgp(product.priceMinor, product.currency)}</span>
                  </button>
                </li>)}
              </ul>
                : <p role="status">No matching products found.</p>}
        </div>}
      </form>

      <div className="sf-header-actions">
        <a href={topicInquiryUrl('tracking my order')} target="_blank" rel="noreferrer"><PhoneIcon /><span>Track Order</span></a>
        <a href={generalInquiryUrl()} target="_blank" rel="noreferrer"><HelpIcon /><span>Need Help?</span></a>
        <a className="sf-cart" href={whatsappUrl('Hello RXB, I would like to place an order.')} target="_blank" rel="noreferrer" aria-label="Order via WhatsApp"><CartIcon /></a>
      </div>
    </div>

    <div className="sf-header-nav">
      <div className="sf-container sf-header-nav-inner">
        <div className="sf-categories" ref={categoriesArea}>
          <button type="button" className="sf-categories-toggle" aria-expanded={categoriesOpen} aria-controls="sf-categories-menu" onClick={() => setCategoriesOpen(open => !open)}>
            <MenuIcon /><span>All Categories</span><ChevronDownIcon className="sf-chevron" />
          </button>
          {categoriesOpen && <ul className="sf-categories-menu" id="sf-categories-menu">
            {categoryLinks.map(({ label, href, Icon }) => <li key={label}><a href={href}><Icon />{label}</a></li>)}
          </ul>}
        </div>
        <nav className="sf-nav" aria-label="Main navigation">
          {navLinks.map(link => <a key={link.label} href={link.href}>{link.label}</a>)}
          <a className="sf-nav-deals" href="/#featured">Deals</a>
        </nav>
        <a className="sf-whatsapp-outline" href={generalInquiryUrl()} target="_blank" rel="noreferrer"><WhatsAppIcon /><span>Order via WhatsApp</span></a>
      </div>
    </div>
  </header>
}
