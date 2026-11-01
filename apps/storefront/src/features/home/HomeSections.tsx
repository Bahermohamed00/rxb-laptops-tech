import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { StoreProduct } from '../products/products.api'
import { whatsappUrl } from '../../config/business-contact'
import { ArrowRightIcon } from '../../components/icons'
import { Hero } from './Hero'
import { ProductTile, ProductTileSkeleton } from './ProductTile'

const delay = (index: number) => ({ '--d': `${index * 90}ms` }) as CSSProperties

const categories = [
  { title: 'Gaming Laptops', text: 'High FPS. No Limits.', href: '/laptops?use=GAMING', image: 'rxb_gaming_laptops.png', position: 'center 55%' },
  { title: 'Business Laptops', text: 'Built for Productivity.', href: '/laptops?use=WORK', image: 'rxb_business_laptops.png', position: 'center 62%' },
  { title: 'Workstations', text: 'For Creative Professionals.', href: '/laptops?use=WORK', image: 'rxb_workstations.png', position: 'center 52%' },
  { title: 'Accessories', text: 'Upgrade Your Setup.', href: '/laptops#accessories', image: 'rxb_accessories.png', position: 'center 50%' },
]

/*
 * Logos live in /public/brands. All but Microsoft come from Simple Icons 16.36.0 (CC0; each traced from the
 * brand's own site or press kit), cropped to their artwork and filled white. Microsoft is its official 2012 logo
 * (Wikimedia Commons), unmodified and shown in single-colour white by CSS. "mark" logos are emblems without a
 * wordmark, so the brand name is also shown under them.
 */
const brands: { name: string; logo: string; kind: 'wordmark' | 'mark' }[] = [
  { name: 'ASUS', logo: 'asus.svg', kind: 'wordmark' },
  { name: 'Lenovo', logo: 'lenovo.svg', kind: 'wordmark' },
  { name: 'Dell', logo: 'dell.svg', kind: 'mark' },
  { name: 'HP', logo: 'hp.svg', kind: 'mark' },
  { name: 'MSI', logo: 'msi.svg', kind: 'mark' },
  { name: 'Acer', logo: 'acer.svg', kind: 'wordmark' },
  { name: 'Apple', logo: 'apple.svg', kind: 'mark' },
  { name: 'Razer', logo: 'razer.svg', kind: 'mark' },
  { name: 'Microsoft', logo: 'microsoft.svg', kind: 'wordmark' },
  { name: 'Samsung', logo: 'samsung.svg', kind: 'wordmark' },
]

function SectionHead({ id, title, text, link }: { id: string; title: string; text?: string; link?: { label: string; href: string } }) {
  return <div className="sf-section-head">
    <div><h2 id={id}>{title}</h2>{text && <p>{text}</p>}</div>
    {link && <a className="sf-view-all" href={link.href}>{link.label}<ArrowRightIcon /></a>}
  </div>
}

function Categories() {
  return <section className="sf-container sf-categories-grid" aria-label="Shop by category">
    {categories.map((category, index) => <a key={category.title} className="sf-category sf-reveal" style={delay(index)} href={category.href}>
      <img className="sf-category-image" src={`/images/categories/${category.image}`} alt="" width="468" height="399" loading="lazy" decoding="async" style={{ objectPosition: category.position }} />
      <span className="sf-category-copy"><strong>{category.title}</strong><small>{category.text}</small></span>
      <span className="sf-round-arrow" aria-hidden="true"><ArrowRightIcon /></span>
    </a>)}
  </section>
}

type FeaturedProps = { products: StoreProduct[]; loading: boolean; error: string; onRetry: () => void; onOpen: (product: StoreProduct) => void }

function Featured({ products, loading, error, onRetry, onOpen }: FeaturedProps) {
  const featured = products
    .filter(product => product.productType === 'LAPTOP')
    .sort((a, b) => Number(b.available) - Number(a.available))
    .slice(0, 4)
  return <section className="sf-container sf-section" id="featured" aria-labelledby="sf-featured-title">
    <SectionHead id="sf-featured-title" title="Featured Laptops" text="Our top picks, carefully selected for performance, quality, and value." link={{ label: 'View All', href: '/laptops' }} />
    {error ? <div className="sf-state" role="alert"><strong>We couldn’t load the RXB catalog.</strong><span>{error}</span><button type="button" className="sf-btn sf-btn-ghost" onClick={onRetry}>Try again</button></div>
      : loading ? <div className="sf-product-grid" role="status" aria-label="Loading featured laptops">{Array.from({ length: 4 }, (_, index) => <ProductTileSkeleton key={index} />)}</div>
        : featured.length ? <div className="sf-product-grid">{featured.map((product, index) => <ProductTile key={product.id} product={product} index={index} glow={index === 0} onOpen={() => onOpen(product)} />)}</div>
          : <div className="sf-state"><strong>New laptops are being listed.</strong><span>Tell us what you need and we’ll source it for you.</span><a className="sf-btn sf-btn-primary" href={whatsappUrl('Hello RXB, I am looking for a laptop. Can you help me choose?')} target="_blank" rel="noreferrer">Ask on WhatsApp</a></div>}
  </section>
}

function BrandCard({ brand }: { brand: typeof brands[number] }) {
  const [missing, setMissing] = useState(false)
  const showName = missing || brand.kind === 'mark'
  return <a href={`/laptops?q=${encodeURIComponent(brand.name)}`} className={`sf-brand sf-brand-${brand.kind}${missing ? ' is-missing' : ''}`} aria-label={`Shop ${brand.name}`}>
    {!missing && <img className={`sf-brand-logo sf-brand-logo-${brand.name.toLowerCase()}`} src={`/brands/${brand.logo}`} alt={`${brand.name} logo`} loading="lazy" decoding="async" onError={() => setMissing(true)} />}
    {showName && <span className="sf-brand-name" aria-hidden="true">{brand.name}</span>}
  </a>
}

function Brands() {
  return <section className="sf-container sf-section" id="brands" aria-labelledby="sf-brands-title">
    <SectionHead id="sf-brands-title" title="Shop by Brand" link={{ label: 'View All Brands', href: '/laptops' }} />
    <ul className="sf-brands">
      {brands.map(brand => <li key={brand.name}><BrandCard brand={brand} /></li>)}
    </ul>
  </section>
}

function Newsletter() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState('')

  function subscribe(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const value = email.trim()
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      setStatus('Enter a valid email address.')
      return
    }
    window.open(whatsappUrl(`Hello RXB, please add me to your deals and new-arrivals updates. My email: ${value}`), '_blank', 'noopener')
    setStatus('Opening WhatsApp so you can confirm your subscription.')
  }

  return <section className="sf-newsletter" aria-labelledby="sf-newsletter-title">
    <div className="sf-newsletter-copy"><h2 id="sf-newsletter-title">Be the First to Know</h2><p>Get the latest deals, new arrivals, and exclusive offers.</p></div>
    <form onSubmit={subscribe} noValidate>
      <input type="email" placeholder="Enter your email address" aria-label="Email address" autoComplete="email" value={email} onChange={event => { setEmail(event.target.value); setStatus('') }} />
      <button className="sf-btn sf-btn-primary" type="submit">Subscribe<ArrowRightIcon /></button>
      {status && <p className="sf-newsletter-status" role="status">{status}</p>}
    </form>
  </section>
}

export function HomeSections(props: FeaturedProps) {
  return <>
    <Hero />
    <Categories />
    <Featured {...props} />
    <Brands />
    <div className="sf-container"><Newsletter /></div>
  </>
}
