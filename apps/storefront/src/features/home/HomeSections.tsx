import { useState } from 'react'
import type { CSSProperties, FormEvent } from 'react'
import type { StoreProduct } from '../products/products.api'
import { whatsappUrl } from '../../config/business-contact'
import { ArrowRightIcon, CardIcon, HeadsetIcon, ShieldIcon, TruckIcon } from '../../components/icons'
import { Hero } from './Hero'
import { NeonCityArt, OpenLaptopArt } from './LaptopArt'
import { ProductTile, ProductTileSkeleton } from './ProductTile'

const delay = (index: number) => ({ '--d': `${index * 90}ms` }) as CSSProperties

const categories = [
  { title: 'Gaming Laptops', text: 'High FPS. No Limits.', href: '/laptops?use=GAMING', image: 'rxb_gaming_laptops.png', position: 'center 55%' },
  { title: 'Business Laptops', text: 'Built for Productivity.', href: '/laptops?use=WORK', image: 'rxb_business_laptops.png', position: 'center 62%' },
  { title: 'Workstations', text: 'For Creative Professionals.', href: '/laptops?use=WORK', image: 'rxb_workstations.png', position: 'center 52%' },
  { title: 'Accessories', text: 'Upgrade Your Setup.', href: '/laptops#accessories', image: 'rxb_accessories.png', position: 'center 50%' },
]

const brands = ['ASUS', 'Lenovo', 'Dell', 'HP', 'MSI', 'Acer', 'Apple', 'Razer', 'Microsoft', 'Samsung']

const reasons = [
  { Icon: TruckIcon, title: ['Fast Delivery', 'Across Egypt'], text: 'Get your order quickly and safely.' },
  { Icon: ShieldIcon, title: ['100% Original Products', 'Official Warranty'], text: 'Trusted brands, real products.' },
  { Icon: HeadsetIcon, title: ['Expert Support', 'Before & After Purchase'], text: 'We’re here to help you choose the right device.' },
  { Icon: CardIcon, title: ['Flexible Payment Options'], text: 'Cash, bank transfer, or payment on delivery.' },
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
        : featured.length ? <div className="sf-product-grid">{featured.map((product, index) => <ProductTile key={product.id} product={product} index={index} onOpen={() => onOpen(product)} />)}</div>
          : <div className="sf-state"><strong>New laptops are being listed.</strong><span>Tell us what you need and we’ll source it for you.</span><a className="sf-btn sf-btn-primary" href={whatsappUrl('Hello RXB, I am looking for a laptop. Can you help me choose?')} target="_blank" rel="noreferrer">Ask on WhatsApp</a></div>}
  </section>
}

function Promotions() {
  return <section className="sf-container sf-promos" aria-label="Promotions">
    <a className="sf-promo sf-promo-gaming sf-reveal" href="/laptops?use=GAMING">
      <NeonCityArt />
      <span className="sf-promo-art"><OpenLaptopArt palette="violet" /></span>
      <span className="sf-promo-copy">
        <small className="sf-eyebrow">Game without compromise</small>
        <strong>Gaming Laptops</strong>
        <span>Top brands. Latest GPUs. Maximum performance.</span>
        <span className="sf-btn sf-btn-light">Explore Gaming<ArrowRightIcon /></span>
      </span>
    </a>
    <a className="sf-promo sf-promo-work sf-reveal" style={delay(1)} href="/laptops?use=WORK">
      <span className="sf-promo-monitor" aria-hidden="true" />
      <span className="sf-promo-art"><OpenLaptopArt palette="silver" /></span>
      <span className="sf-promo-copy">
        <small className="sf-eyebrow">Built for creators</small>
        <strong>Workstations</strong>
        <span>Power for your biggest ideas.</span>
        <span className="sf-btn sf-btn-light">Shop Workstations<ArrowRightIcon /></span>
      </span>
    </a>
  </section>
}

function Brands() {
  return <section className="sf-container sf-section" id="brands" aria-labelledby="sf-brands-title">
    <SectionHead id="sf-brands-title" title="Shop by Brand" link={{ label: 'View All Brands', href: '/laptops' }} />
    <ul className="sf-brands">
      {brands.map(brand => <li key={brand}><a href={`/laptops?q=${encodeURIComponent(brand)}`} className={`sf-brand sf-brand-${brand.toLowerCase()}`}>{brand}</a></li>)}
    </ul>
  </section>
}

function WhyRxb() {
  return <section className="sf-container sf-section" aria-labelledby="sf-why-title">
    <SectionHead id="sf-why-title" title="Why Choose RXB?" text="More than just a store — we’re tech enthusiasts, just like you." />
    <ul className="sf-reasons">
      {reasons.map(({ Icon, title, text }) => <li key={title[0]}>
        <Icon />
        <div><strong>{title.map(line => <span key={line}>{line}</span>)}</strong><p>{text}</p></div>
      </li>)}
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
    <Promotions />
    <Brands />
    <WhyRxb />
    <div className="sf-container"><Newsletter /></div>
  </>
}
