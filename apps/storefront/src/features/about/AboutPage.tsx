import { useEffect, useRef, useState } from 'react'
import { CardIcon, HeadsetIcon, ShieldIcon, TruckIcon } from '../../components/icons'
import { SiteFooter } from '../../components/SiteFooter'
import { ThemeToggle } from '../../components/ThemeToggle'
import type { Theme } from '../../theme/useTheme'
import './about.css'

const reasons = [
  { Icon: TruckIcon, title: ['Fast Delivery', 'Across Egypt'], text: 'Get your order quickly and safely.' },
  { Icon: ShieldIcon, title: ['100% Original Products', 'Official Warranty'], text: 'Trusted brands, real products.' },
  { Icon: HeadsetIcon, title: ['Expert Support', 'Before & After Purchase'], text: 'We’re here to help you choose the right device.' },
  { Icon: CardIcon, title: ['Flexible Payment Options'], text: 'Cash, bank transfer, or payment on delivery.' },
]

export function AboutPage({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const menuToggle = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (!menuOpen) return
    const onKeyDown = (event: WindowEventMap['keydown']) => { if (event.key === 'Escape') { setMenuOpen(false); menuToggle.current?.focus() } }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [menuOpen])
  return <main className="site site-ready about-page">
    <div className="announcement"><span className="status-dot" /> RXB LAPTOPS &amp; TECH</div>
    <header className="site-header">
      <div className="header wrap">
        <a className="wordmark" href="/" aria-label="RXB Laptops and Tech home"><img className="wordmark-logo" src="/rxb-logo-transparent.png" alt="" /><span className="wordmark-caption">LAPTOPS <i>/</i> TECH</span></a>
        <nav id="storefront-primary-navigation" className={`main-nav ${menuOpen ? 'main-nav-open' : ''}`} aria-label="Main navigation">
          <a href="/" onClick={() => setMenuOpen(false)}>Home</a><a href="/#laptops" onClick={() => setMenuOpen(false)}>Laptops</a><a href="/#parts" onClick={() => setMenuOpen(false)}>Parts</a><a href="/about" aria-current="page" onClick={() => setMenuOpen(false)}>About</a>
        </nav>
        <div className="header-tools"><ThemeToggle theme={theme} onToggle={onToggleTheme} /><button ref={menuToggle} className="mobile-menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} aria-controls="storefront-primary-navigation" onClick={() => setMenuOpen(open => !open)}><span /><span /><span /></button></div>
      </div>
    </header>
    <section className="about-hero wrap" aria-labelledby="about-title">
      <div className="eyebrow"><span>RXB</span><i /> ABOUT THE STORE</div>
      <h1 id="about-title">Technology for<br /><em>everyday needs.</em></h1>
      <p>RXB Laptops &amp; Tech focuses on laptops and technology. Explore published product details, compare compatible laptop configurations, and contact the store to ask about a listing.</p>
      <a className="button-primary" href="/#laptops">Explore the laptop catalog <span aria-hidden="true">↗</span></a>
    </section>
    <section className="about-content wrap" aria-label="About RXB">
      <article><span>01 / PRODUCT INFORMATION</span><h2>Clear listings</h2><p>Published catalog information is supplied by product listings. Specifications, images, prices, and availability may vary by listing.</p></article>
      <article><span>02 / CONFIGURATIONS</span><h2>Compatible choices</h2><p>Where a laptop supports configuration choices, compatible RAM and storage combinations are shown with prices confirmed by the catalog API.</p></article>
      <article><span>03 / ACCESSORIES</span><h2>Catalog scope</h2><p>Accessory availability is shown only when supported by the live catalog. Any separately labeled visual previews are not purchasable inventory.</p></article>
    </section>
    <section className="about-why wrap" aria-labelledby="about-why-title">
      <div className="about-why-head">
        <span>04 / WHY RXB</span>
        <h2 id="about-why-title">Why Choose RXB?</h2>
        <p>More than just a store — we’re tech enthusiasts, just like you.</p>
      </div>
      <ul className="about-why-list">
        {reasons.map(({ Icon, title, text }) => <li key={title[0]}>
          <Icon />
          <h3>{title.map(line => <span key={line}>{line}</span>)}</h3>
          <p>{text}</p>
        </li>)}
      </ul>
    </section>
    <SiteFooter />
  </main>
}
